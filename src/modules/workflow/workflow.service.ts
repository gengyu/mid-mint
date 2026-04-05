import fs from "fs";
import path from "path";
import { assertSourceInput } from "@/modules/domain/validation";
import type { SourceInput } from "@/modules/domain/types";
import type { WorkflowOrchestrator, WorkflowRepositories } from "@/modules/workflow/orchestrator";
import type { CreateJobInput, RewriteJobInput, RunJobOptions } from "@/modules/workflow/workflow.types";
import { ensureDir, projectPath } from "@/lib/utils/fs";

export class WorkflowService {
  constructor(
    private readonly orchestrator: WorkflowOrchestrator,
    private readonly repositories: WorkflowRepositories
  ) {}

  createJob(input: CreateJobInput) {
    const sourceInput: SourceInput = assertSourceInput({
      urls: input.urls ?? [],
      rawText: input.rawText ?? "",
      notes: input.notes ?? "",
      targetAudience: input.targetAudience ?? "",
      contentGoal: input.contentGoal ?? "",
      preferredStyle: input.preferredStyle ?? ""
    });

    const job = this.repositories.jobs.create(sourceInput);
    this.repositories.jobVersions.create({
      jobId: job.id,
      versionNumber: job.activeVersion,
      trigger: "initial",
      rewriteStage: null
    });
    this.repositories.sourceInputs.save(job.id, job.activeVersion, sourceInput);

    return {
      jobId: job.id,
      status: job.status,
      activeVersion: job.activeVersion
    };
  }

  async runJob(jobId: string, options?: RunJobOptions) {
    const job = await this.orchestrator.run(jobId, options);
    return {
      jobId: job.id,
      status: job.status
    };
  }

  getJob(jobId: string) {
    return this.orchestrator.getJob(jobId);
  }

  getJobVersion(jobId: string, versionNumber: number) {
    return this.orchestrator.getVersionArtifacts(jobId, versionNumber);
  }

  async rewriteJob(jobId: string, input: RewriteJobInput) {
    const job = await this.orchestrator.rewrite(jobId, input.targetStage, input.reason);
    return {
      jobId: job.id,
      status: job.status,
      nextVersion: job.activeVersion,
      targetStage: input.targetStage
    };
  }

  getPreview(jobId: string) {
    return this.orchestrator.getPreview(jobId);
  }

  exportJob(jobId: string, format: "png" | "svg" | "html") {
    const job = this.orchestrator.getJob(jobId);
    if (!job) {
      throw new Error("Job not found.");
    }

    const preview = this.orchestrator.getPreview(jobId);
    if (!preview) {
      throw new Error("Preview not found.");
    }

    const outputDir = ensureDir(projectPath("storage", "v1", "jobs", jobId, `v${preview.activeVersion}`, "exports"));

    if (format === "html") {
      return {
        jobId,
        activeVersion: preview.activeVersion,
        format,
        downloadUrl: preview.htmlPreviewUrl
      };
    }

    const urls = format === "png" ? preview.pngUrls : preview.svgUrls;
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${jobId} ${format.toUpperCase()} Export</title>
  <style>
    body { margin: 0; padding: 24px; background: #f4f4f5; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; color: #18181b; }
    .wrap { width: min(960px, 100%); margin: 0 auto; display: grid; gap: 16px; }
    .head, .item { background: white; border-radius: 20px; padding: 18px; box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08); }
    .item a { color: #b7472a; text-decoration: none; font-weight: 700; }
    img { width: 100%; display: block; border-radius: 14px; margin-top: 12px; background: #fafafa; }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="head">
      <h1>${jobId}</h1>
      <p>Version ${preview.activeVersion} ${format.toUpperCase()} export</p>
    </section>
    ${urls
      .map(
        (url, index) => `<section class="item">
          <a href="${url}" target="_blank" rel="noreferrer">Download slide ${index + 1}</a>
          ${format === "svg" ? `<img src="${url}" alt="slide ${index + 1}" />` : ""}
        </section>`
      )
      .join("")}
  </main>
</body>
</html>`;

    const fileName = `export-${format}.html`;
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, html, "utf8");

    return {
      jobId,
      activeVersion: preview.activeVersion,
      format,
      downloadUrl: `/storage/v1/jobs/${jobId}/v${preview.activeVersion}/exports/${fileName}`
    };
  }
}
