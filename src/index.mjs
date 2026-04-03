import "dotenv/config";
import { chromium } from "playwright";
import { extractFromAllSources } from "./extractor.mjs";
import { log, getErrorMessage, sleep, safeJson, parseNumber } from "./helpers.mjs";

const config = {
  requestQueueUrl: process.env.REQUEST_QUEUE_URL,
  ingestUrl: process.env.INGEST_URL,
  tmdbApiKey: process.env.TMDB_API_KEY || "193c909f9dcb815ea536c783dab59ff5",
  headless: (process.env.HEADLESS || "true").toLowerCase() !== "false",
  pollIntervalMs: parseNumber(process.env.POLL_INTERVAL_MS, 15000),
};

const runOnce = process.argv.includes("--once");

if (!config.requestQueueUrl || !config.ingestUrl) {
  throw new Error("Missing REQUEST_QUEUE_URL or INGEST_URL");
}

async function main() {
  log("starting multi-source extractor bot");
  const browser = await chromium.launch({ headless: config.headless });

  try {
    do {
      const requests = await fetchPendingRequests();
      if (!requests.length) log("no pending requests");

      for (const request of requests) {
        try {
          await processRequest(browser, request);
        } catch (error) {
          log(`request ${request.tmdb_id} failed: ${getErrorMessage(error)}`);
        }
      }

      if (!runOnce) await sleep(config.pollIntervalMs);
    } while (!runOnce);
  } finally {
    await browser.close();
  }
}

async function fetchPendingRequests() {
  const res = await fetch(config.requestQueueUrl, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`queue returned ${res.status}`);
  const payload = await res.json();
  return Array.isArray(payload.requests) ? payload.requests : [];
}

async function processRequest(browser, request) {
  const title = String(request.title || "").trim();
  const tmdbId = Number(request.tmdb_id);
  if (!title || Number.isNaN(tmdbId)) throw new Error("invalid request");

  log(`processing ${tmdbId} — ${title}`);

  // Step 1: Verify with TMDB for accurate matching
  const tmdbMeta = await fetchTmdbMeta(tmdbId);
  const verifiedTitle = tmdbMeta?.title || tmdbMeta?.name || title;
  const year = (tmdbMeta?.release_date || tmdbMeta?.first_air_date || "").slice(0, 4);

  log(`  TMDB verified: "${verifiedTitle}" (${year})`);

  // Step 2: Try all sources
  const result = await extractFromAllSources(browser, {
    tmdbId,
    title: verifiedTitle,
    year,
  });

  if (!result?.streamUrl) throw new Error("no stream found from any source");

  // Step 3: Send to ingest
  const payload = {
    tmdb_id: tmdbId,
    title: verifiedTitle,
    stream_url: result.streamUrl,
    stream_type: result.streamType,
    subtitles: result.subtitles,
  };

  const res = await fetch(config.ingestUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await safeJson(res);
  if (!res.ok || body?.success === false) {
    throw new Error(body?.error || `ingest returned ${res.status}`);
  }

  log(`✓ ingested ${tmdbId} via ${result.source} → ${result.streamType}`);
}

async function fetchTmdbMeta(tmdbId) {
  try {
    // Try movie first, then TV
    for (const type of ["movie", "tv"]) {
      const res = await fetch(
        `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${config.tmdbApiKey}&language=ar-SA`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.id) return data;
      }
    }
  } catch {}
  return null;
}

main().catch(err => {
  console.error(`[fatal] ${getErrorMessage(err)}`);
  process.exit(1);
});
