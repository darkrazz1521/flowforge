import { Module } from '@nestjs/common';

import { ExecutionController } from './execution.controller.js';
import { ExecutionService } from './execution.service.js';
import { QueueModule } from '../queue/queue.module.js';

@Module({
  imports: [
    QueueModule,
  ],
  controllers: [
    ExecutionController,
  ],
  providers: [
    ExecutionService,
  ],
})
export class ExecutionModule {}