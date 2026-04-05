import {
  assertContentBrief,
  assertDeckPlan,
  assertParsedSource,
  assertRenderResult,
  assertReviewResult,
  assertVisualSpec
} from "@/modules/domain/validation";
import type { JobStatus, ReviewDecision, RewriteStage } from "@/modules/domain/types";
import type {
  ContentBrief,
  DeckPlan,
  Job,
  JobVersion,
  ParsedSource,
  RenderResult,
  ReviewResult,
  SourceInput,
  VisualSpec
} from "@/modules/domain/types";
import type { RunJobOptions } from "@/modules/workflow/workflow.types";

export type WorkflowRepositories = {
  jobs: {
    create(input: SourceInput): Job;
    getById(jobId: string): Job | null;
    update(jobId: string, updater: (current: Job) => Job): Job | null;
  };
  jobVersions: {
    create(input: { jobId: string; versionNumber: number; trigger: "initial" | "rewrite"; rewriteStage: RewriteStage | null }): JobVersion;
    listByJobId(jobId: string): JobVersion[];
  };
  sourceInputs: {
    save(jobId: string, versionNumber: number, payload: SourceInput): void;
    get(jobId: string, versionNumber: number): SourceInput | null;
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
      errorCode: string | null;
      errorMessage: string | null;
    }): void;
  };
};

export type WorkflowModules = {
  sourceParser: {
    run(input: SourceInput): Promise<ParsedSource>;
  };
  briefGenerator: {
    run(input: ParsedSource & { targetAudience: string; contentGoal: string; preferredStyle: string }): Promise<ContentBrief>;
  };
  deckGenerator: {
    run(input: { parsedSource: ParsedSource; contentBrief: ContentBrief }): Promise<DeckPlan>;
  };
  visualMatch: {
    run(input: { deckPlan: DeckPlan; preferredStyle: string }): Promise<{ deckPlan: DeckPlan; visualSpec: VisualSpec }>;
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
    }): Promise<ReviewResult>;
  };
};

export class WorkflowOrchestrator {
  constructor(
    private readonly repositories: WorkflowRepositories,
    private readonly modules: WorkflowModules
  ) {}

  async run(jobId: string, options?: RunJobOptions): Promise<Job> {
    void options;
    const job = this.repositories.jobs.getById(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status === "APPROVED") {
      return job;
    }

    const currentVersion = job.activeVersion;
    const sourceInput = this.requireArtifact(
      this.repositories.sourceInputs.get(jobId, currentVersion),
      "Source input not found."
    );
    const currentJobVersion = this.repositories.jobVersions.listByJobId(jobId)
      .find((version) => version.versionNumber === currentVersion) ?? null;
    const rewriteStage = currentJobVersion?.rewriteStage ?? null;

    const parsedSource =
      rewriteStage && rewriteStage !== "source-parse"
        ? this.requireArtifact(this.repositories.parsedSources.get(jobId, currentVersion), "Parsed source not found.")
        : await this.runStage("PARSED", jobId, currentVersion, async () => {
            const result = await this.modules.sourceParser.run(sourceInput);
            const validated = assertParsedSource(result);
            this.repositories.parsedSources.save(jobId, currentVersion, validated);
            return validated;
          });

    const contentBrief =
      rewriteStage === "deck" || rewriteStage === "visual"
        ? this.requireArtifact(
            this.repositories.contentBriefs.get(jobId, currentVersion),
            "Content brief not found."
          )
        : await this.runStage("BRIEFED", jobId, currentVersion, async () => {
            const result = await this.modules.briefGenerator.run({
              ...parsedSource,
              targetAudience: sourceInput.targetAudience,
              contentGoal: sourceInput.contentGoal,
              preferredStyle: sourceInput.preferredStyle
            });
            const validated = assertContentBrief(result);
            this.repositories.contentBriefs.save(jobId, currentVersion, validated);
            return validated;
          });

    let deckPlan =
      rewriteStage === "visual"
        ? this.requireArtifact(this.repositories.deckPlans.get(jobId, currentVersion), "Deck plan not found.")
        : await this.runStage("DECK_GENERATED", jobId, currentVersion, async () => {
            const result = await this.modules.deckGenerator.run({
              parsedSource,
              contentBrief
            });
            const validated = assertDeckPlan(result);
            this.repositories.deckPlans.save(jobId, currentVersion, validated);
            return validated;
          });

    const visualOutput = await this.runStage("VISUAL_MATCHED", jobId, currentVersion, async () => {
      const result = await this.modules.visualMatch.run({
        deckPlan,
        preferredStyle: sourceInput.preferredStyle
      });
      const validatedDeckPlan = assertDeckPlan(result.deckPlan);
      const validatedVisualSpec = assertVisualSpec(result.visualSpec);
      this.repositories.deckPlans.save(jobId, currentVersion, validatedDeckPlan);
      this.repositories.visualSpecs.save(jobId, currentVersion, validatedVisualSpec);
      return {
        deckPlan: validatedDeckPlan,
        visualSpec: validatedVisualSpec
      };
    });
    deckPlan = visualOutput.deckPlan;

    const renderResult = await this.runStage("RENDERED", jobId, currentVersion, async () => {
      const result = await this.modules.renderer.run({
        jobId,
        versionNumber: currentVersion,
        deckPlan,
        visualSpec: visualOutput.visualSpec
      });
      const validated = assertRenderResult(result, deckPlan.slides.length);
      this.repositories.renderResults.save(jobId, currentVersion, validated);
      return validated;
    });

    const reviewResult = await this.runStage("REVIEWED", jobId, currentVersion, async () => {
      const result = await this.modules.reviewer.run({
        parsedSource,
        contentBrief,
        deckPlan,
        visualSpec: visualOutput.visualSpec,
        renderResult
      });
      const validated = assertReviewResult(result);
      this.repositories.reviewResults.save(jobId, currentVersion, validated);
      return validated;
    });

    return this.finalizeReview(jobId, reviewResult);
  }

  async rewrite(jobId: string, targetStage: RewriteStage, reason: string): Promise<Job> {
    const job = this.repositories.jobs.getById(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (!["REVIEWED", "REWRITE_PENDING", "FAILED"].includes(job.status)) {
      throw new Error("Job state does not allow rewrite.");
    }
    if (job.rewriteCount >= 3) {
      throw new Error("Rewrite limit reached.");
    }

    const currentVersion = job.activeVersion;
    const nextVersion = currentVersion + 1;
    this.repositories.jobVersions.create({
      jobId,
      versionNumber: nextVersion,
      trigger: "rewrite",
      rewriteStage: targetStage
    });
    this.copyRewriteArtifacts(jobId, currentVersion, nextVersion, targetStage);
    this.repositories.rewriteLogs.create({
      jobId,
      fromVersion: currentVersion,
      toVersion: nextVersion,
      targetStage,
      reason
    });

    return this.updateJob(jobId, (current) => ({
      ...current,
      status: "REWRITE_PENDING",
      rewriteCount: current.rewriteCount + 1,
      activeVersion: nextVersion
    }));
  }

  getJob(jobId: string): Job | null {
    return this.repositories.jobs.getById(jobId);
  }

  getVersionArtifacts(jobId: string, versionNumber: number) {
    return {
      job: this.repositories.jobs.getById(jobId),
      sourceInput: this.repositories.sourceInputs.get(jobId, versionNumber),
      parsedSource: this.repositories.parsedSources.get(jobId, versionNumber),
      contentBrief: this.repositories.contentBriefs.get(jobId, versionNumber),
      deckPlan: this.repositories.deckPlans.get(jobId, versionNumber),
      visualSpec: this.repositories.visualSpecs.get(jobId, versionNumber),
      renderResult: this.repositories.renderResults.get(jobId, versionNumber),
      reviewResult: this.repositories.reviewResults.get(jobId, versionNumber)
    };
  }

  getPreview(jobId: string) {
    const job = this.repositories.jobs.getById(jobId);
    if (!job) {
      return null;
    }

    const renderResult = this.repositories.renderResults.get(jobId, job.activeVersion);
    if (!renderResult) {
      return null;
    }

    return {
      jobId,
      activeVersion: job.activeVersion,
      htmlPreviewUrl: renderResult.htmlPreviewUrl,
      pngUrls: renderResult.pngUrls,
      svgUrls: renderResult.svgUrls
    };
  }

  private requireArtifact<T>(value: T | null, message: string): T {
    if (value === null) {
      throw new Error(message);
    }

    return value;
  }

  private updateJob(jobId: string, updater: (job: Job) => Job): Job {
    const updated = this.repositories.jobs.update(jobId, updater);
    if (!updated) {
      throw new Error(`Job not found: ${jobId}`);
    }

    return updated;
  }

  private async runStage<T>(
    stageName: JobStatus,
    jobId: string,
    versionNumber: number,
    executor: () => Promise<T>
  ): Promise<T> {
    const startedAt = new Date().toISOString();

    try {
      const result = await executor();
      const finishedAt = new Date().toISOString();
      this.repositories.stageLogs.create({
        jobId,
        versionNumber,
        stageName,
        startedAt,
        finishedAt,
        status: "success",
        errorCode: null,
        errorMessage: null
      });
      this.updateJob(jobId, (job) => ({ ...job, status: stageName }));
      return result;
    } catch (error) {
      const finishedAt = new Date().toISOString();
      this.repositories.stageLogs.create({
        jobId,
        versionNumber,
        stageName,
        startedAt,
        finishedAt,
        status: "error",
        errorCode: "STAGE_FAILED",
        errorMessage: error instanceof Error ? error.message : "Stage failed."
      });
      this.updateJob(jobId, (job) => ({ ...job, status: "FAILED" }));
      throw error;
    }
  }

  private finalizeReview(jobId: string, reviewResult: ReviewResult) {
    if (reviewResult.decision === "approve") {
      return this.updateJob(jobId, (job) => ({ ...job, status: "APPROVED" }));
    }

    if (reviewResult.decision === "block") {
      return this.updateJob(jobId, (job) => ({ ...job, status: "FAILED" }));
    }

    const shouldStopForLowImprovement = this.hasLowImprovementStreak(jobId);
    return this.updateJob(jobId, (job) => ({
      ...job,
      status: job.rewriteCount >= 3 || shouldStopForLowImprovement ? "FAILED" : "REWRITE_PENDING"
    }));
  }

  private hasLowImprovementStreak(jobId: string) {
    const reviewRepository = this.repositories.reviewResults;
    const listByJobId = reviewRepository.listByJobId;
    if (!listByJobId) {
      return false;
    }

    const rows = listByJobId(jobId)
      .filter((item): item is { jobId: string; versionNumber: number; payload?: ReviewResult } => "versionNumber" in item)
      .filter((item): item is { jobId: string; versionNumber: number; payload: ReviewResult } => Boolean(item.payload))
      .sort((left, right) => left.versionNumber - right.versionNumber);

    if (rows.length < 3) {
      return false;
    }

    const [thirdLast, secondLast, last] = rows.slice(-3);
    const improvementA = secondLast.payload.score - thirdLast.payload.score;
    const improvementB = last.payload.score - secondLast.payload.score;
    return improvementA < 3 && improvementB < 3;
  }

  private copyRewriteArtifacts(
    jobId: string,
    fromVersion: number,
    toVersion: number,
    targetStage: RewriteStage
  ) {
    const sourceInput = this.repositories.sourceInputs.get(jobId, fromVersion);
    if (sourceInput) {
      this.repositories.sourceInputs.save(jobId, toVersion, sourceInput);
    }

    if (targetStage === "source-parse") {
      return;
    }

    const parsedSource = this.repositories.parsedSources.get(jobId, fromVersion);
    if (parsedSource) {
      this.repositories.parsedSources.save(jobId, toVersion, parsedSource);
    }

    if (targetStage === "brief") {
      return;
    }

    const contentBrief = this.repositories.contentBriefs.get(jobId, fromVersion);
    if (contentBrief) {
      this.repositories.contentBriefs.save(jobId, toVersion, contentBrief);
    }

    if (targetStage === "deck") {
      return;
    }

    const deckPlan = this.repositories.deckPlans.get(jobId, fromVersion);
    if (deckPlan) {
      this.repositories.deckPlans.save(jobId, toVersion, deckPlan);
    }
  }
}

export function isTerminalReviewDecision(decision: ReviewDecision) {
  return decision === "approve" || decision === "block";
}
