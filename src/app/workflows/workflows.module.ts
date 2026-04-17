import { Module } from "@nestjs/common";
import { WorkflowsController } from "./workflows.controller";
import { WorkflowApplicationService } from "@/application/workflows/workflow-application.service";
import { workflowRepositories } from "@/application/workflows/workflow.repositories";
import type { WorkflowModules } from "@/application/workflows/workflow-runtime.types";
import { BriefGenerator } from "@/features/generation/brief/brief-generator";
import { DeckGenerator } from "@/features/generation/deck/deck-generator";
import { Renderer } from "@/features/generation/render/renderer";
import { Reviewer } from "@/features/generation/review/reviewer";
import { SourceParser } from "@/features/generation/source/source-parser";
import { VisualMatch } from "@/features/generation/visual/visual-match";
import { OpenAiProvider } from "@/infra/ai/llm/openai";
import { TemporalWorkflowRuntime } from "@/infra/runtime/temporal/temporal.runtime";

const WORKFLOW_REPOSITORIES = "WORKFLOW_REPOSITORIES";

@Module({
  controllers: [WorkflowsController],
  providers: [
    SourceParser,
    BriefGenerator,
    DeckGenerator,
    VisualMatch,
    Renderer,
    Reviewer,
    OpenAiProvider,
    { provide: WORKFLOW_REPOSITORIES, useValue: workflowRepositories },
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
        repositories: typeof workflowRepositories,
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
      provide: WorkflowApplicationService,
      inject: [WORKFLOW_REPOSITORIES, TemporalWorkflowRuntime],
      useFactory: (
        repositories: typeof workflowRepositories,
        temporalRuntime: TemporalWorkflowRuntime
      ) =>
        new WorkflowApplicationService(repositories, temporalRuntime)
    }
  ],
})
export class WorkflowsModule {}
