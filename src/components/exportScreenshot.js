import html2canvas from 'html2canvas';

// ─── README / Documentation links ─────────────────────────────────────────────
// Add your links here. Each entry: { label, url, description }
export const README_LINKS = [
  // { label: 'GitHub Repository', url: 'https://github.com/...', description: 'Source code and documentation' },
  // { label: 'SHRUG Dataset Docs', url: 'https://...', description: 'SHRUG Dev Lab reference guide' },
  // { label: 'NREGA MIS Portal', url: 'https://nrega.nic.in', description: 'Official MGNREGA data portal' },
  // { label: 'MICES Documentation', url: 'https://...', description: 'Minor Irrigation Census data' },
];
// ──────────────────────────────────────────────────────────────────────────────

export async function exportScreenshot(filename = 'GeoMNREGA_Export') {
  const el = document.getElementById('root') || document.body;
  try {
    const canvas = await html2canvas(el, {
      useCORS: true,
      allowTaint: true,
      logging: false,
      scale: window.devicePixelRatio || 1,
      width: el.offsetWidth,
      height: el.offsetHeight,
      windowWidth: el.offsetWidth,
      windowHeight: el.offsetHeight,
      x: 0, y: 0, scrollX: 0, scrollY: 0,
    });
    const link = document.createElement('a');
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error('Export failed:', err);
  }
}

export function downloadCSV(rows, filename = 'GeoMNREGA_Data', columns) {
  if (!rows || rows.length === 0) return;
  const cols = columns || Object.keys(rows[0]);
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = cols.map(escape).join(',');
  const body = rows.map(r => cols.map(c => escape(r[c])).join(',')).join('\n');
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Generates a self-contained HTML report and downloads it.
 * @param {Object} opts
 * @param {string}   opts.title        - Report title
 * @param {string}   opts.subtitle     - Subtitle / description
 * @param {Object[]} opts.stats        - Array of { label, value } summary stats
 * @param {Object[]} opts.tableRows    - Data rows for the table
 * @param {string[]} opts.tableColumns - Column keys (ordered)
 * @param {string}   opts.filename     - Base filename without extension
 */
export async function exportReport({ title, subtitle, stats = [], tableRows = [], tableColumns = [], filename = 'GeoMNREGA_Report' }) {
  const dateStr = new Date().toISOString().slice(0, 10);

  // Capture full-page screenshot
  let mapImgSrc = '';
  try {
    const el = document.getElementById('root') || document.body;
    const canvas = await html2canvas(el, {
      useCORS: true, allowTaint: true, logging: false, scale: 1,
      width: el.offsetWidth, height: el.offsetHeight,
      windowWidth: el.offsetWidth, windowHeight: el.offsetHeight,
    });
    mapImgSrc = canvas.toDataURL('image/png');
  } catch (_) {}

  const statsHTML = stats.map(s => `
    <div class="stat-card">
      <div class="stat-value">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>`).join('');

  const colsToShow = tableColumns.length > 0 ? tableColumns : (tableRows[0] ? Object.keys(tableRows[0]) : []);
  const tableHeaderHTML = colsToShow.map(c => `<th>${c.charAt(0).toUpperCase() + c.slice(1)}</th>`).join('');
  const tableBodyHTML = tableRows.slice(0, 50).map(r =>
    `<tr>${colsToShow.map(c => `<td>${r[c] ?? ''}</td>`).join('')}</tr>`
  ).join('');

  const linksHTML = README_LINKS.length > 0
    ? README_LINKS.map(l => `
      <div class="link-card">
        <a href="${l.url}" target="_blank">${l.label}</a>
        <span class="link-desc">${l.description || ''}</span>
      </div>`).join('')
    : `<p class="no-links">Documentation links will be added here.</p>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title} — GeoMNREGA Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #1a2b3c; }
  .page { max-width: 1000px; margin: 0 auto; padding: 40px 32px; }
  .report-header { background: linear-gradient(135deg, #1a2b3c 0%, #2d74b4 100%); color: white; border-radius: 12px; padding: 32px; margin-bottom: 28px; }
  .report-header h1 { font-size: 24px; font-weight: 700; margin-bottom: 6px; }
  .report-header .sub { font-size: 13px; opacity: 0.8; margin-bottom: 4px; }
  .report-header .date { font-size: 11px; opacity: 0.6; margin-top: 10px; }
  .portal-name { font-size: 11px; font-weight: 600; letter-spacing: 1px; opacity: 0.7; text-transform: uppercase; margin-bottom: 8px; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #2d74b4; border-left: 3px solid #2d74b4; padding-left: 10px; margin-bottom: 14px; }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
  .stat-card { background: white; border-radius: 8px; padding: 16px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.07); }
  .stat-value { font-size: 22px; font-weight: 700; color: #1a2b3c; }
  .stat-label { font-size: 11px; color: #6b7280; margin-top: 4px; }
  .map-img { width: 100%; border-radius: 10px; border: 1px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06); font-size: 13px; }
  th { background: #1a2b3c; color: white; padding: 10px 14px; text-align: left; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 9px 14px; border-bottom: 1px solid #f0f0f0; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #fafafa; }
  .table-note { font-size: 11px; color: #9ca3af; margin-top: 6px; }
  .links-grid { display: flex; flex-direction: column; gap: 10px; }
  .link-card { background: white; border-radius: 8px; padding: 14px 18px; display: flex; align-items: center; gap: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .link-card a { color: #2d74b4; font-weight: 600; font-size: 14px; text-decoration: none; }
  .link-card a:hover { text-decoration: underline; }
  .link-desc { font-size: 12px; color: #6b7280; }
  .no-links { font-size: 13px; color: #9ca3af; background: white; padding: 16px; border-radius: 8px; font-style: italic; }
  .report-footer { margin-top: 36px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; }
  @media print { body { background: white; } .page { padding: 20px; } }
</style>
</head>
<body>
<div class="page">
  <div class="report-header">
    <div class="portal-name">GeoMNREGA Research Portal</div>
    <h1>${title}</h1>
    <div class="sub">${subtitle}</div>
    <div class="date">Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
  </div>
  ${stats.length > 0 ? `<div class="section"><div class="section-title">Summary Statistics</div><div class="stats-grid">${statsHTML}</div></div>` : ''}
  ${mapImgSrc ? `<div class="section"><div class="section-title">Map Snapshot</div><img src="${mapImgSrc}" class="map-img" alt="Map snapshot" /></div>` : ''}
  ${tableRows.length > 0 ? `<div class="section"><div class="section-title">Data Table</div><table><thead><tr>${tableHeaderHTML}</tr></thead><tbody>${tableBodyHTML}</tbody></table>${tableRows.length > 50 ? `<p class="table-note">Showing top 50 of ${tableRows.length} records. Download CSV for full data.</p>` : ''}</div>` : ''}
  <div class="section">
    <div class="section-title">Documentation &amp; References</div>
    <div class="links-grid">${linksHTML}</div>
  </div>
  <div class="report-footer">
    <span>GeoMNREGA Research Portal</span>
    <span>${dateStr}</span>
  </div>
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${dateStr}.html`;
  link.click();
  URL.revokeObjectURL(link.href);
}
