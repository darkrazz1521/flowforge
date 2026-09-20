import type {
  JsonValue,
  WorkflowNodeType,
} from './create-workflow-node.dto.js';

export class UpdateWorkflowNodeDto {
  name?: string;

  type?: WorkflowNodeType;

  position?: number;

  config?: JsonValue | null;
}