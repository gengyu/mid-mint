import { Body, Controller, Get, Inject, Param, ParseIntPipe, Post } from "@nestjs/common";
import { JobsService } from "@/features/jobs/job.service";

@Controller("api/jobs")
export class JobsController {
  constructor(@Inject(JobsService) private readonly jobsService: JobsService) {}

  @Get()
  async listJobs() {
    return this.jobsService.listJobs();
  }

  @Post()
  async createJob(@Body() body: any) {
    return this.jobsService.createJob(body);
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
