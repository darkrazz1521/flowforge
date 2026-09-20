import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { WorkflowNodeService } from './workflow-node.service.js';

import { CreateWorkflowNodeDto } from './dto/create-workflow-node.dto.js';
import { UpdateWorkflowNodeDto } from './dto/update-workflow-node.dto.js';

@Controller('workflow-nodes')
export class WorkflowNodeController {
  constructor(
    private readonly workflowNodeService: WorkflowNodeService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateWorkflowNodeDto,
  ): Promise<unknown> {
    return this.workflowNodeService.create(dto);
  }

  @Get()
  findAll(
    @Query('workflowId') workflowId?: string,
  ): Promise<unknown> {
    return this.workflowNodeService.findAll(
      workflowId !== undefined
        ? Number(workflowId)
        : undefined,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<unknown> {
    return this.workflowNodeService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkflowNodeDto,
  ): Promise<unknown> {
    return this.workflowNodeService.update(id, dto);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<unknown> {
    return this.workflowNodeService.remove(id);
  }
}