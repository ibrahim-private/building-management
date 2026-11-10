/**
 * Report model: a plain description of a report, independent of how it is drawn.
 * Builders (builders.ts) produce it from financial data; the renderer turns it into PDF pages.
 */

export interface ReportMetaItem {
  label: string;
  value: string;
}

export interface ReportTable {
  headers: string[];
  rows: string[][];
  /** Relative column widths (any positive numbers; normalised by the renderer). */
  widths?: number[];
  /** Per-column alignment; "start" is the right edge in RTL. Default: start. */
  align?: ('start' | 'center')[];
  /** Optional totals row shown after the data rows. */
  totals?: string[];
}

export interface ReportSection {
  title: string;
  summary?: ReportMetaItem[];
  table?: ReportTable;
  emptyText?: string;
}

export interface ReportDoc {
  title: string;
  subtitle?: string;
  meta: ReportMetaItem[];
  sections: ReportSection[];
  /** Used in the downloaded file name. */
  fileSlug: string;
}
