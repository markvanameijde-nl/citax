// Publieke RSS-proxy. Leeg laten voor lokaal draaien (npm start serveert
// zelf op /api). Vul een Cloudflare Worker-URL in (zonder slash aan het
// eind) om de app publiek te laten werken vanaf bv. GitHub Pages.
// Zie nieuws/worker/README.md voor het deployen.
const WORKER_URL = "";

const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\]|::1)$/.test(location.hostname);
const API_BASE = isLocalHost || !WORKER_URL ? "" : WORKER_URL;
const FEEDS_ENDPOINT = `${API_BASE}/api/feeds`;
const RSS_ENDPOINT = `${API_BASE}/api/rss`;
const FALLBACK_FEEDS = ["Algemeen", "Economie", "Sport", "Tech"];

const STORAGE_READ = "nieuws.read";
const STORAGE_DELETED = "nieuws.deleted";

const listEl = document.getElementById("article-list");
const statusEl = document.getElementById("status");
const refreshBtn = document.getElementById("refresh-btn");

const readIds = loadSet(STORAGE_READ);
const deletedIds = loadSet(STORAGE_DELETED);

let cachedFeedNames = null;

function loadSet(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return new Set();
        const arr = JSON.parse(raw);
        return new Set(Array.isArray(arr) ? arr : []);
    } catch {
        return new Set();
    }
}

function saveSet(key, set) {
    try {
        localStorage.setItem(key, JSON.stringify([...set]));
    } catch {
        // Storage kan vol zitten of geblokkeerd — niet fataal.
    }
}

// Drop stored ids that are no longer in any loaded feed, so readIds and
// deletedIds don't grow forever as Nu.nl publishes more articles.
function pruneSet(key, set, keepIds) {
    let changed = false;
    for (const id of set) {
        if (!keepIds.has(id)) {
            set.delete(id);
            changed = true;
        }
    }
    if (changed) saveSet(key, set);
}

function setStatus(text, isError = false) {
    statusEl.textContent = text;
    statusEl.classList.toggle("error", isError);
}

async function loadFeedNames() {
    if (cachedFeedNames) return cachedFeedNames;
    try {
        const res = await fetch(FEEDS_ENDPOINT);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data.feeds) && data.feeds.length > 0) {
            cachedFeedNames = data.feeds;
            return cachedFeedNames;
        }
    } catch {
        // Val terug op een minimale set als /api/feeds niet beschikbaar is.
    }
    return FALLBACK_FEEDS;
}

async function fetchFeed(name) {
    const res = await fetch(`${RSS_ENDPOINT}?feed=${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error(`feed ${name}: status ${res.status}`);
    const xml = await res.text();
    return parseRss(xml, name);
}

function parseRss(xml, fallbackCategory) {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror")) {
        throw new Error("kon RSS niet parsen");
    }
    const items = [...doc.querySelectorAll("item")];
    return items.map((item) => {
        const title = text(item, "title");
        const link = text(item, "link");
        const pubDate = text(item, "pubDate");
        const guid = text(item, "guid") || link;
        const category = text(item, "category") || fallbackCategory;
        const ts = pubDate ? Date.parse(pubDate) : NaN;
        return {
            id: guid || link || title,
            title,
            link,
            category,
            timestamp: Number.isFinite(ts) ? ts : 0,
        };
    }).filter((a) => a.id && a.title && a.link);
}

function text(parent, tag) {
    const el = parent.querySelector(tag);
    return el ? el.textContent.trim() : "";
}

function dedupe(articles) {
    const seen = new Map();
    for (const a of articles) {
        // Keep first occurrence so the primary feed's category wins.
        if (!seen.has(a.id)) seen.set(a.id, a);
    }
    return [...seen.values()];
}

async function loadAndRender() {
    refreshBtn.classList.add("spinning");
    refreshBtn.disabled = true;
    setStatus("Laden…");

    try {
        const feedNames = await loadFeedNames();
        const results = await Promise.allSettled(feedNames.map(fetchFeed));

        const articles = [];
        const failed = [];
        results.forEach((r, i) => {
            if (r.status === "fulfilled") articles.push(...r.value);
            else failed.push(feedNames[i]);
        });

        if (articles.length === 0) {
            render([]);
            setStatus(
                failed.length > 0
                    ? `Geen berichten geladen. Mislukt: ${failed.join(", ")}.`
                    : "Geen berichten gevonden.",
                true
            );
            return;
        }

        const deduped = dedupe(articles);

        // Only prune when every feed loaded; otherwise stored ids might
        // legitimately correspond to articles from a feed that failed.
        if (failed.length === 0) {
            const allIds = new Set(deduped.map((a) => a.id));
            pruneSet(STORAGE_READ, readIds, allIds);
            pruneSet(STORAGE_DELETED, deletedIds, allIds);
        }

        const merged = deduped
            .filter((a) => !deletedIds.has(a.id))
            .sort((a, b) => a.timestamp - b.timestamp);

        render(merged);

        if (failed.length > 0) {
            setStatus(`Sommige feeds mislukten: ${failed.join(", ")}.`, true);
        } else {
            setStatus(`${merged.length} berichten — oudste bovenaan.`);
        }
    } catch (err) {
        setStatus(`Fout bij laden: ${err.message}`, true);
    } finally {
        refreshBtn.classList.remove("spinning");
        refreshBtn.disabled = false;
    }
}

function render(articles) {
    listEl.innerHTML = "";
    for (const article of articles) {
        listEl.appendChild(createArticleEl(article));
    }
}

function createArticleEl(article) {
    const li = document.createElement("li");
    li.className = "article" + (readIds.has(article.id) ? " read" : "");
    li.dataset.id = article.id;

    const link = document.createElement("a");
    link.className = "article-link";
    link.href = article.link;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.addEventListener("click", () => markRead(li));

    const titleEl = document.createElement("div");
    titleEl.className = "article-title";
    titleEl.textContent = article.title;

    const catEl = document.createElement("div");
    catEl.className = "article-category";
    catEl.textContent = article.category;

    link.appendChild(titleEl);
    link.appendChild(catEl);

    const del = document.createElement("button");
    del.className = "delete-btn";
    del.type = "button";
    del.setAttribute("aria-label", `Wissen: ${article.title}`);
    const icon = document.createElement("span");
    icon.className = "delete-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "✕";
    const label = document.createElement("span");
    label.textContent = "Wissen";
    del.appendChild(icon);
    del.appendChild(label);
    del.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteArticle(li);
    });

    li.appendChild(link);
    li.appendChild(del);
    return li;
}

function markRead(li) {
    const id = li.dataset.id;
    if (readIds.has(id)) return;
    readIds.add(id);
    saveSet(STORAGE_READ, readIds);
    li.classList.add("read");
}

function deleteArticle(li) {
    deletedIds.add(li.dataset.id);
    saveSet(STORAGE_DELETED, deletedIds);
    li.remove();
    if (listEl.children.length === 0) {
        setStatus("Alle berichten gewist. Klik op Vernieuwen voor nieuwe berichten.");
    }
}

refreshBtn.addEventListener("click", loadAndRender);

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => {
            // Registratie faalt op file:// — niet fataal.
        });
    });
}

loadAndRender();
