import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { isValidISODate, todayISO } from '@/utils/date';

interface DatePromptDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  dateLabel?: string;
  confirmLabel: string;
  /** Runs the financial action; the dialog stays open and disabled while it runs. */
  onConfirm: (date: string) => Promise<boolean>;
}

/**
 * Confirmation dialog for payments: explains what will happen and asks for the
 * payment date (defaults to today). Buttons are disabled while saving so the
 * same payment cannot be triggered twice.
 */
export function DatePromptDialog({
  open,
  onClose,
  title,
  description,
  dateLabel = 'تاريخ الدفع',
  confirmLabel,
  onConfirm,
}: DatePromptDialogProps) {
  const [date, setDate] = useState(todayISO());
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) setDate(todayISO());
  }, [open]);

  const valid = isValidISODate(date);

  const submit = async () => {
    if (pending || !valid) return;
    setPending(true);
    try {
      const ok = await onConfirm(date);
      if (ok) onClose();
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && !pending && onClose()}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            إلغاء
          </Button>
          <Button onClick={submit} loading={pending} disabled={!valid}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="text-sm leading-7 text-muted">{description}</div>
        <TextField
          label={dateLabel}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={valid ? undefined : 'اختر تاريخاً صحيحاً'}
        />
      </div>
    </Modal>
  );
}
