export class UpdateWorkflowDto {
  name?: string;

  description?: string | null;

  status?: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
}