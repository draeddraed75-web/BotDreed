/**
 * Shared helpers for the extractor bot.
 */

export const AD_DOMAINS = [
  "googlesyndication.com", "adservice.google.com", "doubleclick.net",
  "popads.net", "propellerads.com", "googletagmanager.com",
  "google-analytics.com", "facebook.net", "amazon-adsystem.com",
  "ads-twitter.com", "adnxs.com", "adsrvr.org", "outbrain.com",
  "taboola.com", "criteo.com", "quantserve.com", "scorecardresearch.com",
  "moatads.com", "pubmatic.com", "openx.net", "rubiconproject.com",
  "casalemedia.com", "lijit.com", "sharethrough.com", "exoclick.com",
  "juicyads.com", "trafficjunky.com",
];

export function isMediaUrl(url, contentType = "") {
  return /\.(m3u8|mp4)(\?|$)/i.test(url)
    || contentType.includes("application/vnd.apple.mpegurl")
    || contentType.includes("application/x-mpegurl")
    || contentType.includes("video/mp4");
}

export function isSubtitleUrl(url, contentType = "") {
  return /\.(vtt|srt|ass|ttml)(\?|$)/i.test(url)
    || contentType.includes("text/vtt")
    || contentType.includes("application/x-subrip");
}

export function scoreMediaUrl(url, contentType, allowedHosts = []) {
  let score = 0;
  if (url.startsWith("https://")) score += 10;
  if (url.includes(".m3u8")) score += 60;
  if (url.includes("master") || url.includes("playlist")) score += 15;
  if (url.includes(".mp4")) score += 40;
  if (contentType.includes("mpegurl")) score += 25;
  if (contentType.includes("video/mp4")) score += 15;
  try {
    const hostname = new URL(url).hostname;
    if (allowedHosts.includes(hostname)) score += 50;
  } catch {}
  return score;
}

export function buildSubtitleTrack(url) {
  const lower = url.toLowerCase();
  if (/(^|[_\-.\/])ar(\b|[_\-.\/])|arabic|عربي/u.test(lower))
    return { label: "Arabic", src: url, srclang: "ar" };
  if (/(^|[_\-.\/])en(\b|[_\-.\/])|english/u.test(lower))
    return { label: "English", src: url, srclang: "en" };
  return { label: "Subtitle", src: url, srclang: "und" };
}

export function resolveUrl(base, value) {
  if (!value) return null;
  try { return new URL(value, base).toString(); } catch { return null; }
}

export function normalizeUrl(value, base) {
  if (!value || String(value).startsWith("data:")) return null;
  return resolveUrl(base, String(value));
}

export function splitCsv(value) {
  return String(value || "").split(",").map(s => s.trim()).filter(Boolean);
}

export function parseNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

export function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function safeJson(response) {
  try { return await response.json(); } catch { return null; }
}
