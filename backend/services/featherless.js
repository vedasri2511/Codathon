import fetch from "node-fetch";

const API_KEY = "rc_71da412490a8c66f9180dfa179a5a791de7a4919e012a3525e37a0b7ec7aea23";

export async function callFeatherless(prompt) {
  const res = await fetch("https://api.featherless.ai/generate", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prompt,
      max_tokens: 100
    })
  });

  if (!res.ok) throw new Error("Featherless failed");

  const data = await res.json();
  return data.output || "";
}