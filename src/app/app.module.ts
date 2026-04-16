import { Module } from '@nestjs/common';
import { JobsModule } from './jobs/jobs.module';
import { TemplatesModule } from './templates/templates.module';
import { HistoryModule } from './history/history.module';
import { LlmModule } from './llm/llm.module';

@Module({
  imports: [
    JobsModule,
    TemplatesModule,
    HistoryModule,
    LlmModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}