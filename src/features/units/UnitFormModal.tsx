import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { SegmentedControl } from '@/components/ui/misc';
import { UNIT_TYPE_LABEL } from '@/constants/labels';
import { useAction } from '@/hooks/useAction';
import { createUnit, createUnitsBulk, updateUnit } from '@/services/units/unitService';
import type { Unit, UnitType } from '@/types';

const singleSchema = z.object({
  type: z.enum(['facility', 'apartment']),
  number: z.string().trim().min(1, 'اكتب رقم الوحدة').max(20, 'الرقم طويل جداً'),
  name: z.string().trim().max(80, 'الاسم طويل جداً'),
  notes: z.string().trim().max(1000, 'الملاحظات طويلة جداً'),
});
type SingleValues = z.infer<typeof singleSchema>;

const bulkSchema = z.object({
  type: z.enum(['facility', 'apartment']),
  quantity: z.number({ invalid_type_error: 'أدخل رقماً' }).int('أدخل رقماً صحيحاً').min(1, 'الحد الأدنى 1').max(200, 'الحد الأقصى 200'),
  firstNumber: z.number({ invalid_type_error: 'أدخل رقماً' }).int('أدخل رقماً صحيحاً').min(0, 'لا يمكن أن يكون سالباً'),
});
type BulkValues = z.infer<typeof bulkSchema>;

interface Props {
  open: boolean;
  onClose: () => void;
  /** When set, the modal edits this unit. Otherwise it adds new units. */
  unit?: Unit;
  defaultType?: UnitType;
}

export function UnitFormModal({ open, onClose, unit, defaultType = 'apartment' }: Props) {
  const editing = Boolean(unit);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const { run, pending } = useAction();

  const single = useForm<SingleValues>({
    resolver: zodResolver(singleSchema),
    defaultValues: { type: defaultType, number: '', name: '', notes: '' },
  });
  const bulk = useForm<BulkValues>({
    resolver: zodResolver(bulkSchema),
    defaultValues: { type: defaultType, quantity: 1, firstNumber: 1 },
  });

  useEffect(() => {
    if (!open) return;
    setMode('single');
    single.reset({
      type: unit?.type ?? defaultType,
      number: unit?.number ?? '',
      name: unit?.name ?? '',
      notes: unit?.notes ?? '',
    });
    bulk.reset({ type: defaultType, quantity: 1, firstNumber: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, unit?.id, defaultType]);

  const submitSingle = single.handleSubmit(async (v) => {
    const result = unit
      ? await run(() => updateUnit(unit.id, v), 'تم حفظ التعديلات')
      : await run(() => createUnit(v), 'تمت إضافة الوحدة');
    if (result.ok) onClose();
  });

  const submitBulk = bulk.handleSubmit(async (v) => {
    const result = await run(
      () => createUnitsBulk(v.type, v.quantity, v.firstNumber),
      `تمت إضافة ${v.quantity} وحدة`,
    );
    if (result.ok) onClose();
  });

  const formId = 'unit-form';
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && !pending && onClose()}
      title={editing ? 'تعديل بيانات الوحدة' : 'إضافة وحدات'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            إلغاء
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            {editing ? 'حفظ' : 'إضافة'}
          </Button>
        </>
      }
    >
      {!editing && (
        <SegmentedControl
          className="mb-4"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'single', label: 'وحدة واحدة' },
            { value: 'bulk', label: 'عدة وحدات متتالية' },
          ]}
        />
      )}

      {mode === 'single' ? (
        <form id={formId} onSubmit={submitSingle} className="space-y-4" noValidate>
          <SelectField label="النوع" disabled={editing} {...single.register('type')} hint={editing ? 'لا يمكن تغيير نوع الوحدة بعد إنشائها.' : undefined}>
            <option value="facility">{UNIT_TYPE_LABEL.facility}</option>
            <option value="apartment">{UNIT_TYPE_LABEL.apartment}</option>
          </SelectField>
          <TextField label="رقم الوحدة" required placeholder="مثال: 3" error={single.formState.errors.number?.message} {...single.register('number')} />
          <TextField label="اسم الساكن / المنشأة" placeholder="اختياري" error={single.formState.errors.name?.message} {...single.register('name')} />
          <TextAreaField
            label="ملاحظات دائمة"
            hint="تبقى مع الوحدة في كل الفترات (مثل: بيانات تواصل أو معلومات عامة)."
            error={single.formState.errors.notes?.message}
            {...single.register('notes')}
          />
        </form>
      ) : (
        <form id={formId} onSubmit={submitBulk} className="space-y-4" noValidate>
          <SelectField label="النوع" {...bulk.register('type')}>
            <option value="facility">{UNIT_TYPE_LABEL.facility}</option>
            <option value="apartment">{UNIT_TYPE_LABEL.apartment}</option>
          </SelectField>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="العدد" type="number" inputMode="numeric" min={1} max={200} error={bulk.formState.errors.quantity?.message} {...bulk.register('quantity', { valueAsNumber: true })} />
            <TextField label="يبدأ من رقم" type="number" inputMode="numeric" min={0} error={bulk.formState.errors.firstNumber?.message} {...bulk.register('firstNumber', { valueAsNumber: true })} />
          </div>
          <p className="text-sm text-muted">يمكنك إضافة الأسماء لاحقاً من خلال تعديل كل وحدة.</p>
        </form>
      )}
    </Modal>
  );
}
