import { db } from './db.js';

async function test() {
  await db.connect();

  try {
    const result = await db.raw.sql`SELECT 1 AS value`;

    console.log('RESULT:', result);
    console.log('TYPE:', typeof result);
    console.log('IS ARRAY:', Array.isArray(result));
  } finally {
    await db.close();
  }
}

test().catch((error) => {
  console.error(error);
  process.exit(1);
});