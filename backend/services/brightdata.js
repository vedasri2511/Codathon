import fetch from "node-fetch";

const API_KEY = "1c75aa9d-bff3-4162-bf83-010988294ed4";

export async function getMarketData(query) {
  const res = await fetch("https://api.brightdata.com/request", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: `https://www.google.com/search?q=${query}+jobs+demand+2026`,
      zone: "YOUR_ZONE_NAME"
    })
  });

  if (!res.ok) throw new Error("Bright Data failed");

  const html = await res.text();
  return html;
}