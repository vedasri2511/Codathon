import React from "react";
import ReactFlow from "reactflow";
import "reactflow/dist/style.css";

function Graph({ data }) {
  const nodes = [
    { id: "start", data: { label: "Start" }, position: { x: 250, y: 0 } }
  ];

  const edges = [];

  data.children.forEach((child, i) => {
    nodes.push({
      id: child.name,
      data: { label: `${child.name} (${child.score})` },
      position: { x: i * 200, y: 150 },
      style: {
        background: child.status === "eliminated" ? "red" : "lightgreen"
      }
    });

    edges.push({
      id: `e-${i}`,
      source: "start",
      target: child.name
    });
  });

  return (
    <div style={{ height: 400 }}>
      <ReactFlow nodes={nodes} edges={edges} />
    </div>
  );
}

export default Graph;