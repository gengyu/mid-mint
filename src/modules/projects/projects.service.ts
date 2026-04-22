import { Injectable } from '@nestjs/common';

import { PipelineService } from '../pipeline/pipeline.service';
import { PipelineResult } from '../pipeline/pipeline.types';
import { ProjectRecord, ProjectStorageService } from '../storage/project-storage.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { GeneratePptDto } from './dto/generate-ppt.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectStorageService: ProjectStorageService,
    private readonly pipelineService: PipelineService,
  ) {}

  async createProject(dto: CreateProjectDto): Promise<ProjectRecord> {
    return this.projectStorageService.createProject({
      title: dto.title,
      content: dto.content,
      sourceType: dto.sourceType ?? 'markdown',
    });
  }

  async listProjects(): Promise<ProjectRecord[]> {
    return this.projectStorageService.listProjects();
  }

  async getProject(projectId: string): Promise<ProjectRecord> {
    return this.projectStorageService.readProjectRecord(projectId);
  }

  async generate(projectId: string, dto: GeneratePptDto): Promise<PipelineResult> {
    return this.pipelineService.generateProjectPpt(projectId, {
      requestedSlides: dto.requestedSlides,
      refinementRounds: dto.refinementRounds,
    });
  }
}
