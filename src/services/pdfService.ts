import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

export async function mergeReportWithAnnexures(
  reportPdfBlob: Blob,
  annexurePdfBlob?: Blob | null,
  onProgress?: (msg: string) => void
): Promise<{ mergedBlob: Blob; pageCount: number }> {
  onProgress?.('Loading base audit report PDF...');
  const reportBytes = await reportPdfBlob.arrayBuffer();
  const mergedDoc = await PDFDocument.load(reportBytes);

  if (annexurePdfBlob) {
    onProgress?.('Parsing and attaching Annexures PDF...');
    const annexureBytes = await annexurePdfBlob.arrayBuffer();
    const annexureDoc = await PDFDocument.load(annexureBytes);

    const copiedPages = await mergedDoc.copyPages(
      annexureDoc,
      annexureDoc.getPageIndices()
    );

    for (const page of copiedPages) {
      mergedDoc.addPage(page);
    }
    onProgress?.(`Attached ${copiedPages.length} Annexure pages.`);
  }

  const pageCount = mergedDoc.getPageCount();
  const finalPdfBytes = await mergedDoc.save();
  const mergedBlob = new Blob([finalPdfBytes as unknown as BlobPart], { type: 'application/pdf' });

  return { mergedBlob, pageCount };
}

export async function compressPdfIfPossible(
  pdfBlob: Blob,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const sizeMb = pdfBlob.size / (1024 * 1024);
  if (sizeMb <= 2) return pdfBlob;

  try {
    onProgress?.(`Compressing PDF (${sizeMb.toFixed(2)} MB) for email limits via PyMuPDF...`);
    const resp = await fetch('/api/compress-pdf', {
      method: 'POST',
      body: pdfBlob,
    });
    if (resp.ok) {
      const compBuffer = await resp.arrayBuffer();
      const compBlob = new Blob([compBuffer], { type: 'application/pdf' });
      const newMb = compBlob.size / (1024 * 1024);
      if (newMb > 0 && newMb < sizeMb) {
        onProgress?.(`Compressed PDF from ${sizeMb.toFixed(2)} MB to ${newMb.toFixed(2)} MB!`);
        return compBlob;
      }
    }
  } catch (e) {
    console.warn('PDF compression skipped:', e);
  }
  return pdfBlob;
}

export async function createAuditPackageZip(
  pdfBlob: Blob,
  pdfFileName: string,
  excelBlob?: Blob | null,
  excelFileName?: string
): Promise<Blob> {
  const zip = new JSZip();

  zip.file(pdfFileName, pdfBlob);

  if (excelBlob && excelFileName) {
    zip.file(excelFileName, excelBlob);
  }

  // Include a summary readme
  zip.file(
    'MANIFEST.txt',
    `Audit Package Generated: ${new Date().toISOString()}\nFiles Included:\n1. ${pdfFileName}\n${excelFileName ? `2. ${excelFileName}\n` : ''}`
  );

  return await zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
