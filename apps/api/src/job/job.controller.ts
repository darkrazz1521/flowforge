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

import { JobService } from './job.service.js';

import { CreateJobDto } from './dto/create-job.dto.js';
import { UpdateJobDto } from './dto/update-job.dto.js';

@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post()
  create(@Body() dto: CreateJobDto): Promise<unknown> {
    return this.jobService.create(dto);
  }

  @Get()
  findAll(
    @Query('workflowId') workflowId?: string,
  ): Promise<unknown[]> {
    if (workflowId !== undefined) {
      return this.jobService.findByWorkflow(Number(workflowId));
    }

    return this.jobService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<unknown> {
    return this.jobService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateJobDto,
  ): Promise<unknown> {
    return this.jobService.update(id, dto);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<unknown> {
    return this.jobService.remove(id);
  }
}