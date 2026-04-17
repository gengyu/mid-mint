import { createId } from "@/infra/utils/id";
import { createJsonTable } from "@/infra/persistence/storage/json-table";
import type {
  ArtifactRecord,
  RewriteLogRecord,
  StageLogRecord,
  WorkflowVersionRecord
} from "@/infra/persistence/storage/v1-types";

function stringifyPayload(payload: unknown) {
  return JSON.stringify(payload);
}

function parsePayload<T>(payloadJson: string) {
  return JSON.parse(payloadJson) as T;
}

function sortNewestFirst<T extends { createdAt: string }>(rows: T[]) {
  return [...rows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function sortByTimestamp<T>(rows: T[], getTime: (row: T) => string) {
  return [...rows].sort((a, b) => (getTime(a) < getTime(b) ? 1 : -1));
}

function createArtifactRepository<TPayload>(tableName: string) {
  const table = createJsonTable<ArtifactRecord<TPayload>>(tableName);

  return {
    save(workflowId: string, versionNumber: number, payload: TPayload) {
      const record: ArtifactRecord<TPayload> = {
        id: createId(tableName),
        workflowId,
        versionNumber,
        payloadJson: stringifyPayload(payload),
        createdAt: new Date().toISOString()
      };

      table.save(record);
      return record;
    },
    getRecord(workflowId: string, versionNumber: number) {
      return table.list().find((row) => row.workflowId === workflowId && row.versionNumber === versionNumber) ?? null;
    },
    get(workflowId: string, versionNumber: number) {
      const record = table.list().find((row) => row.workflowId === workflowId && row.versionNumber === versionNumber) ?? null;
      if (!record) {
        return null;
      }

      return parsePayload<TPayload>(record.payloadJson);
    },
    listRecords() {
      return sortNewestFirst(table.list());
    },
    list() {
      return sortNewestFirst(table.list());
    },
    listByWorkflowId(workflowId: string) {
      return sortNewestFirst(table.list().filter((row) => row.workflowId === workflowId));
    },
    listPayloadsByWorkflowId(workflowId: string) {
      return sortNewestFirst(
        table
          .list()
          .filter((row) => row.workflowId === workflowId)
          .map((record) => ({
            ...record,
            payload: parsePayload<TPayload>(record.payloadJson)
          }))
      );
    },
    deleteByWorkflowIdAndVersion(workflowId: string, versionNumber: number) {
      return table.deleteWhere((row) => row.workflowId === workflowId && row.versionNumber === versionNumber);
    }
  };
}

function createJsonTableRepo<TRecord extends { id: string }>(tableName: string) {
  return createJsonTable<TRecord>(tableName);
}

export const workflowVersionsTable = createJsonTableRepo<WorkflowVersionRecord>("workflow_versions");
export const sourceInputsTable = createJsonTableRepo<ArtifactRecord<unknown>>("source_inputs");
export const parsedSourcesTable = createJsonTableRepo<ArtifactRecord<unknown>>("parsed_sources");
export const contentBriefsTable = createJsonTableRepo<ArtifactRecord<unknown>>("content_briefs");
export const deckPlansTable = createJsonTableRepo<ArtifactRecord<unknown>>("deck_plans");
export const visualSpecsTable = createJsonTableRepo<ArtifactRecord<unknown>>("visual_specs");
export const renderResultsTable = createJsonTableRepo<ArtifactRecord<unknown>>("render_results");
export const reviewResultsTable = createJsonTableRepo<ArtifactRecord<unknown>>("review_results");
export const stageLogsTable = createJsonTableRepo<StageLogRecord>("stage_logs");
export const rewriteLogsTable = createJsonTableRepo<RewriteLogRecord>("rewrite_logs");

export const workflowVersionRepository = {
  create(input: {
    workflowId: string;
    versionNumber: number;
    trigger: "initial" | "rewrite";
    rewriteStage: WorkflowVersionRecord["rewriteStage"];
  }) {
    const record: WorkflowVersionRecord = {
      id: createId("workflow-version"),
      workflowId: input.workflowId,
      versionNumber: input.versionNumber,
      trigger: input.trigger,
      rewriteStage: input.rewriteStage,
      createdAt: new Date().toISOString()
    };
    workflowVersionsTable.save(record);
    return record;
  },
  getByWorkflowIdAndVersion(workflowId: string, versionNumber: number) {
    return workflowVersionsTable.list().find((row) => row.workflowId === workflowId && row.versionNumber === versionNumber) ?? null;
  },
  listByWorkflowId(workflowId: string) {
    return sortNewestFirst(workflowVersionsTable.list().filter((row) => row.workflowId === workflowId));
  },
  list() {
    return sortNewestFirst(workflowVersionsTable.list());
  },
  latestByWorkflowId(workflowId: string) {
    return sortNewestFirst(workflowVersionsTable.list().filter((row) => row.workflowId === workflowId))[0] ?? null;
  },
  deleteByWorkflowId(workflowId: string) {
    return workflowVersionsTable.deleteWhere((row) => row.workflowId === workflowId);
  }
};

export const sourceInputRepository = createArtifactRepository<unknown>("source_inputs");
export const parsedSourceRepository = createArtifactRepository<unknown>("parsed_sources");
export const contentBriefRepository = createArtifactRepository<unknown>("content_briefs");
export const deckPlanRepository = createArtifactRepository<unknown>("deck_plans");
export const visualSpecRepository = createArtifactRepository<unknown>("visual_specs");
export const renderResultRepository = createArtifactRepository<unknown>("render_results");
export const reviewResultRepository = createArtifactRepository<unknown>("review_results");

export const stageLogRepository = {
  create(input: Omit<StageLogRecord, "id">) {
    const record: StageLogRecord = {
      id: createId("stage-log"),
      ...input
    };
    stageLogsTable.save(record);
    return record;
  },
  list() {
    return sortByTimestamp(stageLogsTable.list(), (row) => row.startedAt);
  },
  listByWorkflowId(workflowId: string) {
    return sortByTimestamp(stageLogsTable.list().filter((row) => row.workflowId === workflowId), (row) => row.startedAt);
  },
  listByWorkflowIdAndVersion(workflowId: string, versionNumber: number) {
    return sortByTimestamp(
      stageLogsTable.list().filter((row) => row.workflowId === workflowId && row.versionNumber === versionNumber),
      (row) => row.startedAt
    );
  }
};

export const rewriteLogRepository = {
  create(input: Omit<RewriteLogRecord, "id" | "createdAt">) {
    const record: RewriteLogRecord = {
      id: createId("rewrite-log"),
      createdAt: new Date().toISOString(),
      ...input
    };
    rewriteLogsTable.save(record);
    return record;
  },
  list() {
    return sortNewestFirst(rewriteLogsTable.list());
  },
  listByWorkflowId(workflowId: string) {
    return sortNewestFirst(rewriteLogsTable.list().filter((row) => row.workflowId === workflowId));
  }
};

export function createV1Repositories() {
  return {
    workflowVersions: workflowVersionRepository,
    sourceInputs: sourceInputRepository,
    parsedSources: parsedSourceRepository,
    contentBriefs: contentBriefRepository,
    deckPlans: deckPlanRepository,
    visualSpecs: visualSpecRepository,
    renderResults: renderResultRepository,
    reviewResults: reviewResultRepository,
    stageLogs: stageLogRepository,
    rewriteLogs: rewriteLogRepository
  };
}
