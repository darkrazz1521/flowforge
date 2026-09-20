import { Module } from '@nestjs/common';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { PrismaModule } from './prisma/prisma.module.js';
import { WorkflowModule } from './workflow/workflow.module.js';
import { WorkflowNodeModule } from './workflow-node/workflow-node.module.js';
import { JobModule } from './job/job.module.js';
import { ExecutionModule } from './execution/execution.module.js';
import { QueueModule } from './queue/queue.module.js';

@Module({
  imports: [
    PrismaModule,
    WorkflowModule,
    WorkflowNodeModule,
    JobModule,
    ExecutionModule,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}