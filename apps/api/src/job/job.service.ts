import { Injectable, NotFoundException } from '@nestjs/common';

import { db } from '../prisma/db.js';

import { CreateJobDto } from './dto/create-job.dto.js';
import { UpdateJobDto } from './dto/update-job.dto.js';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

@Injectable()
export class JobService {
  async create(dto: CreateJobDto): Promise<unknown> {
    const result = await db.orm.public.Job.create({
      workflowId: dto.workflowId,
      status: dto.status ?? 'PENDING',
      attempts: dto.attempts ?? 0,
      payload: dto.payload as JsonValue | null,
    });

    return result;
  }

  async findAll(): Promise<unknown[]> {
    const result = await db.orm.public.Job.all();

    return result;
  }

  async findByWorkflow(workflowId: number): Promise<unknown[]> {
    const result = await db.orm.public.Job
      .where({
        workflowId,
      })
      .all();

    return result;
  }

  async findOne(id: number): Promise<unknown> {
    const result = await db.orm.public.Job
      .where({
        id,
      })
      .first();

    if (!result) {
      throw new NotFoundException(`Job ${id} not found`);
    }

    return result;
  }

  async update(id: number, dto: UpdateJobDto): Promise<unknown> {
    const job = db.orm.public.Job.where({
      id,
    });

    const data = {
      ...(dto.status !== undefined && {
        status: dto.status,
      }),

      ...(dto.attempts !== undefined && {
        attempts: dto.attempts,
      }),

      ...(dto.payload !== undefined && {
        payload: dto.payload as JsonValue | null,
      }),

      ...(dto.result !== undefined && {
        result: dto.result as JsonValue | null,
      }),

      ...(dto.error !== undefined && {
        error: dto.error,
      }),

      ...(dto.startedAt !== undefined && {
        startedAt: dto.startedAt,
      }),

      ...(dto.completedAt !== undefined && {
        completedAt: dto.completedAt,
      }),
    };

    const result = await job.update(data);

    if (!result) {
      throw new NotFoundException(`Job ${id} not found`);
    }

    return result;
  }

  async remove(id: number): Promise<unknown> {
    const job = db.orm.public.Job.where({
      id,
    });

    const result = await job.delete();

    if (!result) {
      throw new NotFoundException(`Job ${id} not found`);
    }

    return {
      message: 'Job deleted successfully',
      job: result,
    };
  }
}