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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
          status: 'Partially Complied',
          obs: 'Customer consent form missing signature of guarantor on 2 sample loan accounts.',
          rem: 'Secondary document requested from branch | Open | 30-Nov-2026',
        },
        {
          q: 4,
          status: 'Non-Complied',
          obs: 'Collection agency identity cards lacked company hologram stamp.',
          rem: 'New ID cards to be issued by Vendor Admin | Open | 10-Nov-2026',
        },
        {
          q: 5,
          status: 'Complied',
          obs: 'Receipt book series sequence fully accounted for without gaps.',
          rem: 'Physical register cross-checked | Closed | Verified',
        },
      ];

      testObservations.forEach((item) => {
        ws.addRow([
          'TC-1049',
          'AGC-9921',
          'Apex Financial & Collection Services LLP',
          'Mumbai',
          'Pawan Kumar',
          '15-Oct-2026',
          item.q,
          item.status,
          item.obs,
          item.rem,
        ]);
      });

      const masterBuffer = await wb.xlsx.writeBuffer();
      const sampleMaster = new File([masterBuffer], 'Base_Data_Sample.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // 2. Create a realistic Sample Audit Report PDF with Page 1 header and Observation pages
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Page 1: Header details
      const page1 = pdfDoc.addPage([595, 842]);
      page1.drawText('INTERNAL AUDIT ENGAGEMENT MEMORANDUM', { x: 50, y: 790, size: 14, font: bold });
      page1.drawText('AGENCY NAME', { x: 50, y: 740, size: 10, font: bold });
      page1.drawText('Apex Financial & Collection Services LLP', { x: 50, y: 725, size: 10, font });

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
      page2.drawText('Screenshot of server disk space showing 98% full on /var/log/asterisk recording mount.', { x: 50, y: 715, size: 10, font });
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
      setErrorMsg('Please upload all files (Master Excel and Audit Report PDF are required).');
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
      addLog('Analyzing populated checklist and score parameters for email drafting...');
      const emailExtracted = await extractEmailDataFromExcel(result.downloads.excel);
      const emailBuilt = buildEmailHtml(
        'Report Email',
        result.metadata,
        emailExtracted.observations,
        emailExtracted.scoreData
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
        scoreData: emailExtracted.scoreData,
        reportMetadata: result.metadata,
      });

      addLog('Success! Proceed to the "Dispatch Email" tab.');
      setIsGenerating(false);
    } catch (err: unknown) {
      setIsGenerating(false);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      addLog(`ERROR: ${msg}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Demo sample trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-muted/30">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Audit Parameters &amp; File Ingestion
          </h2>
          <p className="text-xs text-muted-foreground">
            Matches the legacy Streamlit generator: filters Master Excel by Audit ID, injects observations into template cells, and executes Gotenberg PDF compilation.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleLoadDemoSample}
          disabled={isGenerating}
          className="gap-2 shrink-0 border-dashed hover:border-primary text-xs cursor-pointer"
        >
          <Sparkles className="size-3.5 text-amber-500" />
          Load Demo Sample (ID: TC-1049)
        </Button>
      </div>

      {errorMsg && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Validation Error</AlertTitle>
          <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* Inputs Form */}
      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Audit ID */}
          <div className="space-y-1.5">
            <Label htmlFor="audit_id" className="text-sm font-semibold">
              Enter Audit ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="audit_id"
              value={auditId}
              onChange={(e) => setAuditId(e.target.value)}
              placeholder="e.g. TC-1049"
              className="font-mono text-sm max-w-md"
            />
            <p className="text-[11px] text-muted-foreground">
              Matches rows in the Master Excel where the "Audit ID" column equals this value.
            </p>
          </div>

          {/* Master Excel Upload */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">
              Upload Master Excel <span className="text-destructive">*</span>
            </Label>
            {masterFile ? (
              <div className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between max-w-md">
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-medium truncate">{masterFile.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMasterFile(null)}
                  className="text-muted-foreground hover:text-destructive p-1"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/60 hover:bg-muted/30 max-w-md transition-colors">
                <FileSpreadsheet className="size-6 text-emerald-600 mb-1" />
                <span className="text-xs font-medium text-foreground">Upload Master Excel (.xlsx)</span>
                <span className="text-[10px] text-muted-foreground">e.g. Base_Data.xlsx or KAF.xlsx</span>
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
            <Label className="text-sm font-semibold">Select Client</Label>
            <Select value={client} onValueChange={(val) => { if (val) setClient(val); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TATA Capital">TATA Capital</SelectItem>
                <SelectItem value="YesBank">YesBank</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* YesBank external redirect notice if selected (1:1 with app.py line 133) */}
          {client === 'YesBank' && (
            <Alert className="border-blue-500 bg-blue-500/10 max-w-md">
              <ExternalLink className="size-4 text-blue-600" />
              <AlertTitle className="text-xs font-semibold text-blue-900">
                YesBank Audit Portal
              </AlertTitle>
              <AlertDescription className="text-xs text-blue-800 space-y-2">
                <p>YesBank reports use the dedicated YesBank workflow engine.</p>
                <a
                  href="https://audit-report-generator-yesbank.streamlit.app/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700"
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
                <Label className="text-sm font-semibold">Select Template</Label>
                <Select value={templateType} onValueChange={(val) => { if (val) setTemplateType(val); }}>
                  <SelectTrigger>
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
                <p className="text-[11px] text-muted-foreground">
                  Preloaded from official 2026-27 TATA Capital agency templates.
                </p>
              </div>

              {/* Upload Audit Report PDF */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">
                  Upload Audit Report PDF <span className="text-destructive">*</span>
                </Label>
                {reportPdf ? (
                  <div className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between max-w-md">
                    <div className="flex items-center gap-2 truncate">
                      <CheckCircle2 className="size-4 text-purple-600 shrink-0" />
                      <span className="text-xs font-medium truncate">{reportPdf.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReportPdf(null)}
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/60 hover:bg-muted/30 max-w-md transition-colors">
                    <FileText className="size-6 text-purple-600 mb-1" />
                    <span className="text-xs font-medium text-foreground">Upload Audit Report PDF (.pdf)</span>
                    <span className="text-[10px] text-muted-foreground">
                      Header details read from Page 1; Evidence sliced from Observation pages
                    </span>
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
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">
                  Upload Annexure PDF <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                </Label>
                {annexurePdf ? (
                  <div className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between max-w-md">
                    <div className="flex items-center gap-2 truncate">
                      <CheckCircle2 className="size-4 text-blue-600 shrink-0" />
                      <span className="text-xs font-medium truncate">{annexurePdf.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAnnexurePdf(null)}
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/60 hover:bg-muted/30 max-w-md transition-colors">
                    <FileUp className="size-6 text-blue-600 mb-1" />
                    <span className="text-xs font-medium text-foreground">Upload Annexure PDF (.pdf)</span>
                    <span className="text-[10px] text-muted-foreground">
                      Appended client-side via pdf-lib into final merged report
                    </span>
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
                  className="gap-2 cursor-pointer font-medium w-full sm:w-auto"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
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

      {/* Real-time execution log */}
      {generationLogs.length > 0 && (
        <Card className="bg-black/95 text-emerald-400 font-mono text-xs p-4 rounded-xl space-y-1 max-h-48 overflow-y-auto">
          {generationLogs.map((log, idx) => (
            <div key={idx} className="leading-relaxed">
              {log}
            </div>
          ))}
        </Card>
      )}

      {/* Downloads Section (1:1 with Streamlit downloads block lines 223-246) */}
      {downloads && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="size-5" />
              <CardTitle className="text-base text-emerald-800">
                Report generated successfully. Proceed to the 'Dispatch Email' tab.
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              All deliverables have been compiled, verified, and packaged into browser memory.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Complete Package ZIP */}
            <Button
              type="button"
              onClick={() => downloadBlob(downloads.zip, 'Audit_Report_Package.zip')}
              className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              <Download className="size-4" />
              Download Complete Package (ZIP)
            </Button>

            {/* Subheader: Individual Downloads */}
            <div className="pt-3 border-t space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Individual Downloads</h3>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => downloadBlob(downloads.excel, downloads.excel_name)}
                  className="gap-2 text-xs cursor-pointer"
                >
                  <FileSpreadsheet className="size-4 text-emerald-600" />
                  Download Excel Report ({downloads.excel_name})
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => downloadBlob(downloads.final, downloads.final_name)}
                  className="gap-2 text-xs cursor-pointer"
                >
                  <FileText className="size-4 text-red-600" />
                  Download Final Report ({downloads.final_name})
                </Button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                onClick={() => setActiveTab('email')}
                className="gap-2 cursor-pointer font-medium"
              >
                Proceed to Dispatch Email Tab
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
