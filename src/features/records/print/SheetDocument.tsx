import type { ClipboardEvent, CSSProperties, KeyboardEvent, ReactNode } from 'react';
import type { SheetRow } from '@/services/reports/subscriptionSheet';
import {
  HEAD_H,
  PAGE_H,
  PAGE_PAD,
  PAGE_W,
  ROW_H,
  TITLE_H,
  sheetColumnWidths,
} from '@/services/reports/sheetLayout';

/**
 * The printed sheet: plain black on white, classic serif Arabic, black table frame.
 * Everything uses inline styles so the exact same markup can be cloned into the PDF
 * renderer. Cells are editable (contentEditable) so the administrator can type notes
 * on screen before downloading or printing; nothing in here is colored.
 */

export const SHEET_FONT = "'Amiri', 'Traditional Arabic', 'Times New Roman', serif";
const BORDER = '1px solid #000';

const plainPaste = (e: ClipboardEvent<HTMLElement>) => {
  e.preventDefault();
  document.execCommand('insertText', false, e.clipboardData.getData('text/plain').replace(/\s+/g, ' '));
};
const blockEnter = (e: KeyboardEvent<HTMLElement>) => {
  if (e.key === 'Enter') e.preventDefault();
};

function Editable({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className="sheet-editable"
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onKeyDown={blockEnter}
      onPaste={plainPaste}
      style={style}
    >
      {children}
    </div>
  );
}

interface Props {
  /** Rows for THIS page only. */
  rows: SheetRow[];
  headers: string[];
  followingCount: number;
  /** Title lines and footer are only rendered where they belong. */
  title?: { line1: string; line2: string };
  footer?: string[];
  pageNumber: number;
}

const cell: CSSProperties = {
  border: BORDER,
  padding: 0,
  height: ROW_H,
  boxSizing: 'border-box',
  overflow: 'hidden',
  verticalAlign: 'middle',
  textAlign: 'center',
  color: '#000',
};

const cellInner: CSSProperties = {
  height: ROW_H - 2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '0 6px',
  boxSizing: 'border-box',
  fontSize: 17,
  lineHeight: '20px',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
};

const noteInner: CSSProperties = {
  ...cellInner,
  justifyContent: 'flex-start',
  textAlign: 'right',
  fontSize: 14,
  lineHeight: '16px',
  whiteSpace: 'normal',
  wordBreak: 'break-word',
};

/** One A4 page of the sheet (794 x 1123 px). */
export function SheetPage({ rows, headers, followingCount, title, footer, pageNumber }: Props) {
  const widths = sheetColumnWidths(followingCount);

  return (
    <div
      data-sheet-page={pageNumber}
      dir="rtl"
      style={{
        width: PAGE_W,
        height: PAGE_H,
        boxSizing: 'border-box',
        padding: PAGE_PAD,
        background: '#fff',
        color: '#000',
        fontFamily: SHEET_FONT,
        letterSpacing: 'normal',
        overflow: 'hidden',
        textAlign: 'right',
      }}
    >
      {title && (
        <div style={{ height: TITLE_H, boxSizing: 'border-box', paddingTop: 6 }}>
          <Editable style={{ fontSize: 25, fontWeight: 700, textAlign: 'center', lineHeight: '38px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            {title.line1}
          </Editable>
          <Editable style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', lineHeight: '36px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            {title.line2}
          </Editable>
        </div>
      )}

      <table
        style={{
          width: '100%',
          tableLayout: 'fixed',
          borderCollapse: 'collapse',
          border: '2px solid #000',
        }}
      >
        <colgroup>
          {widths.map((w, i) => (
            <col key={i} style={{ width: `${w}%` }} />
          ))}
        </colgroup>

        {title && (
          <thead>
            <tr style={{ height: HEAD_H }}>
              <th style={{ ...cell, height: HEAD_H, fontSize: 17, fontWeight: 700 }}>شقة</th>
              {headers.map((h) => (
                <th key={h} style={{ ...cell, height: HEAD_H, fontSize: 16, fontWeight: 700 }}>
                  {h}
                </th>
              ))}
              <th style={{ ...cell, height: HEAD_H, fontSize: 17, fontWeight: 700 }}>ملاحظات</th>
            </tr>
          </thead>
        )}

        <tbody>
          {rows.map((row) => (
            <tr key={row.key} style={{ height: ROW_H }}>
              <td style={cell}>
                <div style={{ ...cellInner, fontWeight: 700 }}>{row.label}</div>
              </td>
              <td style={cell}>
                <Editable style={cellInner}>{row.cell}</Editable>
              </td>
              {Array.from({ length: followingCount }, (_, i) => (
                <td key={i} style={cell}>
                  <Editable style={cellInner} />
                </td>
              ))}
              <td style={cell}>
                <Editable style={noteInner}>{row.note}</Editable>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {footer && (
        <ul style={{ listStyle: 'none', margin: 0, padding: '18px 4px 0' }}>
          {footer.map((line, i) => (
            <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
              <span style={{ fontSize: 18, lineHeight: '30px' }}>•</span>
              <Editable style={{ flex: 1, fontSize: 18, fontWeight: 700, lineHeight: '30px' }}>{line}</Editable>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
