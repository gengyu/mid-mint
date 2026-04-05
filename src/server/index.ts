import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createJobsRouter } from "@/api/jobs.routes";
import { generatePoster } from "@/lib/pipeline/generate-poster";
import { TEMPLATE_CATALOG } from "@/lib/templates/catalog";
import type { HistoryEntry } from "@/lib/templates/types";
import { loadProjectEnv } from "@/lib/config/env";
import { historyStore } from "@/lib/history/store";
import { resolveApiPort } from "@/lib/config/ports";
import { createId } from "@/lib/utils/id";
import { generateXhsDeck } from "@/lib/xhs/generate-deck";
import { xhsHistoryStore } from "@/lib/xhs/history-store";
import type { XhsDeckHistoryEntry } from "@/lib/xhs/types";
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

app.use(cors());
app.use(express.json({ limit: "8mb" }));
app.use(express.static(publicDir));
app.use("/storage", express.static(storageDir));

const workflowOrchestrator = new WorkflowOrchestrator(workflowRepositories, {
  sourceParser: new SourceParser(),
  briefGenerator: new BriefGenerator(),
  deckGenerator: new DeckGenerator(),
  visualMatch: new VisualMatch(),
  renderer: new Renderer(),
  reviewer: new Reviewer()
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

app.get("/api/xhs-history", (_req, res) => {
  res.json(xhsHistoryStore.list());
});

app.get("/api/llm-health", async (_req, res) => {
  const provider = new OpenAiProvider();
  const health = await provider.checkHealth();
  res.status(health.ok ? 200 : 503).json(health);
});

app.post("/api/generate", async (req, res) => {
  try {
    const result = await generatePoster(req.body);
    const entry: HistoryEntry = {
      id: createId("history"),
      prompt: String(req.body?.prompt || ""),
      templateId: result.templateId,
      values: result.values,
      svg: result.svg,
      backgroundUrl: result.backgroundUrl,
      backgroundPrompt: result.backgroundPrompt,
      createdAt: new Date().toISOString()
    };

    historyStore.save(entry);
    res.json({
      ...result,
      historyEntry: entry
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generate failed.";
    res.status(400).json({ message });
  }
});

app.post("/api/generate-xhs", async (req, res) => {
  const requestStartedAt = Date.now();
  try {
    const result = await generateXhsDeck(req.body);
    console.log(
      `[xhs] generated "${result.topic}" in ${Date.now() - requestStartedAt}ms`,
      result.logs.map((item) => `${item.stage}:${item.status}:${item.durationMs ?? 0}ms`).join(" | ")
    );
    const entry: XhsDeckHistoryEntry = {
      id: createId("xhs"),
      kind: "deck",
      prompt: result.prompt,
      topic: result.topic,
      slideCount: result.slideCount,
      summary: result.summary,
      slides: result.slides,
      sources: result.sources,
      outputDir: result.outputDir,
      htmlPath: result.htmlPath,
      createdAt: result.createdAt,
      logs: result.logs
    };

    xhsHistoryStore.save(entry);
    res.json({
      ...result,
      historyEntry: entry
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Deck generate failed.";
    console.error(`[xhs] generate failed in ${Date.now() - requestStartedAt}ms: ${message}`);
    res.status(400).json({ message });
  }
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
