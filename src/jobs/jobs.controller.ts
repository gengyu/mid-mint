import { Body, Controller, Get, Inject, Param, ParseIntPipe, Post } from "@nestjs/common";
import { WorkflowService } from "../modules/workflow/workflow.service";

@Controller("api/jobs")
export class JobsController {
  constructor(@Inject(WorkflowService) private readonly workflowService: WorkflowService) {}

  @Post()
  async createJob(@Body() body: any) {
    return this.workflowService.createJob(body);
  }

  @Post(":jobId/run")
  async runJob(@Param("jobId") jobId: string) {
    return this.workflowService.startRun(jobId);
  }

  @Get(":jobId")
  async getJob(@Param("jobId") jobId: string) {
    return this.workflowService.getJob(jobId);
  }

  @Get(":jobId/versions/:version")
  async getJobVersion(@Param("jobId") jobId: string, @Param("version", ParseIntPipe) version: number) {
    return this.workflowService.getJobVersion(jobId, version);
  }

  @Post(":jobId/rewrite")
  async rewriteJob(@Param("jobId") jobId: string, @Body() body: any) {
    return this.workflowService.rewriteJob(jobId, body);
  }

  @Get(":jobId/preview")
  async getJobPreview(@Param("jobId") jobId: string) {
    return this.workflowService.getPreview(jobId);
  }

  @Post(":jobId/export")
  async exportJob(@Param("jobId") jobId: string, @Body() body: any) {
    return this.workflowService.exportJob(jobId, body.format);
  }
}
