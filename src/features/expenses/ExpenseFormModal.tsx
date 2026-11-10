import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { MoneyField, SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Notice } from '@/components/ui/feedback';
import { useAction } from '@/hooks/useAction';
import { usePeriodResolution, usePeriods } from '@/hooks/useData';
import { createExpense, updateExpense } from '@/services/finance/expenseService';
import type { Expense } from '@/types';
import { isValidISODate, todayISO } from '@/utils/date';
import { minorToInputString } from '@/utils/money';
import { dateInput, moneyToMinor, positiveMoneyInput } from '@/utils/validation';

const schema = z.object({
  title: z.string().trim().min(1, 'اكتب عنوان المصروف').max(100, 'العنوان طويل جداً'),
  amount: positiveMoneyInput,
  date: dateInput,
  notes: z.string().trim().max(1000, 'الملاحظات طويلة جداً'),
  periodId: z.string(),
});
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  expense?: Expense;
}

export function ExpenseFormModal({ open, onClose, expense }: Props) {
  const periods = usePeriods();
  const { run, pending } = useAction();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    setValue,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', amount: '', date: todayISO(), notes: '', periodId: '' },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      title: expense?.title ?? '',
      amount: expense ? minorToInputString(expense.amount) : '',
      date: expense?.date ?? todayISO(),
      notes: expense?.notes ?? '',
      periodId: expense?.periodId ?? '',
    });
  }, [open, expense, reset]);

  const date = watch('date');
  const periodId = watch('periodId');
  const resolution = usePeriodResolution(isValidISODate(date) ? date : '0000-00-00');

  // The expense's date decides the period automatically when exactly one matches.
  useEffect(() => {
    if (resolution?.kind === 'single') setValue('periodId', resolution.period.id);
    else if (resolution && periodId && !periods?.some((p) => p.id === periodId)) {
      setValue('periodId', '');
    }
  }, [resolution, periods, periodId, setValue]);

  const paid = expense?.status === 'paid';
  const needsChoice = resolution?.kind !== 'single' && (periods?.length ?? 0) > 0;
  const choices =
    resolution?.kind === 'multiple' ? resolution.periods : needsChoice ? (periods ?? []) : [];

  const onSubmit = handleSubmit(async (values) => {
    if (needsChoice && !values.periodId && !paid) {
      setError('periodId', { message: 'اختر الفترة المالية لهذا المصروف' });
      return;
    }
    const input = {
      title: values.title,
      amount: moneyToMinor(values.amount),
      notes: values.notes,
      date: values.date,
      periodId: values.periodId || null,
    };
    const result = expense
      ? await run(() => updateExpense(expense.id, input), 'تم حفظ التعديلات')
      : await run(() => createExpense(input), 'تمت إضافة المصروف');
    if (result.ok) onClose();
  });

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && !pending && onClose()}
      title={expense ? 'تعديل المصروف' : 'إضافة مصروف'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            إلغاء
          </Button>
          <Button type="submit" form="expense-form" loading={pending}>
            حفظ
          </Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        {paid && (
          <Notice tone="info">
            هذا المصروف مدفوع، لذلك يمكن تعديل العنوان والملاحظات فقط. للتعديل الكامل تراجع عن الدفع أولاً.
          </Notice>
        )}
        {!expense && (
          <Notice tone="info">المصروف الجديد يكون "غير مدفوع" ولا يؤثر على الخزينة حتى تؤكد دفعه.</Notice>
        )}

        <TextField label="عنوان المصروف" required placeholder="مثال: فاتورة كهرباء السلم" error={errors.title?.message} {...register('title')} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MoneyField label="المبلغ" required disabled={paid} error={errors.amount?.message} {...register('amount')} />
          <TextField label="تاريخ المصروف" type="date" required disabled={paid} error={errors.date?.message} {...register('date')} />
        </div>

        {/* Period assignment feedback */}
        {!paid && resolution?.kind === 'single' && (
          <Notice tone="success">سيُربط هذا المصروف تلقائياً بالفترة: <b>{resolution.period.name}</b></Notice>
        )}
        {!paid && resolution?.kind === 'none' && (periods?.length ?? 0) > 0 && (
          <Notice tone="warn" title="هذا التاريخ لا يقع ضمن أي فترة مالية">
            اختر الفترة التي تريد ربط المصروف بها، ولن نختار لك فترة بدون موافقتك.
          </Notice>
        )}
        {!paid && resolution?.kind === 'multiple' && (
          <Notice tone="warn" title="هذا التاريخ يقع ضمن أكثر من فترة">اختر الفترة المناسبة.</Notice>
        )}
        {!paid && choices.length > 0 && (
          <SelectField label="الفترة المالية" required error={errors.periodId?.message} {...register('periodId')}>
            <option value="">اختر الفترة...</option>
            {choices.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SelectField>
        )}

        <TextAreaField label="ملاحظات" placeholder="اختياري" error={errors.notes?.message} {...register('notes')} />
      </form>
    </Modal>
  );
}
