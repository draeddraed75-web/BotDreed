/**
 * Stream extraction engine — tries multiple sources per title.
 */
import { SOURCES, buildSearchUrl } from "./sources.mjs";
import {
  AD_DOMAINS, isMediaUrl, isSubtitleUrl, scoreMediaUrl,
  buildSubtitleTrack, normalizeUrl, log, getErrorMessage,
} from "./helpers.mjs";

const NAV_TIMEOUT = 60_000;
const MEDIA_WAIT  = 15_000;

/**
 * Try every configured source until a stream is found.
 * Returns { streamUrl, streamType, subtitles, source } or null.
 */
export async function extractFromAllSources(browser, { tmdbId, title, year }) {
  for (const source of SOURCES) {
    try {
      log(`  trying ${source.name}…`);
      const result = await extractFromSource(browser, source, { tmdbId, title, year });

      if (result?.streamUrl) {
        log(`  ✓ stream found via ${source.name}`);
        return { ...result, source: source.name };
      }
    } catch (err) {
      log(`  ✗ ${source.name}: ${getErrorMessage(err)}`);
    }
  }

  return null;
}

async function extractFromSource(browser, source, { tmdbId, title, year }) {
  const page = await browser.newPage();
  const mediaCandidates = new Map();
  const subtitleCandidates = new Map();

  const capture = (rawUrl, headers = {}) => {
    const url = normalizeUrl(rawUrl, page.url());
    if (!url) return;
    const ct = String(headers["content-type"] || headers["Content-Type"] || "").toLowerCase();
    if (isMediaUrl(url, ct)) mediaCandidates.set(url, scoreMediaUrl(url, ct, source.allowedHosts || []));
    if (isSubtitleUrl(url, ct)) subtitleCandidates.set(url, buildSubtitleTrack(url));
  };

  try {
    await setupPage(page);
    page.on("request", req => capture(req.url()));
    page.on("response", res => capture(res.url(), res.headers()));

    // Step 1: Navigate — either direct embed or search page
    const targetUrl = source.useTmdbId
      ? buildSearchUrl(source, { tmdbId, title })
      : await findDetailUrl(page, source, title);

    if (!targetUrl) return null;

    if (!source.useTmdbId) {
      // We already navigated during search; now go to detail
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
    } else {
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
    }

    // Step 2: Wait for page ready
    if (source.pageReadySelector) {
      await page.waitForSelector(source.pageReadySelector, { timeout: 10_000 }).catch(() => null);
    }

    // Step 3: Try play buttons
    for (const sel of (source.playSelectors || [])) {
      const count = await page.locator(sel).count().catch(() => 0);
      if (!count) continue;
      await page.locator(sel).first().click({ force: true, timeout: 2000 }).catch(() => null);
      await page.waitForTimeout(1200);
    }
    await page.mouse.click(200, 200).catch(() => null);

    // Step 4: Wait for media network requests
    await page.waitForTimeout(MEDIA_WAIT);

    // Step 5: Scrape HTML for URLs
    const html = await page.content();
    for (const m of html.matchAll(/(?:https?:)?\/\/[^\s"'<>]+\.(?:m3u8|mp4|vtt|srt)(?:\?[^\s"'<>]*)?/gi)) {
      capture(m[0]);
    }

    // Step 6: Check iframes for embedded players
    const iframes = page.frames();
    for (const frame of iframes) {
      try {
        const frameHtml = await frame.content().catch(() => "");
        for (const m of frameHtml.matchAll(/(?:https?:)?\/\/[^\s"'<>]+\.(?:m3u8|mp4)(?:\?[^\s"'<>]*)?/gi)) {
          capture(m[0]);
        }
      } catch {}
    }

    const ranked = Array.from(mediaCandidates.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([url]) => url);

    const streamUrl = ranked[0] || null;
    return {
      streamUrl,
      streamType: streamUrl?.includes(".m3u8") ? "hls" : "mp4",
      subtitles: Array.from(subtitleCandidates.values()),
    };
  } finally {
    await page.close();
  }
}

async function findDetailUrl(page, source, title) {
  const searchUrl = buildSearchUrl(source, { tmdbId: 0, title });
  await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
  await page.waitForTimeout(3000);

  const selector = source.resultLinkSelector || "a[href*='/movie/']";
  const count = await page.locator(selector).count();
  if (!count) return null;

  const href = await page.locator(selector).first().getAttribute("href");
  if (!href) return null;

  try { return new URL(href, page.url()).toString(); } catch { return null; }
}

async function setupPage(page) {
  await page.route("**/*", route => {
    const url = route.request().url();
    // Block ads and trackers
    if (AD_DOMAINS.some(d => url.includes(d))) return route.abort();
    // Block popup/redirect scripts
    const resourceType = route.request().resourceType();
    if (resourceType === "image" && url.includes("ad")) return route.abort();
    return route.continue();
  });
  page.setDefaultNavigationTimeout(NAV_TIMEOUT);
}
