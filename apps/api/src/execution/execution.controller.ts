import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import { ExecutionService } from './execution.service.js';
import { ExecuteWorkflowDto } from './dto/execute-workflow.dto.js';

@Controller('executions')
export class ExecutionController {
  constructor(
    private readonly executionService: ExecutionService,
  ) {}

  @Post('workflows/:workflowId')
  executeWorkflow(
    @Param('workflowId', ParseIntPipe) workflowId: number,
    @Body() dto: ExecuteWorkflowDto,
  ) {
    return this.executionService.executeWorkflow(
      workflowId,
      dto.payload,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.executionService.findOne(id);
  }
}