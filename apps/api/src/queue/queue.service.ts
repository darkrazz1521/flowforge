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

  async onModuleDestroy() {
    await this.queue.close();
    await this.connection.quit();
  }
}