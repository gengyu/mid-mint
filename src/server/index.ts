import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createJobsRouter } from "@/api/jobs.routes";

import { TEMPLATE_CATALOG } from "@/lib/templates/catalog";

import { loadProjectEnv } from "@/lib/config/env";
import { historyStore } from "@/lib/history/store";
import { resolveApiPort } from "@/lib/config/ports";


import { JobsController } from "@/api/jobs.controller";
import { workflowRepositories } from "@/modules/workflow/workflow.repositories";
import { WorkflowOrchestrator } from "@/modules/workflow/orchestrator";
import { WorkflowService } from "@/modules/workflow/workflow.service";
import { BriefGenerator } from "@/modules/brief/brief-generator";
import { DeckGenerator } from "@/modules/deck/deck-generator";
import { Renderer } from "@/modules/render/renderer";
import { Reviewer } from "@/modules/review/reviewer";
import { SourceParser } from "@/modules/source/source-parser";
import { VisualMatch } from "@/modules/visual/visual-match";
import { OpenAiProvider } from "@/lib/llm/openai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..", "..");
const distDir = path.join(rootDir, "dist");
const publicDir = path.join(rootDir, "public");
const storageDir = path.join(rootDir, "storage");
loadProjectEnv(rootDir);

const app = express();
const port = resolveApiPort(process.env);
const llmProvider = new OpenAiProvider();

app.use(cors());
app.use(express.json({ limit: "8mb" }));
app.use(express.static(publicDir));
app.use("/storage", express.static(storageDir));

const workflowOrchestrator = new WorkflowOrchestrator(workflowRepositories, {
  sourceParser: new SourceParser(llmProvider),
  briefGenerator: new BriefGenerator(llmProvider),
  deckGenerator: new DeckGenerator(llmProvider),
  visualMatch: new VisualMatch(llmProvider),
  renderer: new Renderer(),
  reviewer: new Reviewer(llmProvider)
});
const workflowService = new WorkflowService(workflowOrchestrator, workflowRepositories);
const jobsController = new JobsController(workflowService);

app.use("/api", createJobsRouter(jobsController));

app.get("/api/templates", (_req, res) => {
  res.json(TEMPLATE_CATALOG);
});

app.get("/api/history", (_req, res) => {
  res.json(historyStore.list());
});



app.get("/api/llm-health", async (_req, res) => {
  const health = await llmProvider.checkHealth();
  res.status(health.ok ? 200 : 503).json(health);
});





if (process.env.NODE_ENV === "production") {
  app.use(express.static(distDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`mid-mint server listening on http://127.0.0.1:${port}`);
});
