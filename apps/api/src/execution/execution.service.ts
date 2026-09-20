import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { db } from '../prisma/db.js';
import { QueueService } from '../queue/queue.service.js';

type JsonPrimitive =
  | string
  | number
  | boolean
  | null;

type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

@Injectable()
export class ExecutionService {
  constructor(
    private readonly queueService: QueueService,
  ) {}

  async executeWorkflow(
    workflowId: number,
    payload?: unknown,
  ): Promise<unknown> {
    const workflow =
      await db.orm.public.Workflow
        .where({
          id: workflowId,
        })
        .first();

    if (!workflow) {
      throw new NotFoundException(
        `Workflow ${workflowId} not found`,
      );
    }

    const nodes =
      await db.orm.public.WorkflowNode
        .where({
          workflowId,
        })
        .all();

    if (nodes.length === 0) {
      throw new BadRequestException(
        `Workflow ${workflowId} has no nodes`,
      );
    }

    const job =
      await db.orm.public.Job.create({
        workflowId,
        status: 'PENDING',
        attempts: 0,
        payload: (payload ?? null) as JsonValue,
      });

    try {
      const queueJob =
        await this.queueService.addWorkflowJob(
          job.id,
          workflowId,
          payload ?? null,
        );

      console.log(
        `Workflow ${workflowId} queued`,
      );

      console.log(
        `Database Job ID: ${job.id}`,
      );

      console.log(
        `BullMQ Job ID: ${queueJob.id}`,
      );

      return job;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to queue workflow';

      await db.orm.public.Job
        .where({
          id: job.id,
        })
        .update({
          status: 'FAILED',
          error: message,
          completedAt: null,
        });

      throw error;
    }
  }

  async findOne(
    id: number,
  ): Promise<unknown> {
    const job =
      await db.orm.public.Job
        .where({
          id,
        })
        .first();

    if (!job) {
      throw new NotFoundException(
        `Execution ${id} not found`,
      );
    }

    return job;
  }
    async cancel(id: number): Promise<unknown> {
    const job = await db.orm.public.Job
      .where({
        id,
      })
      .first();

    if (!job) {
      throw new NotFoundException(
        `Execution ${id} not found`,
      );
    }

    if (
      job.status === 'COMPLETED' ||
      job.status === 'FAILED' ||
      job.status === 'CANCELLED'
    ) {
      throw new BadRequestException(
        `Execution ${id} cannot be cancelled because it is already ${job.status}`,
      );
    }

    const result = await db.orm.public.Job
      .where({
        id,
      })
      .update({
        status: 'CANCELLED',
        completedAt: new Date().toISOString(),
      });

    if (!result) {
      throw new NotFoundException(
        `Execution ${id} not found`,
      );
    }

    console.log(
      `Execution ${id} cancelled`,
    );

    return result;
  }
}