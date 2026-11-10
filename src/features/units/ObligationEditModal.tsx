import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { MoneyField, TextAreaField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Notice } from '@/components/ui/feedback';
import { useAction } from '@/hooks/useAction';
import { setObligationAmount, setObligationNote } from '@/services/period/obligationService';
import type { FinancialPeriod, Obligation } from '@/types';
import { minorToInputString } from '@/utils/money';
import { moneyToMinor, positiveMoneyInput } from '@/utils/validation';

const schema = z.object({
  amount: positiveMoneyInput,
  note: z.string().trim().max(500, 'الملاحظة طويلة جداً'),
});
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  obligation: Obligation | null;
  period: FinancialPeriod | null;
}

/** Edits what one unit owes in ONE period, plus that period's private note. */
export function ObligationEditModal({ open, onClose, obligation, period }: Props) {
  const { run, pending } = useAction();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { amount: '', note: '' } });

  useEffect(() => {
    if (open && obligation) {
      reset({ amount: minorToInputString(obligation.amount), note: obligation.periodNote });
    }
  }, [open, obligation, reset]);

  const paid = obligation?.status === 'paid';

  const onSubmit = handleSubmit(async (values) => {
    if (!obligation) return;
    const result = await run(async () => {
      if (!paid && moneyToMinor(values.amount) !== obligation.amount) {
        await setObligationAmount(obligation.id, moneyToMinor(values.amount));
      }
      await setObligationNote(obligation.id, values.note);
    }, 'تم الحفظ');
    if (result.ok) onClose();
  });

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && !pending && onClose()}
      title="تعديل التزام الفترة"
      description={period?.name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            إلغاء
          </Button>
          <Button type="submit" form="obligation-form" loading={pending}>
            حفظ
          </Button>
        </>
      }
    >
      <form id="obligation-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        {paid && (
          <Notice tone="info">
            هذه الوحدة دفعت بالفعل، لذلك لا يمكن تعديل المبلغ. للتعديل تراجع عن الدفع أولاً، أما الملاحظة فيمكن تعديلها.
          </Notice>
        )}
        <MoneyField
          label="المبلغ المطلوب في هذه الفترة"
          disabled={paid}
          hint="يؤثر على هذه الفترة فقط ولا يغيّر الفترات الأخرى."
          error={errors.amount?.message}
          {...register('amount')}
        />
        <TextAreaField
          label="ملاحظة خاصة بهذه الفترة"
          hint="مثل: اتفاق خاص أو تأجيل. تبقى مرتبطة بهذه الفترة فقط."
          error={errors.note?.message}
          {...register('note')}
        />
      </form>
    </Modal>
  );
}
