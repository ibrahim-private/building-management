import { Check, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SectionCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/feedback';
import { PageHeader, SegmentedControl, Switch } from '@/components/ui/misc';
import { PRIMARY_COLOR_OPTIONS } from '@/constants/app';
import { useAction } from '@/hooks/useAction';
import { useSettings } from '@/hooks/useData';
import { updateSettings } from '@/services/settings/settingsService';
import type { AppSettings } from '@/types';
import { cn } from '@/utils/cn';
import { BackupSection } from './BackupSection';

export function SettingsPage() {
  const settings = useSettings();
  const { run } = useAction();
  const [duration, setDuration] = useState('');

  useEffect(() => {
    if (settings) setDuration(String(settings.defaultDurationDays));
  }, [settings?.defaultDurationDays]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!settings) return <LoadingState />;

  const save = (patch: Partial<AppSettings>, message = 'تم حفظ الإعداد') => run(() => updateSettings(patch), message);

  const durationNumber = Number(duration);
  const durationValid = Number.isInteger(durationNumber) && durationNumber >= 1 && durationNumber <= 366;

  return (
    <div className="space-y-5">
      <PageHeader title="الإعدادات" />

      <SectionCard title="المظهر">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">الوضع</p>
            <SegmentedControl
              value={settings.theme}
              onChange={(theme) => void save({ theme })}
              options={[
                { value: 'light', label: 'فاتح' },
                { value: 'dark', label: 'داكن' },
              ]}
            />
            <span className="ms-3 inline-flex align-middle text-muted" aria-hidden>
              {settings.theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </span>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">اللون الرئيسي</p>
            <div className="flex flex-wrap gap-3">
              {PRIMARY_COLOR_OPTIONS.map((opt) => {
                const selected = settings.primaryColor === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => void save({ primaryColor: opt.value })}
                    className={cn(
                      'flex min-h-[44px] items-center gap-2 rounded-xl border px-3 text-sm font-semibold',
                      selected ? 'border-primary bg-primary-soft text-primary-ink' : 'border-line text-muted hover:bg-soft',
                    )}
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full text-white" style={{ background: opt.swatch }}>
                      {selected && <Check className="h-4 w-4" aria-hidden />}
                    </span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="إعدادات الفترات">
        <div className="space-y-5">
          <div>
            <label htmlFor="duration" className="mb-1.5 block text-sm font-semibold text-ink">
              المدة الافتراضية للفترة (بالأيام)
            </label>
            <div className="flex flex-wrap items-start gap-2">
              <input
                id="duration"
                type="number"
                inputMode="numeric"
                min={1}
                max={366}
                className="input-base w-32"
                value={duration}
                aria-invalid={!durationValid || undefined}
                onChange={(e) => setDuration(e.target.value)}
              />
              <Button
                variant="secondary"
                disabled={!durationValid || durationNumber === settings.defaultDurationDays}
                onClick={() => void save({ defaultDurationDays: durationNumber })}
              >
                حفظ
              </Button>
            </div>
            {!durationValid ? (
              <p role="alert" className="mt-1 text-sm text-danger-fg">أدخل عدداً صحيحاً بين 1 و 366.</p>
            ) : (
              <p className="mt-1 text-sm text-muted">30 = شهر، 60 = شهران. تُستخدم كاقتراح عند إنشاء فترة جديدة.</p>
            )}
          </div>

          <Switch
            label="إنشاء الفترات تلقائياً"
            description="إذا انتهت الفترة الحالية، تُنشأ فترة جديدة عند فتح التطبيق بنفس المدة وبنفس مبالغ كل وحدة، وتُغلق الفترة القديمة دون تغيير أي بيانات، وسيُطلب منك مراجعة الفترة الجديدة. الافتراضي: يدوي."
            checked={settings.autoCreatePeriods}
            onCheckedChange={(autoCreatePeriods) =>
              void save({ autoCreatePeriods }, autoCreatePeriods ? 'تم تفعيل الإنشاء التلقائي' : 'عاد الإنشاء إلى الوضع اليدوي')
            }
          />
        </div>
      </SectionCard>

      <BackupSection />
    </div>
  );
}
