import { Module } from "@nestjs/common";
import { JobsController } from "./jobs.controller";
import { OpenAiProvider } from "../lib/llm/openai";
import { BriefGenerator } from "../modules/brief/brief-generator";
import { DeckGenerator } from "../modules/deck/deck-generator";
import { Renderer } from "../modules/render/renderer";
import { Reviewer } from "../modules/review/reviewer";
import { SourceParser } from "../modules/source/source-parser";
import { VisualMatch } from "../modules/visual/visual-match";
import { WorkflowOrchestrator } from "../modules/workflow/orchestrator";
import { workflowRepositories } from "../modules/workflow/workflow.repositories";
import { WorkflowService } from "../modules/workflow/workflow.service";

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
    { provide: WORKFLOW_REPOSITORIES, useValue: workflowRepositories },
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
        repositories: typeof workflowRepositories,
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
      provide: WorkflowService,
      inject: [WorkflowOrchestrator, WORKFLOW_REPOSITORIES],
      useFactory: (orchestrator: WorkflowOrchestrator, repositories: typeof workflowRepositories) =>
        new WorkflowService(orchestrator, repositories)
    }
  ],
})
export class JobsModule {}
