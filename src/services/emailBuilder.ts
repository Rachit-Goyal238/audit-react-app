import ExcelJS from 'exceljs';
import type { ObservationItem, ScoreData, ReportMetadata } from '../types/audit';

export function getTataSignature(auditorName = 'Pawan Kumar'): string {
  return `
    <br><br>
    <p style="margin:0; font-family:'Times New Roman', Times, serif; font-size:15px;">
      Thanks &amp; Regards,
    </p>

    <table style="margin-top:10px; border-collapse:collapse; font-family:'Times New Roman', Times, serif;">
      <tr>
        <td style="padding-right:18px;">
          <img src="https://github.com/Rachit-Goyal238/audit-report-generator/blob/main/assets/kgac_logo.png?raw=true" width="165" alt="KGAC Logo" />
        </td>
        <td style="border-left:2px solid #C0C0C0; padding-left:18px; vertical-align:top;">
          <div style="font-size:22px; font-weight:bold; color:#666666;">
            ${auditorName}
          </div>
          <div style="font-size:17px; font-weight:bold; color:#666666; margin-top:3px;">
            Audit Team, Kumar Gaurav Agarwal &amp; Co.
          </div>
          <div style="margin-top:18px; font-size:15px; color:#333333;">
            +91 9999934588 | +91 8368087809 |
            <a href="https://www.kgac.in" style="color:#333333; text-decoration:none;">www.kgac.in</a>
          </div>
        </td>
      </tr>
    </table>

    <p style="margin-top:12px; font-size:11px; line-height:18px; font-family:'Times New Roman', Times, serif;">
      <span style="color:red; font-weight:bold;">Confidentiality Warning:</span>
      This message and any attachments are intended only for the use of the intended recipient(s), are confidential and may be privileged. If you are not the intended recipient, you are hereby notified that any review, re-transmission, conversion to hard copy, copying, circulation or other use of this message and any attachments is strictly prohibited. If you are not the intended recipient, please notify the sender immediately by return email and delete this message and any attachments from your system.
    </p>
    <p style="margin-top:4px; margin-bottom:10px; font-size:11px; font-family:'Times New Roman', Times, serif; color:#1F497D; word-break:break-all;">
      ********************************************************************************************************
    </p>
    <p style="color:#138C36; font-style:italic; font-weight:bold; font-size:14px; font-family:'Times New Roman', Times, serif;">
      Please do not print this email unless it is absolutely necessary.
    </p>
  `;
}

export function buildAuditDetailsTable(metadata: ReportMetadata): string {
  const BLUE = '#4F81BD';
  const BORDER = '#000000';

  const rows = [
    ['Agency Code', metadata.agency_code, 'Auditor Name', metadata.auditor_name],
    ['Agency Name', metadata.agency_name, 'Audit Date', metadata.audit_date],
    ['Agency Address', metadata.operating_address, 'Collection Manager', metadata.collection_manager],
    ['Type of Agency', metadata.report_type, 'Agency Manager', metadata.agency_manager],
  ];

  let html = `<table style="width:700px; max-width:700px; margin:15px 0; border-collapse:collapse; table-layout:fixed; font-family:Calibri, Arial, sans-serif; font-size:13px;">`;

  for (const [lLabel, lVal, rLabel, rVal] of rows) {
    html += `
      <tr>
        <td style="background:${BLUE}; color:white; font-weight:bold; border:1px solid ${BORDER}; padding:8px; width:17%; vertical-align:top; word-break:break-word; font-size:13px;">
          ${lLabel}
        </td>
        <td style="border:1px solid ${BORDER}; padding:8px; width:33%; background:white; white-space:normal; word-break:break-word; vertical-align:top; font-size:13px;">
          ${lVal || ''}
        </td>
        <td style="background:${BLUE}; color:white; font-weight:bold; border:1px solid ${BORDER}; padding:8px; width:17%; vertical-align:top; word-break:break-word; font-size:13px;">
          ${rLabel}
        </td>
        <td style="border:1px solid ${BORDER}; padding:8px; width:33%; background:white; white-space:normal; word-break:break-word; vertical-align:top; font-size:13px;">
          ${rVal || ''}
        </td>
      </tr>
    `;
  }
  html += `</table>`;
  return html;
}

export function buildObservationsTable(observations: ObservationItem[], isClosure = false): string {
  const BLUE = '#4F81BD';
  const BORDER = '#000000';

  if (!isClosure) {
    let html = `
      <table style="width:900px; max-width:900px; margin:15px 0; border-collapse:collapse; table-layout:fixed; font-family:Calibri, Arial, sans-serif; font-size:13px;">
        <tr>
          <th style="background:${BLUE}; color:white; border:1px solid ${BORDER}; padding:7px 8px; font-weight:bold; text-align:left; width:14%;">Rating Category</th>
          <th style="background:${BLUE}; color:white; border:1px solid ${BORDER}; padding:7px 8px; font-weight:bold; text-align:left; width:24%;">Short Segmentation</th>
          <th style="background:${BLUE}; color:white; border:1px solid ${BORDER}; padding:7px 8px; font-weight:bold; text-align:left; width:46%;">Observation</th>
          <th style="background:${BLUE}; color:white; border:1px solid ${BORDER}; padding:7px 8px; font-weight:bold; text-align:center; width:16%;">Pending Status<br>(Open/Closed)</th>
        </tr>
    `;

    for (const obs of observations) {
      html += `
        <tr>
          <td style="border:1px solid ${BORDER}; padding:6px 8px; vertical-align:top; background:white;">${obs.rating_category}</td>
          <td style="border:1px solid ${BORDER}; padding:6px 8px; vertical-align:top; background:white;">${obs.short_segmentation}</td>
          <td style="border:1px solid ${BORDER}; padding:6px 8px; vertical-align:top; background:white;">${obs.observation.replace(/\n/g, '<br>')}</td>
          <td style="border:1px solid ${BORDER}; padding:6px 8px; vertical-align:top; background:white; text-align:center;">${obs.pending_status}</td>
        </tr>
      `;
    }
    html += `</table>`;
    return html;
  } else {
    let html = `
      <table style="width:900px; max-width:900px; margin:15px 0; border-collapse:collapse; table-layout:fixed; font-family:Calibri, Arial, sans-serif; font-size:13px;">
        <tr>
          <th style="background:${BLUE}; color:white; border:1px solid ${BORDER}; padding:7px 8px; font-weight:bold; text-align:left; width:12%;">Rating Category</th>
          <th style="background:${BLUE}; color:white; border:1px solid ${BORDER}; padding:7px 8px; font-weight:bold; text-align:left; width:15%;">Short Segmentation</th>
          <th style="background:${BLUE}; color:white; border:1px solid ${BORDER}; padding:7px 8px; font-weight:bold; text-align:left; width:25%;">Observation</th>
          <th style="background:${BLUE}; color:white; border:1px solid ${BORDER}; padding:7px 8px; font-weight:bold; text-align:left; width:18%;">Closure Remarks</th>
          <th style="background:${BLUE}; color:white; border:1px solid ${BORDER}; padding:7px 8px; font-weight:bold; text-align:center; width:12%;">Pending Status<br>(Open/Closed)</th>
          <th style="background:${BLUE}; color:white; border:1px solid ${BORDER}; padding:7px 8px; font-weight:bold; text-align:center; width:18%;">Timelines for non-closure points</th>
        </tr>
    `;

    for (const obs of observations) {
      html += `
        <tr>
          <td style="border:1px solid ${BORDER}; padding:6px 8px; vertical-align:top; background:white;">${obs.rating_category}</td>
          <td style="border:1px solid ${BORDER}; padding:6px 8px; vertical-align:top; background:white;">${obs.short_segmentation}</td>
          <td style="border:1px solid ${BORDER}; padding:6px 8px; vertical-align:top; background:white;">${obs.observation.replace(/\n/g, '<br>')}</td>
          <td style="border:1px solid ${BORDER}; padding:6px 8px; vertical-align:top; background:white;">${obs.closure_remarks.replace(/\n/g, '<br>')}</td>
          <td style="border:1px solid ${BORDER}; padding:6px 8px; vertical-align:top; background:white; text-align:center;">${obs.pending_status}</td>
          <td style="border:1px solid ${BORDER}; padding:6px 8px; vertical-align:top; background:white; text-align:center;">${obs.timelines}</td>
        </tr>
      `;
    }
    html += `</table>`;
    return html;
  }
}

export function buildScoreTable(scoreData: ScoreData): string {
  const BLUE = '#4F81BD';
  const BORDER = '#000000';
  const scores = scoreData.rows;
  const summary = scoreData.summary;

  let html = `
    <table style="width:600px; max-width:600px; margin:15px 0; border-collapse:collapse; table-layout:fixed; font-family:Calibri, Arial, sans-serif; font-size:13px;">
      <tr>
        <th style="background:${BLUE}; color:white; border:1px solid ${BORDER}; padding:7px 8px; font-weight:bold; width:8%; text-align:center;">S. No.</th>
        <th style="background:${BLUE}; color:white; border:1px solid ${BORDER}; padding:7px 8px; font-weight:bold; width:32%; text-align:left;">Particulars</th>
        <th style="background:${BLUE}; color:white; border:1px solid ${BORDER}; padding:7px 8px; font-weight:bold; width:15%; text-align:center;">Key Points</th>
        <th style="background:${BLUE}; color:white; border:1px solid ${BORDER}; padding:7px 8px; font-weight:bold; width:15%; text-align:center;">Weightage</th>
        <th style="background:${BLUE}; color:white; border:1px solid ${BORDER}; padding:7px 8px; font-weight:bold; width:15%; text-align:center;">Actual</th>
        <th style="background:${BLUE}; color:white; border:1px solid ${BORDER}; padding:7px 8px; font-weight:bold; width:15%; text-align:center;">Percentage</th>
      </tr>
  `;

  for (const row of scores) {
    let pct = row.Percentage;
    const num = parseFloat(pct);
    if (!isNaN(num)) {
      pct = `${Math.round(num <= 1 ? num * 100 : num)}%`;
    }

    html += `
      <tr>
        <td style="border:1px solid ${BORDER}; padding:6px 8px; text-align:center; background:white;">${row['S. No.']}</td>
        <td style="border:1px solid ${BORDER}; padding:6px 8px; background:white;">${row.Particulars}</td>
        <td style="border:1px solid ${BORDER}; padding:6px 8px; text-align:center; background:white;">${row['Key Points']}</td>
        <td style="border:1px solid ${BORDER}; padding:6px 8px; text-align:center; background:white;">${row.Weightage}</td>
        <td style="border:1px solid ${BORDER}; padding:6px 8px; text-align:center; background:white;">${row.Actual}</td>
        <td style="border:1px solid ${BORDER}; padding:6px 8px; text-align:center; background:white;">${pct}</td>
      </tr>
    `;
  }

  let totalPctNum = parseFloat(summary.percentage);
  if (!isNaN(totalPctNum) && totalPctNum <= 1) {
    totalPctNum = totalPctNum * 100;
  }
  const totalPercentage = isNaN(totalPctNum) ? 0 : Math.round(totalPctNum);
  const displayPercentage = `${totalPercentage}%`;

  let totalBg = '#A9D18E';
  let totalFg = '#000000';
  if (totalPercentage >= 80) {
    totalBg = '#A9D18E';
  } else if (totalPercentage >= 70 || totalPercentage >= 60) {
    totalBg = '#FFC000';
  } else {
    totalBg = '#FF0000';
    totalFg = totalPercentage < 50 ? '#FFFFFF' : '#000000';
  }

  html += `
    <tr>
      <td style="border:1px solid ${BORDER}; padding:4px; background:white;"></td>
      <td style="background:${BLUE}; color:white; font-weight:bold; border:1px solid ${BORDER}; padding:4px; text-align:center;">Total</td>
      <td style="background:${BLUE}; color:white; font-weight:bold; border:1px solid ${BORDER}; padding:4px; text-align:center;">${summary.total_key_points}</td>
      <td style="background:${BLUE}; color:white; font-weight:bold; border:1px solid ${BORDER}; padding:4px; text-align:center;">${summary.total_weightage}</td>
      <td style="background:${BLUE}; color:white; font-weight:bold; border:1px solid ${BORDER}; padding:4px; text-align:center;">${summary.total_actual}</td>
      <td style="background:${totalBg}; color:${totalFg}; font-weight:bold; border:1px solid ${BORDER}; padding:4px; text-align:center;">${displayPercentage}</td>
    </tr>
    <tr>
      <td colspan="5" style="background:${BLUE}; color:white; font-weight:bold; border:1px solid ${BORDER}; padding:4px; text-align:center;">FINAL RATING</td>
      <td style="background:${BLUE}; color:white; font-weight:bold; border:1px solid ${BORDER}; padding:4px; text-align:center;">${summary.final_rating}</td>
    </tr>
  </table>
  `;

  return html;
}

export async function extractEmailDataFromExcel(excelBlob: Blob): Promise<{
  observations: ObservationItem[];
  scoreData: ScoreData;
}> {
  const arrayBuffer = await excelBlob.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(arrayBuffer);

  // 1. Checklist sheet observations
  const checklistSheet = wb.getWorksheet('Checklist') || wb.worksheets[0];
  const observations: ObservationItem[] = [];

  if (checklistSheet) {
    // Find header row starting with "Sr.No."
    let headerRow = 7;
    checklistSheet.eachRow((row, r) => {
      row.eachCell((cell) => {
        if (String(cell.value || '').trim().replace(/\s+/g, ' ').toLowerCase().includes('sr.no')) {
          headerRow = r;
        }
      });
    });

    const colMap: Record<string, number> = {};
    checklistSheet.getRow(headerRow).eachCell((cell, col) => {
      colMap[String(cell.value || '').trim().toLowerCase()] = col;
    });

    const exclude = ['', 'na', 'n/a', 'nan', 'none'];

    for (let r = headerRow + 1; r <= checklistSheet.rowCount; r++) {
      const row = checklistSheet.getRow(r);
      const srNo = row.getCell(1).value;
      if (srNo === null || srNo === undefined || String(srNo).trim() === '') break;

      // Filter on Pending Status (col I or Col 9)
      const pendingStatus = String(row.getCell(colMap['pending status (open/ closed)'] || 9).value || '').trim();
      if (!exclude.includes(pendingStatus.toLowerCase())) {
        observations.push({
          rating_category: String(row.getCell(colMap['rating category'] || 2).value || '').trim(),
          short_segmentation: String(row.getCell(colMap['short segmentation'] || 3).value || '').trim(),
          observation: String(row.getCell(colMap['observation'] || 4).value || '').trim(),
          pending_status: pendingStatus,
          closure_remarks: String(row.getCell(colMap['closing meeting comments'] || 8).value || '').trim(),
          timelines: String(row.getCell(colMap['timelines for non-closure point'] || 10).value || '').trim(),
        });
      }
    }
  }

function getCellValue(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'object') {
    if ('result' in val && val.result !== null && val.result !== undefined) {
      return getCellValue(val.result);
    }
    if ('text' in val && typeof val.text === 'string') {
      return val.text.trim();
    }
    if ('richText' in val && Array.isArray(val.richText)) {
      return val.richText.map((t: any) => t.text).join('').trim();
    }
    if ('formula' in val || 'sharedFormula' in val) {
      return '0';
    }
  }
  const str = String(val).trim();
  if (str.startsWith('[object')) return '0';
  return str;
}

function formatScorePercentage(val: any): string {
  const clean = getCellValue(val);
  if (!clean || clean === '-') return '-';
  const num = parseFloat(clean);
  if (!isNaN(num)) {
    const pct = num <= 1 ? Math.round(num * 100) : Math.round(num);
    return `${pct}%`;
  }
  return clean;
}

  // 2. Score Parameters Sheet
  const scoreSheet = wb.getWorksheet('Score Parameters') || wb.worksheets[1];
  const scoreRows: ScoreData['rows'] = [];
  const scoreSummary: ScoreData['summary'] = {
    total_key_points: '',
    total_weightage: '',
    total_actual: '',
    percentage: '',
    final_rating: '',
  };

  if (scoreSheet) {
    for (let r = 2; r <= scoreSheet.rowCount; r++) {
      const row = scoreSheet.getRow(r);
      const srNo = getCellValue(row.getCell(1).value);
      const particular = getCellValue(row.getCell(2).value);

      if (srNo.toUpperCase() === 'TOTAL' || particular.toUpperCase() === 'TOTAL') {
        scoreSummary.total_key_points = getCellValue(row.getCell(3).value);
        scoreSummary.total_weightage = getCellValue(row.getCell(4).value);
        scoreSummary.total_actual = getCellValue(row.getCell(5).value);
        scoreSummary.percentage = formatScorePercentage(row.getCell(6).value);
      } else if (srNo.toUpperCase() === 'FINAL RATING' || particular.toUpperCase() === 'FINAL RATING') {
        scoreSummary.final_rating = getCellValue(row.getCell(6).value);
      } else if (srNo !== '') {
        scoreRows.push({
          'S. No.': srNo,
          Particulars: particular,
          'Key Points': getCellValue(row.getCell(3).value),
          Weightage: getCellValue(row.getCell(4).value),
          Actual: getCellValue(row.getCell(5).value),
          Percentage: formatScorePercentage(row.getCell(6).value),
        });
      }
    }
  }

  return { observations, scoreData: { rows: scoreRows, summary: scoreSummary } };
}

export function buildEmailHtml(
  emailType: 'Report Email' | 'Closure Email',
  metadata: ReportMetadata,
  observations: ObservationItem[],
  scoreData: ScoreData
): { subject: string; html: string } {
  const auditDetailsTable = buildAuditDetailsTable(metadata);
  const observationsTable = buildObservationsTable(observations, emailType === 'Closure Email');
  const signature = getTataSignature(metadata.auditor_name);

  if (emailType === 'Report Email') {
    const scoreTable = buildScoreTable(scoreData);
    const subject = `${metadata.report_type} Audit Report || ${metadata.location} || ${metadata.agency_name} || ${metadata.agency_code} || ${metadata.product}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 15px; color: #000; line-height: 1.35; }
          table { border-collapse: collapse; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <p>Dear Sir,</p>
        <p>Greetings of the day!</p>
        <p>
          This is to apprise you that the scheduled agency audit was successfully performed on <b>${metadata.audit_date}</b>. Based on the audit parameters, the agency obtained <b>"${scoreData.summary.final_rating || 'N/A'}"</b> rating.
        </p>
        <p>
          Below are the critical observations identified, and the detailed audit sheet with artifacts is also attached for your reference:
        </p>
        ${auditDetailsTable}
        <h3 style="font-size:15px !important; font-family:Calibri, Arial, sans-serif; font-weight:bold; margin:15px 0 8px 0; line-height:1.2;">
          <u>Allocation :</u>
        </h3>
        <h3 style="font-size:15px !important; font-family:Calibri, Arial, sans-serif; font-weight:bold; margin:15px 0 8px 0; line-height:1.2;">
          <u>Key Observations:</u>
        </h3>
        ${observationsTable}
        <h3 style="font-size:15px !important; font-family:Calibri, Arial, sans-serif; font-weight:bold; margin:15px 0 8px 0; line-height:1.2;">
          <u>Parameter-wise Scoring and Rating:</u>
        </h3>
        ${scoreTable}
        <p>
          Please share your remarks on each point with the resolution for closure of the audit query within <b>07 days.</b>
        </p>
        ${signature}
      </body>
      </html>
    `;
    return { subject, html };
  } else {
    const subject = `${metadata.report_type} Audit Closure Meeting || ${metadata.location} || ${metadata.agency_name} || ${metadata.agency_code} || ${metadata.product}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 15px; color: #000; line-height: 1.35; }
          table { border-collapse: collapse; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <p>Dear Sir/Madam,</p>
        <p>Greetings of the day!</p>
        <p>
          Please find below mentioned observations noted during the audit conducted for your agency. The audit has been completed, and as discussed during the audit closure meeting, the points listed below have been closed or will be implemented by you within the agreed timelines. These observations were reviewed with you at the time of audit completion, and your responses have been duly recorded in the "Closing Meeting Comments" column of the observation sheet.
        </p>
        <p>Kindly acknowledge the receipt of this communication.</p>
        <h3 style="font-size:15px !important; font-family:Calibri, Arial, sans-serif; font-weight:bold; margin:15px 0 8px 0; line-height:1.2;">
          <u>Agency details :</u>
        </h3>
        ${auditDetailsTable}
        <h3 style="font-size:15px !important; font-family:Calibri, Arial, sans-serif; font-weight:bold; margin:15px 0 8px 0; line-height:1.2;">
          <u>Allocation :</u>
        </h3>
        <h3 style="font-size:15px !important; font-family:Calibri, Arial, sans-serif; font-weight:bold; margin:15px 0 8px 0; line-height:1.2;">
          <u>Key Observations:</u>
        </h3>
        ${observationsTable}
        <p>
          Note: The observations mentioned above are provisional and may change based on the review of supporting evidence and backend data. Any additional observations, if identified, will be included in the final report.
        </p>
        ${signature}
      </body>
      </html>
    `;
    return { subject, html };
  }
}
