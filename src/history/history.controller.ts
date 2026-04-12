import { Controller, Get } from '@nestjs/common';
import { historyStore } from '../lib/history/store';

@Controller('api/history')
export class HistoryController {
  @Get()
  async getHistory() {
    return historyStore.list();
  }
}
