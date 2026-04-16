import { createV1Repositories } from "@/infra/persistence/storage";
import type { WorkflowRepositories } from "@/features/jobs/orchestrator";

function createTypedWorkflowRepositories(): WorkflowRepositories {
  const repositories = createV1Repositories();

  return {
    ...repositories,
    sourceInputs: repositories.sourceInputs as WorkflowRepositories["sourceInputs"],
    parsedSources: repositories.parsedSources as WorkflowRepositories["parsedSources"],
    contentBriefs: repositories.contentBriefs as WorkflowRepositories["contentBriefs"],
    deckPlans: repositories.deckPlans as WorkflowRepositories["deckPlans"],
    visualSpecs: repositories.visualSpecs as WorkflowRepositories["visualSpecs"],
    renderResults: repositories.renderResults as WorkflowRepositories["renderResults"],
    reviewResults: repositories.reviewResults as WorkflowRepositories["reviewResults"]
  };
}

export const jobRepositories = createTypedWorkflowRepositories();

export function createJobRepositories() {
  return createTypedWorkflowRepositories();
}
