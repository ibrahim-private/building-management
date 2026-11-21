import { ArrowRight, Download, Printer } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState, Notice } from '@/components/ui/feedback';
import { SelectField } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/misc';
import { useAction } from '@/hooks/useAction';
import { useSettings, useSubscriptionSheet } from '@/hooks/useData';
import { renderSheetPdf } from '@/services/pdf/sheetPdf';
import {
  DEFAULT_FOLLOWING_COLUMNS,
  MAX_FOLLOWING_COLUMNS,
  PAGE_H,
  PAGE_W,
  paginateRows,
  sheetColumnHeaders,
  sheetSubtitle,
  sheetTitle,
} from '@/services/reports/sheetLayout';
import { SheetPage } from './SheetDocument';

const PAGE_GAP = 24;

/**
 * Preview of the printed subscriptions sheet. The numbers are filled in; every cell,
 * the title and the summary lines can be edited right on the paper before downloading or printing.
 * Edits only affect the printed/PDF copy, not the app's data.
 */
export function PeriodPrintPage() {
  const { periodId = '' } = useParams();
  const sheet = useSubscriptionSheet(periodId);
  const settings = useSettings();
  const { run, pending } = useAction();

  const [following, setFollowing] = useState(DEFAULT_FOLLOWING_COLUMNS);
  const paperRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxWidth, setBoxWidth] = useState(PAGE_W);

  const hasRows = Boolean(sheet && sheet.rows.length > 0);

  // Shrink the A4 paper to fit narrow screens (phones); print/PDF always use the real size.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setBoxWidth(el.clientWidth || PAGE_W);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasRows]);

  const pages = useMemo(() => paginateRows(sheet?.rows ?? []), [sheet?.rows]);

  if (sheet === undefined || settings === undefined) return <LoadingState />;
  if (sheet === null) return <ErrorState title="هذه الفترة غير موجودة" />;

  const { period } = sheet;
  const headers = sheetColumnHeaders(period.startDate, period.endDate, following);
  const title = { line1: sheetTitle(settings.buildingName), line2: sheetSubtitle(period.startDate, period.endDate) };
  const scale = Math.min(1, boxWidth / PAGE_W);
  const totalHeight = pages.length * (PAGE_H + PAGE_GAP);

  const downloadPdf = () =>
    run(async () => {
      const els: HTMLElement[] = paperRef.current
        ? Array.from(paperRef.current.querySelectorAll<HTMLElement>('[data-sheet-page]'))
        : [];
      await renderSheetPdf(els, `subscriptions-${period.startDate}.pdf`);
    }, 'تم تجهيز ملف PDF وبدأ تنزيله');

  return (
    <div className="space-y-5">
      <div className="space-y-5 print:hidden">
        <Link
          to={`/records/${period.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary"
        >
          <ArrowRight className="h-4 w-4" aria-hidden />
          العودة إلى {period.name}
        </Link>

        <PageHeader
          title="معاينة كشف الاشتراكات"
          description="الأرقام جاهزة. اضغط على أي خانة واكتب ملاحظاتك، ثم نزّل الملف أو اطبعه."
          actions={
            <>
              <Button icon={<Download className="h-5 w-5" />} loading={pending} onClick={() => void downloadPdf()}>
                تنزيل PDF
              </Button>
              <Button variant="secondary" icon={<Printer className="h-5 w-5" />} onClick={() => window.print()}>
                طباعة
              </Button>
            </>
          }
        />

        {!settings.buildingName && (
          <Notice tone="warn" title="لم تُدخل اسم العمارة بعد">
            عنوان الكشف الآن "ايرادات العمارة" فقط. اكتب الاسم أو الرقم من{' '}
            <Link to="/settings" className="font-bold underline">
              الإعدادات
            </Link>{' '}
            ليظهر تلقائياً، أو عدّله مباشرة على الورقة أدناه.
          </Notice>
        )}

        <Notice tone="info">
          ما تكتبه هنا يظهر في الملف المطبوع فقط ولا يغيّر بيانات التطبيق. على الهاتف يمكنك تكبير الورقة بإصبعين لتسهيل الكتابة.
        </Notice>

        <div className="max-w-xs">
          <SelectField
            label="أعمدة الفترات التالية (فارغة للكتابة اليدوية)"
            value={following}
            onChange={(e) => setFollowing(Number(e.target.value))}
          >
            {Array.from({ length: MAX_FOLLOWING_COLUMNS + 1 }, (_, n) => (
              <option key={n} value={n}>
                {n === 0 ? 'بدون' : n}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      {sheet.rows.length === 0 ? (
        <EmptyState title="لا توجد وحدات في هذه الفترة" description="أضف الشقق والمنشآت أولاً ثم ارجع للطباعة." />
      ) : (
        <div ref={boxRef} className="w-full">
          <div
            className="mx-auto print:!h-auto print:!w-auto"
            style={{ width: PAGE_W * scale, height: totalHeight * scale }}
          >
            <div
              ref={paperRef}
              className="print:!transform-none"
              style={{ width: PAGE_W, transform: `scale(${scale})`, transformOrigin: 'top right' }}
            >
              {pages.map((rows, i) => (
                <div
                  key={i}
                  className="mb-6 bg-white shadow-card print:mb-0 print:break-after-page print:shadow-none print:last:break-after-auto"
                  style={{ width: PAGE_W, height: PAGE_H }}
                >
                  <SheetPage
                    pageNumber={i + 1}
                    rows={rows}
                    headers={headers}
                    followingCount={following}
                    title={i === 0 ? title : undefined}
                    footer={i === pages.length - 1 ? sheet.footer : undefined}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
