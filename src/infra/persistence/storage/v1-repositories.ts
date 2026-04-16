import { createId } from "@/infra/utils/id";
import { createJsonTable } from "@/infra/persistence/storage/json-table";
import type {
  ArtifactRecord,
  JobRecord,
  JobVersionRecord,
  RewriteLogRecord,
  StageLogRecord
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
    save(jobId: string, versionNumber: number, payload: TPayload) {
      const record: ArtifactRecord<TPayload> = {
        id: createId(tableName),
        jobId,
        versionNumber,
        payloadJson: stringifyPayload(payload),
        createdAt: new Date().toISOString()
      };

      table.save(record);
      return record;
    },
    getRecord(jobId: string, versionNumber: number) {
      return (
        table
          .list()
          .find((row) => row.jobId === jobId && row.versionNumber === versionNumber) ?? null
      );
    },
    get(jobId: string, versionNumber: number) {
      const record =
        table
          .list()
          .find((row) => row.jobId === jobId && row.versionNumber === versionNumber) ?? null;
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
    listByJobId(jobId: string) {
      return sortNewestFirst(table.list().filter((row) => row.jobId === jobId));
    },
    listPayloadsByJobId(jobId: string) {
      return sortNewestFirst(
        table
          .list()
          .filter((row) => row.jobId === jobId)
          .map((record) => ({
            ...record,
            payload: parsePayload<TPayload>(record.payloadJson)
          }))
      );
    },
    deleteByJobIdAndVersion(jobId: string, versionNumber: number) {
      return table.deleteWhere((row) => row.jobId === jobId && row.versionNumber === versionNumber);
    }
  };
}

function createJsonTableRepo<TRecord extends { id: string }>(tableName: string) {
  return createJsonTable<TRecord>(tableName);
}

export const jobsTable = createJsonTableRepo<JobRecord>("jobs");
export const jobVersionsTable = createJsonTableRepo<JobVersionRecord>("job_versions");
export const sourceInputsTable = createJsonTableRepo<ArtifactRecord<unknown>>("source_inputs");
export const parsedSourcesTable = createJsonTableRepo<ArtifactRecord<unknown>>("parsed_sources");
export const contentBriefsTable = createJsonTableRepo<ArtifactRecord<unknown>>("content_briefs");
export const deckPlansTable = createJsonTableRepo<ArtifactRecord<unknown>>("deck_plans");
export const visualSpecsTable = createJsonTableRepo<ArtifactRecord<unknown>>("visual_specs");
export const renderResultsTable = createJsonTableRepo<ArtifactRecord<unknown>>("render_results");
export const reviewResultsTable = createJsonTableRepo<ArtifactRecord<unknown>>("review_results");
export const stageLogsTable = createJsonTableRepo<StageLogRecord>("stage_logs");
export const rewriteLogsTable = createJsonTableRepo<RewriteLogRecord>("rewrite_logs");

export const jobRepository = {
  create(input: unknown) {
    void input;
    const now = new Date().toISOString();
    const record: JobRecord = {
      id: createId("job"),
      status: "INPUT_RECEIVED",
      rewriteCount: 0,
      activeVersion: 1,
      createdAt: now,
      updatedAt: now
    };
    jobsTable.save(record);
    return record;
  },
  getById(jobId: string) {
    return jobsTable.getById(jobId);
  },
  list() {
    return sortNewestFirst(jobsTable.list());
  },
  update(jobId: string, updater: (current: JobRecord) => JobRecord) {
    const current = jobsTable.getById(jobId);
    if (!current) {
      return null;
    }

    const updated = updater(current);
    jobsTable.save({
      ...updated,
      updatedAt: new Date().toISOString()
    });
    return jobsTable.getById(jobId);
  },
  deleteById(jobId: string) {
    return jobsTable.deleteById(jobId);
  }
};

export const jobVersionRepository = {
  create(input: {
    jobId: string;
    versionNumber: number;
    trigger: "initial" | "rewrite";
    rewriteStage: JobVersionRecord["rewriteStage"];
  }) {
    const record: JobVersionRecord = {
      id: createId("job-version"),
      jobId: input.jobId,
      versionNumber: input.versionNumber,
      trigger: input.trigger,
      rewriteStage: input.rewriteStage,
      createdAt: new Date().toISOString()
    };
    jobVersionsTable.save(record);
    return record;
  },
  getByJobIdAndVersion(jobId: string, versionNumber: number) {
    return (
      jobVersionsTable
        .list()
        .find((row) => row.jobId === jobId && row.versionNumber === versionNumber) ?? null
    );
  },
  listByJobId(jobId: string) {
    return sortNewestFirst(jobVersionsTable.list().filter((row) => row.jobId === jobId));
  },
  list() {
    return sortNewestFirst(jobVersionsTable.list());
  },
  latestByJobId(jobId: string) {
    return sortNewestFirst(jobVersionsTable.list().filter((row) => row.jobId === jobId))[0] ?? null;
  },
  deleteByJobId(jobId: string) {
    return jobVersionsTable.deleteWhere((row) => row.jobId === jobId);
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
  listByJobId(jobId: string) {
    return sortByTimestamp(
      stageLogsTable.list().filter((row) => row.jobId === jobId),
      (row) => row.startedAt
    );
  },
  listByJobIdAndVersion(jobId: string, versionNumber: number) {
    return sortByTimestamp(
      stageLogsTable.list().filter((row) => row.jobId === jobId && row.versionNumber === versionNumber),
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
  listByJobId(jobId: string) {
    return sortNewestFirst(rewriteLogsTable.list().filter((row) => row.jobId === jobId));
  }
};

export function createV1Repositories() {
  return {
    jobs: jobRepository,
    jobVersions: jobVersionRepository,
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
