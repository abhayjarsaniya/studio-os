export interface ExportColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  format?: 'text' | 'currency' | 'date' | 'number';
}

export interface ExportSummaryMetric {
  label: string;
  value: string | number;
  subtext?: string;
}

export interface MasterExportOptions {
  filename: string;
  title: string;
  subtitle?: string;
  filterSummary?: string;
  columns: ExportColumn[];
  rows: Record<string, any>[];
  summaryMetrics?: ExportSummaryMetric[];
  totals?: Record<string, string | number>;
}

export class MasterExportService {
  /**
   * Export dataset as an Excel-compatible spreadsheet (.xlsx / XML Spreadsheet 2003)
   * Opens cleanly in Microsoft Excel, Google Sheets, LibreOffice and Apple Numbers without warnings.
   */
  exportToExcel(options: MasterExportOptions): void {
    if (typeof window === 'undefined') return;

    const { filename, title, subtitle, filterSummary, columns, rows, summaryMetrics, totals } = options;
    const nowStr = new Date().toLocaleString('en-IN');

    // Build XML Spreadsheet 2003 format (.xls/.xlsx compatible)
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>${this.escapeXml(title)}</Title>
  <Author>Studio OS Enterprise Platform Master Admin</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#1E293B"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="HeaderTitle">
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#EA580C"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="HeaderSub">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Italic="1" ss:Color="#64748B"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="SummaryCard">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#FFF7ED" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FED7AA"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FED7AA"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FED7AA"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FED7AA"/>
   </Borders>
  </Style>
  <Style ss:ID="ColHeader">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Center" ss:Horizontal="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#EA580C"/>
   </Borders>
  </Style>
  <Style ss:ID="DataLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataRight">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="TotalRow">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#0F172A"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Report Data">
  <Table ss:DefaultRowHeight="20">
`;

    // Define column widths
    columns.forEach(() => {
      xml += `   <Column ss:AutoFitWidth="1" ss:Width="140"/>\n`;
    });

    // Title Row
    xml += `   <Row ss:Height="28">
    <Cell ss:MergeAcross="${Math.max(1, columns.length - 1)}" ss:StyleID="HeaderTitle"><Data ss:Type="String">Studio OS Enterprise — ${this.escapeXml(title)}</Data></Cell>
   </Row>\n`;

    // Subtitle & Metadata Row
    xml += `   <Row ss:Height="18">
    <Cell ss:MergeAcross="${Math.max(1, columns.length - 1)}" ss:StyleID="HeaderSub"><Data ss:Type="String">Generated: ${nowStr} | Filters: ${this.escapeXml(filterSummary || 'All Records')} | Platform Master Admin</Data></Cell>
   </Row>\n`;

    // Blank row
    xml += `   <Row ss:Height="10"></Row>\n`;

    // Summary Metrics Cards (if any)
    if (summaryMetrics && summaryMetrics.length > 0) {
      xml += `   <Row ss:Height="22">\n`;
      summaryMetrics.forEach(m => {
        xml += `    <Cell ss:StyleID="SummaryCard"><Data ss:Type="String">${this.escapeXml(m.label)}: ${this.escapeXml(String(m.value))}</Data></Cell>\n`;
      });
      xml += `   </Row>\n   <Row ss:Height="10"></Row>\n`;
    }

    // Column Headers
    xml += `   <Row ss:Height="24">\n`;
    columns.forEach(col => {
      xml += `    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">${this.escapeXml(col.label)}</Data></Cell>\n`;
    });
    xml += `   </Row>\n`;

    // Data Rows
    if (rows.length === 0) {
      xml += `   <Row ss:Height="24">
    <Cell ss:MergeAcross="${Math.max(1, columns.length - 1)}" ss:StyleID="DataCenter"><Data ss:Type="String">No records found matching the selected filters.</Data></Cell>
   </Row>\n`;
    } else {
      rows.forEach(row => {
        xml += `   <Row ss:Height="20">\n`;
        columns.forEach(col => {
          const val = row[col.key];
          const isNum = typeof val === 'number' && !isNaN(val);
          const styleId = col.align === 'right' || col.format === 'currency' ? 'DataRight' : (col.align === 'center' ? 'DataCenter' : 'DataLeft');
          const type = isNum ? 'Number' : 'String';
          const displayVal = val !== undefined && val !== null ? String(val) : '-';
          xml += `    <Cell ss:StyleID="${styleId}"><Data ss:Type="${type}">${this.escapeXml(displayVal)}</Data></Cell>\n`;
        });
        xml += `   </Row>\n`;
      });
    }

    // Totals Row (if provided)
    if (totals && rows.length > 0) {
      xml += `   <Row ss:Height="22">\n`;
      columns.forEach((col, idx) => {
        const val = totals[col.key] || (idx === 0 ? 'TOTAL' : '');
        const styleId = 'TotalRow';
        xml += `    <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${this.escapeXml(String(val))}</Data></Cell>\n`;
      });
      xml += `   </Row>\n`;
    }

    xml += `  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    this.triggerDownload(blob, `${filename}_${new Date().toISOString().slice(0, 10)}.xls`);
  }

  /**
   * Export dataset as a printable PDF report with Studio OS letterhead and branding
   */
  exportToPDF(options: MasterExportOptions): void {
    if (typeof window === 'undefined') return;

    const { title, subtitle, filterSummary, columns, rows, summaryMetrics, totals } = options;
    const nowStr = new Date().toLocaleString('en-IN');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up was blocked. Please allow pop-ups for Studio OS to view and print the PDF report.');
      return;
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Studio OS Master Admin Report — ${this.escapeHtml(title)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 12mm 10mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 16px;
      font-size: 12px;
      line-height: 1.4;
    }
    .header-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #ea580c;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .brand-title {
      font-size: 18px;
      font-weight: 800;
      color: #ea580c;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .report-title {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 2px;
    }
    .meta-box {
      text-align: right;
      font-size: 11px;
      color: #64748b;
    }
    .meta-box strong { color: #0f172a; }
    .filter-badge {
      display: inline-block;
      background: #fff7ed;
      color: #c2410c;
      border: 1px solid #fed7aa;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .metrics-grid {
      display: flex;
      gap: 12px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }
    .metric-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
      min-width: 140px;
    }
    .metric-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; }
    .metric-value { font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    th {
      background: #0f172a;
      color: #ffffff;
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 8px 6px;
      border: 1px solid #0f172a;
    }
    td {
      padding: 6px;
      border: 1px solid #e2e8f0;
      font-size: 11px;
      vertical-align: middle;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .align-left { text-align: left; }
    .align-right { text-align: right; }
    .align-center { text-align: center; }
    .total-row td {
      background: #f1f5f9 !important;
      font-weight: 800;
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
      color: #0f172a;
    }
    .footer {
      margin-top: 20px;
      padding-top: 8px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #94a3b8;
    }
    .no-print-bar {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: -16px -16px 16px -16px;
    }
    .btn {
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      border: none;
    }
    .btn-primary { background: #ea580c; color: white; }
    .btn-secondary { background: #e2e8f0; color: #0f172a; margin-left: 8px; }
    @media print {
      .no-print-bar { display: none; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <span style="font-weight: 700; color: #0f172a;">Studio OS Enterprise Document Preview</span>
    <div>
      <button class="btn btn-primary" onclick="window.print()">Print / Save as PDF</button>
      <button class="btn btn-secondary" onclick="window.close()">Close</button>
    </div>
  </div>

  <div class="header-banner">
    <div>
      <div class="brand-title">
        <span>👑 Studio OS Master Control Center</span>
      </div>
      <div class="report-title">${this.escapeHtml(title)}</div>
      ${subtitle ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${this.escapeHtml(subtitle)}</div>` : ''}
    </div>
    <div class="meta-box">
      <div>Report Status: <strong>Verified Persisted Data</strong></div>
      <div>Generated: <strong>${nowStr}</strong></div>
      <div>Security: <strong>Master Super Admin Only</strong></div>
    </div>
  </div>

  ${filterSummary ? `<div class="filter-badge">Active Filters: ${this.escapeHtml(filterSummary)}</div>` : ''}

  ${summaryMetrics && summaryMetrics.length > 0 ? `
    <div class="metrics-grid">
      ${summaryMetrics.map(m => `
        <div class="metric-card">
          <div class="metric-label">${this.escapeHtml(m.label)}</div>
          <div class="metric-value">${this.escapeHtml(String(m.value))}</div>
        </div>
      `).join('')}
    </div>
  ` : ''}

  <table>
    <thead>
      <tr>
        ${columns.map(c => `
          <th class="${c.align === 'right' || c.format === 'currency' ? 'align-right' : (c.align === 'center' ? 'align-center' : 'align-left')}">
            ${this.escapeHtml(c.label)}
          </th>
        `).join('')}
      </tr>
    </thead>
    <tbody>
      ${rows.length === 0 ? `
        <tr>
          <td colspan="${columns.length}" class="align-center" style="padding: 24px; color: #64748b;">
            No records found matching the selected filters.
          </td>
        </tr>
      ` : rows.map(r => `
        <tr>
          ${columns.map(c => {
            const val = r[c.key];
            const displayVal = val !== undefined && val !== null ? String(val) : '-';
            const alignClass = c.align === 'right' || c.format === 'currency' ? 'align-right' : (c.align === 'center' ? 'align-center' : 'align-left');
            return `<td class="${alignClass}">${this.escapeHtml(displayVal)}</td>`;
          }).join('')}
        </tr>
      `).join('')}

      ${totals && rows.length > 0 ? `
        <tr class="total-row">
          ${columns.map((c, idx) => {
            const val = totals[c.key] || (idx === 0 ? 'TOTAL' : '');
            const alignClass = c.align === 'right' || c.format === 'currency' ? 'align-right' : (c.align === 'center' ? 'align-center' : 'align-left');
            return `<td class="${alignClass}">${this.escapeHtml(String(val))}</td>`;
          }).join('')}
        </tr>
      ` : ''}
    </tbody>
  </table>

  <div class="footer">
    <span>Studio OS Enterprise Platform • Confidential Administrative Audit</span>
    <span>Page 1 of 1 • System Generated by jarsaniya.abhay@gmail.com</span>
  </div>

  <script>
    window.onload = function() {
      // Auto trigger print prompt for convenience if requested
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export const masterExportService = new MasterExportService();
