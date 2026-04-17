import type {
  ContentBrief,
  DeckPlan,
  ParsedSource,
  RenderResult,
  ReviewResult,
  RewriteStage,
  SourceInput,
  VisualSpec,
  WorkflowStageStatus,
  WorkflowVersion
} from "@/core/domain/types";
import type { StageRunResult } from "@/application/workflows/stage-execution";

export type WorkflowRepositories = {
  workflowVersions: {
    create(input: {
      workflowId: string;
      versionNumber: number;
      trigger: "initial" | "rewrite";
      rewriteStage: RewriteStage | null;
    }): WorkflowVersion;
    listByWorkflowId(workflowId: string): WorkflowVersion[];
    list?(): WorkflowVersion[];
    deleteByWorkflowId?: (workflowId: string) => number;
  };
  sourceInputs: {
    save(workflowId: string, versionNumber: number, payload: SourceInput): void;
    get(workflowId: string, versionNumber: number): SourceInput | null;
    deleteByWorkflowIdAndVersion?: (workflowId: string, versionNumber: number) => number;
  };
  parsedSources: {
    save(workflowId: string, versionNumber: number, payload: ParsedSource): void;
    get(workflowId: string, versionNumber: number): ParsedSource | null;
  };
  contentBriefs: {
    save(workflowId: string, versionNumber: number, payload: ContentBrief): void;
    get(workflowId: string, versionNumber: number): ContentBrief | null;
  };
  deckPlans: {
    save(workflowId: string, versionNumber: number, payload: DeckPlan): void;
    get(workflowId: string, versionNumber: number): DeckPlan | null;
  };
  visualSpecs: {
    save(workflowId: string, versionNumber: number, payload: VisualSpec): void;
    get(workflowId: string, versionNumber: number): VisualSpec | null;
  };
  renderResults: {
    save(workflowId: string, versionNumber: number, payload: RenderResult): void;
    get(workflowId: string, versionNumber: number): RenderResult | null;
  };
  reviewResults: {
    save(workflowId: string, versionNumber: number, payload: ReviewResult): void;
    get(workflowId: string, versionNumber: number): ReviewResult | null;
    listByWorkflowId?(
      workflowId: string
    ): Array<{ workflowId: string; versionNumber: number; payload?: ReviewResult } | ReviewResult>;
  };
  rewriteLogs: {
    create(input: {
      workflowId: string;
      fromVersion: number;
      toVersion: number;
      targetStage: RewriteStage;
      reason: string;
    }): void;
    listByWorkflowId?(workflowId: string): Array<{
      workflowId: string;
      fromVersion: number;
      toVersion: number;
      targetStage: string;
      reason: string;
      createdAt: string;
    }>;
  };
  stageLogs: {
    create(input: {
      workflowId: string;
      versionNumber: number;
      stageName: WorkflowStageStatus;
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
    listByWorkflowIdAndVersion?(workflowId: string, versionNumber: number): Array<{
      stageName: WorkflowStageStatus;
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
    listByWorkflowId?(workflowId: string): Array<{
      workflowId: string;
      versionNumber: number;
      stageName: WorkflowStageStatus;
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
    parse(input: SourceInput): Promise<StageRunResult<ParsedSource>>;
  };
  briefGenerator: {
    generate(
      input: ParsedSource & { targetAudience: string; contentGoal: string; preferredStyle: string }
    ): Promise<StageRunResult<ContentBrief>>;
  };
  deckGenerator: {
    generate(input: { parsedSource: ParsedSource; contentBrief: ContentBrief }): Promise<StageRunResult<DeckPlan>>;
  };
  visualMatch: {
    match(input: {
      parsedSource: ParsedSource;
      contentBrief: ContentBrief;
      deckPlan: DeckPlan;
      preferredStyle: string;
    }): Promise<StageRunResult<{ deckPlan: DeckPlan; visualSpec: VisualSpec }>>;
  };
  renderer: {
    render(input: {
      workflowId: string;
      versionNumber: number;
      deckPlan: DeckPlan;
      visualSpec: VisualSpec;
    }): Promise<RenderResult>;
  };
  reviewer: {
    review(input: {
      parsedSource: ParsedSource;
      contentBrief: ContentBrief;
      deckPlan: DeckPlan;
      visualSpec: VisualSpec;
      renderResult: RenderResult;
    }): Promise<StageRunResult<ReviewResult>>;
  };
};
