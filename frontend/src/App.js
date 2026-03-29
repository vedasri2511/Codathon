import React, { useState } from "react";
import Graph from "./Graph";
import "./App.css";

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
    <div className="app-shell">
      <div className="app-container">
        <header className="hero-card">
          <h1>Decision Graph Engine</h1>
          <p>Ask a comparison question and get evidence-backed reasoning.</p>

          <div className="input-row">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Try: dl vs ml for jobs and salary"
            />
            <button onClick={handleSubmit} disabled={loading || !question.trim()}>
              {loading ? "Analyzing..." : "Analyze"}
            </button>
          </div>

          {!loading && error && <p className="error-text">{error}</p>}
        </header>

        {data && (
          <div className="results-grid">
            <section className="panel">
              <h2>Final Decision</h2>
              <p className="decision-title">{data.best?.name || "No decision"}</p>
              <p className="muted-text">
                Score: {data.best?.score ?? 0} | Source: {data.best?.source || "unknown"}
              </p>

              {data.finalNarrative && (
                <>
                  <h3>Final Explanation ({data.narrativeProvider})</h3>
                  <p className="narrative-text">{data.finalNarrative}</p>
                </>
              )}
            </section>

            <section className="panel">
              <h2>Options</h2>
              {data.options.length === 0 ? (
                <p className="muted-text">No options generated for this question.</p>
              ) : (
                <ul className="list-block">
                  {data.options.map((option) => (
                    <li key={option.name} className="item-card">
                      <strong>{option.name}</strong>
                      <span className="badge">Score {option.score}</span>
                      <span className={`status ${option.status}`}>{option.status}</span>
                      {option.evidence?.length > 0 && (
                        <ul className="sub-list">
                          {option.evidence.map((item, index) => (
                            <li key={`${option.name}-evidence-${index}`}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel">
              <h2>Tradeoffs</h2>
              {data.tradeoffs.length === 0 ? (
                <p className="muted-text">No tradeoff data available.</p>
              ) : (
                <ul className="list-block">
                  {data.tradeoffs.map((item) => (
                    <li key={`tradeoff-${item.name}`} className="item-card">
                      <strong>{item.name}</strong>
                      <div>Pros: {(item.pros || []).join(" | ")}</div>
                      <div>Cons: {(item.cons || []).join(" | ")}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel">
              <h2>Eliminations</h2>
              {data.eliminations.length === 0 ? (
                <p className="muted-text">No option was eliminated.</p>
              ) : (
                <ul className="list-block">
                  {data.eliminations.map((item) => (
                    <li key={`elim-${item.name}`} className="item-card">
                      <strong>{item.name}</strong>: {item.reason}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {data.options.some((option) => option.warnings?.length > 0) && (
              <section className="panel full-width">
                <h2>Warnings</h2>
                <ul className="list-block">
                  {data.options
                    .filter((option) => option.warnings?.length > 0)
                    .map((option) => (
                      <li key={`warn-${option.name}`} className="item-card warning">
                        <strong>{option.name}</strong>: {option.warnings.join(" | ")}
                      </li>
                    ))}
                </ul>
              </section>
            )}

            <section className="panel full-width">
              <h2>Graph / Reasoning Tree</h2>
              <Graph data={data.graph} />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;