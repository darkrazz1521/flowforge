import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { db } from './db.js';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await db.connect();
  }

  async onModuleDestroy() {
    await db.close();
  }

  get client() {
    return db;
  }
}