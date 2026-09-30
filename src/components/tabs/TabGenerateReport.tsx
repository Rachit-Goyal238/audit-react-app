import { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  FileUp,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAudit } from '@/context/AuditContext';
import { generateTataReport } from '@/services/tataEngine';
import { extractEmailDataFromExcel, buildEmailHtml } from '@/services/emailBuilder';
import { downloadBlob } from '@/services/pdfService';

export function TabGenerateReport() {
  const {
    auditId,
    setAuditId,
    masterFile,
    setMasterFile,
    client,
    setClient,
    templateType,
    setTemplateType,
    reportPdf,
    setReportPdf,
    annexurePdf,
    setAnnexurePdf,
    downloads,
    setDownloads,
    setReportMetadata,
    setEmailState,
    setActiveTab,
    settings,
    isGenerating,
    setIsGenerating,
    generationLogs,
    addLog,
    clearLogs,
  } = useAudit();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Template options for TATA Capital (1:1 with templates.json)
  const templateOptions = [
    'Collection',
    'Repossesion',
    'Collection And Repossesion',
    'Stockyard',
  ];

  const handleLoadDemoSample = async () => {
    try {
      setErrorMsg(null);
      addLog('Loading sample test files...');

      // 1. Create a Master Excel with Audit ID TC-1049
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Master');
      ws.addRow([
        'Audit ID',
        'Agency Code',
        'Agency Name',
        'Location',
        'Auditor Name',
        'Audit Date',
        'Question No.',
        'Status Detail',
        'Key Observation',
        'Remarks',
      ]);

      const testObservations = [
        {
          q: 1,
          status: 'Complied',
          obs: 'DRA Certification verification carried out for all active telecallers.',
          rem: 'Verified 12 certificates | Closed | Completed on site',
        },
        {
          q: 2,
          status: 'Non-Complied',
          obs: 'Call recordings not retained for the full 90-day mandatory window.',
          rem: 'Storage drive failure on dialer server | Open | 15-Nov-2026',
        },
        {
          q: 3,
          status: 'Complied',
          obs: 'Receipt books reconciliation matches cash deposits on bank slip.',
          rem: 'Reconciled 44 receipts | Closed | Verified by manager',
        },
        {
          q: 4,
          status: 'Complied',
          obs: 'Asset register and hardware tags maintained in good condition.',
          rem: 'Closed | Verified on site',
        },
        {
          q: 5,
          status: 'Complied',
          obs: 'Physical security: agency locks and CCTV footage operational.',
          rem: 'Closed | 30 days footage verified',
        },
      ];

      for (const item of testObservations) {
        ws.addRow([
          'TC-1049',
          'AG-9021',
          'Apex Financial Recovery Services',
          'Mumbai BKC',
          'Rahul Sharma',
          '15-Oct-2026',
          item.q,
          item.status,
          item.obs,
          item.rem,
        ]);
      }

      const buffer = await wb.xlsx.writeBuffer();
      const sampleMaster = new File([buffer], 'Master_Audits_2026.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // 2. Create a clean sample Audit PDF with Cover Info
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const page1 = pdfDoc.addPage([595, 842]);
      page1.drawText('TATA CAPITAL AUDIT INSPECTION REPORT', { x: 50, y: 800, size: 16, font: bold, color: rgb(0.1, 0.2, 0.6) });
      page1.drawText('Official Audit Assessment & Compliance Verification', { x: 50, y: 780, size: 10, font, color: rgb(0.4, 0.4, 0.4) });

      page1.drawText('AGENCY NAME', { x: 50, y: 740, size: 10, font: bold });
      page1.drawText('Apex Financial Recovery Services', { x: 50, y: 725, size: 10, font });

      page1.drawText('OPERATING ADDRESS', { x: 50, y: 690, size: 10, font: bold });
      page1.drawText('Unit 402, Trade Center, BKC, Bandra East, Mumbai - 400051', { x: 50, y: 675, size: 10, font });
      page1.drawText('CURRENT EMAIL ID', { x: 50, y: 660, size: 9, font });

      page1.drawText('TYPE OF AGENCY', { x: 50, y: 625, size: 10, font: bold });
      page1.drawText('Collection', { x: 50, y: 610, size: 10, font });

      page1.drawText('COLLECTION MANAGER', { x: 50, y: 575, size: 10, font: bold });
      page1.drawText('Rajesh Sharma', { x: 50, y: 560, size: 10, font });

      page1.drawText('AGENCY MANAGER', { x: 50, y: 525, size: 10, font: bold });
      page1.drawText('Amitabh Varma', { x: 50, y: 510, size: 10, font });

      page1.drawText('PRODUCT', { x: 50, y: 475, size: 10, font: bold });
      page1.drawText('Auto Loans & Personal Loans', { x: 50, y: 460, size: 10, font });

      // Page 2: Observation evidence page
      const page2 = pdfDoc.addPage([595, 842]);
      page2.drawText('AUDIT FIELD OBSERVATIONS & EVIDENCE', { x: 50, y: 790, size: 14, font: bold });
      page2.drawText('Observation # 1: Dialer Recording Retention Issue', { x: 50, y: 740, size: 12, font: bold, color: rgb(0.8, 0.1, 0.1) });
      page2.drawText('Screenshot of server disk space showing 98% full on dialer storage.', { x: 50, y: 715, size: 10, font });
      page2.drawRectangle({ x: 50, y: 450, width: 495, height: 240, color: rgb(0.95, 0.95, 0.95), borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 1 });
      page2.drawText('[System Log Artifact / Dialer Storage Screenshot]', { x: 160, y: 560, size: 11, font, color: rgb(0.5, 0.5, 0.5) });

      const pdfBytes = await pdfDoc.save();
      const samplePdf = new File([pdfBytes as unknown as BlobPart], 'Audit_Report_TC1049.pdf', {
        type: 'application/pdf',
      });

      setAuditId('TC-1049');
      setMasterFile(sampleMaster);
      setClient('TATA Capital');
      setTemplateType('Collection');
      setReportPdf(samplePdf);
      setAnnexurePdf(null);
      addLog('Sample files loaded. Audit ID: TC-1049 ready for generation.');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleGenerateReport = async () => {
    setErrorMsg(null);
    if (!auditId.trim()) {
      setErrorMsg('Please enter Audit ID');
      return;
    }
    if (!masterFile || !reportPdf) {
      setErrorMsg('Please upload all required files (Master Excel and Audit Report PDF).');
      return;
    }

    try {
      setIsGenerating(true);
      clearLogs();
      addLog(`Initiating report generation for Audit ID: ${auditId}...`);

      const result = await generateTataReport(
        auditId,
        masterFile,
        client,
        templateType,
        reportPdf,
        annexurePdf,
        settings,
        (msg) => addLog(msg)
      );

      setDownloads(result.downloads);
      setReportMetadata(result.metadata);

      // Pre-build email state for Tab 2
      addLog('Compiling checklist score summary for email dispatch...');
      const emailExtracted = await extractEmailDataFromExcel(result.downloads.excel);
      const finalScoreData =
        result.scoreData && result.scoreData.rows && result.scoreData.rows.length > 0
          ? result.scoreData
          : emailExtracted.scoreData;

      const emailBuilt = buildEmailHtml(
        'Report Email',
        result.metadata,
        emailExtracted.observations,
        finalScoreData
      );

      setEmailState({
        emailType: 'Report Email',
        subject: emailBuilt.subject,
        to: '',
        cc: '',
        attachZip: true,
        attachPdf: false,
        additionalAttachments: [],
        html: emailBuilt.html,
        observations: emailExtracted.observations,
        scoreData: finalScoreData,
        reportMetadata: result.metadata,
      });

      addLog('Report generated successfully.');
      setIsGenerating(false);
    } catch (err: unknown) {
      setIsGenerating(false);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      addLog(`ERROR: ${msg}`);
    }
  };

  const currentStatusMsg = generationLogs.length > 0 ? generationLogs[generationLogs.length - 1] : 'Processing...';

  return (
    <div className="space-y-6">
      {/* Parameters Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Audit Parameters &amp; File Ingestion
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure client audit parameters and upload checklist inputs.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleLoadDemoSample}
          disabled={isGenerating}
          className="gap-2 shrink-0 border-slate-200 hover:bg-slate-50 text-slate-700 text-xs cursor-pointer rounded-lg font-medium shadow-2xs"
        >
          <Sparkles className="size-3.5 text-blue-600" />
          Load Sample Data (TC-1049)
        </Button>
      </div>

      {errorMsg && (
        <Alert variant="destructive" className="rounded-xl border-red-200 bg-red-50 text-red-900">
          <AlertCircle className="size-4 text-red-600" />
          <AlertTitle className="text-xs font-semibold">Validation Error</AlertTitle>
          <AlertDescription className="text-xs mt-1">{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* Main Parameters Form */}
      <Card className="rounded-xl border border-slate-200/80 shadow-xs bg-white">
        <CardContent className="p-6 space-y-6">
          {/* Audit ID */}
          <div className="space-y-1.5 max-w-md">
            <Label htmlFor="audit_id" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Audit ID <span className="text-red-500">*</span>
            </Label>
            <Input
              id="audit_id"
              value={auditId}
              onChange={(e) => setAuditId(e.target.value)}
              placeholder="e.g. TC-1049"
              className="font-mono text-xs h-10 border-slate-200 focus:border-blue-600 focus:ring-blue-100 rounded-lg"
            />
            <p className="text-[11px] text-slate-400">
              Corresponds to the unique audit identifier in the Master Excel sheet.
            </p>
          </div>

          {/* Master Excel Upload */}
          <div className="space-y-1.5 max-w-md">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Master Excel File <span className="text-red-500">*</span>
            </Label>
            {masterFile ? (
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="size-8 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="size-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-medium text-slate-800 truncate">{masterFile.name}</p>
                    <p className="text-[10px] text-slate-400">{(masterFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMasterFile(null)}
                  className="text-slate-400 hover:text-red-600 p-1.5 rounded hover:bg-slate-200/50 transition-colors"
                  title="Remove file"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/20 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
                <FileSpreadsheet className="size-7 text-emerald-600 mb-1.5" />
                <span className="text-xs font-semibold text-slate-800">Upload Master Excel File</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Click or drag &amp; drop (.xlsx, .xls)</span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={(e) => setMasterFile(e.target.files?.[0] || null)}
                />
              </label>
            )}
          </div>

          {/* Client Selector */}
          <div className="space-y-1.5 max-w-md">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Select Client</Label>
            <Select value={client} onValueChange={(val) => { if (val) setClient(val); }}>
              <SelectTrigger className="h-10 border-slate-200 text-xs">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TATA Capital">TATA Capital</SelectItem>
                <SelectItem value="YesBank">YesBank</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* YesBank external redirect notice if selected */}
          {client === 'YesBank' && (
            <Alert className="border-blue-200 bg-blue-50/70 max-w-md rounded-xl">
              <ExternalLink className="size-4 text-blue-600" />
              <AlertTitle className="text-xs font-semibold text-blue-900">
                YesBank Audit Portal
              </AlertTitle>
              <AlertDescription className="text-xs text-blue-800 space-y-2 mt-1">
                <p>YesBank audits utilize the dedicated YesBank workflow portal.</p>
                <a
                  href="https://audit-report-generator-yesbank.streamlit.app/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 text-xs shadow-xs"
                >
                  Open YesBank Report Generator <ExternalLink className="size-3" />
                </a>
              </AlertDescription>
            </Alert>
          )}

          {client === 'TATA Capital' && (
            <>
              {/* Template Selector */}
              <div className="space-y-1.5 max-w-md">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Audit Template</Label>
                <Select value={templateType} onValueChange={(val) => { if (val) setTemplateType(val); }}>
                  <SelectTrigger className="h-10 border-slate-200 text-xs">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templateOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Upload Audit Report PDF */}
              <div className="space-y-1.5 max-w-md">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Audit Report PDF <span className="text-red-500">*</span>
                </Label>
                {reportPdf ? (
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="size-8 rounded bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                        <FileText className="size-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-medium text-slate-800 truncate">{reportPdf.name}</p>
                        <p className="text-[10px] text-slate-400">{(reportPdf.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReportPdf(null)}
                      className="text-slate-400 hover:text-red-600 p-1.5 rounded hover:bg-slate-200/50 transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/20 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
                    <FileText className="size-7 text-red-600 mb-1.5" />
                    <span className="text-xs font-semibold text-slate-800">Upload Audit Report PDF</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Report containing inspection observations &amp; evidence</span>
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => setReportPdf(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>

              {/* Upload Annexure PDF */}
              <div className="space-y-1.5 max-w-md">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Annexure PDF <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </Label>
                {annexurePdf ? (
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="size-8 rounded bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <FileUp className="size-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-medium text-slate-800 truncate">{annexurePdf.name}</p>
                        <p className="text-[10px] text-slate-400">{(annexurePdf.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAnnexurePdf(null)}
                      className="text-slate-400 hover:text-red-600 p-1.5 rounded hover:bg-slate-200/50 transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/20 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
                    <FileUp className="size-7 text-blue-600 mb-1.5" />
                    <span className="text-xs font-semibold text-slate-800">Upload Annexure PDF</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Appended to final compiled report</span>
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => setAnnexurePdf(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>

              {/* Generate Report Button */}
              <div className="pt-2">
                <Button
                  type="button"
                  size="lg"
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg text-sm shadow-xs transition-colors cursor-pointer w-full sm:w-auto h-11"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Generating Report...
                    </>
                  ) : (
                    'Generate Report'
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Clean Stepper / Progress Indicator while Generating */}
      {isGenerating && (
        <Card className="rounded-xl border border-blue-200 bg-blue-50/50 p-6 shadow-xs animate-in fade-in-50">
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <Loader2 className="size-5 text-blue-600 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-blue-950">Compiling Audit Report...</h4>
              <p className="text-xs text-blue-700 truncate mt-0.5">{currentStatusMsg}</p>
              <div className="w-full bg-blue-200 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full animate-pulse w-3/4" />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Downloads / Delivery Section */}
      {downloads && (
        <Card className="rounded-xl border border-emerald-200 bg-emerald-50/60 shadow-xs">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="size-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Report Package Generated Successfully
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Excel scores, individual slice PDFs, and final merged report ready for dispatch.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => setActiveTab('email')}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-xs font-semibold gap-1.5 shadow-xs shrink-0 cursor-pointer hidden sm:flex items-center"
              >
                Proceed to Dispatch Email
                <ArrowRight className="size-3.5" />
              </Button>
            </div>

            <div className="pt-2 border-t border-emerald-200/60 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={() => downloadBlob(downloads.zip, 'Audit_Report_Package.zip')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-xs font-medium gap-2 shadow-xs cursor-pointer"
              >
                <Download className="size-3.5" />
                Download Complete Package (ZIP)
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => downloadBlob(downloads.excel, downloads.excel_name)}
                className="bg-white border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg px-3 py-2 text-xs font-medium gap-2 cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="size-3.5 text-emerald-600" />
                Excel Report
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => downloadBlob(downloads.final, downloads.final_name)}
                className="bg-white border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg px-3 py-2 text-xs font-medium gap-2 cursor-pointer shadow-2xs"
              >
                <FileText className="size-3.5 text-red-600" />
                Final Merged Report (PDF)
              </Button>
            </div>

            <div className="pt-2 flex justify-end sm:hidden">
              <Button
                type="button"
                onClick={() => setActiveTab('email')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-xs font-semibold gap-1.5 shadow-xs"
              >
                Proceed to Dispatch Email
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
