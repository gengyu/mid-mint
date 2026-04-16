import type {
  ContentBrief,
  DeckPlan,
  Job,
  JobStatus,
  JobVersion,
  ParsedSource,
  RenderResult,
  ReviewResult,
  RewriteStage,
  SourceInput,
  VisualSpec
} from "@/core/domain/types";
import type { StageRunResult } from "@/application/jobs/stage-execution";

export type WorkflowRepositories = {
  jobs: {
    create(input: SourceInput): Job;
    getById(jobId: string): Job | null;
    list(): Job[];
    update(jobId: string, updater: (current: Job) => Job): Job | null;
    deleteById?: (jobId: string) => boolean;
  };
  jobVersions: {
    create(input: { jobId: string; versionNumber: number; trigger: "initial" | "rewrite"; rewriteStage: RewriteStage | null }): JobVersion;
    listByJobId(jobId: string): JobVersion[];
    deleteByJobId?: (jobId: string) => number;
  };
  sourceInputs: {
    save(jobId: string, versionNumber: number, payload: SourceInput): void;
    get(jobId: string, versionNumber: number): SourceInput | null;
    deleteByJobIdAndVersion?: (jobId: string, versionNumber: number) => number;
  };
  parsedSources: {
    save(jobId: string, versionNumber: number, payload: ParsedSource): void;
    get(jobId: string, versionNumber: number): ParsedSource | null;
  };
  contentBriefs: {
    save(jobId: string, versionNumber: number, payload: ContentBrief): void;
    get(jobId: string, versionNumber: number): ContentBrief | null;
  };
  deckPlans: {
    save(jobId: string, versionNumber: number, payload: DeckPlan): void;
    get(jobId: string, versionNumber: number): DeckPlan | null;
  };
  visualSpecs: {
    save(jobId: string, versionNumber: number, payload: VisualSpec): void;
    get(jobId: string, versionNumber: number): VisualSpec | null;
  };
  renderResults: {
    save(jobId: string, versionNumber: number, payload: RenderResult): void;
    get(jobId: string, versionNumber: number): RenderResult | null;
  };
  reviewResults: {
    save(jobId: string, versionNumber: number, payload: ReviewResult): void;
    get(jobId: string, versionNumber: number): ReviewResult | null;
    listByJobId?(jobId: string): Array<{ jobId: string; versionNumber: number; payload?: ReviewResult } | ReviewResult>;
  };
  rewriteLogs: {
    create(input: {
      jobId: string;
      fromVersion: number;
      toVersion: number;
      targetStage: RewriteStage;
      reason: string;
    }): void;
  };
  stageLogs: {
    create(input: {
      jobId: string;
      versionNumber: number;
      stageName: JobStatus;
      startedAt: string;
      finishedAt: string;
      status: "success" | "error";
      model: string | null;
      usedLlm: boolean;
      llmAttempted: boolean;
      retryOccurred: boolean;
      usedFallback: boolean;
      durationMs: number;
      errorCode: string | null;
      errorMessage: string | null;
    }): void;
    listByJobIdAndVersion?(jobId: string, versionNumber: number): Array<{
      stageName: JobStatus;
      status: "success" | "error";
      startedAt: string;
      finishedAt: string;
      model: string | null;
      usedLlm: boolean;
      llmAttempted: boolean;
      retryOccurred: boolean;
      usedFallback: boolean;
      durationMs: number;
      errorCode: string | null;
      errorMessage: string | null;
    }>;
  };
};

export type WorkflowModules = {
  sourceParser: {
    run(input: SourceInput): Promise<StageRunResult<ParsedSource>>;
  };
  briefGenerator: {
    run(input: ParsedSource & { targetAudience: string; contentGoal: string; preferredStyle: string }): Promise<StageRunResult<ContentBrief>>;
  };
  deckGenerator: {
    run(input: { parsedSource: ParsedSource; contentBrief: ContentBrief }): Promise<StageRunResult<DeckPlan>>;
  };
  visualMatch: {
    run(input: {
      parsedSource: ParsedSource;
      contentBrief: ContentBrief;
      deckPlan: DeckPlan;
      preferredStyle: string;
    }): Promise<StageRunResult<{ deckPlan: DeckPlan; visualSpec: VisualSpec }>>;
  };
  renderer: {
    run(input: { jobId: string; versionNumber: number; deckPlan: DeckPlan; visualSpec: VisualSpec }): Promise<RenderResult>;
  };
  reviewer: {
    run(input: {
      parsedSource: ParsedSource;
      contentBrief: ContentBrief;
      deckPlan: DeckPlan;
      visualSpec: VisualSpec;
      renderResult: RenderResult;
    }): Promise<StageRunResult<ReviewResult>>;
  };
};
