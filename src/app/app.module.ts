import { Module } from "@nestjs/common";
import { WorkflowsModule } from "./workflows/workflows.module";
import { TemplatesModule } from "./templates/templates.module";
import { HistoryModule } from "./history/history.module";
import { LlmModule } from "./llm/llm.module";

@Module({
  imports: [
    WorkflowsModule,
    TemplatesModule,
    HistoryModule,
    LlmModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
