import { Body, Controller, Get, Inject, Param, ParseIntPipe, Post } from "@nestjs/common";
import { WorkflowApplicationService } from "@/application/workflows/workflow-application.service";

@Controller("api/workflows")
export class WorkflowsController {
  constructor(@Inject(WorkflowApplicationService) private readonly workflowsService: WorkflowApplicationService) {}

  @Get()
  async listWorkflows() {
    return this.workflowsService.listWorkflows();
  }

  @Post()
  async createWorkflow(@Body() body: any) {
    return this.workflowsService.createWorkflow(body);
  }

  @Post(":workflowId/rewrite")
  async requestRewrite(@Param("workflowId") workflowId: string, @Body() body: any) {
    return this.workflowsService.requestRewrite(workflowId, body);
  }

  @Get(":workflowId")
  async getWorkflow(@Param("workflowId") workflowId: string) {
    return this.workflowsService.getWorkflow(workflowId);
  }

  @Get(":workflowId/versions/:version")
  async getWorkflowVersion(@Param("workflowId") workflowId: string, @Param("version", ParseIntPipe) version: number) {
    return this.workflowsService.getWorkflowVersion(workflowId, version);
  }
}
