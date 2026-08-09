import type { ExpenseStatus } from '../types';
import { STATUS_LABELS } from '../types';

const TAG_CLASS: Record<ExpenseStatus, string> = {
  approved: 'tag tag-accent-2',
  pending: 'tag tag-accent',
  needs_board: 'tag tag-outline',
  rejected: 'tag tag-neutral',
};

export function StatusTag({ status, reason }: { status: ExpenseStatus; reason?: string | null }) {
  return (
    <span className={TAG_CLASS[status]} style={{ whiteSpace: 'nowrap' }} title={reason ?? undefined}>
      {STATUS_LABELS[status]}
    </span>
  );
}
