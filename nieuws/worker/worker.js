// Cloudflare Worker — proxy for Nu.nl RSS feeds with permissive CORS.
// Mirrors the /api/feeds and /api/rss routes of the local Node server
// so the frontend can talk to either without code changes.

const ALLOWED_FEEDS = [
  "Algemeen",
  "Economie",
  "Sport",
  "Tech",
  "Achterklap",
  "Opmerkelijk",
  "Internet",
  "Wetenschap",
  "Gezondheid",
  "Muziek",
  "Film",
  "Boek",
];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(status, obj, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
      ...extra,
    },
  });
}

async function fetchRss(feed) {
  const upstream = await fetch(
    `https://www.nu.nl/rss/${encodeURIComponent(feed)}`,
    {
      headers: {
        "User-Agent":
          "citax-nieuws/1.0 (+https://markvanameijde-nl.github.io/citax/nieuws/)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      // Let Cloudflare edge-cache the upstream response for 60s so we
      // don't hammer Nu.nl on every request.
      cf: { cacheTtl: 60, cacheEverything: true },
    }
  );
  if (!upstream.ok) {
    throw new Error(`upstream ${upstream.status}`);
  }
  return upstream.text();
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== "GET") {
      return new Response("Method not allowed", {
        status: 405,
        headers: CORS_HEADERS,
      });
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/feeds" || url.pathname === "/feeds") {
      return json(200, { feeds: ALLOWED_FEEDS });
    }

    if (url.pathname === "/api/rss" || url.pathname === "/rss") {
      const feed = url.searchParams.get("feed") || "Algemeen";
      if (!ALLOWED_FEEDS.includes(feed)) {
        return json(400, { error: `Onbekende feed: ${feed}` });
      }
      try {
        const xml = await fetchRss(feed);
        return new Response(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=60",
            ...CORS_HEADERS,
          },
        });
      } catch (err) {
        return json(502, { error: err.message });
      }
    }

    if (url.pathname === "/" || url.pathname === "") {
      return json(200, {
        name: "citax-nieuws",
        endpoints: ["/api/feeds", "/api/rss?feed=<name>"],
      });
    }

    return new Response("Not found", { status: 404, headers: CORS_HEADERS });
  },
};
