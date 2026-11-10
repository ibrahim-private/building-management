import { zodResolver } from '@hookform/resolvers/zod';
import { Building, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MoneyField, TextField } from '@/components/ui/Field';
import { LoadingState, Notice } from '@/components/ui/feedback';
import { useAction } from '@/hooks/useAction';
import { useSettings } from '@/hooks/useData';
import { completeSetup } from '@/services/settings/setupService';
import { todayISO } from '@/utils/date';
import { dateInput, moneyToMinor, nonNegativeMoneyInput } from '@/utils/validation';

const schema = z.object({ balance: nonNegativeMoneyInput, date: dateInput });
type FormValues = z.infer<typeof schema>;

/** First launch: record the treasury's existing balance as the opening transaction. */
export function SetupPage() {
  const settings = useSettings();
  const navigate = useNavigate();
  const { run, pending } = useAction();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { balance: '', date: todayISO() },
  });

  if (!settings) return <LoadingState />;
  if (settings.setupCompleted) return <Navigate to="/" replace />;

  const onSubmit = handleSubmit(async (values) => {
    const result = await run(() => completeSetup(moneyToMinor(values.balance), values.date), 'تم إعداد التطبيق بنجاح');
    if (result.ok) navigate('/', { replace: true });
  });

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-sm">
            <Building className="h-8 w-8" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold text-ink">أهلاً بك في إدارة العمارة</h1>
          <p className="mt-2 text-muted">
            قبل البدء، أدخل المبلغ الموجود حالياً في خزينة العمارة. سيُسجَّل كرصيد افتتاحي ويمكنك تعديل الخزينة لاحقاً بحركة يدوية.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <MoneyField
            label="رصيد الخزينة الحالي"
            required
            placeholder="0"
            hint="اكتب 0 إذا كانت الخزينة فارغة."
            error={errors.balance?.message}
            {...register('balance')}
          />
          <TextField label="تاريخ الرصيد" type="date" required error={errors.date?.message} {...register('date')} />
          <Button type="submit" size="lg" className="w-full" loading={pending}>
            ابدأ الاستخدام
          </Button>
        </form>

        <Notice tone="info" className="mt-6">
          <span className="flex items-start gap-2">
            <ShieldCheck className="mt-1 h-4 w-4 shrink-0" aria-hidden />
            كل البيانات تُحفظ على هذا الجهاز فقط ولا تُرسل لأي مكان. التطبيق يعمل بدون إنترنت، ولا تنسَ أخذ نسخة احتياطية من الإعدادات بشكل دوري.
          </span>
        </Notice>
      </Card>
    </div>
  );
}
