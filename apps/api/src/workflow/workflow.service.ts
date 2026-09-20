import { Injectable, NotFoundException } from '@nestjs/common';

import { db } from '../prisma/db.js';

import { CreateWorkflowDto } from './dto/create-workflow.dto.js';
import { UpdateWorkflowDto } from './dto/update-workflow.dto.js';

@Injectable()
export class WorkflowService {
  async create(dto: CreateWorkflowDto): Promise<unknown> {
    return db.orm.public.Workflow.create({
      name: dto.name,
      description: dto.description ?? null,
      status: dto.status ?? 'ACTIVE',
      ownerId: dto.ownerId,
    });
  }

  async findAll(): Promise<unknown> {
    return db.orm.public.Workflow.all();
  }

  async findOne(id: number): Promise<unknown> {
    const workflow = await db.orm.public.Workflow
      .where({ id })
      .first();

    if (!workflow) {
      throw new NotFoundException(`Workflow ${id} not found`);
    }

    return workflow;
  }

  async update(id: number, dto: UpdateWorkflowDto): Promise<unknown> {
    const workflow = await db.orm.public.Workflow
      .where({ id })
      .update({
        ...(dto.name !== undefined
          ? {
              name: dto.name,
            }
          : {}),

        ...(dto.description !== undefined
          ? {
              description: dto.description,
            }
          : {}),

        ...(dto.status !== undefined
          ? {
              status: dto.status,
            }
          : {}),
      });

    if (!workflow) {
      throw new NotFoundException(`Workflow ${id} not found`);
    }

    return workflow;
  }

  async remove(id: number): Promise<unknown> {
    const workflow = await db.orm.public.Workflow
      .where({ id })
      .delete();

    if (!workflow) {
      throw new NotFoundException(`Workflow ${id} not found`);
    }

    return {
      message: 'Workflow deleted successfully',
      workflow,
    };
  }
}