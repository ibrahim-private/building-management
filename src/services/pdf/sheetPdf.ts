import { PAGE_H, PAGE_W } from '@/services/reports/sheetLayout';
import { downloadBlob } from '@/utils/download';

/**
 * Turns the on-screen sheet pages into an A4 PDF, exactly as shown (what you see is what you get,
 * including every edit typed into the cells). Each page is cloned off-screen at its natural size,
 * rasterised at 2x and placed on a page. Works offline.
 */
export async function renderSheetPdf(pages: HTMLElement[], filename: string): Promise<void> {
  if (pages.length === 0) return;
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

  if ('fonts' in document) {
    await Promise.all(
      ['400', '700'].map((w) => document.fonts.load(`${w} 16px "Amiri"`, 'ايرادات العمارة ١٢٣ 123').catch(() => [])),
    );
    await document.fonts.ready;
  }

  const stage = document.createElement('div');
  Object.assign(stage.style, { position: 'fixed', left: '-10000px', top: '0', width: `${PAGE_W}px`, zIndex: '-1' });
  document.body.appendChild(stage);

  try {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pages.length; i += 1) {
      const clone = pages[i].cloneNode(true) as HTMLElement;
      clone.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'));
      stage.replaceChildren(clone);

      const canvas = await html2canvas(clone, {
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

    downloadBlob(pdf.output('blob'), filename);
  } finally {
    stage.remove();
  }
}
