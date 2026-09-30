import { useState } from 'react';
import {
  Download,
  CheckCircle2,
  Sliders,
  Code2,
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { downloadBlob } from '@/services/pdfService';

export function TemplatesPage() {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadSampleTemplate = async () => {
    try {
      setDownloading(true);
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Audit_Report_Template');

      ws.pageSetup = {
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9,
      };

      // Title & Banner
      ws.addRow(['INTERNAL AUDIT REPORT & MANAGEMENT ACTION PLAN']);
      ws.mergeCells('A1:G1');
      const titleRow = ws.getRow(1);
      titleRow.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E78' },
      };
      titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
      titleRow.height = 36;

      // Metadata block
      ws.addRow(['Client Name:', '{{CLIENT_NAME}}', '', 'Audit Period:', '{{AUDIT_PERIOD}}']);
      ws.addRow(['Branch / Unit:', '{{BRANCH_NAME}}', '', 'Lead Auditor:', '{{LEAD_AUDITOR}}']);
      ws.addRow(['Report Date:', '{{REPORT_DATE}}', '', 'Security Level:', 'CONFIDENTIAL']);
      ws.addRow([]);

      // Table Header
      const headerRow = ws.addRow([
        'Finding Ref',
        'Audit Domain',
        'Risk Severity',
        'Observation & Deficiency',
        'Agreed Action Plan',
        'Owner',
        'Target Date',
      ]);
      headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2F5597' },
      };
      headerRow.height = 24;

      // Sample placeholders
      ws.addRow(['OBS-001', 'Access Management', 'HIGH', 'Sample description...', 'Sample remediation...', 'SecOps', '15-Oct-2026']);
      ws.addRow(['OBS-002', 'Data Backup', 'MEDIUM', 'Sample description...', 'Sample remediation...', 'IT Ops', '30-Oct-2026']);

      ws.columns = [
        { width: 14 },
        { width: 22 },
        { width: 16 },
        { width: 36 },
        { width: 36 },
        { width: 18 },
        { width: 15 },
      ];

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      downloadBlob(blob, 'Standard_Internal_Audit_Template.xlsx');
    } finally {
      setDownloading(false);
    }
  };

  const tokens = [
    { token: '{{CLIENT_NAME}}', description: 'Replaced with the legal entity or client name entered during upload.' },
    { token: '{{BRANCH_NAME}}', description: 'Replaced with specific branch, operational unit, or data center location.' },
    { token: '{{AUDIT_PERIOD}}', description: 'Audit frequency or timeframe, e.g. Q3 FY2026 or Annual Review.' },
    { token: '{{LEAD_AUDITOR}}', description: 'Name and credentials of the primary engagement auditor.' },
    { token: '{{REPORT_DATE}}', description: 'Automatically populated with the current formatted dispatch date.' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Template Specifications & Formatting Guide
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Rules and placeholder standards to guarantee pixel-perfect PDF rendering through Gotenberg LibreOffice.
          </p>
        </div>
        <Button
          onClick={handleDownloadSampleTemplate}
          disabled={downloading}
          className="gap-2 shrink-0 cursor-pointer"
        >
          <Download className="size-4" />
          Download Sample Template (.xlsx)
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Placeholder tokens */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Code2 className="size-4 text-primary" />
              <CardTitle className="text-base">Supported Placeholder Tokens</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Insert these text tokens anywhere in your template workbook.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tokens.map((item) => (
              <div key={item.token} className="p-3 rounded-lg border bg-muted/20 space-y-1">
                <div className="flex items-center justify-between">
                  <code className="text-xs font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    {item.token}
                  </code>
                  <Badge variant="outline" className="text-[10px]">
                    Auto-injected
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Print Layout Rules */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sliders className="size-4 text-primary" />
              <CardTitle className="text-base">LibreOffice Print Setup Requirements</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Settings enforced by the app to eliminate truncated columns and awkward page splits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground">Fit to 1 Page Wide (fitToWidth = 1):</span>
                <p className="text-muted-foreground mt-0.5">
                  Ensures all table columns fit cleanly on a single page width without horizontal splitting.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground">Unconstrained Height (fitToHeight = 0):</span>
                <p className="text-muted-foreground mt-0.5">
                  Allows audit findings to naturally flow onto subsequent pages without shrinking text into unreadable sizes.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground">Landscape Orientation:</span>
                <p className="text-muted-foreground mt-0.5">
                  Standard A4 Landscape provides the necessary horizontal width for 7-9 column audit matrices.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground">Repeating Header Rows:</span>
                <p className="text-muted-foreground mt-0.5">
                  Header rows are automatically repeated across multiple observation pages in LibreOffice.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
