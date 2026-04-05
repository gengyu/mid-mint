import type { Request, Response } from "express";
import { z } from "zod";
import { toAppError } from "@/shared/errors";
import { WorkflowService } from "@/modules/workflow/workflow.service";

const createJobRequestSchema = z.object({
  urls: z.array(z.string()).optional(),
  rawText: z.string().optional(),
  notes: z.string().optional(),
  targetAudience: z.string().optional(),
  contentGoal: z.string().optional(),
  preferredStyle: z.string().optional()
});

const rewriteRequestSchema = z.object({
  targetStage: z.enum(["source-parse", "brief", "deck", "visual"]),
  reason: z.string().default("")
});

const exportRequestSchema = z.object({
  format: z.enum(["png", "svg", "html"])
});

export class JobsController {
  constructor(private readonly workflowService: WorkflowService) {}

  private getRouteParam(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] ?? "" : value ?? "";
  }

  createJob = (req: Request, res: Response) => {
    try {
      const payload = createJobRequestSchema.parse(req.body);
      res.status(201).json(this.workflowService.createJob(payload));
    } catch (error) {
      res.status(400).json(toAppError(error));
    }
  };

  runJob = async (req: Request, res: Response) => {
    try {
      res.json(await this.workflowService.runJob(this.getRouteParam(req.params.jobId)));
    } catch (error) {
      res.status(400).json(toAppError(error));
    }
  };

  getJob = (req: Request, res: Response) => {
    const job = this.workflowService.getJob(this.getRouteParam(req.params.jobId));
    if (!job) {
      res.status(404).json({ message: "Job not found." });
      return;
    }

    res.json({
      jobId: job.id,
      status: job.status,
      rewriteCount: job.rewriteCount,
      activeVersion: job.activeVersion,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    });
  };

  getVersion = (req: Request, res: Response) => {
    const versionNumber = Number(this.getRouteParam(req.params.version));
    res.json(this.workflowService.getJobVersion(this.getRouteParam(req.params.jobId), versionNumber));
  };

  rewriteJob = async (req: Request, res: Response) => {
    try {
      const payload = rewriteRequestSchema.parse(req.body);
      res.json(await this.workflowService.rewriteJob(this.getRouteParam(req.params.jobId), payload));
    } catch (error) {
      res.status(400).json(toAppError(error));
    }
  };

  getPreview = (req: Request, res: Response) => {
    const preview = this.workflowService.getPreview(this.getRouteParam(req.params.jobId));
    if (!preview) {
      res.status(404).json({ message: "Preview not found." });
      return;
    }

    res.json(preview);
  };

  exportJob = (req: Request, res: Response) => {
    try {
      const payload = exportRequestSchema.parse(req.body);
      const jobId = this.getRouteParam(req.params.jobId);
      res.json(this.workflowService.exportJob(jobId, payload.format));
    } catch (error) {
      res.status(400).json(toAppError(error));
    }
  };
}
