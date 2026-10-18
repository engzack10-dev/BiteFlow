/**
 * BiteFlow FS-10 Reports & Exports Utilities
 * RFC-4180 compliant CSV generation with spreadsheet formula-injection protection,
 * and high-fidelity branded PDF printable document generation.
 */

export interface ExportColumn<T = unknown> {
  header: string
  accessor: (item: T, index: number) => string | number | null | undefined
}

export interface SummaryMetric {
  label: string
  value: string | number
  highlight?: boolean
}

export interface PrintableReportConfig<T = unknown> {
  title: string
  subtitle?: string
  generatedAt?: string
  metadata?: Array<{ label: string; value: string }>
  summaryMetrics?: SummaryMetric[]
  columns: ExportColumn<T>[]
  data: T[]
  footerNotice?: string
}

/**
 * Formula injection security guard:
 * Spreadsheet engines (Excel, Google Sheets, LibreOffice) may evaluate strings
 * starting with =, +, -, @, \t, \r as executable formulas (CSV Injection / DDE).
 * We prefix any such value with a single quote (') to force literal string interpretation.
 */
export function sanitizeCSVCell(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  let str = String(value)

  // Check if string starts with dangerous formula prefix even after leading whitespace or control characters
  let trimmedIndex = 0
  while (trimmedIndex < str.length && str.charCodeAt(trimmedIndex) <= 32) {
    trimmedIndex++
  }
  const trimmed = str.slice(trimmedIndex)
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r']

  if (dangerousPrefixes.some((prefix) => trimmed.startsWith(prefix))) {
    // Escape by prefixing with a single quote
    str = `'${str}`
  }

  // If the cell contains quotes, commas, newlines, or carriage returns, wrap in quotes and escape internal quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }

  return str
}

/**
 * Generates and downloads an RFC-4180 compliant CSV file safely in the browser.
 */
export function exportToCSV<T>(
  columns: ExportColumn<T>[],
  data: T[],
  filename: string,
  metadataHeaders?: Array<{ label: string; value: string }>
): void {
  const lines: string[] = []

  // Optional metadata header rows
  if (metadataHeaders && metadataHeaders.length > 0) {
    for (const meta of metadataHeaders) {
      lines.push(`${sanitizeCSVCell(meta.label)},${sanitizeCSVCell(meta.value)}`)
    }
    lines.push('') // Empty row separator
  }

  // Header row
  const headerRow = columns.map((col) => sanitizeCSVCell(col.header)).join(',')
  lines.push(headerRow)

  // Data rows
  data.forEach((item, index) => {
    const row = columns
      .map((col) => sanitizeCSVCell(col.accessor(item, index)))
      .join(',')
    lines.push(row)
  })

  // Prepend UTF-8 BOM (\uFEFF) so Excel opens UTF-8 properly without garbling characters
  const csvContent = '\uFEFF' + lines.join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`)
  document.body.appendChild(anchor)
  anchor.click()

  // Clean up
  setTimeout(() => {
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }, 200)
}

/**
 * Generates a clean, BiteFlow-branded printable document rendered in an iframe
 * and triggers window.print() so the administrator can save as PDF with complete
 * styling, running headers, and multi-page pagination.
 */
export function exportToPrintablePDF<T>(config: PrintableReportConfig<T>): void {
  const {
    title,
    subtitle = 'BiteFlow Restaurant Operations & Performance',
    generatedAt = new Date().toLocaleString(),
    metadata = [],
    summaryMetrics = [],
    columns,
    data,
    footerNotice = 'BiteFlow Restaurant Management • Confidential Operational Report',
  } = config

  // Build HTML table headers
  const theadHtml = `
    <thead>
      <tr>
        ${columns.map((c) => `<th>${escapeHtml(c.header)}</th>`).join('')}
      </tr>
    </thead>
  `

  // Build HTML table rows
  const tbodyHtml = `
    <tbody>
      ${data.length === 0 ? `
        <tr>
          <td colspan="${columns.length}" style="text-align: center; padding: 2rem; color: #6b7280;">
            No records found for the selected reporting criteria.
          </td>
        </tr>
      ` : data.map((item, index) => `
        <tr>
          ${columns.map((c) => {
            const raw = c.accessor(item, index)
            const val = raw === null || raw === undefined ? '—' : String(raw)
            return `<td>${escapeHtml(val)}</td>`
          }).join('')}
        </tr>
      `).join('')}
    </tbody>
  `

  // Build summary metrics cards HTML
  const summaryCardsHtml = summaryMetrics.length > 0 ? `
    <div class="summary-cards">
      ${summaryMetrics.map((m) => `
        <div class="summary-card ${m.highlight ? 'card-highlight' : ''}">
          <div class="summary-label">${escapeHtml(m.label)}</div>
          <div class="summary-value">${escapeHtml(String(m.value))}</div>
        </div>
      `).join('')}
    </div>
  ` : ''

  // Build metadata items HTML
  const metadataHtml = metadata.length > 0 ? `
    <div class="metadata-strip">
      ${metadata.map((m) => `
        <div class="meta-item">
          <strong>${escapeHtml(m.label)}:</strong> <span>${escapeHtml(m.value)}</span>
        </div>
      `).join('')}
    </div>
  ` : ''

  const htmlDocument = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      size: letter portrait;
      margin: 8mm 12mm 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      background: #ffffff;
      line-height: 1.35;
      font-size: 10pt;
      padding: 4px;
    }
    .report-header {
      border-bottom: 2px solid #ea580c;
      padding-bottom: 8px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .report-brand-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .report-brand-logo {
      height: 38px;
      width: auto;
      object-fit: contain;
      display: block;
    }
    .report-title-box {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .report-main-title {
      font-size: 13pt;
      font-weight: 700;
      color: #111827;
      line-height: 1.2;
    }
    .report-sub {
      font-size: 8.5pt;
      color: #6b7280;
    }
    .header-meta {
      text-align: right;
      font-size: 8pt;
      color: #6b7280;
      line-height: 1.4;
    }
    .metadata-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 6px 10px;
      margin-bottom: 10px;
      font-size: 8.5pt;
    }
    .meta-item strong {
      color: #374151;
    }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
      gap: 8px;
      margin-bottom: 12px;
    }
    .summary-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 6px 10px;
      text-align: left;
    }
    .summary-card.card-highlight {
      background: #fff7ed;
      border-color: #fdba74;
    }
    .summary-label {
      font-size: 7.5pt;
      text-transform: uppercase;
      font-weight: 700;
      color: #6b7280;
      margin-bottom: 2px;
      letter-spacing: 0.3px;
    }
    .summary-value {
      font-size: 12pt;
      font-weight: 800;
      color: #111827;
      line-height: 1.1;
    }
    .summary-card.card-highlight .summary-value {
      color: #c2410c;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 8.5pt;
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
    }
    th {
      background: #f3f4f6;
      color: #1f2937;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #d1d5db;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    td {
      padding: 5px 8px;
      border: 1px solid #e5e7eb;
      color: #374151;
      vertical-align: middle;
    }
    tbody tr:nth-child(even) {
      background: #fafafa;
    }
    .report-footer {
      margin-top: 14px;
      padding-top: 6px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #9ca3af;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="report-brand-box">
      <img src="${window.location.origin}/Bitelogo.png" alt="BiteFlow Logo" class="report-brand-logo" />
      <div class="report-title-box">
        <h1 class="report-main-title">${escapeHtml(title)}</h1>
        <div class="report-sub">${escapeHtml(subtitle)}</div>
      </div>
    </div>
    <div class="header-meta">
      <div><strong>Generated:</strong> ${escapeHtml(generatedAt)}</div>
      <div><strong>Records:</strong> ${data.length} total</div>
      <div><strong>Status:</strong> Authoritative Persistence</div>
    </div>
  </div>

  ${metadataHtml}
  ${summaryCardsHtml}

  <table>
    ${theadHtml}
    ${tbodyHtml}
  </table>

  <div class="report-footer">
    <div>${escapeHtml(footerNotice)}</div>
    <div>Page 1 of 1 • System Generated</div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`

  // Use a hidden iframe to print cleanly without leaving open tabs
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'

  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document || iframe.contentDocument
  if (doc) {
    doc.open()
    doc.write(htmlDocument)
    doc.close()
  }

  // Remove iframe after user finishes printing or cancels
  setTimeout(() => {
    try {
      if (iframe.parentNode) {
        document.body.removeChild(iframe)
      }
    } catch {
      // Ignored
    }
  }, 60000)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
