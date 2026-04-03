# Al-Mahboub replacement bot

This bot replaces the old extractor with a cleaner flow:

1. Reads pending titles from the request queue
2. Searches your provider site by title
3. Opens the result page with Playwright
4. Detects `.m3u8` or `.mp4` network URLs
5. Sends the final payload to the ingest webhook

## Why replace the old bot

From the screenshots, the old bot has a few structural issues:

- it depends on a manual `url + tmdb_id` request instead of polling the request queue
- it hardcodes important values directly in code
- it only has a basic extraction path, so it can miss the real video request
- it is not clearly linked to the dashboard request flow end-to-end

## Setup

```bash
cd bot
npm install
npx playwright install chromium
cp .env.example .env
```

Then edit `.env` and set your provider search URL and selectors.

## Run continuously

```bash
npm run start
```

## Run one cycle only

```bash
npm run once
```

## Required env values

- `REQUEST_QUEUE_URL`: pending requests endpoint
- `INGEST_URL`: webhook that inserts media into the library
- `PROVIDER_SEARCH_URL_TEMPLATE`: search URL with `{query}` placeholder
- `PROVIDER_RESULT_LINK_SELECTOR`: CSS selector for the first result link

## Example payload sent to ingest

```json
{
  "tmdb_id": 1325734,
  "title": "The Drama",
  "stream_url": "https://cdn.example.com/master.m3u8",
  "stream_type": "hls",
  "subtitles": [
    {
      "label": "Arabic",
      "src": "https://cdn.example.com/subs/ar.vtt",
      "srclang": "ar"
    }
  ]
}
```

## Notes

- The webhook already enriches TMDb metadata on ingest.
- If no stream is found, the request remains pending and the bot retries next cycle.
- If you want, I can next adapt this bot to your exact source website so it works out of the box.