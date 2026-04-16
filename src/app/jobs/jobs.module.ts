import { Module } from "@nestjs/common";
import { JobsController } from "./jobs.controller";
import { BriefGenerator } from "@/features/brief/brief-generator";
import { DeckGenerator } from "@/features/deck/deck-generator";
import { Renderer } from "@/features/render/renderer";
import { Reviewer } from "@/features/review/reviewer";
import { SourceParser } from "@/features/source/source-parser";
import { VisualMatch } from "@/features/visual/visual-match";
import { WorkflowOrchestrator } from "@/features/jobs/orchestrator";
import { jobRepositories } from "@/features/jobs/job.repositories";
import { JobsService } from "@/features/jobs/job.service";
import { OpenAiProvider } from "@/infra/ai/llm/openai";
import { TemporalWorkflowRuntime } from "@/infra/runtime/temporal/temporal.runtime";

const WORKFLOW_REPOSITORIES = "WORKFLOW_REPOSITORIES";

@Module({
  controllers: [JobsController],
  providers: [
    SourceParser,
    BriefGenerator,
    DeckGenerator,
    VisualMatch,
    Renderer,
    Reviewer,
    OpenAiProvider,
    { provide: WORKFLOW_REPOSITORIES, useValue: jobRepositories },
    {
      provide: WorkflowOrchestrator,
      inject: [
        WORKFLOW_REPOSITORIES,
        SourceParser,
        BriefGenerator,
        DeckGenerator,
        VisualMatch,
        Renderer,
        Reviewer
      ],
      useFactory: (
        repositories: typeof jobRepositories,
        sourceParser: SourceParser,
        briefGenerator: BriefGenerator,
        deckGenerator: DeckGenerator,
        visualMatch: VisualMatch,
        renderer: Renderer,
        reviewer: Reviewer
      ) =>
        new WorkflowOrchestrator(repositories, {
          sourceParser,
          briefGenerator,
          deckGenerator,
          visualMatch,
          renderer,
          reviewer
        })
    },
    {
      provide: TemporalWorkflowRuntime,
      inject: [
        WORKFLOW_REPOSITORIES,
        SourceParser,
        BriefGenerator,
        DeckGenerator,
        VisualMatch,
        Renderer,
        Reviewer
      ],
      useFactory: async (
        repositories: typeof jobRepositories,
        sourceParser: SourceParser,
        briefGenerator: BriefGenerator,
        deckGenerator: DeckGenerator,
        visualMatch: VisualMatch,
        renderer: Renderer,
        reviewer: Reviewer
      ) => {
        const runtime = new TemporalWorkflowRuntime(repositories, {
          sourceParser,
          briefGenerator,
          deckGenerator,
          visualMatch,
          renderer,
          reviewer
        });
        await runtime.init();
        return runtime;
      }
    },
    {
      provide: JobsService,
      inject: [WorkflowOrchestrator, WORKFLOW_REPOSITORIES, TemporalWorkflowRuntime],
      useFactory: (
        orchestrator: WorkflowOrchestrator,
        repositories: typeof jobRepositories,
        temporalRuntime: TemporalWorkflowRuntime
      ) =>
        new JobsService(orchestrator, repositories, temporalRuntime)
    }
  ],
})
export class JobsModule {}
