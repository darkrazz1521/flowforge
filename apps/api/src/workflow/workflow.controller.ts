import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { WorkflowService } from './workflow.service.js';

import { CreateWorkflowDto } from './dto/create-workflow.dto.js';
import { UpdateWorkflowDto } from './dto/update-workflow.dto.js';

@Controller('workflows')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateWorkflowDto,
  ): Promise<unknown> {
    return this.workflowService.create(dto);
  }

  @Get()
  findAll(): Promise<unknown> {
    return this.workflowService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<unknown> {
    return this.workflowService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkflowDto,
  ): Promise<unknown> {
    return this.workflowService.update(id, dto);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<unknown> {
    return this.workflowService.remove(id);
  }
}