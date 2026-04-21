const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;

// Whitelist of Nu.nl RSS feed names the proxy is allowed to fetch.
// Prevents the proxy being used as an open relay.
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

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".ico": "image/x-icon",
};

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
}

function sendJson(res, status, obj) {
  setCors(res);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

function fetchRss(feed) {
  return new Promise((resolve, reject) => {
    const upstream = `https://www.nu.nl/rss/${encodeURIComponent(feed)}`;
    const req = https.get(
      upstream,
      {
        headers: {
          "User-Agent":
            "citax-nieuws/1.0 (+https://markvanameijde-nl.github.io/citax/nieuws/)",
          Accept: "application/rss+xml, application/xml, text/xml",
        },
      },
      (upstreamRes) => {
        if (upstreamRes.statusCode !== 200) {
          upstreamRes.resume();
          reject(new Error(`upstream returned ${upstreamRes.statusCode}`));
          return;
        }
        const chunks = [];
        upstreamRes.on("data", (c) => chunks.push(c));
        upstreamRes.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      }
    );
    req.on("error", reject);
    req.setTimeout(10000, () => {
      req.destroy(new Error("upstream timeout"));
    });
  });
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";

  // Prevent path traversal: resolve and ensure the result stays under ROOT.
  // startsWith alone is unsafe if ROOT is a prefix of a sibling dir name.
  const target = path.normalize(path.join(ROOT, pathname));
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(target, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(target).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    fs.createReadStream(target).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    setCors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "GET") {
    res.writeHead(405);
    res.end("Method not allowed");
    return;
  }

  if (url.pathname === "/api/feeds") {
    sendJson(res, 200, { feeds: ALLOWED_FEEDS });
    return;
  }

  if (url.pathname === "/api/rss") {
    const feed = url.searchParams.get("feed") || "Algemeen";
    if (!ALLOWED_FEEDS.includes(feed)) {
      sendJson(res, 400, { error: `Onbekende feed: ${feed}` });
      return;
    }
    try {
      const xml = await fetchRss(feed);
      setCors(res);
      res.writeHead(200, {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      });
      res.end(xml);
    } catch (err) {
      sendJson(res, 502, { error: err.message });
    }
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`nieuws draait op http://localhost:${PORT}/`);
});
