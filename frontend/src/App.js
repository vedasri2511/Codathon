import React, { useState } from "react";
import Graph from "./Graph";

function App() {
  const [question, setQuestion] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const res = await fetch("http://localhost:5000/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question })
      });

      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error(err);
      alert("Backend not connected");
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

      {data && (
        <>
          <h3>Final Decision: {data.best.name}</h3>
          <Graph data={data.graph} />
        </>
      )}
    </div>
  );
}

export default App;