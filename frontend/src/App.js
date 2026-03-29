import React, { useState } from "react";
import Graph from "./Graph";

function App() {
  const [question, setQuestion] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function normalizeResponse(result, questionText) {
    const options = Array.isArray(result?.options) ? result.options : [];
    const tradeoffs = Array.isArray(result?.tradeoffs) ? result.tradeoffs : [];
    const eliminations = Array.isArray(result?.eliminations) ? result.eliminations : [];
    const best = result?.best || options[0] || { name: "No decision", score: 0, source: "unknown" };
    const graph = result?.graph || { name: "Start", children: [] };

    return {
      question: result?.question || questionText,
      options,
      tradeoffs,
      eliminations,
      best,
      graph,
      finalNarrative: result?.finalNarrative || "",
      narrativeProvider: result?.narrativeProvider || "rules"
    };
  }

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("http://localhost:5000/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question })
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result?.error || "Analysis request failed");
      }

      setData(normalizeResponse(result, question));
    } catch (err) {
      console.error(err);
      setData(null);
      setError(err.message || "Backend not connected");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Decision Graph Engine</h2>

      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Enter your question"
      />

      <button onClick={handleSubmit}>Analyze</button>

      {loading && <p>Analyzing...</p>}
      {!loading && error && <p style={{ color: "crimson" }}>{error}</p>}

      {data && (
        <>
          <h3>Final Decision: {data.best?.name || "No decision"}</h3>
          <p>
            Score: {data.best?.score ?? 0} | Source: {data.best?.source || "unknown"}
          </p>

          {data.finalNarrative && (
            <>
              <h4>Final Explanation ({data.narrativeProvider})</h4>
              <p style={{ whiteSpace: "pre-wrap" }}>{data.finalNarrative}</p>
            </>
          )}

          <h4>Options</h4>
          {data.options.length === 0 ? (
            <p>No options generated for this question.</p>
          ) : (
            <ul>
              {data.options.map((option) => (
                <li key={option.name}>
                  <strong>{option.name}</strong> - Score {option.score} - {option.status}
                  {option.evidence?.length > 0 && (
                    <ul>
                      {option.evidence.map((item, index) => (
                        <li key={`${option.name}-evidence-${index}`}>{item}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}

          <h4>Tradeoffs</h4>
          {data.tradeoffs.length === 0 ? (
            <p>No tradeoff data available.</p>
          ) : (
            <ul>
              {data.tradeoffs.map((item) => (
                <li key={`tradeoff-${item.name}`}>
                  <strong>{item.name}</strong>
                  <div>Pros: {(item.pros || []).join(" | ")}</div>
                  <div>Cons: {(item.cons || []).join(" | ")}</div>
                </li>
              ))}
            </ul>
          )}

          <h4>Eliminations</h4>
          {data.eliminations.length === 0 ? (
            <p>No option was eliminated.</p>
          ) : (
            <ul>
              {data.eliminations.map((item) => (
                <li key={`elim-${item.name}`}>
                  <strong>{item.name}</strong>: {item.reason}
                </li>
              ))}
            </ul>
          )}

          {data.options.some((option) => option.warnings?.length > 0) && (
            <>
              <h4>Warnings</h4>
              <ul>
                {data.options
                  .filter((option) => option.warnings?.length > 0)
                  .map((option) => (
                    <li key={`warn-${option.name}`}>
                      <strong>{option.name}</strong>: {option.warnings.join(" | ")}
                    </li>
                  ))}
              </ul>
            </>
          )}

          <h4>Graph/Tree of Reasoning Paths</h4>
          <Graph data={data.graph} />
        </>
      )}
    </div>
  );
}

export default App;