import { Body, Controller, Get, Inject, Param, ParseIntPipe, Post } from "@nestjs/common";
import { JobApplicationService } from "@/application/jobs/job-application.service";

@Controller("api/jobs")
export class JobsController {
  constructor(@Inject(JobApplicationService) private readonly jobsService: JobApplicationService) {}

  @Get()
  async listJobs() {
    return this.jobsService.listJobs();
  }

  @Post()
  async createJob(@Body() body: any) {
    return this.jobsService.createJob(body);
  }

  @Post(":jobId/rewrite")
  async requestRewrite(@Param("jobId") jobId: string, @Body() body: any) {
    return this.jobsService.requestRewrite(jobId, body);
  }

  @Get(":jobId")
  async getJob(@Param("jobId") jobId: string) {
    return this.jobsService.getJob(jobId);
  }

  @Get(":jobId/versions/:version")
  async getJobVersion(@Param("jobId") jobId: string, @Param("version", ParseIntPipe) version: number) {
    return this.jobsService.getJobVersion(jobId, version);
  }
}
