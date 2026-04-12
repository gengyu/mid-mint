import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

type JobStatus =
  | "INPUT_RECEIVED"
  | "PARSED"
  | "BRIEFED"
  | "DECK_GENERATED"
  | "VISUAL_MATCHED"
  | "RENDERED"
  | "REVIEWED"
  | "APPROVED"
  | "REWRITE_PENDING"
  | "FAILED";

type RewriteStage = "source-parse" | "brief" | "deck" | "visual";
type AppPage = "create" | "workspace" | "preview" | "export";

type SourceInput = {
  urls: string[];
  rawText: string;
  notes: string;
  targetAudience: string;
  contentGoal: string;
  preferredStyle: string;
};

type JobSummary = {
  jobId: string;
  status: JobStatus;
  rewriteCount: number;
  activeVersion: number;
  createdAt: string;
  updatedAt: string;
};

type ReviewResult = {
  score: number;
  issues: string[];
  strengths: string[];
  blockingIssues: string[];
  suggestedFixes: string[];
  decision: "approve" | "rewrite" | "block";
  rewriteStage: RewriteStage | null;
  stageScores: Record<string, number>;
};

type VisualSpec = {
  routeId: string;
  themeCategory: string;
  visualFamily: string;
  tone: string;
  densityLevel: string;
  layoutMode: string;
  paletteKey: string;
  typographyMode: string;
  decorationLevel: string;
  imageStrategy: string;
  routeReasons: string[];
  warnings: string[];
};

type VersionPayload = {
  job: JobSummary | null;
  sourceInput: SourceInput | null;
  parsedSource: Record<string, unknown> | null;
  contentBrief: Record<string, unknown> | null;
  deckPlan: {
    summary: string;
    slides: Array<{
      index: number;
      pageType: string;
      title: string;
      body: string;
      templateId: string;
      highlights: string[];
    }>;
    cta: string;
  } | null;
  visualSpec: VisualSpec | null;
  renderResult: {
    htmlPreviewUrl: string;
    pngUrls: string[];
    svgUrls: string[];
    assets: Array<{
      slideIndex: number;
      pngUrl: string;
      svgUrl: string;
      overflowDetected: boolean;
    }>;
  } | null;
  reviewResult: ReviewResult | null;
  stageMeta?: Array<{
    stageName: JobStatus;
    usedLlm: boolean;
    model: string | null;
    usedFallback: boolean;
    durationMs: number;
    errorCode: string | null;
  }>;
};

type PreviewPayload = {
  jobId: string;
  activeVersion: number;
  htmlPreviewUrl: string;
  pngUrls: string[];
  svgUrls: string[];
};

type ExportPayload = {
  jobId: string;
  activeVersion: number;
  format: "png" | "svg" | "html";
  downloadUrl: string;
};

const stageOrder: JobStatus[] = [
  "INPUT_RECEIVED",
  "PARSED",
  "BRIEFED",
  "DECK_GENERATED",
  "VISUAL_MATCHED",
  "RENDERED",
  "REVIEWED",
  "APPROVED"
];

const previewReadyStatuses: JobStatus[] = [
  "RENDERED",
  "REVIEWED",
  "APPROVED",
  "REWRITE_PENDING"
];

const pages: Array<{ id: AppPage; label: string }> = [
  { id: "create", label: "Job Creation" },
  { id: "workspace", label: "Workspace" },
  { id: "preview", label: "Preview" },
  { id: "export", label: "Export" }
];

const initialForm = {
  urls: "",
  rawText: "",
  notes: "",
  targetAudience: "",
  contentGoal: "",
  preferredStyle: ""
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

async function readJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || body?.code || "Request failed.");
  }

  return body as T;
}

function derivePageFromHash(): AppPage {
  const hash = window.location.hash.replace(/^#/, "");
  return pages.some((page) => page.id === hash) ? (hash as AppPage) : "create";
}

function canFetchPreview(status: JobStatus | null | undefined) {
  return Boolean(status && previewReadyStatuses.includes(status));
}

export function App() {
  const [page, setPage] = useState<AppPage>(() => derivePageFromHash());
  const [form, setForm] = useState(initialForm);
  const [job, setJob] = useState<JobSummary | null>(null);
  const [selectedVersion, setSelectedVersion] = useState(1);
  const [versionPayload, setVersionPayload] = useState<VersionPayload | null>(null);
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [exportLinks, setExportLinks] = useState<Partial<Record<"png" | "svg" | "html", string>>>({});
  const [rewriteStage, setRewriteStage] = useState<RewriteStage>("deck");
  const [rewriteReason, setRewriteReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunningWorkflow, setIsRunningWorkflow] = useState(false);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [runElapsedSeconds, setRunElapsedSeconds] = useState(0);
  const [isPending, startTransition] = useTransition();

  const versionOptions = useMemo(() => {
    if (!job) {
      return [];
    }

    return Array.from({ length: job.activeVersion }, (_, index) => job.activeVersion - index);
  }, [job]);

  const activeStageIndex = useMemo(() => {
    if (!job) {
      return -1;
    }

    return stageOrder.indexOf(job.status === "REWRITE_PENDING" ? "REVIEWED" : job.status);
  }, [job]);

  const isWorkflowActive = useMemo(() => {
    return Boolean(job && ["INPUT_RECEIVED", "PARSED", "BRIEFED", "DECK_GENERATED", "VISUAL_MATCHED", "RENDERED"].includes(job.status));
  }, [job]);

  useEffect(() => {
    function handleHashChange() {
      setPage(derivePageFromHash());
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigate = useCallback((nextPage: AppPage) => {
    window.location.hash = nextPage;
    setPage(nextPage);
  }, []);

  const refreshJob = useCallback(async (jobId: string, version: number) => {
    const [jobSummary, versionData] = await Promise.all([
      readJson<JobSummary>(`/api/jobs/${jobId}`),
      readJson<VersionPayload>(`/api/jobs/${jobId}/versions/${version}`)
    ]);

    setJob(jobSummary);
    setVersionPayload(versionData);

    if (!canFetchPreview(jobSummary.status)) {
      setPreview(null);
      return;
    }

    try {
      const previewData = await readJson<PreviewPayload>(`/api/jobs/${jobId}/preview`);
      setPreview(previewData);
    } catch {
      setPreview(null);
    }
  }, []);

  useEffect(() => {
    if (!job?.jobId) {
      return;
    }

    void (async () => {
      try {
        await refreshJob(job.jobId, selectedVersion);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Load failed.");
      }
    })();
  }, [job?.jobId, refreshJob, selectedVersion]);

  useEffect(() => {
    if (!isRunningWorkflow || !job?.jobId) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshJob(job.jobId, selectedVersion).catch(() => undefined);
    }, 1500);

    return () => window.clearInterval(timer);
  }, [isRunningWorkflow, job?.jobId, refreshJob, selectedVersion]);

  useEffect(() => {
    if (!isRunningWorkflow || !job) {
      return;
    }

    if (!isWorkflowActive) {
      setIsRunningWorkflow(false);
      setRunStartedAt(null);
    }
  }, [isRunningWorkflow, isWorkflowActive, job]);

  useEffect(() => {
    if (!isRunningWorkflow || !runStartedAt) {
      return;
    }

    const timer = window.setInterval(() => {
      setRunElapsedSeconds(Math.max(0, Math.round((Date.now() - runStartedAt) / 1000)));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRunningWorkflow, runStartedAt]);

  function updateField(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleCreateJob() {
    setError(null);
    setMessage(null);

    startTransition(() => {
      void (async () => {
        try {
          const created = await readJson<{ jobId: string; status: JobStatus; activeVersion: number }>("/api/jobs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              urls: form.urls
                .split(/\n|,/)
                .map((item) => item.trim())
                .filter(Boolean),
              rawText: form.rawText,
              notes: form.notes,
              targetAudience: form.targetAudience,
              contentGoal: form.contentGoal,
              preferredStyle: form.preferredStyle
            })
          });
          setSelectedVersion(created.activeVersion);
          await refreshJob(created.jobId, created.activeVersion);
          setMessage("Job created.");
          navigate("workspace");
        } catch (requestError) {
          setError(requestError instanceof Error ? requestError.message : "Create job failed.");
        }
      })();
    });
  }

  async function handleRunJob() {
    if (!job) {
      return;
    }

    setError(null);
    setMessage("Workflow is running. Stage outputs will refresh automatically.");
    setIsRunningWorkflow(true);
    setRunStartedAt(Date.now());
    setRunElapsedSeconds(0);
    navigate("workspace");
    startTransition(() => {
      void (async () => {
        try {
          await readJson(`/api/jobs/${job.jobId}/run`, { method: "POST" });
          await refreshJob(job.jobId, job.activeVersion);
          setMessage("Workflow started. Stage outputs will keep refreshing.");
        } catch (requestError) {
          setError(requestError instanceof Error ? requestError.message : "Run failed.");
          setIsRunningWorkflow(false);
          setRunStartedAt(null);
          setRunElapsedSeconds(0);
        }
      })();
    });
  }

  async function handleRewrite() {
    if (!job) {
      return;
    }

    setError(null);
    setMessage(null);
    startTransition(() => {
      void (async () => {
        try {
          const rewriteResponse = await readJson<{ nextVersion: number }>(`/api/jobs/${job.jobId}/rewrite`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              targetStage: rewriteStage,
              reason: rewriteReason
            })
          });

          setIsRunningWorkflow(true);
          setRunStartedAt(Date.now());
          setRunElapsedSeconds(0);
          setMessage(`Rewrite started for version ${rewriteResponse.nextVersion}. Stage outputs will keep refreshing.`);
          await readJson(`/api/jobs/${job.jobId}/run`, { method: "POST" });
          setSelectedVersion(rewriteResponse.nextVersion);
          await refreshJob(job.jobId, rewriteResponse.nextVersion);
          setMessage(`Rewrite is running for version ${rewriteResponse.nextVersion}.`);
          navigate("workspace");
        } catch (requestError) {
          setError(requestError instanceof Error ? requestError.message : "Rewrite failed.");
          setIsRunningWorkflow(false);
          setRunStartedAt(null);
          setRunElapsedSeconds(0);
        }
      })();
    });
  }

  async function handleExport(format: "png" | "svg" | "html") {
    if (!job) {
      return;
    }

    setError(null);
    try {
      const exported = await readJson<ExportPayload>(`/api/jobs/${job.jobId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format })
      });

      setExportLinks((current) => ({
        ...current,
        [format]: exported.downloadUrl
      }));
      setMessage(`${format.toUpperCase()} export ready.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Export failed.");
    }
  }

  const slideTemplateSummary = versionPayload?.deckPlan?.slides ?? [];
  const visualSpec = versionPayload?.visualSpec;
  const latestStageMeta = versionPayload?.stageMeta?.[versionPayload.stageMeta.length - 1] ?? null;
  const runStatusLabel = isRunningWorkflow
    ? `Running ${job?.status || "workflow"}${runStartedAt ? ` · ${runElapsedSeconds}s` : ""}`
    : job?.status
      ? `Ready · ${job.status}`
      : "No active workflow";

  return (
    <div className="app-shell">
      <aside className="panel hero-panel">
        <div>
          <p className="eyebrow">MID-MINT V1</p>
          <h1>Stage-Based Xiaohongshu Deck Workspace</h1>
          <p className="intro">我们把创建、工作区、预览和导出拆成了清晰的 4 个页面视图。</p>
        </div>

        <nav className="page-nav" aria-label="Primary pages">
          {pages.map((item) => (
            <button
              key={item.id}
              type="button"
              className={classNames("page-tab", page === item.id && "active")}
              onClick={() => navigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="job-summary-card">
          <strong>{job?.jobId || "No active job"}</strong>
          <span>Status: {job?.status || "-"}</span>
          <span>Version: {job?.activeVersion || "-"}</span>
        </div>

        <div className={classNames("run-status-card", isRunningWorkflow && "running")}>
          <strong>{runStatusLabel}</strong>
          <span>
            Current stage: {job?.status || "-"}
          </span>
          {latestStageMeta ? (
            <span>
              Last completed: {latestStageMeta.stageName}
              {latestStageMeta.model ? ` · ${latestStageMeta.model}` : ""}
              {latestStageMeta.usedFallback ? " · fallback" : ""}
            </span>
          ) : (
            <span>Click Run Workflow to start processing.</span>
          )}
        </div>

        <div className="button-row">
          <button className="primary" type="button" onClick={handleRunJob} disabled={!job || isPending || isRunningWorkflow}>
            {isRunningWorkflow ? "Running Workflow..." : "Run Workflow"}
          </button>
          <button className="ghost" type="button" onClick={() => navigate("preview")} disabled={!preview}>
            Open Preview
          </button>
        </div>

        {message ? <p className="notice success">{message}</p> : null}
        {error ? <p className="notice error">{error}</p> : null}
      </aside>

      <main className="workspace">
        {page === "create" ? (
          <section className="panel page-panel">
            <SectionHeader eyebrow="JOB CREATION" title="Create A New Job" />
            <div className="form-grid">
              <label>
                URLs
                <textarea value={form.urls} onChange={(event) => updateField("urls", event.target.value)} placeholder="一行一个 URL，可留空" />
              </label>
              <label>
                Raw Text
                <textarea value={form.rawText} onChange={(event) => updateField("rawText", event.target.value)} placeholder="粘贴原始资料" />
              </label>
              <label>
                Notes
                <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="补充约束、场景、目标" />
              </label>
              <label>
                Target Audience
                <input value={form.targetAudience} onChange={(event) => updateField("targetAudience", event.target.value)} placeholder="例如 AI 产品经理" />
              </label>
              <label>
                Content Goal
                <input value={form.contentGoal} onChange={(event) => updateField("contentGoal", event.target.value)} placeholder="例如 快速看懂这条消息的影响" />
              </label>
              <label>
                Preferred Style
                <input value={form.preferredStyle} onChange={(event) => updateField("preferredStyle", event.target.value)} placeholder="例如 专业、短句、偏科技" />
              </label>
            </div>
            <div className="button-row">
              <button className="primary" type="button" onClick={handleCreateJob} disabled={isPending}>
                Create Job
              </button>
            </div>
          </section>
        ) : null}

        {page === "workspace" ? (
          <section className="panel page-panel">
            <SectionHeader eyebrow="WORKSPACE" title="Stage Outputs And Review" />

            <div className="stage-track">
              {stageOrder.map((stage, index) => (
                <div
                  key={stage}
                  className={classNames(
                    "stage-pill",
                    index <= activeStageIndex && "active",
                    isRunningWorkflow && job?.status === stage && "live"
                  )}
                >
                  {stage}
                </div>
              ))}
            </div>

            {isRunningWorkflow ? (
              <div className="progress-banner">
                <div className="progress-dot" aria-hidden="true" />
                <div>
                  <strong>Workflow in progress</strong>
                  <p>
                    We are running stage <code>{job?.status || "INPUT_RECEIVED"}</code> and auto-refreshing the workspace.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="toolbar">
              <label>
                Version
                <select value={selectedVersion} onChange={(event) => setSelectedVersion(Number(event.target.value))} disabled={!job}>
                  {versionOptions.map((version) => (
                    <option key={version} value={version}>
                      v{version}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Rewrite Stage
                <select value={rewriteStage} onChange={(event) => setRewriteStage(event.target.value as RewriteStage)}>
                  <option value="source-parse">source-parse</option>
                  <option value="brief">brief</option>
                  <option value="deck">deck</option>
                  <option value="visual">visual</option>
                </select>
              </label>
              <input value={rewriteReason} onChange={(event) => setRewriteReason(event.target.value)} placeholder="rewrite reason" />
              <button className="ghost" type="button" onClick={handleRewrite} disabled={!job || isPending}>
                Rewrite And Rerun
              </button>
            </div>

            <div className="workspace-layout">
              <div className="json-grid">
                <JsonCard title="Source Input" data={versionPayload?.sourceInput} />
                <JsonCard title="Parsed Source" data={versionPayload?.parsedSource} />
                <JsonCard title="Content Brief" data={versionPayload?.contentBrief} />
                <JsonCard title="Deck Plan" data={versionPayload?.deckPlan} />
                <JsonCard title="Visual Spec" data={versionPayload?.visualSpec} />
                <article className="card-block">
                  <h3>Visual Route Summary</h3>
                  {visualSpec ? (
                    <div>
                      <p>themeCategory: {visualSpec.themeCategory}</p>
                      <p>visualFamily: {visualSpec.visualFamily}</p>
                      <p>tone: {visualSpec.tone}</p>
                      <p>densityLevel: {visualSpec.densityLevel}</p>
                      <p>layoutMode: {visualSpec.layoutMode}</p>
                      <p>routeId: {visualSpec.routeId}</p>
                      <p>routeReasons: {visualSpec.routeReasons.join(", ") || "-"}</p>
                      <p>warnings: {visualSpec.warnings.join(", ") || "-"}</p>
                    </div>
                  ) : (
                    <p className="empty-copy">No visual route yet.</p>
                  )}
                </article>
                <article className="card-block">
                  <h3>Resolved Templates</h3>
                  {slideTemplateSummary.length ? (
                    <ul>
                      {slideTemplateSummary.map((slide) => (
                        <li key={slide.index}>
                          Slide {slide.index} · {slide.pageType} · {slide.templateId}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="empty-copy">No slide templates yet.</p>
                  )}
                </article>
                <article className="card-block">
                  <h3>Stage Meta</h3>
                  {versionPayload?.stageMeta?.length ? (
                    <ul className="meta-list">
                      {versionPayload.stageMeta.map((meta) => (
                        <li key={meta.stageName}>
                          <strong>{meta.stageName}</strong>
                          <span>{meta.model || "deterministic"}</span>
                          <span>{meta.usedFallback ? "fallback" : meta.usedLlm ? "llm" : "local"}</span>
                          <span>{meta.durationMs}ms</span>
                          <span>{meta.errorCode || "ok"}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="empty-copy">No stage execution metadata yet.</p>
                  )}
                </article>
              </div>
              <div className="review-column">
                <div className="review-badge-large">{versionPayload?.reviewResult?.decision || "-"}</div>
                {versionPayload?.reviewResult ? (
                  <div className="review-grid">
                    <div className="score-card">
                      <span>Total Score</span>
                      <strong>{versionPayload.reviewResult.score}</strong>
                    </div>
                    <JsonCard title="Stage Scores" data={versionPayload.reviewResult.stageScores} compact />
                    <ListCard title="Strengths" items={versionPayload.reviewResult.strengths} />
                    <ListCard title="Issues" items={versionPayload.reviewResult.issues} />
                    <ListCard title="Blocking Issues" items={versionPayload.reviewResult.blockingIssues} />
                    <ListCard title="Suggested Fixes" items={versionPayload.reviewResult.suggestedFixes} />
                  </div>
                ) : (
                  <EmptyBlock text="运行完成后这里会展示 review score 和问题列表。" />
                )}
              </div>
            </div>
          </section>
        ) : null}

        {page === "preview" ? (
          <section className="panel page-panel">
            <SectionHeader eyebrow="PREVIEW" title="Rendered Asset Preview" />
            {preview?.htmlPreviewUrl ? (
              <div className="button-row">
                <a className="ghost link-button" href={preview.htmlPreviewUrl} target="_blank" rel="noreferrer">
                  Open HTML Preview
                </a>
              </div>
            ) : null}

            <div className="json-grid">
              <article className="card-block compact">
                <h3>Deck Route Label</h3>
                <p>{visualSpec ? `${visualSpec.visualFamily} · ${visualSpec.themeCategory} · ${visualSpec.densityLevel}` : "No route"}</p>
                <p>tone: {visualSpec?.tone || "-"}</p>
                <p>warnings: {visualSpec?.warnings.join(", ") || "-"}</p>
              </article>
            </div>

            {versionPayload?.renderResult?.assets?.length ? (
              <div className="asset-grid">
                {versionPayload.renderResult.assets.map((asset) => (
                  <article key={asset.slideIndex} className="asset-card">
                    <div className="asset-head">
                      <strong>Slide {asset.slideIndex}</strong>
                      {asset.overflowDetected ? <span className="warning-chip">Overflow</span> : null}
                    </div>
                    <p>
                      Template:{" "}
                      {versionPayload.deckPlan?.slides.find((slide) => slide.index === asset.slideIndex)?.templateId || "-"}
                    </p>
                    <img src={asset.svgUrl} alt={`slide ${asset.slideIndex}`} />
                    <div className="asset-links">
                      <a href={asset.svgUrl} target="_blank" rel="noreferrer">
                        SVG
                      </a>
                      <a href={asset.pngUrl} target="_blank" rel="noreferrer">
                        PNG
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyBlock text="还没有 preview 数据，先创建 job 并运行 workflow。" />
            )}
          </section>
        ) : null}

        {page === "export" ? (
          <section className="panel page-panel">
            <SectionHeader eyebrow="EXPORT" title="Export Active Version" />
            <div className="button-row">
              <button className="ghost" type="button" onClick={() => handleExport("png")} disabled={!job}>
                Export PNG
              </button>
              <button className="ghost" type="button" onClick={() => handleExport("svg")} disabled={!job}>
                Export SVG
              </button>
              <button className="ghost" type="button" onClick={() => handleExport("html")} disabled={!job}>
                Export HTML
              </button>
            </div>

            <div className="export-links">
              {(["png", "svg", "html"] as const).map((format) =>
                exportLinks[format] ? (
                  <a key={format} className="export-link-card" href={exportLinks[format]} target="_blank" rel="noreferrer">
                    Download {format.toUpperCase()}
                  </a>
                ) : null
              )}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function SectionHeader(props: { eyebrow: string; title: string }) {
  return (
    <div className="section-head">
      <div>
        <p className="eyebrow">{props.eyebrow}</p>
        <h2>{props.title}</h2>
      </div>
    </div>
  );
}

function JsonCard(props: { title: string; data: unknown; compact?: boolean }) {
  return (
    <article className={classNames("card-block", props.compact && "compact")}>
      <h3>{props.title}</h3>
      <pre>{props.data ? JSON.stringify(props.data, null, 2) : "No data"}</pre>
    </article>
  );
}

function ListCard(props: { title: string; items: string[] }) {
  return (
    <article className="card-block">
      <h3>{props.title}</h3>
      {props.items.length ? (
        <ul>
          {props.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="empty-copy">No items.</p>
      )}
    </article>
  );
}

function EmptyBlock(props: { text: string }) {
  return <div className="empty-block">{props.text}</div>;
}
