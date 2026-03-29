import "dotenv/config";
import fetch from "node-fetch";
import https from "https";

const API_KEY = process.env.BRIGHTDATA_API_KEY || "";
const ZONE = process.env.BRIGHTDATA_ZONE || "serp_api1";
const REQUEST_TIMEOUT_MS = Number(process.env.BRIGHTDATA_TIMEOUT_MS || 20000);
const IPV4_AGENT = new https.Agent({ family: 4 });

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      agent: options.agent || IPV4_AGENT
    });
  } catch (err) {
    const code = err?.code ? ` [${err.code}]` : "";
    throw new Error(`${err.message}${code}`);
  } finally {
    clearTimeout(timer);
  }
}

function stripTags(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSnippetsFromHtml(html) {
  const snippets = [];

  const ddgSnippetRegex = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = ddgSnippetRegex.exec(html)) && snippets.length < 10) {
    const cleaned = stripTags(match[1]);
    if (cleaned.length > 20) snippets.push(cleaned);
  }

  if (snippets.length === 0) {
    const genericSnippetRegex = /<(p|span|div)[^>]*>([\s\S]{80,400}?)<\/(p|span|div)>/gi;
    while ((match = genericSnippetRegex.exec(html)) && snippets.length < 10) {
      const cleaned = stripTags(match[2]);
      if (cleaned.length > 40 && /demand|jobs?|hiring|market|trend|growth/i.test(cleaned)) {
        snippets.push(cleaned);
      }
    }
  }

  return snippets;
}

async function fetchWithBrightData(query) {
  if (!API_KEY || !ZONE) {
    throw new Error("BRIGHTDATA_API_KEY or BRIGHTDATA_ZONE is not configured");
  }

  const targetUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  const res = await fetchWithTimeout("https://api.brightdata.com/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      zone: ZONE,
      url: targetUrl,
      format: "raw"
    })
  });

  if (!res.ok) {
    throw new Error(`Bright Data request failed (${res.status})`);
  }

  return res.text();
}

async function fetchWithDuckDuckGo(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetchWithTimeout(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Accept-Language": "en-US,en;q=0.9"
    }
  });

  if (!res.ok) {
    throw new Error(`DuckDuckGo request failed (${res.status})`);
  }

  return res.text();
}

export async function getMarketData(query) {
  const requestErrors = [];

  try {
    const html = await fetchWithBrightData(query);
    const snippets = parseSnippetsFromHtml(html);
    if (snippets.length > 0) {
      return { provider: "brightdata", snippets };
    }
    requestErrors.push("Bright Data returned no parseable snippets");
  } catch (err) {
    requestErrors.push(err.message);
  }

  try {
    const html = await fetchWithDuckDuckGo(query);
    const snippets = parseSnippetsFromHtml(html);
    if (snippets.length > 0) {
      return { provider: "duckduckgo", snippets, warnings: requestErrors };
    }
    requestErrors.push("DuckDuckGo returned no parseable snippets");
  } catch (err) {
    requestErrors.push(err.message);
  }

  throw new Error(`Live data fetch failed: ${requestErrors.join(" | ")}`);
}