export class CreateProjectDto {
  title?: string;

  content!: string;

  sourceType?: 'markdown' | 'txt' | 'html' | 'docx';
}
