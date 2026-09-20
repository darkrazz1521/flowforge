export type WorkflowNodeType =
  | 'TASK'
  | 'HTTP'
  | 'DELAY'
  | 'CONDITION';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export class CreateWorkflowNodeDto {
  workflowId!: number;

  name!: string;

  type!: WorkflowNodeType;

  position!: number;

  config?: JsonValue | null;
}