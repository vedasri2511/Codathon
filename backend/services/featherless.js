import "dotenv/config";
import fetch from "node-fetch";

const API_KEY = process.env.FEATHERLESS_API_KEY || "";
const FEATHERLESS_MODEL = process.env.FEATHERLESS_MODEL || "vicgalle/Roleplay-Llama-3-8B";

function extractChatContent(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim();
  }

  return "";
}

export async function callFeatherless(prompt) {
  if (!API_KEY) {
    throw new Error("FEATHERLESS_API_KEY is not configured");
  }

  const res = await fetch("https://api.featherless.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: FEATHERLESS_MODEL,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 220,
      temperature: 0.3
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Featherless failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return extractChatContent(data) || data.output || data.text || "";
}