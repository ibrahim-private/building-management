import { APP_NAME } from '@/constants/app';
import { formatDateTime, todayISO } from '@/utils/date';
import { downloadBlob } from '@/utils/download';
import type { ReportDoc, ReportMetaItem, ReportTable } from './types';

/**
 * Arabic PDF rendering
 * --------------------
 * Arabic needs letter joining (shaping) and right-to-left layout, which most
 * JS PDF libraries do not implement correctly on their own. So instead of
 * drawing text with the PDF library, each report page is laid out as HTML/CSS
 * (the browser does shaping + bidi perfectly with the embedded IBM Plex Sans
 * Arabic web font), rasterised with html2canvas, and placed on an A4 page with jsPDF.
 *
 * Both libraries are bundled and cached by the service worker, so this works offline.
 * Trade-off: the PDF text is an image (not selectable), at 2x resolution for sharp print.
 *
 * Pagination is deterministic: every block has a fixed pixel height, so the page
 * breaks are calculated up-front instead of cutting rows in half.
 */

const PAGE_W = 794; // A4 at 96dpi
const PAGE_H = 1123;
const PAD_X = 40;
const PAD_TOP = 36;
const FOOTER_H = 44;
const CONTENT_H = PAGE_H - PAD_TOP - FOOTER_H;

const H = {
  firstHeader: (metaCount: number) => 128 + Math.ceil(metaCount / 2) * 26,
  nextHeader: 40,
  sectionTitle: 46,
  summaryRow: 70,
  tableHead: 34,
  row: 30,
  totals: 36,
  text: 44,
  gap: 14,
};

const COLORS = {
  ink: '#0f172a',
  muted: '#64748b',
  line: '#e2e8f0',
  soft: '#f1f5f9',
  primary: '#059669',
  primarySoft: '#ecfdf5',
};

type Block =
  | { kind: 'sectionTitle'; text: string; height: number }
  | { kind: 'summary'; items: ReportMetaItem[]; height: number }
  | { kind: 'thead'; table: ReportTable; height: number }
  | { kind: 'row'; table: ReportTable; cells: string[]; index: number; height: number }
  | { kind: 'totals'; table: ReportTable; cells: string[]; height: number }
  | { kind: 'text'; text: string; height: number };

type Page = { blocks: Block[]; used: number };

// ---------------------------------------------------------------- pagination

function paginate(doc: ReportDoc): Page[] {
  const pages: Page[] = [{ blocks: [], used: H.firstHeader(doc.meta.length) }];
  const current = () => pages[pages.length - 1];
  const newPage = () => pages.push({ blocks: [], used: H.nextHeader });
  const remaining = () => CONTENT_H - current().used;
  const place = (block: Block) => {
    current().blocks.push(block);
    current().used += block.height;
  };
  /** Starts a new page unless `needed` px still fit. */
  const ensure = (needed: number) => {
    if (remaining() < needed && current().blocks.length > 0) newPage();
  };

  for (const section of doc.sections) {
    const hasTable = Boolean(section.table && section.table.rows.length > 0);

    // Keep the title together with the first thing that follows it.
    const firstBlockHeight = section.summary
      ? H.summaryRow
      : hasTable
        ? H.tableHead + H.row
        : H.text;
    ensure(H.sectionTitle + firstBlockHeight);
    place({ kind: 'sectionTitle', text: section.title, height: H.sectionTitle });

    if (section.summary && section.summary.length > 0) {
      const perRow = 3;
      for (let i = 0; i < section.summary.length; i += perRow) {
        ensure(H.summaryRow);
        place({ kind: 'summary', items: section.summary.slice(i, i + perRow), height: H.summaryRow });
      }
      current().used += H.gap;
    }

    if (section.table) {
      const table = section.table;
      if (table.rows.length === 0) {
        ensure(H.text);
        place({ kind: 'text', text: section.emptyText ?? 'لا توجد بيانات.', height: H.text });
      } else {
        ensure(H.tableHead + H.row);
        place({ kind: 'thead', table, height: H.tableHead });
        table.rows.forEach((cells, index) => {
          if (remaining() < H.row + (index === table.rows.length - 1 && table.totals ? H.totals : 0)) {
            newPage();
            place({ kind: 'thead', table, height: H.tableHead }); // repeat header on the new page
          }
          place({ kind: 'row', table, cells, index, height: H.row });
        });
        if (table.totals) {
          if (remaining() < H.totals) {
            newPage();
            place({ kind: 'thead', table, height: H.tableHead });
          }
          place({ kind: 'totals', table, cells: table.totals, height: H.totals });
        }
      }
      current().used += H.gap;
    } else if (!section.summary && section.emptyText) {
      // Plain text section (e.g. permanent notes)
      ensure(H.text);
      place({ kind: 'text', text: section.emptyText, height: H.text });
    }
  }
  return pages;
}

// ------------------------------------------------------------- DOM building

type Styles = Partial<CSSStyleDeclaration>;

function el(tag: string, styles: Styles = {}, text?: string, children: HTMLElement[] = []): HTMLElement {
  const node = document.createElement(tag);
  Object.assign(node.style, styles);
  if (text !== undefined) node.textContent = text;
  for (const child of children) node.appendChild(child);
  return node;
}

const base: Styles = {
  boxSizing: 'border-box',
  fontFamily: '"IBM Plex Sans Arabic", Tahoma, sans-serif',
  letterSpacing: 'normal', // letter-spacing breaks Arabic letter joining
  direction: 'rtl',
  textAlign: 'right',
};

function columnWidths(table: ReportTable): string[] {
  const raw = table.widths ?? table.headers.map(() => 1);
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => `${(w / total) * 100}%`);
}

function cell(text: string, width: string, align: 'start' | 'center' | undefined, extra: Styles = {}): HTMLElement {
  return el('div', {
    ...base,
    flex: `0 0 ${width}`,
    width,
    padding: '0 8px',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    textAlign: align === 'center' ? 'center' : 'right',
    fontSize: '12.5px',
    ...extra,
  }, text);
}

function renderBlock(block: Block): HTMLElement {
  switch (block.kind) {
    case 'sectionTitle':
      return el('div', { ...base, height: `${block.height}px`, paddingTop: '16px' }, undefined, [
        el('div', {
          ...base,
          fontSize: '16px',
          fontWeight: '700',
          color: COLORS.ink,
          borderRight: `4px solid ${COLORS.primary}`,
          paddingRight: '10px',
          lineHeight: '24px',
        }, block.text),
      ]);

    case 'summary':
      return el('div', { ...base, height: `${block.height}px`, display: 'flex', gap: '10px', paddingTop: '4px' },
        undefined,
        block.items.map((item) =>
          el('div', {
            ...base,
            flex: '1 1 0',
            height: '58px',
            background: COLORS.primarySoft,
            border: `1px solid ${COLORS.line}`,
            borderRadius: '10px',
            padding: '8px 12px',
          }, undefined, [
            el('div', { ...base, fontSize: '11.5px', color: COLORS.muted, lineHeight: '18px' }, item.label),
            el('div', { ...base, fontSize: '15px', fontWeight: '700', color: COLORS.ink, lineHeight: '24px' }, item.value),
          ]),
        ),
      );

    case 'thead': {
      const widths = columnWidths(block.table);
      return el('div', {
        ...base,
        height: `${block.height}px`,
        display: 'flex',
        alignItems: 'center',
        background: COLORS.primary,
        color: '#ffffff',
        borderRadius: '8px 8px 0 0',
      }, undefined, block.table.headers.map((h, i) =>
        cell(h, widths[i], block.table.align?.[i], { fontWeight: '700', color: '#ffffff', fontSize: '12px' }),
      ));
    }

    case 'row': {
      const widths = columnWidths(block.table);
      return el('div', {
        ...base,
        height: `${block.height}px`,
        display: 'flex',
        alignItems: 'center',
        background: block.index % 2 === 1 ? COLORS.soft : '#ffffff',
        borderBottom: `1px solid ${COLORS.line}`,
        color: COLORS.ink,
      }, undefined, block.cells.map((c, i) => cell(c, widths[i], block.table.align?.[i])));
    }

    case 'totals': {
      const widths = columnWidths(block.table);
      return el('div', {
        ...base,
        height: `${block.height}px`,
        display: 'flex',
        alignItems: 'center',
        background: COLORS.primarySoft,
        borderTop: `2px solid ${COLORS.primary}`,
        borderBottom: `1px solid ${COLORS.line}`,
      }, undefined, block.cells.map((c, i) =>
        cell(c, widths[i], block.table.align?.[i], { fontWeight: '700', color: COLORS.ink }),
      ));
    }

    case 'text':
      return el('div', {
        ...base,
        height: `${block.height}px`,
        fontSize: '13px',
        color: COLORS.muted,
        lineHeight: '22px',
        paddingTop: '8px',
        overflow: 'hidden',
      }, block.text);
  }
}

function renderFirstHeader(doc: ReportDoc, generatedAt: string): HTMLElement {
  const metaRows: HTMLElement[] = [];
  for (let i = 0; i < doc.meta.length; i += 2) {
    metaRows.push(
      el('div', { ...base, display: 'flex', height: '26px', alignItems: 'center' }, undefined,
        doc.meta.slice(i, i + 2).map((m) =>
          el('div', { ...base, flex: '1 1 0', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, undefined, [
            el('span', { color: COLORS.muted }, `${m.label}: `),
            el('span', { fontWeight: '600', color: COLORS.ink }, m.value),
          ]),
        ),
      ),
    );
  }

  return el('div', { ...base, height: `${H.firstHeader(doc.meta.length)}px` }, undefined, [
    el('div', { ...base, display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '26px', fontSize: '12px' }, undefined, [
      el('span', { fontWeight: '700', color: COLORS.primary, fontSize: '14px' }, `${APP_NAME} - تقرير إدارة العمارة`),
      el('span', { color: COLORS.muted }, `تاريخ الإصدار: ${generatedAt}`),
    ]),
    el('div', { ...base, fontSize: '26px', fontWeight: '700', color: COLORS.ink, lineHeight: '42px', marginTop: '8px' }, doc.title),
    el('div', { ...base, fontSize: '14px', color: COLORS.muted, lineHeight: '24px', height: '24px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }, doc.subtitle ?? ''),
    el('div', { height: '3px', background: COLORS.primary, borderRadius: '2px', margin: '10px 0 8px' }),
    ...metaRows,
  ]);
}

function renderNextHeader(doc: ReportDoc): HTMLElement {
  return el('div', { ...base, height: `${H.nextHeader}px`, borderBottom: `2px solid ${COLORS.primary}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '12px', color: COLORS.muted }, undefined, [
    el('span', { fontWeight: '700', color: COLORS.ink }, `${doc.title}${doc.subtitle ? ` - ${doc.subtitle}` : ''}`),
    el('span', {}, APP_NAME),
  ]);
}

function renderPage(doc: ReportDoc, page: Page, pageNo: number, pageCount: number, generatedAt: string): HTMLElement {
  const root = el('div', {
    ...base,
    position: 'relative',
    width: `${PAGE_W}px`,
    height: `${PAGE_H}px`,
    background: '#ffffff',
    color: COLORS.ink,
    padding: `${PAD_TOP}px ${PAD_X}px 0`,
    overflow: 'hidden',
  });
  root.appendChild(pageNo === 1 ? renderFirstHeader(doc, generatedAt) : renderNextHeader(doc));
  for (const block of page.blocks) root.appendChild(renderBlock(block));

  root.appendChild(
    el('div', {
      ...base,
      position: 'absolute',
      left: `${PAD_X}px`,
      right: `${PAD_X}px`,
      bottom: '16px',
      height: '22px',
      borderTop: `1px solid ${COLORS.line}`,
      paddingTop: '6px',
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '11.5px',
      color: COLORS.muted,
    }, undefined, [
      el('span', {}, `${APP_NAME} · ${generatedAt}`),
      el('span', {}, `صفحة ${pageNo} من ${pageCount}`),
    ]),
  );
  return root;
}

// ------------------------------------------------------------------- export

async function ensureFontsReady(): Promise<void> {
  if (!('fonts' in document)) return;
  const sample = 'تقرير العمارة ١٢٣ 123';
  await Promise.all(
    ['400', '600', '700'].map((weight) =>
      document.fonts.load(`${weight} 14px "IBM Plex Sans Arabic"`, sample).catch(() => []),
    ),
  );
  await document.fonts.ready;
}

/** Builds the PDF for a report and downloads it. Works offline. */
export async function renderReportPdf(doc: ReportDoc): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  await ensureFontsReady();

  const generatedAt = formatDateTime();
  const pages = paginate(doc);

  // Off-screen stage; removed in `finally` even if rendering fails.
  const stage = el('div', { position: 'fixed', left: '-10000px', top: '0', width: `${PAGE_W}px`, zIndex: '-1' });
  document.body.appendChild(stage);

  try {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    pdf.setProperties({ title: `${doc.title}${doc.subtitle ? ` - ${doc.subtitle}` : ''}`, creator: APP_NAME });

    for (let i = 0; i < pages.length; i += 1) {
      const pageEl = renderPage(doc, pages[i], i + 1, pages.length, generatedAt);
      stage.replaceChildren(pageEl);
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        width: PAGE_W,
        height: PAGE_H,
        windowWidth: PAGE_W,
      });
      if (i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');
    }

    downloadBlob(pdf.output('blob'), `building-${doc.fileSlug}-${todayISO()}.pdf`);
  } finally {
    stage.remove();
  }
}
