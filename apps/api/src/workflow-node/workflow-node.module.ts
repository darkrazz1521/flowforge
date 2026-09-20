import { Module } from '@nestjs/common';

import { WorkflowNodeController } from './workflow-node.controller.js';
import { WorkflowNodeService } from './workflow-node.service.js';

@Module({
  controllers: [WorkflowNodeController],
  providers: [WorkflowNodeService],
  exports: [WorkflowNodeService],
})
export class WorkflowNodeModule {}