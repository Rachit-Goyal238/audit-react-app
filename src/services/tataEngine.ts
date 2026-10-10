import ExcelJS from 'exceljs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';
import type {
  TataPdfHeaderData,
  ReportMetadata,
  GeneratedDownloads,
  AppSettings,
  ScoreData,
  ScoreRow,
  ScoreSummary,
} from '../types/audit';
import { convertExcelToPdfViaGotenberg } from './gotenbergService';
import { compressPdfIfPossible } from './pdfService';

// Ensure PDF.js worker is properly configured for Vite
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export function sanitizeFilename(name: string): string {
  const sanitized = name.replace(/[\\/*?:"<>|]/g, '');
  return sanitized.replace(/\s+/g, ' ').trim();
}

export function createOutputPaths(
  agency_name: string,
  agency_code: string,
  location: string,
  report_type: string,
  product: string
) {
  const baseNameRaw = `${agency_name} (${agency_code}) - ${location} - ${report_type} - ${product}`;
  const baseName = sanitizeFilename(baseNameRaw);

  return {
    baseName,
    excel: `${baseName}.xlsx`,
    pdf: `${baseName}.pdf`,
    evidence: `${baseName}_Evidence.pdf`,
    final: `${baseName}_Final_Report.pdf`,
  };
}

export async function extractPdfHeader(pdfFile: File): Promise<TataPdfHeaderData> {
  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const firstPage = await pdf.getPage(1);
    const textContent = await firstPage.getTextContent();
    const textItems = textContent.items
      .map((item: any) => ('str' in item ? item.str.trim() : ''))
      .filter((s: string) => s.length > 0);

    const data: TataPdfHeaderData = {};

    for (let i = 0; i < textItems.length; i++) {
      const line = textItems[i].toUpperCase();

      if (line === 'AGENCY NAME' && i + 1 < textItems.length) {
        data.agency_name = textItems[i + 1];
      } else if (line === 'OPERATING ADDRESS') {
        const addressLines: string[] = [];
        let j = i + 1;
        while (j < textItems.length) {
          if (textItems[j].toUpperCase() === 'CURRENT EMAIL ID') break;
          addressLines.push(textItems[j]);
          j++;
        }
        data.operating_address = addressLines.join(' ');
      } else if (line === 'TYPE OF AGENCY' && i + 1 < textItems.length) {
        data.agency_type = textItems[i + 1];
      } else if (line === 'COLLECTION MANAGER' && i + 1 < textItems.length) {
        data.collection_manager = textItems[i + 1];
      } else if (line === 'AGENCY MANAGER' && i + 1 < textItems.length) {
        data.agency_manager = textItems[i + 1];
      } else if (line === 'PRODUCT' && i + 1 < textItems.length) {
        data.product = textItems[i + 1];
      }
    }

    return data;
  } catch (err) {
    console.warn('PDF Header extraction fallback:', err);
    return {};
  }
}

export async function extractEvidencePages(pdfFile: File): Promise<Blob> {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const sourceDoc = await PDFDocument.load(arrayBuffer);
  const evidenceDoc = await PDFDocument.create();

  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const evidencePageIndices: number[] = [];
    const observationRegex = /Observation\s*#?\s*\d+/i;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ');

      if (observationRegex.test(pageText)) {
        evidencePageIndices.push(pageNum - 1);
      }
    }

    if (evidencePageIndices.length > 0) {
      const copiedPages = await evidenceDoc.copyPages(sourceDoc, evidencePageIndices);
      for (const cp of copiedPages) {
        evidenceDoc.addPage(cp);
      }
    } else {
      const page = evidenceDoc.addPage([595, 842]);
      const font = await evidenceDoc.embedFont(StandardFonts.Helvetica);
      page.drawText('No evidence pages found in the report.', {
        x: 50,
        y: 750,
        size: 14,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }
  } catch (err) {
    console.warn('PDF evidence extraction fallback:', err);
    if (sourceDoc.getPageCount() > 1) {
      const pagesToCopy = Array.from({ length: sourceDoc.getPageCount() - 1 }, (_, i) => i + 1);
      const copiedPages = await evidenceDoc.copyPages(sourceDoc, pagesToCopy);
      copiedPages.forEach((p) => evidenceDoc.addPage(p));
    } else {
      const page = evidenceDoc.addPage([595, 842]);
      const font = await evidenceDoc.embedFont(StandardFonts.Helvetica);
      page.drawText('No evidence pages found in the report.', { x: 50, y: 750, size: 14, font, color: rgb(0.3, 0.3, 0.3) });
    }
  }

  const pdfBytes = await evidenceDoc.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}

export async function mergeThreePdfs(
  generatedPdfBlob: Blob,
  evidencePdfBlob: Blob,
  annexurePdfFile?: File | null
): Promise<Blob> {
  const finalDoc = await PDFDocument.create();

  // 1. Generated PDF
  const genBytes = await generatedPdfBlob.arrayBuffer();
  const genDoc = await PDFDocument.load(genBytes);
  const genPages = await finalDoc.copyPages(genDoc, genDoc.getPageIndices());
  genPages.forEach((p) => finalDoc.addPage(p));

  // 2. Evidence PDF
  const eviBytes = await evidencePdfBlob.arrayBuffer();
  const eviDoc = await PDFDocument.load(eviBytes);
  const eviPages = await finalDoc.copyPages(eviDoc, eviDoc.getPageIndices());
  eviPages.forEach((p) => finalDoc.addPage(p));

  // 3. Optional Annexure PDF
  if (annexurePdfFile) {
    const annBytes = await annexurePdfFile.arrayBuffer();
    const annDoc = await PDFDocument.load(annBytes);
    const annPages = await finalDoc.copyPages(annDoc, annDoc.getPageIndices());
    annPages.forEach((p) => finalDoc.addPage(p));
  }

  const finalBytes = await finalDoc.save();
  return new Blob([finalBytes as unknown as BlobPart], { type: 'application/pdf' });
}

export function parseClosingComment(comment: any) {
  const parts = String(comment || '')
    .split(/\s*[|;]\s*/)
    .map((p) => p.trim());

  return {
    remarks: parts[0] || '',
    status: parts[1] || '',
    timeline: parts[2] || '',
  };
}

export async function generateTataReport(
  auditId: string,
  masterFile: File,
  client: string,
  templateType: string,
  reportPdfFile: File,
  annexurePdfFile: File | null,
  settings: AppSettings,
  onProgress?: (msg: string) => void
): Promise<{ downloads: GeneratedDownloads; metadata: ReportMetadata; scoreData?: ScoreData }> {
  onProgress?.('Parsing Master Excel workbook...');
  const masterBuffer = await masterFile.arrayBuffer();
  const masterWb = new ExcelJS.Workbook();
  await masterWb.xlsx.load(masterBuffer);

  const masterSheet = masterWb.worksheets[0];
  if (!masterSheet) {
    throw new Error('Master Excel contains no sheets.');
  }

  // 1. Find Header Row & Index Columns
  const headers: string[] = [];
  masterSheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value || '').trim();
  });

  const auditIdColIndex = headers.findIndex((h) => h.toLowerCase() === 'audit id');
  if (auditIdColIndex === -1) {
    throw new Error('Column "Audit ID" not found in Master Excel.');
  }

  // 2. Filter Rows by Audit ID
  const auditRows: Record<string, any>[] = [];
  masterSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const rowAuditId = String(row.getCell(auditIdColIndex + 1).value || '').trim();
    if (rowAuditId.toLowerCase() === auditId.trim().toLowerCase()) {
      const rowObj: Record<string, any> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = row.getCell(idx + 1).value;
      });
      auditRows.push(rowObj);
    }
  });

  if (auditRows.length === 0) {
    throw new Error(`Audit ID '${auditId}' not found in Master Excel.`);
  }

  onProgress?.(`Found ${auditRows.length} audit records for ID '${auditId}'.`);
  const firstRow = auditRows[0];
  const agency_code = String(firstRow['Agency Code'] || '').trim();
  const agency_name = String(firstRow['Agency Name'] || '').trim();

  // Location variant matching like legacy Python
  const possibleLocations = [
    'location',
    'location/ city',
    'location / city',
    'city/location',
    'city',
    'location/city',
  ];
  let location = '';
  for (const [key, val] of Object.entries(firstRow)) {
    if (possibleLocations.includes(key.toLowerCase().trim()) && val) {
      location = String(val).trim();
      break;
    }
  }
  if (!location) {
    location = 'Location Not Found';
  }

  // Find audit date
  let audit_date = 'Date Not Found';
  for (const [key, val] of Object.entries(firstRow)) {
    const k = key.toLowerCase();
    if (k.includes('audit') && k.includes('date') && val) {
      if (val instanceof Date) {
        audit_date = val.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      } else {
        audit_date = String(val).trim();
      }
      break;
    }
  }

  const auditor_name = String(firstRow['Auditor Name'] || '').trim();

  // 3. Extract Header Info from Page 1 of Audit Report PDF
  onProgress?.('Extracting agency & manager header details from Audit Report PDF...');
  const pdfHeaderData = await extractPdfHeader(reportPdfFile);
  const report_type = pdfHeaderData.agency_type || templateType || 'Collection';
  const product = pdfHeaderData.product || 'Unknown_Product';

  if (!location || location === 'Location Not Found') {
    if (pdfHeaderData.operating_address) {
      const words = pdfHeaderData.operating_address.split(/[,\s]+/).filter(Boolean);
      const pinIdx = words.findIndex((w) => /^\d{6}$/.test(w));
      if (pinIdx > 0) {
        location = words[pinIdx - 1];
      } else {
        location = words[words.length - 1] || 'Location';
      }
    } else {
      location = 'Location';
    }
  }

  const paths = createOutputPaths(agency_name, agency_code, location, report_type, product);

  // 4. Load Template Excel from public/templates
  onProgress?.(`Loading official template for '${client} - ${templateType}'...`);
  const tataTemplateMap: Record<string, string> = {
    'Collection': '/templates/TATA Capital/TATA_Collection_Agency_Template_2026-27.xlsx',
    'Repossesion': '/templates/TATA Capital/TATA_Repo_Agency_Template_2026-27.xlsx',
    'Collection And Repossesion': '/templates/TATA Capital/TATA_Collection_and_Repo_Agency_Template_2026-27.xlsx',
    'Stockyard': '/templates/TATA Capital/TATA_Stockyard_Agency_Template_2026-27.xlsx',
  };

  const templatePath = tataTemplateMap[templateType] || tataTemplateMap['Collection'];
  let templateBuffer: ArrayBuffer;

  try {
    const encodedUrl = encodeURI(templatePath);
    const resp = await fetch(encodedUrl);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} fetching ${encodedUrl}`);
    }
    templateBuffer = await resp.arrayBuffer();
  } catch (err) {
    onProgress?.(`Notice: Template fetch error (${err}), creating structured workbook in memory...`);
    // Fallback template workbook creation in memory so it NEVER crashes
    const fallbackWb = new ExcelJS.Workbook();
    const wsFallback = fallbackWb.addWorksheet('Checklist');
    wsFallback.pageSetup = { fitToPage: true, fitToWidth: 1, fitToHeight: 0, orientation: 'landscape', paperSize: 9 };
    wsFallback.addRow(['INTERNAL AUDIT REPORT & MANAGEMENT ACTION PLAN']);
    wsFallback.addRow(['', '', '', '', '', '', '']);
    wsFallback.addRow(['', '', '', '', '', '', '']);
    wsFallback.addRow(['', '', '', '', '', '', '']);
    wsFallback.addRow(['', '', '', '', '', '', '']);
    wsFallback.addRow(['', '', '', '', '', '', '']);
    wsFallback.addRow(['', '', '', '', '', '', '']);
    wsFallback.addRow(['Sr.No.', 'Rating Category', 'Short Segmentation', 'Observation', '', 'Status Detail', 'Key Observation', 'Closing Meeting Comments', 'Pending Status (Open/ Closed)', 'Timelines for Non-Closure Point']);
    for (let i = 1; i <= 30; i++) {
      wsFallback.addRow([i, 'Category ' + i, 'Segment ' + i, 'Observation checklist point ' + i, '', '', '', '', '', '']);
    }
    const scoreWs = fallbackWb.addWorksheet('Score Parameters');
    scoreWs.addRow(['S. No.', 'Particulars', 'Key Points', 'Weightage', 'Actual', 'Percentage']);
    scoreWs.addRow(['1', 'Code of Conduct Compliance', '10', '10', '9', '90%']);
    scoreWs.addRow(['2', 'Documentation & Physical Registers', '10', '10', '8', '80%']);
    scoreWs.addRow(['3', 'Customer Interaction Quality', '10', '10', '8.5', '85%']);
    scoreWs.addRow(['TOTAL', 'TOTAL', '30', '30', '25.5', '85%']);
    scoreWs.addRow(['FINAL RATING', '', '', '', '', 'A']);
    const buf = await fallbackWb.xlsx.writeBuffer();
    templateBuffer = buf as ArrayBuffer;
  }

  const templateWb = new ExcelJS.Workbook();
  await templateWb.xlsx.load(templateBuffer);
  const ws = templateWb.worksheets[0];

  // Populate Headers (1:1 with excel_utils.py)
  ws.getCell('D2').value = agency_code;
  ws.getCell('D3').value = agency_name;
  ws.getCell('D4').value = pdfHeaderData.operating_address || '';
  ws.getCell('D5').value = pdfHeaderData.agency_type || '';
  ws.getCell('G2').value = auditor_name;
  ws.getCell('G3').value = audit_date;
  ws.getCell('G4').value = pdfHeaderData.collection_manager || '';
  ws.getCell('G5').value = pdfHeaderData.agency_manager || '';

  // Populate Checklist Rows (1:1 with excel_utils.py)
  onProgress?.('Populating checklist observations and formatting status cells...');
  const questionRowMap: Record<number, number> = {};
  for (let r = 8; r <= ws.rowCount; r++) {
    const cellVal = ws.getCell(`A${r}`).value;
    if (cellVal !== null && cellVal !== undefined) {
      const num = parseInt(String(cellVal), 10);
      if (!isNaN(num)) {
        questionRowMap[num] = r;
      }
    }
  }

  // Pre-clean all checklist rows (A to J) so nothing from template is bold
  for (let r = 8; r <= ws.rowCount; r++) {
    const aVal = ws.getCell(`A${r}`).value;
    if (aVal !== null && aVal !== undefined && !isNaN(parseInt(String(aVal), 10))) {
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].forEach((col) => {
        const cell = ws.getCell(`${col}${r}`);
        cell.style = {
          ...cell.style,
          font: { ...(cell.font || { name: 'Calibri', size: 9 }), bold: false },
        };
      });
    }
  }

  for (const auditRow of auditRows) {
    const qVal = auditRow['Question No.'];
    if (qVal === undefined || qVal === null) continue;
    const qNum = parseInt(String(qVal).trim(), 10);
    if (isNaN(qNum) || !questionRowMap[qNum]) continue;

    const targetRow = questionRowMap[qNum];
    const statusDetail = String(
      auditRow['Status Detail'] ||
      auditRow['status detail'] ||
      auditRow['Status'] ||
      auditRow['status'] ||
      auditRow['Compliance status\n (Yes / No)'] ||
      auditRow['Compliance status (Yes / No)'] ||
      ''
    ).trim();
    const keyObservation = String(
      auditRow['Key Observation'] ||
      auditRow['key observation'] ||
      ''
    ).trim();
    const remarksVal = auditRow['Remarks'] || auditRow['remarks'] || '';
    const parsed = parseClosingComment(remarksVal);

    const pendingStatus = String(
      parsed.status ||
      auditRow['Pending Status'] ||
      auditRow['pending status'] ||
      auditRow['Pending Status (Open/ Closed)'] ||
      auditRow['Pending Status\n(Open/ Closed)'] ||
      auditRow['Closure Status'] ||
      auditRow['closure status'] ||
      ''
    ).trim();

    ws.getCell(`F${targetRow}`).value = statusDetail;
    ws.getCell(`G${targetRow}`).value = keyObservation;
    ws.getCell(`H${targetRow}`).value = parsed.remarks;
    ws.getCell(`I${targetRow}`).value = pendingStatus || parsed.status;
    ws.getCell(`J${targetRow}`).value = parsed.timeline;

    // Only remarks having closure status either Closed or Open to be bold (Column F to J), nothing else needs to be bold
    const isClosureBold = ['open', 'closed'].includes(pendingStatus.toLowerCase());

    // Columns F to J: bold IF AND ONLY IF closure status is Open or Closed
    ['F', 'G', 'H', 'I', 'J'].forEach((col) => {
      const cell = ws.getCell(`${col}${targetRow}`);
      cell.style = {
        ...cell.style,
        font: { ...(cell.font || { name: 'Calibri', size: 9 }), bold: isClosureBold },
      };
    });

    // Columns A to E: NEVER bold
    ['A', 'B', 'C', 'D', 'E'].forEach((col) => {
      const cell = ws.getCell(`${col}${targetRow}`);
      cell.style = {
        ...cell.style,
        font: { ...(cell.font || { name: 'Calibri', size: 9 }), bold: false },
      };
    });
  }

  // 4b. Evaluate Checklist Column E & Score Parameters sheet
  onProgress?.('Evaluating checklist scores and Score Parameters table...');

  function getChecklistRowWeight(cell: ExcelJS.Cell, sheet: ExcelJS.Worksheet): number {
    if (!cell || cell.value === null || cell.value === undefined) return 0;
    const v = cell.value;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const num = parseFloat(v);
      if (!isNaN(num)) return num;
      return 0;
    }
    if (typeof v === 'object') {
      let formula: string | undefined = (v as any).formula;
      if (!formula && (v as any).sharedFormula) {
        const master = sheet.getCell((v as any).sharedFormula);
        if (master && master.value && typeof master.value === 'object') {
          formula = (master.value as any).formula;
        }
      }
      if (formula) {
        const m = formula.match(/IF\(F\d+=\"Yes\",\s*(\d+(?:\.\d+)?)/i);
        if (m) return parseFloat(m[1]);
      }
      if (typeof (v as any).result === 'number') return (v as any).result;
    }
    return 0;
  }

  function setCellResult(cell: ExcelJS.Cell, result: any) {
    if (cell.value && typeof cell.value === 'object') {
      cell.value = { ...(cell.value as any), result } as any;
    } else {
      cell.value = result;
    }
  }

  const catScores: Record<string, { keyPoints: number; weightage: number; actual: number }> = {};

  for (let r = 8; r <= ws.rowCount; r++) {
    const srNo = ws.getCell(`A${r}`).value;
    if (srNo === null || srNo === undefined) continue;
    const num = parseInt(String(srNo), 10);
    if (isNaN(num)) continue;

    const cat = String(ws.getCell(`B${r}`).value || '').trim();
    if (!cat) continue;

    const eCell = ws.getCell(`E${r}`);
    const fVal = String(ws.getCell(`F${r}`).value || '').trim().toLowerCase();
    const isYes = ['yes', 'complied', 'y', 'true'].includes(fVal);

    const weight = getChecklistRowWeight(eCell, ws);
    const actual = isYes ? weight : 0;

    setCellResult(eCell, actual);

    if (!catScores[cat]) {
      catScores[cat] = { keyPoints: 0, weightage: 0, actual: 0 };
    }
    catScores[cat].keyPoints += 1;
    catScores[cat].weightage += weight;
    catScores[cat].actual += actual;
  }

  // Evaluate Score Parameters Sheet
  const scoreRows: ScoreRow[] = [];
  let scoreSummary: ScoreSummary = {
    total_key_points: '0',
    total_weightage: '0',
    total_actual: '0',
    percentage: '0%',
    final_rating: 'E',
  };

  const scoreWs = templateWb.getWorksheet('Score Parameters') || templateWb.worksheets.find(w => w.name.toLowerCase().includes('score'));
  if (scoreWs) {
    let totalKey = 0;
    let totalWeight = 0;
    let totalActual = 0;

    for (let r = 2; r <= scoreWs.rowCount; r++) {
      const srCell = scoreWs.getCell(`A${r}`);
      const partCell = scoreWs.getCell(`B${r}`);
      const srVal = String(srCell.value || '').trim();
      const partVal = String(partCell.value || '').trim();

      if (srVal.toUpperCase() === 'TOTAL' || partVal.toUpperCase() === 'TOTAL') {
        const totalPct = totalWeight > 0 ? (totalActual / totalWeight) : 0;
        const totalPctDisplay = totalWeight > 0 ? `${Math.round((totalActual / totalWeight) * 100)}%` : '0%';

        scoreSummary.total_key_points = String(totalKey);
        scoreSummary.total_weightage = String(totalWeight);
        scoreSummary.total_actual = String(totalActual);
        scoreSummary.percentage = totalPctDisplay;

        const cCell = scoreWs.getCell(`C${r}`);
        const dCell = scoreWs.getCell(`D${r}`);
        const eCell = scoreWs.getCell(`E${r}`);
        const fCell = scoreWs.getCell(`F${r}`);

        setCellResult(cCell, totalKey);
        setCellResult(dCell, totalWeight);
        setCellResult(eCell, totalActual);
        setCellResult(fCell, totalPct);
      } else if (srVal.toUpperCase() === 'FINAL RATING' || partVal.toUpperCase() === 'FINAL RATING') {
        const totalPctNum = totalWeight > 0 ? Math.round((totalActual / totalWeight) * 100) : 0;
        let grade = 'E';
        if (totalPctNum >= 80) grade = 'A';
        else if (totalPctNum >= 70) grade = 'B';
        else if (totalPctNum >= 60) grade = 'C';
        else if (totalPctNum >= 50) grade = 'D';
        else grade = 'E';

        scoreSummary.final_rating = grade;

        const fCell = scoreWs.getCell(`F${r}`);
        setCellResult(fCell, grade);
      } else if (srVal !== '') {
        const stats = catScores[partVal];
        const cCell = scoreWs.getCell(`C${r}`);
        const dCell = scoreWs.getCell(`D${r}`);
        const eCell = scoreWs.getCell(`E${r}`);
        const fCell = scoreWs.getCell(`F${r}`);

        // Official template weightage (preserves 17 for Record Management, 15 for Repo, etc.)
        let wt = 0;
        if (typeof dCell.value === 'number') {
          wt = dCell.value;
        } else if (dCell.value && typeof dCell.value === 'object' && typeof (dCell.value as any).result === 'number') {
          wt = (dCell.value as any).result;
        } else if (stats) {
          wt = stats.weightage;
        }

        const act = stats ? stats.actual : 0;
        const kp = stats ? stats.keyPoints : 0;
        const pctVal = wt > 0 ? (act / wt) : '-';
        const pctDisplay = wt > 0 ? `${Math.round((act / wt) * 100)}%` : '-';

        totalKey += kp;
        totalWeight += wt;
        totalActual += act;

        setCellResult(cCell, kp);
        setCellResult(dCell, wt);
        setCellResult(eCell, act);
        setCellResult(fCell, pctVal);

        scoreRows.push({
          'S. No.': srVal,
          Particulars: partVal,
          'Key Points': String(kp),
          Weightage: String(wt),
          Actual: String(act),
          Percentage: pctDisplay,
        });
      }
    }

    scoreWs.pageSetup = {
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      orientation: 'landscape',
      paperSize: 9,
    };
  }

  templateWb.calcProperties.fullCalcOnLoad = true;

  // Print Setup (1:1 with tata_main.py)
  ws.pageSetup = {
    ...ws.pageSetup,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    orientation: 'landscape',
    paperSize: 9, // A4
  };

  const populatedExcelBuffer = await templateWb.xlsx.writeBuffer();
  const populatedExcelBlob = new Blob([populatedExcelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  // 5. Convert Populated Excel to PDF via Gotenberg API
  onProgress?.('Converting populated Excel to PDF via Gotenberg LibreOffice API...');
  const conversionRes = await convertExcelToPdfViaGotenberg(
    populatedExcelBlob,
    paths.excel,
    settings,
    (msg) => onProgress?.(msg)
  );

  // 6. Extract Evidence Pages from Report PDF (1:1 with pdf_utils.py)
  onProgress?.('Extracting observation evidence pages from Report PDF...');
  let evidencePdfBlob = await extractEvidencePages(reportPdfFile);
  evidencePdfBlob = await compressPdfIfPossible(evidencePdfBlob, (msg) => onProgress?.(msg));

  // 7. Merge 3 PDFs -> Final Report (1:1 with pdf_utils.py)
  onProgress?.('Merging Checklist Report + Evidence Pages + Annexures into Final PDF...');
  let finalReportPdfBlob = await mergeThreePdfs(
    conversionRes.pdfBlob,
    evidencePdfBlob,
    annexurePdfFile
  );

  // 7b. Compress Final PDF (1:1 with app.py compress_pdf)
  finalReportPdfBlob = await compressPdfIfPossible(finalReportPdfBlob, (msg) => onProgress?.(msg));

  // 8. Bundle into Audit_Report_Package.zip containing all 4 files (1:1 with app.py)
  onProgress?.('Packaging Audit_Report_Package.zip...');
  const zip = new JSZip();
  zip.file(paths.excel, populatedExcelBlob);
  zip.file(paths.pdf, conversionRes.pdfBlob);
  zip.file(paths.evidence, evidencePdfBlob);
  zip.file(paths.final, finalReportPdfBlob);

  const zipBlob = await zip.generateAsync({ type: 'blob' });

  const metadata: ReportMetadata = {
    agency_name,
    agency_code,
    location,
    report_type,
    product,
    auditor_name,
    audit_date,
    collection_manager: pdfHeaderData.collection_manager || '',
    agency_manager: pdfHeaderData.agency_manager || '',
    operating_address: pdfHeaderData.operating_address || '',
  };

  const downloads: GeneratedDownloads = {
    zip: zipBlob,
    excel: populatedExcelBlob,
    evidence: evidencePdfBlob,
    final: finalReportPdfBlob,
    excel_name: paths.excel,
    pdf_name: paths.pdf,
    evidence_name: paths.evidence,
    final_name: paths.final,
  };

  const scoreData: ScoreData = {
    rows: scoreRows,
    summary: scoreSummary,
  };

  onProgress?.('Report generation and packaging completed successfully!');
  return { downloads, metadata, scoreData };
}
