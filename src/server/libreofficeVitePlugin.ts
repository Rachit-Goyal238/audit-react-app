import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import busboy from 'busboy';

function findLibreOffice(): string | null {
  const candidates = [
    'C:\\Program Files\\LibreOffice\\program\\soffice.com',
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.com',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    '/usr/bin/libreoffice',
    '/usr/bin/soffice',
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function findPython(): string | null {
  const candidates = [
    'C:\\Users\\Rachit Goyal\\Downloads\\audit-automation-final\\venv\\Scripts\\python.exe',
    'C:\\Users\\Rachit Goyal\\Downloads\\email_test_env\\Scripts\\python.exe',
    'python',
    'python3',
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function libreofficeLocalPlugin(): Plugin {
  const loExecutable = findLibreOffice();
  const pythonExecutable = findPython();

  return {
    name: 'libreoffice-local-bridge',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Health check endpoint
        if ((req.url === '/health' || req.url === '/api/health') && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              status: 'healthy',
              engine: loExecutable ? 'LibreOffice Native Local' : 'Unavailable',
              executable: loExecutable || 'Not found',
              hasCompression: !!pythonExecutable,
            })
          );
          return;
        }

        // PDF Compression endpoint (PyMuPDF 1:1 with legacy app.py compress_pdf)
        if (req.url?.startsWith('/api/compress-pdf') && req.method === 'POST') {
          const chunks: Buffer[] = [];
          req.on('data', (c: Buffer) => chunks.push(c));
          req.on('end', () => {
            const pdfBuffer = Buffer.concat(chunks);
            const sizeMb = pdfBuffer.length / (1024 * 1024);

            // If under 2MB or no python, return as-is
            if (!pythonExecutable || sizeMb <= 2) {
              res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-Length': pdfBuffer.length,
              });
              res.end(pdfBuffer);
              return;
            }

            const tmpDir = os.tmpdir();
            const tempInput = path.join(tmpDir, `raw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.pdf`);
            const tempOutput = path.join(tmpDir, `comp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.pdf`);

            fs.writeFileSync(tempInput, pdfBuffer);

            const pyScript = `
import fitz, sys
try:
    doc = fitz.open(sys.argv[1])
    doc.scrub(metadata=True, xml_metadata=True, attached_files=True, thumbnails=True, reset_fields=True)
    doc.rewrite_images(quality=30, dpi_threshold=150, dpi_target=72)
    doc.save(sys.argv[2], garbage=4, deflate=True, clean=True)
    doc.close()
except Exception as e:
    sys.exit(1)
`;
            execFile(pythonExecutable, ['-c', pyScript, tempInput, tempOutput], (err) => {
              let finalBuffer = pdfBuffer;
              if (!err && fs.existsSync(tempOutput)) {
                finalBuffer = fs.readFileSync(tempOutput);
              }

              try {
                if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
                if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
              } catch (_) {}

              res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-Length': finalBuffer.length,
              });
              res.end(finalBuffer);
            });
          });
          return;
        }

        // Gotenberg compatible conversion endpoint
        if (
          (req.url === '/forms/libreoffice/convert' || req.url === '/api/convert') &&
          req.method === 'POST'
        ) {
          if (!loExecutable) {
            res.writeHead(503, { 'Content-Type': 'text/plain' });
            res.end(
              'LibreOffice executable not detected on the host system. Please install LibreOffice or configure a Gotenberg Cloud Run endpoint.'
            );
            return;
          }

          const bb = busboy({ headers: req.headers });
          let fileBuffer = Buffer.alloc(0);
          let filename = 'document.xlsx';

          bb.on('file', (_name, file, info) => {
            filename = info.filename || 'document.xlsx';
            const chunks: Buffer[] = [];
            file.on('data', (d: Buffer) => chunks.push(d));
            file.on('end', () => {
              fileBuffer = Buffer.concat(chunks);
            });
          });

          bb.on('close', () => {
            if (fileBuffer.length === 0) {
              res.writeHead(400, { 'Content-Type': 'text/plain' });
              res.end('No file received in multipart request.');
              return;
            }

            const tempId = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            const tmpDir = os.tmpdir();
            const tempExcel = path.join(tmpDir, `${tempId}_${path.basename(filename)}`);
            fs.writeFileSync(tempExcel, fileBuffer);

            // Execute headless conversion via LibreOffice
            execFile(
              loExecutable,
              ['--headless', '--convert-to', 'pdf:calc_pdf_Export', '--outdir', tmpDir, tempExcel],
              { timeout: 45000 },
              (err) => {
                const expectedPdf = tempExcel.replace(/\.xlsx$/, '.pdf');

                if (err || !fs.existsSync(expectedPdf)) {
                  console.error('[LibreOffice Bridge Error]:', err);
                  try {
                    if (fs.existsSync(tempExcel)) fs.unlinkSync(tempExcel);
                  } catch (_) {}
                  res.writeHead(500, { 'Content-Type': 'text/plain' });
                  res.end(`LibreOffice conversion failed: ${err ? err.message : 'No PDF produced'}`);
                  return;
                }

                const pdfData = fs.readFileSync(expectedPdf);

                // Clean up temp files
                try {
                  fs.unlinkSync(tempExcel);
                  fs.unlinkSync(expectedPdf);
                } catch (_) {}

                res.writeHead(200, {
                  'Content-Type': 'application/pdf',
                  'Content-Length': pdfData.length,
                });
                res.end(pdfData);
              }
            );
          });

          req.pipe(bb);
          return;
        }

        next();
      });
    },
  };
}
