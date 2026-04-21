import { Module } from '@nestjs/common';

import { ProjectStorageService } from './project-storage.service';

@Module({
  providers: [ProjectStorageService],
  exports: [ProjectStorageService],
})
export class StorageModule {}
