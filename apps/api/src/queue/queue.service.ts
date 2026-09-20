import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly connection = new Redis({
    host: '127.0.0.1',
    port: 6379,
    maxRetriesPerRequest: null,
  });

  private readonly queue = new Queue(
    'workflow-execution',
    {
      connection: this.connection,
    },
  );

  async addWorkflowJob(
    jobId: number,
    workflowId: number,
    payload: unknown,
  ) {
    return this.queue.add(
      'execute-workflow',
      {
        jobId,
        workflowId,
        payload,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: false,
        removeOnFail: false,
      },
    );
  }

  async cancelWorkflowJob(
  jobId: number,
): Promise<boolean> {
  const jobs = await this.queue.getJobs([
    'waiting',
    'delayed',
    'active',
  ]);

  for (const job of jobs) {
    const data = job.data as {
      jobId?: number;
    };

    if (data.jobId !== jobId) {
      continue;
    }

    try {
      const state = await job.getState();

      console.log(
        `Cancelling BullMQ Job ${job.id} for Database Job ${jobId}. State: ${state}`,
      );

      if (
        state === 'waiting' ||
        state === 'delayed'
      ) {
        await job.remove();

        console.log(
          `BullMQ Job ${job.id} removed.`,
        );

        return true;
      }

      if (state === 'active') {
        console.log(
          `BullMQ Job ${job.id} is currently active. Worker cancellation check will stop execution.`,
        );

        return false;
      }
    } catch (error) {
      console.error(
        `Failed to cancel BullMQ Job for Database Job ${jobId}:`,
        error,
      );

      return false;
    }
  }

  return false;
}

  async onModuleDestroy() {
    await this.queue.close();
    await this.connection.quit();
  }
}