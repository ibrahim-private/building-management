import { Download, ShieldCheck, Upload } from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { SectionCard } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { Notice } from '@/components/ui/feedback';
import { useAction } from '@/hooks/useAction';
import { checkCurrentData, createBackup, parseBackup, restoreBackup } from '@/services/backup/backupService';
import { formatDateTime } from '@/utils/date';
import { downloadBlob } from '@/utils/download';

const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

export function BackupSection() {
  const fileInput = useRef<HTMLInputElement>(null);
  const confirm = useConfirm();
  const { run, pending } = useAction();

  const exportBackup = () =>
    run(async () => {
      const { blob, filename } = await createBackup();
      downloadBlob(blob, filename);
    }, 'تم تصدير النسخة الاحتياطية');

  const onFileChosen = async (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = ''; // allow choosing the same file again
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      toast.error('الملف كبير جداً ولا يبدو نسخة احتياطية صالحة.');
      return;
    }

    // Steps 1-3: read, validate structure/version, verify relationships. Nothing is written yet.
    const parsed = await run(async () => parseBackup(await file.text()));
    if (!parsed.ok) return;
    const { counts, exportedAt } = parsed.value;

    // Steps 4-5: explicit confirmation with a clear warning.
    const ok = await confirm({
      title: 'استعادة النسخة الاحتياطية؟',
      tone: 'danger',
      confirmText: 'استبدال البيانات الحالية',
      description:
        `⚠️ ستُستبدل كل البيانات الموجودة على هذا الجهاز بمحتوى الملف.\n` +
        `تاريخ النسخة: ${formatDateTime(new Date(exportedAt))}\n` +
        `يحتوي على: ${counts.units} وحدة، ${counts.periods} فترة، ${counts.obligations} التزام، ` +
        `${counts.expenses} مصروف، ${counts.transactions} حركة مالية.\n` +
        `يُنصح بتصدير نسخة من بياناتك الحالية أولاً.`,
    });
    if (!ok) return;

    // Steps 6-7: restore atomically, verified inside the same transaction.
    await run(() => restoreBackup(parsed.value), 'تمت استعادة البيانات والتحقق منها بنجاح');
  };

  const checkData = async () => {
    const result = await run(() => checkCurrentData());
    if (!result.ok) return;
    if (result.value.length === 0) toast.success('بياناتك سليمة، لا توجد أي مشكلة.');
    else {
      await confirm({
        title: 'تم العثور على مشاكل في البيانات',
        confirmText: 'حسناً',
        cancelText: 'إغلاق',
        description: `${result.value.join('\n')}\n\nصدّر نسخة احتياطية الآن واحتفظ بها قبل أي إجراء.`,
      });
    }
  };

  return (
    <SectionCard title="إدارة البيانات" description="بياناتك محفوظة على هذا الجهاز فقط، لذلك النسخ الاحتياطي مهم.">
      <div className="space-y-4">
        <Notice tone="info">
          لا توجد مزامنة سحابية: البيانات لا تنتقل بين الأجهزة تلقائياً. صدّر نسخة بشكل دوري واحفظها في مكان آمن (بريدك أو فلاشة).
        </Notice>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button size="lg" icon={<Download className="h-5 w-5" />} onClick={() => void exportBackup()} disabled={pending}>
            تصدير نسخة احتياطية
          </Button>
          <Button size="lg" variant="secondary" icon={<Upload className="h-5 w-5" />} onClick={() => fileInput.current?.click()} disabled={pending}>
            استعادة من ملف
          </Button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="اختيار ملف النسخة الاحتياطية"
          tabIndex={-1}
          onChange={(e) => void onFileChosen(e.target.files?.[0])}
        />

        <Button variant="ghost" icon={<ShieldCheck className="h-4 w-4" />} onClick={() => void checkData()} disabled={pending}>
          فحص سلامة البيانات
        </Button>
      </div>
    </SectionCard>
  );
}
