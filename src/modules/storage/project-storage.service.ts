import path from 'node:path';

import { Injectable, NotFoundException } from '@nestjs/common';

import {
  ensureDir,
  listChildDirectories,
  pathExists,
  readBinaryFile,
  readTextFile,
  writeBinaryFile,
  writeTextFile,
} from '../../common/utils/file.util';
import { createProjectId } from '../../common/utils/id.util';
import { writeJsonFile } from '../../common/utils/json.util';
import { DocumentSourceType } from '../parser/types/parsed-document.type';

export interface ProjectRecord {
  id: string;
  title: string;
  sourceType: DocumentSourceType;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'generated';
  outputFile?: string;
}

@Injectable()
export class ProjectStorageService {
  private readonly projectsRoot = path.join(process.cwd(), 'data', 'projects');

  async createProject(input: {
    title?: string;
    content: string;
    sourceType: DocumentSourceType;
  }): Promise<ProjectRecord> {
    const now = new Date().toISOString();
    const id = createProjectId(input.title);
    const record: ProjectRecord = {
      id,
      title: input.title?.trim() || 'Untitled Presentation',
      sourceType: input.sourceType,
      createdAt: now,
      updatedAt: now,
      status: 'draft',
    };

    await ensureDir(this.getProjectDir(id));
    await ensureDir(this.getAssetsDir(id));
    await ensureDir(this.getOutputDir(id));
    await this.writeInputFile(id, input.sourceType, input.content);
    await this.writeProjectRecord(record);

    return record;
  }

  async listProjects(): Promise<ProjectRecord[]> {
    const projectIds = await listChildDirectories(this.projectsRoot);
    const records = await Promise.all(
      projectIds.map(async (projectId) => this.readProjectRecord(projectId).catch(() => null)),
    );

    return records.filter((record): record is ProjectRecord => record !== null);
  }

  async readProjectRecord(projectId: string): Promise<ProjectRecord> {
    const manifestPath = this.getManifestPath(projectId);
    if (!(await pathExists(manifestPath))) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return JSON.parse(await readTextFile(manifestPath)) as ProjectRecord;
  }

  async readInput(projectId: string): Promise<{ content: string; sourceType: DocumentSourceType }> {
    const record = await this.readProjectRecord(projectId);
    const inputPath = this.getInputPath(projectId, record.sourceType);

    if (record.sourceType === 'docx') {
      return {
        content: (await readBinaryFile(inputPath)).toString('base64'),
        sourceType: record.sourceType,
      };
    }

    return {
      content: await readTextFile(inputPath),
      sourceType: record.sourceType,
    };
  }

  async writeArtifact(projectId: string, fileName: string, payload: unknown): Promise<string> {
    const artifactPath = path.join(this.getProjectDir(projectId), fileName);
    await writeJsonFile(artifactPath, payload);
    return artifactPath;
  }

  async writeAsset(projectId: string, fileName: string, content: string): Promise<string> {
    const filePath = path.join(this.getAssetsDir(projectId), fileName);
    await writeTextFile(filePath, content);
    return filePath;
  }

  async updateGeneratedProject(projectId: string, outputFile: string): Promise<ProjectRecord> {
    const record = await this.readProjectRecord(projectId);
    const updatedRecord: ProjectRecord = {
      ...record,
      updatedAt: new Date().toISOString(),
      status: 'generated',
      outputFile,
    };
    await this.writeProjectRecord(updatedRecord);
    return updatedRecord;
  }

  getOutputPptxPath(projectId: string, title: string): string {
    const safeName = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return path.join(this.getOutputDir(projectId), `${safeName || 'presentation'}.pptx`);
  }

  private async writeProjectRecord(record: ProjectRecord): Promise<void> {
    await writeJsonFile(this.getManifestPath(record.id), record);
  }

  private getProjectDir(projectId: string): string {
    return path.join(this.projectsRoot, projectId);
  }

  private getManifestPath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'project.json');
  }

  private getInputPath(projectId: string, sourceType: DocumentSourceType): string {
    return path.join(this.getProjectDir(projectId), this.getInputFileName(sourceType));
  }

  private getAssetsDir(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'assets');
  }

  private getOutputDir(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'output');
  }

  private getInputFileName(sourceType: DocumentSourceType): string {
    switch (sourceType) {
      case 'txt':
        return 'input.txt';
      case 'html':
        return 'input.html';
      case 'docx':
        return 'input.docx';
      case 'markdown':
      default:
        return 'input.md';
    }
  }

  private async writeInputFile(
    projectId: string,
    sourceType: DocumentSourceType,
    content: string,
  ): Promise<void> {
    const inputPath = this.getInputPath(projectId, sourceType);
    if (sourceType === 'docx') {
      await writeBinaryFile(inputPath, Buffer.from(content, 'base64'));
      return;
    }

    await writeTextFile(inputPath, content);
  }
}
