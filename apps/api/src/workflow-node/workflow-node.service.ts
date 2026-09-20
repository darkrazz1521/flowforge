import { Injectable, NotFoundException } from '@nestjs/common';

import { db } from '../prisma/db.js';

import { CreateWorkflowNodeDto } from './dto/create-workflow-node.dto.js';
import { UpdateWorkflowNodeDto } from './dto/update-workflow-node.dto.js';

@Injectable()
export class WorkflowNodeService {
  async create(dto: CreateWorkflowNodeDto): Promise<any> {
    return db.orm.public.WorkflowNode.create({
      workflowId: dto.workflowId,
      name: dto.name,
      type: dto.type,
      position: dto.position,
      ...(dto.config !== undefined
        ? { config: dto.config }
        : {}),
    });
  }

  async findAll(workflowId?: number): Promise<any[]> {
    if (workflowId !== undefined) {
      return db.orm.public.WorkflowNode
        .where((node) => node.workflowId.eq(workflowId))
        .orderBy((node) => node.position.asc())
        .all();
    }

    return db.orm.public.WorkflowNode
      .orderBy((node) => node.position.asc())
      .all();
  }

  async findOne(id: number): Promise<any> {
    const result = await db.orm.public.WorkflowNode
      .where((node) => node.id.eq(id))
      .first();

    if (!result) {
      throw new NotFoundException(
        `Workflow node ${id} not found`,
      );
    }

    return result;
  }

  async update(
    id: number,
    dto: UpdateWorkflowNodeDto,
  ): Promise<any> {
    const node = db.orm.public.WorkflowNode
      .where((item) => item.id.eq(id));

    const existing = await node.first();

    if (!existing) {
      throw new NotFoundException(
        `Workflow node ${id} not found`,
      );
    }

    return node.update({
      ...(dto.name !== undefined
        ? { name: dto.name }
        : {}),

      ...(dto.type !== undefined
        ? { type: dto.type }
        : {}),

      ...(dto.position !== undefined
        ? { position: dto.position }
        : {}),

      ...(dto.config !== undefined
        ? { config: dto.config }
        : {}),
    });
  }

  async remove(id: number): Promise<any> {
    const node = db.orm.public.WorkflowNode
      .where((item) => item.id.eq(id));

    const existing = await node.first();

    if (!existing) {
      throw new NotFoundException(
        `Workflow node ${id} not found`,
      );
    }

    const deleted = await node.delete();

    return {
      message: 'Workflow node deleted successfully',
      node: deleted,
    };
  }
}