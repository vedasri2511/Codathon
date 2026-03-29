import { callFeatherless } from "./featherless.js";
import { getMarketData } from "./brightdata.js";

export async function runDecisionEngine(question) {
  let options = [];

  // 🔹 Try AI-based option generation
  try {
    const text = await callFeatherless(
      `Give 3 short options for: ${question}`
    );

    options = text
      .split("\n")
      .map(o => o.replace(/^\d+\.\s*/, "").trim())
      .filter(o => o.length > 0);
  } catch (err) {
    console.log("Featherless failed, using fallback");
  }

  // 🔹 Fallback options (IMPORTANT)
  if (options.length === 0) {
    options = ["AI", "Web Development", "Data Science"];
  }

  let results = [];

  for (let option of options) {
    let score = 5;
    let evaluation = "";

    try {
      const data = await getMarketData(option);

      const evalText = await callFeatherless(
        `Evaluate ${option}. Give score from 1 to 10 with reason.`
      );

      const match = evalText.match(/\d+/);
      score = match ? parseInt(match[0]) : 5;

      evaluation = evalText;
    } catch (err) {
      // 🔹 Fallback scoring
      score = Math.floor(Math.random() * 10) + 1;
      evaluation = "Fallback evaluation (API not available)";
    }

    results.push({
      name: option,
      score,
      evaluation,
      status: score >= 6 ? "considered" : "eliminated"
    });
  }

  // 🔹 Safety check
  if (results.length === 0) {
    return {
      question,
      options: [],
      best: { name: "No valid options" },
      graph: { name: "Start", children: [] }
    };
  }

  // 🔹 Safe reduce
  const best = results.reduce(
    (a, b) => (a.score > b.score ? a : b),
    results[0]
  );

  return {
    question,
    options: results,
    best,
    graph: {
      name: "Start",
      children: results
    }
  };
}