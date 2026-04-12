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

type AppPage = "tasks" | "create";

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
  runtimeStatus?: "running" | "waiting_signal" | "completed" | "failed" | "legacy_fallback" | null;
  currentStage?: JobStatus | null;
  runtimeVersion?: number | null;
  temporalMode?: "disabled" | "ready" | "error";
  temporalError?: string | null;
  lastErrorCode?: string | null;
  pendingRewrite?: boolean;
};

type ReviewResult = {
  score: number;
  issues: string[];
  strengths: string[];
  blockingIssues: string[];
  suggestedFixes: string[];
  decision: "approve" | "rewrite" | "block";
  rewriteStage: string | null;
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

type StageMeta = {
  stageName: JobStatus;
  status: "success" | "error";
  startedAt: string;
  finishedAt: string;
  usedLlm: boolean;
  llmAttempted: boolean;
  model: string | null;
  usedFallback: boolean;
  retryOccurred: boolean;
  durationMs: number;
  errorCode: string | null;
  errorMessage: string | null;
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
      goal?: string;
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
  stageMeta?: StageMeta[];
};

const pages: Array<{ id: AppPage; label: string }> = [
  { id: "tasks", label: "任务列表" },
  { id: "create", label: "新建任务" }
];

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

const stageCopy: Record<JobStatus, { title: string; description: string; recovery: string }> = {
  INPUT_RECEIVED: {
    title: "接收输入",
    description: "保存链接、原文、备注和目标，建立任务版本。",
    recovery: "任务元数据已持久化，进程中断后可以从当前版本继续读取状态。"
  },
  PARSED: {
    title: "解析素材",
    description: "把原始输入清洗成标题、事实点、风险点和可复用素材。",
    recovery: "解析失败会记录错误码；超时或模型异常时可回退到本地兜底逻辑。"
  },
  BRIEFED: {
    title: "生成 Brief",
    description: "整理叙事角度、目标受众、核心观点和写作约束。",
    recovery: "Brief 会单独存档，后续步骤可复用成功结果，不需要整条链路重跑。"
  },
  DECK_GENERATED: {
    title: "生成脚本",
    description: "把 brief 转成多页 deck 结构、页面目标、标题和正文。",
    recovery: "脚本阶段失败不会污染前序产物，恢复后可以直接继续下游编排。"
  },
  VISUAL_MATCHED: {
    title: "匹配视觉",
    description: "结合内容类型、密度和风格，确定模板路线和视觉配置。",
    recovery: "视觉决策和模板绑定会保存在当前版本，恢复后无需重新解析素材。"
  },
  RENDERED: {
    title: "渲染预览",
    description: "输出 SVG、PNG 和 HTML 预览资源，并检测溢出风险。",
    recovery: "已经生成的资源会保留在本地存储，重载页面后依然能直接查看。"
  },
  REVIEWED: {
    title: "审核结果",
    description: "汇总评分、问题、亮点和建议，决定通过或拦截。",
    recovery: "审核结果会写入版本记录，方便后续排查失败原因和人工复核。"
  },
  APPROVED: {
    title: "完成通过",
    description: "任务全部执行完成，当前版本可直接交付使用。",
    recovery: "最终状态已落盘，页面刷新后仍能看到完整详情和产物。"
  },
  REWRITE_PENDING: {
    title: "等待重跑",
    description: "当前版本等待新的重跑动作。",
    recovery: "保留已有阶段产物，避免重复计算。"
  },
  FAILED: {
    title: "执行失败",
    description: "阶段执行中断，等待查看错误并处理。",
    recovery: "错误码和阶段日志会保留，便于恢复时定位问题。"
  }
};

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
  return pages.some((page) => page.id === hash) ? (hash as AppPage) : "tasks";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}

function formatDuration(durationMs: number | null | undefined) {
  if (!durationMs && durationMs !== 0) {
    return "-";
  }

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1000).toFixed(durationMs >= 10_000 ? 0 : 1)}s`;
}

export function App() {
  const [page, setPage] = useState<AppPage>(() => derivePageFromHash());
  const [form, setForm] = useState(initialForm);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState(1);
  const [jobDetail, setJobDetail] = useState<JobSummary | null>(null);
  const [versionPayload, setVersionPayload] = useState<VersionPayload | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedJob = useMemo(
    () => jobs.find((item) => item.jobId === selectedJobId) ?? jobDetail,
    [jobDetail, jobs, selectedJobId]
  );

  const versionOptions = useMemo(() => {
    if (!selectedJob) {
      return [];
    }

    return Array.from({ length: selectedJob.activeVersion }, (_, index) => selectedJob.activeVersion - index);
  }, [selectedJob]);

  const runningJobs = useMemo(
    () => jobs.filter((item) => item.runtimeStatus === "running"),
    [jobs]
  );

  const activeStage = selectedJob?.currentStage ?? (selectedJob?.status === "REWRITE_PENDING" ? "REVIEWED" : selectedJob?.status) ?? null;

  const refreshJobs = useCallback(async () => {
    const items = await readJson<JobSummary[]>("/api/jobs");
    setJobs(items);
    setSelectedJobId((current) => current ?? items[0]?.jobId ?? null);
  }, []);

  const refreshDetail = useCallback(async (jobId: string, version: number) => {
    const [jobSummary, versionData] = await Promise.all([
      readJson<JobSummary>(`/api/jobs/${jobId}`),
      readJson<VersionPayload>(`/api/jobs/${jobId}/versions/${version}`)
    ]);

    setJobDetail(jobSummary);
    setVersionPayload(versionData);
    setSelectedVersion(version);
  }, []);

  useEffect(() => {
    function handleHashChange() {
      setPage(derivePageFromHash());
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    void refreshJobs().catch(() => undefined);
  }, [refreshJobs]);

  useEffect(() => {
    if (!selectedJobId) {
      setJobDetail(null);
      setVersionPayload(null);
      return;
    }

    void refreshDetail(selectedJobId, selectedVersion).catch((requestError) => {
      setError(requestError instanceof Error ? requestError.message : "加载任务详情失败。");
    });
  }, [refreshDetail, selectedJobId, selectedVersion]);

  useEffect(() => {
    if (!jobs.some((item) => item.runtimeStatus === "running")) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshJobs().catch(() => undefined);
      if (selectedJobId) {
        void refreshDetail(selectedJobId, selectedVersion).catch(() => undefined);
      }
    }, 1500);

    return () => window.clearInterval(timer);
  }, [jobs, refreshDetail, refreshJobs, selectedJobId, selectedVersion]);

  function navigate(nextPage: AppPage) {
    window.location.hash = nextPage;
    setPage(nextPage);
  }

  function updateField(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSelectJob(job: JobSummary) {
    setSelectedJobId(job.jobId);
    setSelectedVersion(job.activeVersion);
    setError(null);
  }

  async function handleCreateJob() {
    setError(null);
    setMessage(null);

    startTransition(() => {
      void (async () => {
        try {
          const created = await readJson<{ jobId: string; activeVersion: number }>("/api/jobs", {
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

          setForm(initialForm);
          setSelectedJobId(created.jobId);
          await refreshJobs();
          await refreshDetail(created.jobId, created.activeVersion);
          setMessage("任务已创建，工作流已经自动开始。");
          navigate("tasks");
        } catch (requestError) {
          setError(requestError instanceof Error ? requestError.message : "创建任务失败。");
        }
      })();
    });
  }

  const stageMetaMap = useMemo(() => {
    const rows = versionPayload?.stageMeta ?? [];
    return new Map(rows.map((item) => [item.stageName, item]));
  }, [versionPayload?.stageMeta]);

  const taskHealth = getTaskHealth(selectedJob);

  return (
    <div className="app-shell">
      <aside className="panel hero-panel">
        <div>
          <p className="eyebrow">MID-MINT</p>
          <h1>任务管理台</h1>
          <p className="intro">默认打开任务列表，左边看任务，右边看每一步详情和产物。</p>
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
          <strong>总任务数 {jobs.length}</strong>
          <span>运行中 {runningJobs.length}</span>
          <span>当前任务 {selectedJob?.jobId || "-"}</span>
          <span>当前版本 v{selectedJob?.activeVersion || "-"}</span>
        </div>

        <div className={classNames("run-status-card", selectedJob?.runtimeStatus === "running" && "running")}>
          <strong>{taskHealth.title}</strong>
          <span>{taskHealth.summary}</span>
          <span>运行态: {selectedJob?.runtimeStatus || "-"}</span>
          <span>当前步骤: {activeStage || "-"}</span>
          <span>Temporal: {selectedJob?.temporalMode || "-"}</span>
          {selectedJob?.temporalError ? <span>运行备注: {selectedJob.temporalError}</span> : null}
        </div>

        {message ? <p className="notice success">{message}</p> : null}
        {error ? <p className="notice error">{error}</p> : null}
      </aside>

      <main className="workspace">
        {page === "tasks" ? (
          <section className="panel page-panel">
            <SectionHeader eyebrow="TASKS" title="任务列表与详情" />

            <div className="task-layout">
              <section className="card-block compact">
                <div className="section-head">
                  <div>
                    <h3>任务列表</h3>
                    <p className="empty-copy">点击任意任务查看详情。</p>
                  </div>
                </div>
                <div className="task-list">
                  {jobs.length ? (
                    jobs.map((item) => (
                      <button
                        key={item.jobId}
                        type="button"
                        className={classNames("task-item", selectedJobId === item.jobId && "active")}
                        onClick={() => handleSelectJob(item)}
                      >
                        <div className="task-item-row">
                          <strong>{item.jobId}</strong>
                          <span className={classNames("status-badge", item.runtimeStatus === "running" && "running")}>
                            {item.runtimeStatus || item.status}
                          </span>
                        </div>
                        <span>{stageCopy[item.currentStage || item.status]?.title || item.status}</span>
                        <span>更新时间 {formatDateTime(item.updatedAt)}</span>
                      </button>
                    ))
                  ) : (
                    <EmptyBlock text="还没有任务，去新建一个试试。" />
                  )}
                </div>
              </section>

              <section className="detail-stack">
                {selectedJob ? (
                  <>
                    <article className="card-block compact">
                      <div className="section-head">
                        <div>
                          <h3>任务概览</h3>
                          <p className="empty-copy">{selectedJob.jobId}</p>
                        </div>
                        <label className="version-switcher">
                          <span>版本</span>
                          <select value={selectedVersion} onChange={(event) => setSelectedVersion(Number(event.target.value))}>
                            {versionOptions.map((version) => (
                              <option key={version} value={version}>
                                v{version}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="summary-grid">
                        <InfoTile label="状态" value={selectedJob.status} />
                        <InfoTile label="当前步骤" value={selectedJob.currentStage || "-"} />
                        <InfoTile label="最后错误" value={selectedJob.lastErrorCode || "-"} />
                        <InfoTile label="重试次数" value={String(selectedJob.rewriteCount)} />
                        <InfoTile label="创建时间" value={formatDateTime(selectedJob.createdAt)} />
                        <InfoTile label="更新时间" value={formatDateTime(selectedJob.updatedAt)} />
                      </div>
                    </article>

                    <article className="card-block compact">
                      <h3>重试 / 超时 / 恢复</h3>
                      <div className="summary-grid">
                        <InfoTile
                          label="重试"
                          value={versionPayload?.stageMeta?.some((item) => item.retryOccurred) ? "本版本发生过重试" : "未记录重试"}
                        />
                        <InfoTile
                          label="超时"
                          value={versionPayload?.stageMeta?.some((item) => item.errorCode === "LLM_TIMEOUT") ? "检测到超时" : "未记录超时"}
                        />
                        <InfoTile
                          label="恢复"
                          value={selectedJob.runtimeStatus === "legacy_fallback" ? "已切到本地编排兜底" : "依赖持久化产物恢复"}
                        />
                        <InfoTile
                          label="等待信号"
                          value={selectedJob.pendingRewrite ? "是" : "否"}
                        />
                      </div>
                    </article>

                    <article className="card-block compact">
                      <h3>步骤明细</h3>
                      <div className="stage-detail-list">
                        {stageOrder.map((stage) => {
                          const meta = stageMetaMap.get(stage);
                          const state = resolveStageState(stage, selectedJob, stageMetaMap);

                          return (
                            <div key={stage} className={classNames("stage-detail-card", `is-${state}`)}>
                              <div className="task-item-row">
                                <div>
                                  <strong>{stageCopy[stage].title}</strong>
                                  <p className="empty-copy">{stage}</p>
                                </div>
                                <span className={classNames("status-badge", state === "running" && "running")}>{state}</span>
                              </div>
                              <p>{stageCopy[stage].description}</p>
                              <div className="stage-copy-grid">
                                <InfoTile label="做什么" value={stageCopy[stage].description} />
                                <InfoTile
                                  label="重试"
                                  value={
                                    meta
                                      ? meta.retryOccurred
                                        ? "本步骤发生过自动重试"
                                        : "本步骤未触发重试"
                                      : "尚未执行"
                                  }
                                />
                                <InfoTile
                                  label="超时"
                                  value={
                                    meta?.errorCode === "LLM_TIMEOUT"
                                      ? meta.errorMessage || "模型调用超时"
                                      : "未记录超时"
                                  }
                                />
                                <InfoTile
                                  label="恢复"
                                  value={
                                    meta
                                      ? meta.retryOccurred && meta.status === "success"
                                        ? "已通过重试恢复"
                                        : stageCopy[stage].recovery
                                      : stageCopy[stage].recovery
                                  }
                                />
                              </div>
                              <div className="stage-metrics">
                                <span>开始 {formatDateTime(meta?.startedAt)}</span>
                                <span>结束 {formatDateTime(meta?.finishedAt)}</span>
                                <span>耗时 {formatDuration(meta?.durationMs)}</span>
                                <span>执行 {meta ? (meta.usedFallback ? "fallback" : meta.usedLlm ? "llm" : "local") : "-"}</span>
                                <span>模型 {meta?.model || "-"}</span>
                                <span>错误码 {meta?.errorCode || "-"}</span>
                              </div>
                              {meta?.errorMessage ? <p className="notice error inline">{meta.errorMessage}</p> : null}
                            </div>
                          );
                        })}
                      </div>
                    </article>

                    <div className="json-grid">
                      <JsonCard title="Source Input" data={versionPayload?.sourceInput} />
                      <JsonCard title="Parsed Source" data={versionPayload?.parsedSource} />
                      <JsonCard title="Content Brief" data={versionPayload?.contentBrief} />
                      <JsonCard title="Deck Plan" data={versionPayload?.deckPlan} />
                      <JsonCard title="Visual Spec" data={versionPayload?.visualSpec} />
                      <JsonCard title="Review Result" data={versionPayload?.reviewResult} />
                    </div>

                    {versionPayload?.renderResult?.assets?.length ? (
                      <article className="card-block compact">
                        <div className="section-head">
                          <div>
                            <h3>预览产物</h3>
                            <p className="empty-copy">直接看当前版本渲染结果。</p>
                          </div>
                          {versionPayload.renderResult.htmlPreviewUrl ? (
                            <a className="ghost link-button" href={versionPayload.renderResult.htmlPreviewUrl} target="_blank" rel="noreferrer">
                              打开 HTML
                            </a>
                          ) : null}
                        </div>
                        <div className="asset-grid">
                          {versionPayload.renderResult.assets.map((asset) => (
                            <article key={asset.slideIndex} className="asset-card">
                              <div className="asset-head">
                                <strong>第 {asset.slideIndex} 页</strong>
                                {asset.overflowDetected ? <span className="warning-chip">Overflow</span> : null}
                              </div>
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
                      </article>
                    ) : null}
                  </>
                ) : (
                  <EmptyBlock text="先从左侧选一个任务，右边就会展示步骤详情。" />
                )}
              </section>
            </div>
          </section>
        ) : null}

        {page === "create" ? (
          <section className="panel page-panel">
            <SectionHeader eyebrow="CREATE" title="新建任务" />
            <p className="empty-copy">这里只保留一个创建接口。提交后会自动开始执行，不需要额外 Run 按钮。</p>
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
                <input value={form.contentGoal} onChange={(event) => updateField("contentGoal", event.target.value)} placeholder="例如 快速看懂重点" />
              </label>
              <label>
                Preferred Style
                <input value={form.preferredStyle} onChange={(event) => updateField("preferredStyle", event.target.value)} placeholder="例如 专业、短句、偏科技" />
              </label>
            </div>
            <div className="button-row">
              <button className="primary" type="button" onClick={handleCreateJob} disabled={isPending}>
                创建任务
              </button>
              <button className="ghost" type="button" onClick={() => navigate("tasks")}>
                返回任务列表
              </button>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function resolveStageState(stage: JobStatus, job: JobSummary, stageMetaMap: Map<JobStatus, StageMeta>) {
  const meta = stageMetaMap.get(stage);
  if (meta) {
    return meta.status === "error" ? "error" : "done";
  }

  if (job.runtimeStatus === "running" && job.currentStage === stage) {
    return "running";
  }

  const activeIndex = stageOrder.indexOf(job.currentStage ?? job.status);
  const stageIndex = stageOrder.indexOf(stage);
  if (activeIndex >= 0 && stageIndex < activeIndex) {
    return "done";
  }

  return "pending";
}

function getTaskHealth(job: JobSummary | null) {
  if (!job) {
    return {
      title: "未选择任务",
      summary: "左侧选一个任务就能看到完整详情。"
    };
  }

  if (job.runtimeStatus === "running") {
    return {
      title: "任务执行中",
      summary: `当前正在执行 ${job.currentStage || job.status}，页面会自动刷新。`
    };
  }

  if (job.lastErrorCode) {
    return {
      title: "任务有失败记录",
      summary: `最近错误码是 ${job.lastErrorCode}，可以结合步骤日志排查。`
    };
  }

  if (job.runtimeStatus === "legacy_fallback") {
    return {
      title: "已切换兜底模式",
      summary: "Temporal 不可用时，会自动回退到本地编排继续执行。"
    };
  }

  return {
    title: "任务状态稳定",
    summary: "当前任务没有新的运行异常。"
  };
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

function InfoTile(props: { label: string; value: string }) {
  return (
    <div className="info-tile">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function JsonCard(props: { title: string; data: unknown }) {
  return (
    <article className="card-block">
      <h3>{props.title}</h3>
      <pre>{props.data ? JSON.stringify(props.data, null, 2) : "No data"}</pre>
    </article>
  );
}

function EmptyBlock(props: { text: string }) {
  return <div className="empty-block">{props.text}</div>;
}
