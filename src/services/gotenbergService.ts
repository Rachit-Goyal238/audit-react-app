import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { AppSettings } from '../types/audit';

export interface GotenbergHealthResult {
  isUp: boolean;
  statusText: string;
  details?: string;
}

export async function checkGotenbergHealth(url: string): Promise<GotenbergHealthResult> {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  const candidateUrls: string[] = [];

  if (cleanUrl) candidateUrls.push(cleanUrl);
  if (typeof window !== 'undefined' && !candidateUrls.includes(window.location.origin)) {
    candidateUrls.push(window.location.origin);
  }

  for (const endpoint of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(`${endpoint}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        const engine = data.engine || 'Gotenberg LibreOffice';
        return {
          isUp: true,
          statusText: `Conversion service active (${engine}) at ${endpoint}`,
        };
      }
    } catch {
      // Continue to next candidate
    }
  }

  return {
    isUp: false,
    statusText: 'No conversion endpoint reachable (Gotenberg or local LibreOffice bridge).',
    details: 'Verify Docker/Cloud Run Gotenberg URL or run Vite in dev mode with local LibreOffice installed.',
  };
}

export async function convertExcelToPdfViaGotenberg(
  excelBlob: Blob,
  fileName: string,
  settings: AppSettings,
  onProgress?: (msg: string) => void
): Promise<{ pdfBlob: Blob; usedFallback: boolean }> {
  const cleanUrl = settings.gotenbergUrl.trim().replace(/\/+$/, '');
  const localOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const candidates: { url: string; label: string }[] = [];
  if (cleanUrl) {
    candidates.push({ url: cleanUrl, label: `Configured endpoint (${cleanUrl})` });
  }
  if (localOrigin && localOrigin !== cleanUrl) {
    candidates.push({ url: localOrigin, label: 'Local LibreOffice Bridge' });
  }

  for (const { url, label } of candidates) {
    try {
      onProgress?.(`Connecting to ${label}...`);
      const formData = new FormData();
      formData.append('files', excelBlob, fileName);
      formData.append('landscape', 'true');

      const headers: Record<string, string> = {};
      if (settings.gotenbergApiKey && url === cleanUrl) {
        headers['Authorization'] = `Bearer ${settings.gotenbergApiKey}`;
      }

      let response: Response | null = null;
      try {
        response = await fetch(`${url}/forms/libreoffice/convert`, {
          method: 'POST',
          headers,
          body: formData,
        });
      } catch {
        // Retry with /api/convert if same origin proxy
        if (url === localOrigin) {
          response = await fetch(`${url}/api/convert`, {
            method: 'POST',
            headers,
            body: formData,
          }).catch(() => null);
        }
      }

      if (response && response.ok) {
        onProgress?.(`PDF successfully compiled via ${label}!`);
        const pdfArrayBuffer = await response.arrayBuffer();
        return {
          pdfBlob: new Blob([pdfArrayBuffer], { type: 'application/pdf' }),
          usedFallback: false,
        };
      }
    } catch {
      onProgress?.(`${label} unavailable, checking alternatives...`);
    }
  }

  if (!settings.useMockFallback) {
    throw new Error(
      'Excel-to-PDF conversion service unavailable. Ensure Gotenberg is running or LibreOffice is installed locally.'
    );
  }

  // Fallback client-side PDF generation using pdf-lib
  onProgress?.('Both Gotenberg and local bridge unavailable. Generating client-side preview PDF...');
  const fallbackBlob = await generateFallbackAuditPdf(fileName);
  return {
    pdfBlob: fallbackBlob,
    usedFallback: true,
  };
}

/**
 * Fallback generator when Gotenberg Docker container is offline/unreachable.
 * Allows developers to test the full merging, previewing, and dispatch workflow.
 */
async function generateFallbackAuditPdf(fileName: string): Promise<Blob> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([842, 595]); // A4 Landscape
  const { width, height } = page.getSize();

  // Header banner
  page.drawRectangle({
    x: 40,
    y: height - 90,
    width: width - 80,
    height: 50,
    color: rgb(0.12, 0.22, 0.38),
  });

  page.drawText('INTERNAL AUDIT REPORT & OBSERVATIONS', {
    x: 60,
    y: height - 60,
    size: 16,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  page.drawText('Preserving Strict Print Areas & Template Formatting', {
    x: 60,
    y: height - 76,
    size: 10,
    font,
    color: rgb(0.8, 0.88, 0.98),
  });

  // Notice box
  page.drawRectangle({
    x: 40,
    y: height - 160,
    width: width - 80,
    height: 55,
    color: rgb(0.96, 0.97, 0.99),
    borderColor: rgb(0.8, 0.85, 0.9),
    borderWidth: 1,
  });

  page.drawText('[Notice: Generated via Local Fallback Engine]', {
    x: 55,
    y: height - 130,
    size: 11,
    font: boldFont,
    color: rgb(0.2, 0.4, 0.7),
  });

  page.drawText(
    `Source Template: ${fileName} | For 100% pixel-perfect LibreOffice native borders, connect your Gotenberg Cloud Run endpoint.`,
    {
      x: 55,
      y: height - 146,
      size: 9,
      font,
      color: rgb(0.35, 0.35, 0.4),
    }
  );

  // Sample findings table outline
  page.drawText('Executive Summary & Observations Breakdown', {
    x: 40,
    y: height - 190,
    size: 13,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  const rowHeights = [220, 255, 290, 325, 360];
  const headers = ['Ref #', 'Audit Area', 'Severity', 'Key Finding', 'Target Date'];

  headers.forEach((h, i) => {
    page.drawText(h, {
      x: 50 + i * 150,
      y: height - rowHeights[0],
      size: 10,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });
  });

  const sampleData = [
    ['OBS-01', 'Access Control & Privileges', 'HIGH', 'Excessive admin roles detected in production ERP', '15-Oct-2026'],
    ['OBS-02', 'Disaster Recovery Drill', 'MEDIUM', 'Annual failover test not recorded in audit log', '30-Oct-2026'],
    ['OBS-03', 'Inventory Reconciliation', 'LOW', 'Physical tag discrepancy under 0.2%', '10-Nov-2026'],
  ];

  sampleData.forEach((row, rowIdx) => {
    const yPos = height - rowHeights[rowIdx + 1];
    row.forEach((col, colIdx) => {
      const isSeverity = colIdx === 2;
      const colColor = isSeverity && col === 'HIGH' ? rgb(0.8, 0.1, 0.1) : rgb(0.2, 0.2, 0.2);
      page.drawText(col, {
        x: 50 + colIdx * 150,
        y: yPos,
        size: 9,
        font: isSeverity ? boldFont : font,
        color: colColor,
      });
    });
  });

  // Footer
  page.drawText(`Generated: ${new Date().toISOString()} | Confidential Internal Audit Document`, {
    x: 40,
    y: 30,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await doc.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}
