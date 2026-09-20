import dotenv from 'dotenv';

dotenv.config({
  path: '../api/.env',
});

import { Redis } from 'ioredis';
import { Worker } from 'bullmq';
import postgres from '@prisma/orm-postgres/runtime';
import contractJson from '../../api/src/prisma/contract.json' with {
  type: 'json',
};

type JsonPrimitive =
  | string
  | number
  | boolean
  | null;

type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

const db = postgres({
  contractJson,
  url: process.env['DATABASE_URL']!,
});

await db.connect();

const connection = new Redis({
  host: '127.0.0.1',
  port: 6379,
  maxRetriesPerRequest: null,
});

type WorkflowNode = {
  id: number;
  name: string;
  type: string;
  config: unknown;
};

function getConfig(
  config: unknown,
): Record<string, unknown> {
  if (
    config &&
    typeof config === 'object' &&
    !Array.isArray(config)
  ) {
    return config as Record<string, unknown>;
  }

  return {};
}

async function executeTask(
  node: WorkflowNode,
  payload: JsonValue,
): Promise<JsonValue> {
  const config = getConfig(node.config);

  return {
    message: 'Task executed successfully',
    nodeId: node.id,
    nodeName: node.name,
    task: (config.task as JsonValue) ?? null,
    input: payload,
  };
}

async function executeHttp(
  node: WorkflowNode,
  payload: JsonValue,
): Promise<JsonValue> {
  const config = getConfig(node.config);

  const url = config.url;

  if (typeof url !== 'string' || url.length === 0) {
    throw new Error(
      `HTTP node ${node.id} requires a valid config.url`,
    );
  }

  const method =
    typeof config.method === 'string'
      ? config.method.toUpperCase()
      : 'GET';

  const headers: Record<string, string> = {};

if (
  config.headers &&
  typeof config.headers === 'object' &&
  !Array.isArray(config.headers)
) {
  for (const [key, value] of Object.entries(
    config.headers as Record<string, unknown>,
  )) {
    if (typeof value === 'string') {
      headers[key] = value;
    }
  }
}

const requestOptions: RequestInit = {
  method,
  headers,
};

if (method !== 'GET' && method !== 'DELETE') {
  headers['Content-Type'] =
    headers['Content-Type'] ?? 'application/json';

  requestOptions.body = JSON.stringify(
    config.body ?? payload,
  );
}

const response = await fetch(
  url,
  requestOptions,
);

  const contentType =
    response.headers.get('content-type') ?? '';

  const data: JsonValue =
    contentType.includes('application/json')
      ? ((await response.json()) as JsonValue)
      : await response.text();

  if (!response.ok) {
    throw new Error(
      `HTTP request failed with status ${response.status}`,
    );
  }

  return {
    message: 'HTTP request executed successfully',
    nodeId: node.id,
    nodeName: node.name,
    status: response.status,
    statusText: response.statusText,
    data,
  };
}

async function executeDelay(
  node: WorkflowNode,
  payload: JsonValue,
  jobId?: number,
): Promise<JsonValue> {
  const config = getConfig(node.config);

  const delay =
    typeof config.delay === 'number'
      ? config.delay
      : typeof config.ms === 'number'
        ? config.ms
        : 1000;

  if (delay < 0 || delay > 30000) {
    throw new Error(
      'Delay must be between 0 and 30000 milliseconds',
    );
  }

  const checkInterval = 250;
  let elapsed = 0;

  while (elapsed < delay) {
    if (
      jobId !== undefined &&
      await isJobCancelled(jobId)
    ) {
      console.log(
        `Database Job ${jobId} cancelled during delay node ${node.id}.`,
      );

      return {
        message: 'Delay cancelled',
        nodeId: node.id,
        nodeName: node.name,
        delay,
        input: payload,
        cancelled: true,
      };
    }

    const remaining = delay - elapsed;
    const waitTime = Math.min(
      checkInterval,
      remaining,
    );

    await new Promise<void>((resolve) => {
      setTimeout(resolve, waitTime);
    });

    elapsed += waitTime;
  }

  if (
    jobId !== undefined &&
    await isJobCancelled(jobId)
  ) {
    console.log(
      `Database Job ${jobId} cancelled after delay node ${node.id}.`,
    );

    return {
      message: 'Delay cancelled',
      nodeId: node.id,
      nodeName: node.name,
      delay,
      input: payload,
      cancelled: true,
    };
  }

  return {
    message: 'Delay completed successfully',
    nodeId: node.id,
    nodeName: node.name,
    delay,
    input: payload,
  };
}

async function executeCondition(
  node: WorkflowNode,
  payload: JsonValue,
): Promise<JsonValue> {
  const config = getConfig(node.config);

  const field = config.field;

  if (
    typeof field !== 'string' ||
    field.length === 0
  ) {
    throw new Error(
      `Condition node ${node.id} requires config.field`,
    );
  }

  const operator =
    typeof config.operator === 'string'
      ? config.operator
      : 'equals';

  const expected =
    (config.value as JsonValue) ?? null;

  const actual = getNestedValue(
    payload,
    field,
  );

  let condition = false;

  switch (operator) {
    case 'equals':
    case '==':
      condition = actual === expected;
      break;

    case 'not_equals':
    case '!=':
      condition = actual !== expected;
      break;

    case 'exists':
      condition =
        actual !== undefined &&
        actual !== null;
      break;

    case 'not_exists':
      condition =
        actual === undefined ||
        actual === null;
      break;

    case 'contains':
      condition =
        typeof actual === 'string' &&
        typeof expected === 'string' &&
        actual.includes(expected);
      break;

    case 'greater_than':
    case '>':
      condition =
        typeof actual === 'number' &&
        typeof expected === 'number' &&
        actual > expected;
      break;

    case 'less_than':
    case '<':
      condition =
        typeof actual === 'number' &&
        typeof expected === 'number' &&
        actual < expected;
      break;

    default:
      throw new Error(
        `Unsupported condition operator: ${operator}`,
      );
  }

  return {
    message: 'Condition evaluated successfully',
    nodeId: node.id,
    nodeName: node.name,
    field,
    operator,
    expected,
    actual:
      actual === undefined
        ? null
        : (actual as JsonValue),
    condition,
    input: payload,
  };
}

function getNestedValue(
  payload: unknown,
  path: string,
): unknown {
  if (
    payload === null ||
    payload === undefined
  ) {
    return undefined;
  }

  return path
    .split('.')
    .reduce<unknown>(
      (current, key) => {
        if (
          current !== null &&
          typeof current === 'object' &&
          !Array.isArray(current)
        ) {
          return (
            current as Record<string, unknown>
          )[key];
        }

        return undefined;
      },
      payload,
    );
}

async function executeNode(
  node: WorkflowNode,
  payload: JsonValue,
  jobId?: number,
): Promise<JsonValue> {
  switch (node.type) {
    case 'TASK':
      return executeTask(node, payload);

    case 'HTTP':
      return executeHttp(node, payload);

    case 'DELAY':
      return executeDelay(node, payload, jobId);

    case 'CONDITION':
      return executeCondition(node, payload);

    default:
      throw new Error(
        `Unsupported node type: ${node.type}`,
      );
  }
}

async function isJobCancelled(jobId: number): Promise<boolean> {
  const currentJob =
    await db.orm.public.Job
      .where({
        id: jobId,
      })
      .first();

  return currentJob?.status === 'CANCELLED';
}

const worker = new Worker(
  'workflow-execution',
  async (job) => {
    const {
      jobId,
      workflowId,
      payload,
    } = job.data as {
      jobId: number;
      workflowId: number;
      payload: JsonValue;
    };

    console.log('-----------------------------------');
    console.log('FlowForge Worker');
    console.log('BullMQ Job ID:', job.id);
    console.log('Database Job ID:', jobId);
    console.log('Workflow ID:', workflowId);
    console.log('Payload:', payload);
    console.log('-----------------------------------');

    

const attemptsMade = job.attemptsMade + 1;

if (await isJobCancelled(jobId)) {
  console.log(
    `Database Job ${jobId} was cancelled before execution.`,
  );

  return {
    cancelled: true,
    jobId,
  };
}

const currentJob =
  await db.orm.public.Job
    .where({
      id: jobId,
    })
    .first();

if (!currentJob) {
  throw new Error(
    `Database Job ${jobId} not found`,
  );
}

if (currentJob.status === 'CANCELLED') {
  console.log(
    `Database Job ${jobId} was cancelled before execution.`,
  );

  return {
    cancelled: true,
    jobId,
  };
}

const startedAt =
  currentJob.startedAt ??
  new Date().toISOString();

await db.orm.public.Job
  .where({
    id: jobId,
  })
  .update({
    status: 'RUNNING',
    attempts: attemptsMade,
    startedAt,
    completedAt: null,
  });



    try {
      const nodes =
        await db.orm.public.WorkflowNode
          .where({
            workflowId,
          })
          .orderBy(
            (node) => node.position.asc(),
          )
          .all();

      if (nodes.length === 0) {
        throw new Error(
          `Workflow ${workflowId} has no nodes`,
        );
      }

      let currentPayload: JsonValue =
        payload ?? null;

      const results: JsonValue[] = [];

      for (const rawNode of nodes) {
  const node = rawNode as WorkflowNode;

  if (await isJobCancelled(jobId)) {
    console.log(
      `Database Job ${jobId} cancelled. Stopping workflow execution.`,
    );

    return {
      cancelled: true,
      jobId,
    };
  }

  console.log(
    `Executing node ${node.id}: ${node.name}`,
  );

  const result =
    await executeNode(
      node,
      currentPayload,
       jobId,
    );

  results.push({
    nodeId: node.id,
    type: node.type,
    result,
  });

  currentPayload = result;
}

      const finalResult: JsonValue = {
        workflowId,
        jobId,
        results,
      };

      if (await isJobCancelled(jobId)) {
  console.log(
    `Database Job ${jobId} was cancelled before completion.`,
  );

  return {
    cancelled: true,
    jobId,
  };
}

      await db.orm.public.Job
        .where({
          id: jobId,
        })
        .update({
  status: 'COMPLETED',
  result: finalResult,
  completedAt: new Date().toISOString(),
  error: null,
});

      console.log(
        `Database Job ${jobId} completed successfully`,
      );

      return finalResult;
        } catch (error) {
  const message =
    error instanceof Error
      ? error.message
      : 'Workflow execution failed';

  const cancelled = await isJobCancelled(jobId);

  if (cancelled) {
    console.log(
      `Database Job ${jobId} was cancelled. Ignoring execution failure.`,
    );

    return {
      cancelled: true,
      jobId,
    };
  }

  const maxAttempts =
    job.opts.attempts ?? 1;

  const isFinalAttempt =
    job.attemptsMade + 1 >= maxAttempts;

  if (!isFinalAttempt) {
    console.log(
      `Database Job ${jobId} entering RETRYING state. ` +
      `Attempt ${attemptsMade}/${maxAttempts}`,
    );
  }

  await db.orm.public.Job
    .where({
      id: jobId,
    })
    .update({
      status: isFinalAttempt
        ? 'FAILED'
        : 'RETRYING',

      attempts: attemptsMade,

      error: message,

      completedAt: isFinalAttempt
        ? new Date().toISOString()
        : null,
    });

  console.error(
    `Database Job ${jobId} failed:`,
    message,
  );

  if (!isFinalAttempt) {
    console.log(
      `BullMQ will retry Database Job ${jobId}. ` +
      `Attempt ${attemptsMade}/${maxAttempts}`,
    );
  } else {
    console.log(
      `Database Job ${jobId} exhausted all ${maxAttempts} attempts.`,
    );
  }

  throw error;
}
  },
  {
    connection,
  },
);

worker.on('completed', (job) => {
  console.log(
    `BullMQ Job ${job.id} completed`,
  );
});

worker.on('failed', (job, error) => {
  console.error(
    `BullMQ Job ${job?.id} failed:`,
    error.message,
  );
});

worker.on('error', (error) => {
  console.error(
    'Worker error:',
    error,
  );
});

console.log(
  'FlowForge Worker started',
);

console.log(
  'Listening on queue: workflow-execution',
);

const shutdown = async () => {
  console.log(
    'FlowForge Worker shutting down...',
  );

  await worker.close();
  await connection.quit();
  await db.close();

  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);