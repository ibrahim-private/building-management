import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { FieldShell, MoneyField, TextField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Notice } from '@/components/ui/feedback';
import { unitLabel } from '@/constants/labels';
import { useAction } from '@/hooks/useAction';
import { usePeriodDraft } from '@/hooks/useData';
import { createPeriod, updatePeriod } from '@/services/period/periodService';
import type { FinancialPeriod } from '@/types';
import { addDaysISO, suggestPeriodName } from '@/utils/date';
import { AppError } from '@/utils/errors';
import { minorToInputString, parseMoneyInput } from '@/utils/money';
import { dateInput, moneyToMinor, positiveMoneyInput } from '@/utils/validation';

const schema = z
  .object({
    name: z.string().trim().min(1, 'اكتب اسم الفترة').max(60, 'الاسم طويل جداً'),
    startDate: dateInput,
    endDate: dateInput,
    amount: positiveMoneyInput,
  })
  .refine((v) => v.endDate >= v.startDate, { path: ['endDate'], message: 'تاريخ النهاية يجب أن يكون بعد البداية' });
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  /** Edit mode when provided; otherwise creates a new period. */
  period?: FinancialPeriod;
}

export function PeriodFormModal({ open, onClose, period }: Props) {
  const editing = Boolean(period);
  const draft = usePeriodDraft();
  const confirm = useConfirm();
  const { run, pending } = useAction();
  const [unitAmounts, setUnitAmounts] = useState<Record<string, string>>({});
  const [unitErrors, setUnitErrors] = useState<Record<string, string>>({});
  const [nameTouched, setNameTouched] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: '', startDate: '', endDate: '', amount: '' } });

  // Initialise once per opening.
  useEffect(() => {
    if (!open) return;
    setUnitErrors({});
    if (period) {
      reset({
        name: period.name,
        startDate: period.startDate,
        endDate: period.endDate,
        amount: minorToInputString(period.defaultAmount),
      });
      setNameTouched(true);
    } else if (draft) {
      reset({
        name: draft.name,
        startDate: draft.startDate,
        endDate: draft.endDate,
        amount: draft.defaultAmount ? minorToInputString(draft.defaultAmount) : '',
      });
      setUnitAmounts(
        Object.fromEntries(draft.units.map((u) => [u.unit.id, u.amount ? minorToInputString(u.amount) : ''])),
      );
      setNameTouched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, period?.id, draft === undefined]);

  // Keep the suggested name in step with the dates until the admin types their own.
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  useEffect(() => {
    if (!editing && !nameTouched && startDate && endDate && endDate >= startDate) {
      setValue('name', suggestPeriodName(startDate, endDate));
    }
  }, [startDate, endDate, editing, nameTouched, setValue]);

  const defaultAmountText = watch('amount');

  const applyDefaultToAll = () => {
    if (!draft) return;
    setUnitAmounts(Object.fromEntries(draft.units.map((u) => [u.unit.id, defaultAmountText])));
    setUnitErrors({});
  };

  const submit = handleSubmit(async (values) => {
    const defaultAmount = moneyToMinor(values.amount);

    const base = { name: values.name, startDate: values.startDate, endDate: values.endDate, defaultAmount };

    // Per-unit amounts (create mode only)
    let overrides: Record<string, number> | undefined;
    if (!editing && draft) {
      const errs: Record<string, string> = {};
      overrides = {};
      for (const { unit } of draft.units) {
        const text = (unitAmounts[unit.id] ?? '').trim();
        const minor = text === '' ? defaultAmount : parseMoneyInput(text);
        if (minor === null || minor <= 0) errs[unit.id] = 'مبلغ غير صالح';
        else overrides[unit.id] = minor;
      }
      setUnitErrors(errs);
      if (Object.keys(errs).length > 0) return;
    }

    const save = (allowOverlap: boolean) =>
      period
        ? updatePeriod(period.id, { ...base, allowOverlap })
        : createPeriod({ ...base, unitAmounts: overrides, allowOverlap });

    const message = editing ? 'تم حفظ الفترة' : 'تم إنشاء الفترة وتجهيز التزامات الوحدات';
    let result = await run(() => save(false), message);

    if (!result.ok && result.error instanceof AppError && result.error.code === 'OVERLAP') {
      const proceed = await confirm({
        title: 'الفترة تتداخل مع فترة أخرى',
        confirmText: 'متابعة رغم التداخل',
        description: `${result.error.message}\nهل تريد المتابعة؟ التداخل قد يجعل ربط المصروفات بالفترات غير واضح.`,
      });
      if (proceed) result = await run(() => save(true), message);
    }
    if (result.ok) onClose();
  });

  const unpaidOpen = draft?.openUnpaidCount ?? 0;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && !pending && onClose()}
      size="lg"
      title={editing ? 'تعديل الفترة المالية' : 'فترة مالية جديدة'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            إلغاء
          </Button>
          <Button type="submit" form="period-form" loading={pending}>
            {editing ? 'حفظ' : 'إنشاء الفترة'}
          </Button>
        </>
      }
    >
      <form id="period-form" onSubmit={submit} className="space-y-4" noValidate>
        {!editing && unpaidOpen > 0 && (
          <Notice tone="warn" title="تنبيه">
            يوجد {unpaidOpen} التزام غير مدفوع في فترات سابقة. إنشاء فترة جديدة لا يمسحها؛ ستبقى في سجلاتها ويمكنك تسجيل دفعها لاحقاً من سجل الفترة.
          </Notice>
        )}
        {!editing && (
          <Notice tone="info">
            سيتم إغلاق الفترة النشطة الحالية (إن وجدت) دون تغيير أي بيانات فيها، وتبدأ كل الوحدات النشطة "غير مدفوعة".
          </Notice>
        )}
        {editing && (
          <Notice tone="info">
            تعديل بيانات الفترة لا يغيّر الالتزامات ولا المدفوعات المسجلة. المبلغ الافتراضي يُستخدم للوحدات التي تُضاف لاحقاً.
          </Notice>
        )}

        <TextField
          label="اسم الفترة"
          required
          error={errors.name?.message}
          {...register('name', { onChange: () => setNameTouched(true) })}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="تاريخ البداية" type="date" required error={errors.startDate?.message} {...register('startDate')} />
          <TextField label="تاريخ النهاية" type="date" required error={errors.endDate?.message} {...register('endDate')} />
        </div>
        <div className="flex flex-wrap gap-2">
          {[30, 60, 90].map((days) => (
            <Button
              key={days}
              size="sm"
              variant="soft"
              onClick={() => startDate && setValue('endDate', addDaysISO(startDate, days - 1), { shouldValidate: true })}
            >
              {days === 30 ? 'شهر' : days === 60 ? 'شهران' : '3 أشهر'}
            </Button>
          ))}
        </div>

        <MoneyField
          label={editing ? 'المبلغ الافتراضي للوحدات' : 'مبلغ الاشتراك لكل وحدة'}
          required
          error={errors.amount?.message}
          {...register('amount')}
        />

        {!editing && draft && draft.units.length > 0 && (
          <FieldShell label="مبلغ كل وحدة (يمكن تعديله)" hint="تبدأ بمبلغ الفترة السابقة. غيّر ما تحتاجه فقط.">
            {() => (
              <div className="space-y-2 rounded-xl border border-line p-3">
                <div className="flex justify-end">
                  <Button size="sm" variant="ghost" onClick={applyDefaultToAll}>
                    تطبيق المبلغ أعلاه على الكل
                  </Button>
                </div>
                <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                  {draft.units.map(({ unit }) => (
                    <label key={unit.id} className="flex items-center gap-2">
                      <span className="w-28 shrink-0 truncate text-sm font-semibold text-ink">{unitLabel(unit)}</span>
                      <input
                        dir="ltr"
                        inputMode="decimal"
                        className="input-base min-h-[40px] py-1.5 text-start"
                        value={unitAmounts[unit.id] ?? ''}
                        aria-label={`مبلغ ${unitLabel(unit)}`}
                        aria-invalid={Boolean(unitErrors[unit.id]) || undefined}
                        onChange={(e) => setUnitAmounts((prev) => ({ ...prev, [unit.id]: e.target.value }))}
                      />
                      {unitErrors[unit.id] && <span className="text-xs text-danger-fg">{unitErrors[unit.id]}</span>}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </FieldShell>
        )}
        {!editing && draft && draft.units.length === 0 && (
          <Notice tone="warn">لا توجد وحدات نشطة بعد. أضف الشقق والمنشآت؛ ستحصل تلقائياً على التزام في الفترة النشطة.</Notice>
        )}
      </form>
    </Modal>
  );
}
