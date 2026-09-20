import dotenv from 'dotenv';

dotenv.config({
  path: '../api/.env',
});

import postgres from '@prisma/orm-postgres/runtime';

import contractJson from '../../api/src/prisma/contract.json' with {
  type: 'json',
};

const db = postgres({
  contractJson,
  url: process.env['DATABASE_URL']!,
});

async function test() {
  console.log('DATABASE_URL:', process.env['DATABASE_URL']);

  console.log('Connecting to PostgreSQL...');

  await db.connect();

  console.log('PostgreSQL connected successfully');

  const workflows =
    await db.orm.public.Workflow.all();

  console.log('Workflows:', workflows);

  await db.close();

  console.log('Database connection closed');
}

test().catch(async (error) => {
  console.error('Database test failed:', error);

  try {
    await db.close();
  } catch {}

  process.exit(1);
});