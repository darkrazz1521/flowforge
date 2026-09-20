export class CreateWorkflowDto {
  name!: string;

  description?: string | null;

  status?: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

  ownerId!: number;
}