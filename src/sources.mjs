/**
 * Multi-source configuration for the extractor bot.
 * Each source defines how to search and extract streams from a provider.
 */

export const SOURCES = [
  // ── International ──
  {
    name: "VidSrc.to",
    type: "international",
    searchTemplate: "https://vidsrc.to/embed/movie/{tmdb_id}",
    useTmdbId: true,
    pageReadySelector: "video, iframe",
    playSelectors: ["button[aria-label*='play' i]", ".play-button", "video"],
    allowedHosts: ["vidsrc.to", "vidsrc.stream"],
  },
  {
    name: "VidSrc.me",
    type: "international",
    searchTemplate: "https://vidsrc.me/embed/movie?tmdb={tmdb_id}",
    useTmdbId: true,
    pageReadySelector: "iframe, video",
    playSelectors: ["video", ".play-button"],
    allowedHosts: ["vidsrc.me"],
  },
  {
    name: "2Embed",
    type: "international",
    searchTemplate: "https://www.2embed.cc/embed/{tmdb_id}",
    useTmdbId: true,
    pageReadySelector: "iframe",
    playSelectors: ["video"],
    allowedHosts: ["2embed.cc", "2embed.org"],
  },
  {
    name: "SuperEmbed",
    type: "international",
    searchTemplate: "https://superembed.stream/e?tmdb={tmdb_id}&type=movie",
    useTmdbId: true,
    pageReadySelector: "iframe, video",
    playSelectors: ["video"],
    allowedHosts: ["superembed.stream"],
  },
  {
    name: "FMovies",
    type: "international",
    searchTemplate: "https://fmovies.to/search?keyword={query}",
    useTmdbId: false,
    resultLinkSelector: "a.film-poster-ahref, a[href*='/movie/'], a[href*='/film/']",
    pageReadySelector: ".film-poster, .movie-detail",
    playSelectors: ["button[aria-label*='play' i]", ".play-button", ".btn-play", "video"],
    allowedHosts: ["fmovies.to", "fmovies.ps"],
  },
  {
    name: "SStream",
    type: "international",
    searchTemplate: "https://sstream.to/search?q={query}",
    useTmdbId: false,
    resultLinkSelector: "a[href*='/movie/'], a[href*='/watch/']",
    pageReadySelector: "video, iframe",
    playSelectors: ["video", ".play-button"],
    allowedHosts: ["sstream.to"],
  },

  // ── Arabic ──
  {
    name: "Akwam",
    type: "arabic",
    searchTemplate: "https://akwam.cx/search?q={query}",
    useTmdbId: false,
    resultLinkSelector: "a[href*='/movie/'], a[href*='/film/'], .entry-box a",
    pageReadySelector: ".download-links, .watch-links, video, iframe",
    playSelectors: [".btn-watch", "a[href*='watch']", "video"],
    allowedHosts: ["akwam.cx", "akwam.to"],
  },
  {
    name: "ArabSeed",
    type: "arabic",
    searchTemplate: "https://arabseed.show/?s={query}",
    useTmdbId: false,
    resultLinkSelector: ".movie-poster a, a[href*='/movies/'], a[href*='/film/']",
    pageReadySelector: "video, iframe, .watch-section",
    playSelectors: [".play-btn", "video", "iframe"],
    allowedHosts: ["arabseed.show", "arabseed.net"],
  },
  {
    name: "MyCima",
    type: "arabic",
    searchTemplate: "https://mycima.mx/search/{query}",
    useTmdbId: false,
    resultLinkSelector: ".Thumb--GridItem a, a[href*='/film/'], a[href*='/movie/']",
    pageReadySelector: "video, iframe, .WatchInner",
    playSelectors: [".Bstract--Poster--Play", "video", "iframe"],
    allowedHosts: ["mycima.mx", "mycima.cc", "wecima.show"],
  },

  // ── Turkish ──
  {
    name: "3sk",
    type: "turkish",
    searchTemplate: "https://3sk.org/?s={query}",
    useTmdbId: false,
    resultLinkSelector: "a[href*='/series/'], a[href*='/film/'], .post-thumbnail a",
    pageReadySelector: "video, iframe",
    playSelectors: [".play-btn", "video", "iframe"],
    allowedHosts: ["3sk.org", "3sk.tv"],
  },
];

/**
 * Build the search URL for a given source.
 */
export function buildSearchUrl(source, { tmdbId, title }) {
  if (source.useTmdbId) {
    return source.searchTemplate.replace("{tmdb_id}", String(tmdbId));
  }
  return source.searchTemplate.replace("{query}", encodeURIComponent(title));
}
