import { Body, Controller, Get, Inject, Param, ParseIntPipe, Post } from "@nestjs/common";
import { WorkflowService } from "../modules/workflow/workflow.service";

@Controller("api/jobs")
export class JobsController {
  constructor(@Inject(WorkflowService) private readonly workflowService: WorkflowService) {}

  @Get()
  async listJobs() {
    return this.workflowService.listJobs();
  }

  @Post()
  async createJob(@Body() body: any) {
    return this.workflowService.createJob(body);
  }

  @Get(":jobId")
  async getJob(@Param("jobId") jobId: string) {
    return this.workflowService.getJob(jobId);
  }

  @Get(":jobId/versions/:version")
  async getJobVersion(@Param("jobId") jobId: string, @Param("version", ParseIntPipe) version: number) {
    return this.workflowService.getJobVersion(jobId, version);
  }
}
