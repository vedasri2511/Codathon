import { getMarketData } from "./brightdata.js";
import { callFeatherless } from "./featherless.js";

const DEFAULT_OPTIONS = ["Big Data", "Cloud Computing", "Data Science"];
const ELIMINATION_THRESHOLD = 7;

function toTitleCase(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizeOption(raw) {
  const cleaned = raw
    .replace(/[?.,!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";

  const map = {
    ml: "Machine Learning",
    dl: "Deep Learning",
    ai: "Artificial Intelligence",
    ds: "Data Science",
    cv: "Computer Vision",
    nlp: "Natural Language Processing"
  };

  const lower = cleaned.toLowerCase();
  if (map[lower]) return map[lower];

  return toTitleCase(cleaned);
}

function extractOptionsFromQuestion(question) {
  if (!question || typeof question !== "string") {
    return DEFAULT_OPTIONS;
  }

  const compactQuestion = question.replace(/\s+/g, " ").trim();

  const directCompareMatch = compactQuestion.match(
    /(.+?)\s*(?:vs\.?|versus|or)\s*(.+?)(?:\s+(?:for|with|in|which|what|is|are|should|best|better)\b|$)/i
  );

  const betweenCompareMatch = compactQuestion.match(
    /between\s+(.+?)\s+and\s+(.+?)(?:\s+(?:for|with|in|which|what|is|are|should|best|better)\b|$)/i
  );

  const comparatorSplit = [];

  if (directCompareMatch) {
    comparatorSplit.push(directCompareMatch[1], directCompareMatch[2]);
  } else if (betweenCompareMatch) {
    comparatorSplit.push(betweenCompareMatch[1], betweenCompareMatch[2]);
  }

  const normalized = comparatorSplit
    .map((part) => normalizeOption(part))
    .filter((part) => part.length >= 2);

  const unique = [];
  for (const option of normalized) {
    if (!unique.some((existing) => existing.toLowerCase() === option.toLowerCase())) {
      unique.push(option);
    }
  }

  if (unique.length >= 2) {
    return unique.slice(0, 4);
  }

  return DEFAULT_OPTIONS;
}

function scoreFromSnippets(snippets) {
  const text = snippets.join(" ").toLowerCase();

  const positiveSignals = [
    "high demand",
    "in demand",
    "strong demand",
    "hiring surge",
    "growing",
    "growth",
    "expanding",
    "rising",
    "future proof",
    "skills gap"
  ];

  const negativeSignals = [
    "low demand",
    "declining",
    "oversaturated",
    "layoffs",
    "shrinking",
    "downturn",
    "limited openings",
    "stagnant"
  ];

  const positiveHits = positiveSignals.reduce(
    (count, phrase) => count + (text.includes(phrase) ? 1 : 0),
    0
  );

  const negativeHits = negativeSignals.reduce(
    (count, phrase) => count + (text.includes(phrase) ? 1 : 0),
    0
  );

  const confidenceBoost = Math.min(2, Math.floor(snippets.length / 3));
  const raw = 5 + positiveHits - negativeHits + confidenceBoost;
  const score = Math.max(1, Math.min(10, raw));

  return {
    score,
    positiveHits,
    negativeHits
  };
}

function buildTradeoffs(option, scoreInfo, evidence) {
  const pros = [];
  const cons = [];

  if (scoreInfo.positiveHits >= 2) {
    pros.push("Strong positive market signals in live search results");
  } else if (scoreInfo.positiveHits === 1) {
    pros.push("Some positive growth indicators are present");
  }

  if (scoreInfo.negativeHits >= 2) {
    cons.push("Multiple negative signals indicate near-term risk");
  } else if (scoreInfo.negativeHits === 1) {
    cons.push("At least one cautionary market signal was detected");
  }

  if (evidence.length > 0) {
    pros.push(`Evidence available from ${evidence.length} live snippet(s)`);
  }

  if (pros.length === 0) {
    pros.push(`No strong upside signals found for ${option}`);
  }

  if (cons.length === 0) {
    cons.push("No major downside signals were found");
  }

  return { pros, cons };
}

function buildReasoningNode(result) {
  return {
    name: `${result.name} (${result.score})`,
    status: result.status,
    children: [
      {
        name: "Signals",
        children: [
          { name: `Positive signals: ${result.signalSummary.positiveHits}` },
          { name: `Negative signals: ${result.signalSummary.negativeHits}` }
        ]
      },
      {
        name: "Tradeoffs",
        children: [
          {
            name: "Pros",
            children: result.tradeoffs.pros.map((item) => ({ name: item }))
          },
          {
            name: "Cons",
            children: result.tradeoffs.cons.map((item) => ({ name: item }))
          }
        ]
      },
      {
        name:
          result.status === "eliminated"
            ? `Eliminated: ${result.eliminationReason}`
            : "Retained as a viable path"
      }
    ]
  };
}

async function evaluateOption(option, question) {
  const marketQuery = `${option} ${question} jobs demand trend 2026`;

  try {
    const marketData = await getMarketData(marketQuery);
    const scoreInfo = scoreFromSnippets(marketData.snippets);
    const tradeoffs = buildTradeoffs(option, scoreInfo, marketData.snippets.slice(0, 2));
    const status = scoreInfo.score >= ELIMINATION_THRESHOLD ? "considered" : "eliminated";

    return {
      name: option,
      score: scoreInfo.score,
      evaluation: `Live web analysis (${marketData.provider})`,
      status,
      source: marketData.provider,
      evidence: marketData.snippets.slice(0, 2),
      tradeoffs,
      signalSummary: {
        positiveHits: scoreInfo.positiveHits,
        negativeHits: scoreInfo.negativeHits
      },
      eliminationReason:
        status === "eliminated"
          ? `Score ${scoreInfo.score} is below threshold ${ELIMINATION_THRESHOLD}`
          : "",
      warnings: marketData.warnings || []
    };
  } catch (err) {
    console.log("Bright Data error:", err.message);
    return {
      name: option,
      score: 1,
      evaluation: "No live data available",
      status: "eliminated",
      source: "none",
      evidence: [],
      tradeoffs: {
        pros: ["Option is still captured for completeness"],
        cons: ["Could not fetch live data to support this path"]
      },
      signalSummary: {
        positiveHits: 0,
        negativeHits: 1
      },
      eliminationReason: "Live market evidence could not be fetched",
      warnings: [err.message]
    };
  }
}

async function generateFinalNarrative(question, results, best, eliminations) {
  const evidenceLines = results
    .map((item) => {
      const snippets = (item.evidence || []).slice(0, 1).join(" || ");
      return `Option: ${item.name}; Score: ${item.score}; Status: ${item.status}; Pros: ${(item.tradeoffs?.pros || []).join("; ")}; Cons: ${(item.tradeoffs?.cons || []).join("; ")}; Evidence: ${snippets}`;
    })
    .join("\n");

  const eliminationLine =
    eliminations.length === 0
      ? "No option was eliminated."
      : eliminations.map((item) => `${item.name}: ${item.reason}`).join(" | ");

  const prompt = [
    "You are helping a decision graph engine provide a concise final decision summary.",
    `Question: ${question}`,
    `Winning option: ${best.name} with score ${best.score}`,
    `Eliminations: ${eliminationLine}`,
    "Use only the provided evidence and do not invent facts.",
    "Return 4 short sections: Final Decision, Why It Won, Key Tradeoffs, Caution.",
    "Evidence:",
    evidenceLines
  ].join("\n");

  try {
    const text = await callFeatherless(prompt);
    if (text && text.trim().length > 0) {
      return {
        text: text.trim(),
        provider: "featherless",
        warning: ""
      };
    }

    return {
      text: `Final Decision: ${best.name}. It has the highest evidence-based score (${best.score}) across explored options.`,
      provider: "rules",
      warning: "Featherless returned empty output"
    };
  } catch (err) {
    return {
      text: `Final Decision: ${best.name}. It has the highest evidence-based score (${best.score}) across explored options.`,
      provider: "rules",
      warning: `Featherless unavailable: ${err.message}`
    };
  }
}

export async function runDecisionEngine(question) {
  const options = extractOptionsFromQuestion(question);
  const results = await Promise.all(options.map((option) => evaluateOption(option, question)));

  const best = results.reduce((a, b) => (a.score > b.score ? a : b));
  const eliminations = results
    .filter((item) => item.status === "eliminated")
    .map((item) => ({ name: item.name, reason: item.eliminationReason }));

  const tradeoffs = results.map((item) => ({
    name: item.name,
    pros: item.tradeoffs.pros,
    cons: item.tradeoffs.cons
  }));

  const summary = await generateFinalNarrative(question, results, best, eliminations);

  if (summary.warning) {
    results.forEach((item) => {
      item.warnings = [...(item.warnings || []), summary.warning];
    });
  }

  return {
    question,
    options: results,
    tradeoffs,
    eliminations,
    best,
    finalNarrative: summary.text,
    narrativeProvider: summary.provider,
    graph: {
      name: "Start",
      children: results.map((result) => buildReasoningNode(result))
    }
  };
}