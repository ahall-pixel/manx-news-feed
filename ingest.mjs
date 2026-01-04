import fs from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";

const FEEDS_FILE = "feeds.json";
const OUTPUT_FILE = "site/data.json";

const MAX_ITEMS_PER_FEED = 40;

function normaliseDate(d) {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
}

function pickText(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && v["#text"]) return String(v["#text"]);
  return String(v);
}

function stripHtml(s) {
  return String(s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

async function fetchXml(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "ManxNewsDigest/1.0 (RSS fetcher)" }
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return await res.text();
}

function parseRssOrAtom(xmlText) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
  });
  const doc = parser.parse(xmlText);

  // RSS 2.0
  if (doc?.rss?.channel) {
    const channel = doc.rss.channel;
    const items = Array.isArray(channel.item) ? channel.item : (channel.item ? [channel.item] : []);
    return items.map((it) => ({
      title: stripHtml(pickText(it.title)),
      link: pickText(it.link),
      published: normaliseDate(it.pubDate || it.published || it.date),
      summary: stripHtml(pickText(it.description || it["content:encoded"] || ""))
    }));
  }

  // Atom
  if (doc?.feed?.entry) {
    const entries = Array.isArray(doc.feed.entry) ? doc.feed.entry : [doc.feed.entry];
    return entries.map((e) => {
      let link = "";
      if (typeof e.link === "string") link = e.link;
      else if (Array.isArray(e.link)) {
        const alt = e.link.find((l) => l?.["@_rel"] === "alternate") || e.link[0];
        link = alt?.["@_href"] || "";
      } else link = e.link?.["@_href"] || "";

      return {
        title: stripHtml(pickText(e.title)),
        link,
        published: normaliseDate(e.published || e.updated),
        summary: stripHtml(pickText(e.summary || e.content || ""))
      };
    });
  }

  return [];
}

function dedupe(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key = `${it.link}::${it.title}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

async function main() {
  const feedsRaw = await fs.readFile(FEEDS_FILE, "utf8");
  const feeds = JSON.parse(feedsRaw);

  const all = [];
  const errors = [];

  for (const f of feeds) {
    try {
      const xml = await fetchXml(f.url);
      const items = parseRssOrAtom(xml)
        .filter((x) => x.title && x.link)
        .slice(0, MAX_ITEMS_PER_FEED)
        .map((x) => ({ ...x, source: f.name }));

      all.push(...items);
    } catch (e) {
      errors.push({ feed: f.name, url: f.url, error: String(e?.message || e) });
    }
  }

  const merged = dedupe(all)
    .sort((a, b) => {
      const ad = a.published ? new Date(a.published).getTime() : 0;
      const bd = b.published ? new Date(b.published).getTime() : 0;
      return bd - ad;
    });

  const payload = {
    generatedAt: new Date().toISOString(),
    itemCount: merged.length,
    errors,
    items: merged
  };

  await fs.mkdir("site", { recursive: true });
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(payload, null, 2), "utf8");

  console.log(`Wrote ${OUTPUT_FILE} with ${payload.itemCount} items`);
  if (errors.length) console.warn("Feed errors:", errors);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
