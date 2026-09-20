import { Redis } from 'ioredis';
import { Queue } from 'bullmq';

const connection = new Redis({
  host: '127.0.0.1',
  port: 6379,
  maxRetriesPerRequest: null,
});

const queue = new Queue(
  'workflow-execution',
  {
    connection,
  },
);

const main = async () => {
  const job = await queue.add(
    'execute-workflow',
    {
      workflowId: 4,
      payload: {
        message: 'Hello from BullMQ',
      },
    },
  );

  console.log(
    'Job added:',
    job.id,
  );

  await queue.close();
  await connection.quit();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});