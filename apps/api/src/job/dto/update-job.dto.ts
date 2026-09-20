export class UpdateJobDto {
  status?:
    | 'PENDING'
    | 'RUNNING'
    | 'RETRYING'
    | 'COMPLETED'
    | 'FAILED'
    | 'CANCELLED';

  attempts?: number;

  payload?: unknown;

  result?: unknown;

  error?: string | null;

  startedAt?: string | null;

  completedAt?: string | null;
}