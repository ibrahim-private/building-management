import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { MoneyField, SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useAction } from '@/hooks/useAction';
import { addManualAdjustment } from '@/services/finance/treasuryService';
import { todayISO } from '@/utils/date';
import { dateInput, moneyToMinor, positiveMoneyInput } from '@/utils/validation';

const schema = z.object({
  direction: z.enum(['in', 'out']),
  amount: positiveMoneyInput,
  date: dateInput,
  reason: z.string().trim().min(1, 'اكتب سبب التعديل').max(300, 'السبب طويل جداً'),
});
type Values = z.infer<typeof schema>;

export function ManualAdjustmentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { run, pending } = useAction();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { direction: 'in', amount: '', date: todayISO(), reason: '' },
  });

  useEffect(() => {
    if (open) reset({ direction: 'in', amount: '', date: todayISO(), reason: '' });
  }, [open, reset]);

  const onSubmit = handleSubmit(async (v) => {
    const result = await run(
      () => addManualAdjustment({ direction: v.direction, amount: moneyToMinor(v.amount), date: v.date, reason: v.reason }),
      'تم تسجيل التعديل',
    );
    if (result.ok) onClose();
  });

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && !pending && onClose()}
      title="تعديل يدوي على الخزينة"
      description="استخدمه لمبلغ لا يتبع تحصيلاً أو مصروفاً (مثل تبرع أو تصحيح)."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            إلغاء
          </Button>
          <Button type="submit" form="adjust-form" loading={pending}>
            تسجيل
          </Button>
        </>
      }
    >
      <form id="adjust-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        <SelectField label="نوع التعديل" {...register('direction')}>
          <option value="in">إضافة إلى الخزينة</option>
          <option value="out">خصم من الخزينة</option>
        </SelectField>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MoneyField label="المبلغ" required error={errors.amount?.message} {...register('amount')} />
          <TextField label="التاريخ" type="date" required error={errors.date?.message} {...register('date')} />
        </div>
        <TextAreaField label="السبب / الملاحظات" required error={errors.reason?.message} {...register('reason')} />
      </form>
    </Modal>
  );
}
