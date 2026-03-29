import express from "express";
import cors from "cors";
import { runDecisionEngine } from "./services/decisionEngine.js";

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json());

app.post("/analyze", async (req, res) => {
  try {
    console.log("Request:", req.body);

    const { question } = req.body;
    const result = await runDecisionEngine(question);

    res.json(result);
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the existing backend process or change PORT.`);
    process.exit(1);
  }
  console.error("Server failed to start:", err.message);
  process.exit(1);
});