import { Module } from "@nestjs/common";
import { JobsController } from "./jobs.controller";
import { BriefGenerator } from "@/features/generation/brief/brief-generator";
import { DeckGenerator } from "@/features/generation/deck/deck-generator";
import { JobsService } from "@/features/jobs/job.service";
import { jobRepositories } from "@/features/jobs/job.repositories";
import { Renderer } from "@/features/generation/render/renderer";
import { Reviewer } from "@/features/generation/review/reviewer";
import { SourceParser } from "@/features/generation/source/source-parser";
import { VisualMatch } from "@/features/generation/visual/visual-match";
import { OpenAiProvider } from "@/infra/ai/llm/openai";
import { TemporalWorkflowRuntime } from "@/infra/runtime/temporal/temporal.runtime";
import type { WorkflowModules } from "@/features/jobs/job-runtime.types";

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
        const modules: WorkflowModules = {
          sourceParser,
          briefGenerator,
          deckGenerator,
          visualMatch,
          renderer,
          reviewer
        };
        const runtime = new TemporalWorkflowRuntime(repositories, modules);
        await runtime.init();
        return runtime;
      }
    },
    {
      provide: JobsService,
      inject: [WORKFLOW_REPOSITORIES, TemporalWorkflowRuntime],
      useFactory: (
        repositories: typeof jobRepositories,
        temporalRuntime: TemporalWorkflowRuntime
      ) =>
        new JobsService(repositories, temporalRuntime)
    }
  ],
})
export class JobsModule {}
