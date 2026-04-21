import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { Result } from '../../common/types/result.type';
import { PipelineResult } from '../pipeline/pipeline.types';
import { ProjectRecord } from '../storage/project-storage.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { GeneratePptDto } from './dto/generate-ppt.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  async create(@Body() dto: CreateProjectDto): Promise<Result<ProjectRecord>> {
    return {
      success: true,
      data: await this.projectsService.createProject(dto),
    };
  }

  @Get()
  async list(): Promise<Result<ProjectRecord[]>> {
    return {
      success: true,
      data: await this.projectsService.listProjects(),
    };
  }

  @Get(':projectId')
  async detail(@Param('projectId') projectId: string): Promise<Result<ProjectRecord>> {
    return {
      success: true,
      data: await this.projectsService.getProject(projectId),
    };
  }

  @Post(':projectId/generate')
  async generate(
    @Param('projectId') projectId: string,
    @Body() dto: GeneratePptDto,
  ): Promise<Result<PipelineResult>> {
    return {
      success: true,
      data: await this.projectsService.generate(projectId, dto),
    };
  }
}
