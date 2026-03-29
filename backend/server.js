import express from "express";
import cors from "cors";
import { runDecisionEngine } from "./services/decisionEngine.js";

const app = express();

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

app.listen(5000, () => console.log("Server running on port 5000"));