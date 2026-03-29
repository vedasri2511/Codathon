import React from "react";
import ReactFlow from "reactflow";
import "reactflow/dist/style.css";

const X_GAP = 230;
const Y_GAP = 130;

function buildGraphElements(tree) {
  const nodes = [];
  const edges = [];
  let cursor = 0;

  const safeTree = tree && typeof tree === "object" ? tree : { name: "Start", children: [] };

  function walk(node, depth, parentId) {
    const nodeId = `${parentId || "root"}-${nodes.length}`;
    let x;
    const children = Array.isArray(node.children) ? node.children : [];

    if (children.length === 0) {
      x = cursor * X_GAP;
      cursor += 1;
    } else {
      const childXValues = children.map((child) => walk(child, depth + 1, nodeId));
      x = childXValues.reduce((sum, value) => sum + value, 0) / childXValues.length;
    }

    const baseStyle = {
      border: "1px solid #223",
      borderRadius: 8,
      minWidth: 120,
      background: "#f4f6f8"
    };

    if (node.status === "considered") {
      baseStyle.background = "#c8f7c5";
    }

    if (node.status === "eliminated") {
      baseStyle.background = "#ffb3b3";
    }

    nodes.push({
      id: nodeId,
      data: { label: node.name || "Path" },
      position: { x, y: depth * Y_GAP },
      style: baseStyle
    });

    if (parentId) {
      edges.push({
        id: `e-${parentId}-${nodeId}`,
        source: parentId,
        target: nodeId
      });
    }

    return x;
  }

  walk(safeTree, 0, null);
  return { nodes, edges };
}

function Graph({ data }) {
  const { nodes, edges } = buildGraphElements(data);

  return (
    <div
      style={{
        height: 520,
        border: "1px solid #d7dde7",
        borderRadius: 12,
        overflow: "hidden",
        background: "#fbfdff"
      }}
    >
      <ReactFlow nodes={nodes} edges={edges} fitView />
    </div>
  );
}

export default Graph;