import { useState } from 'react';
import {
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  ExternalLink,
  FileText,
  Archive,
  Loader2,
  Trash2,
  Download,
  Copy,
  Check,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAudit } from '@/context/AuditContext';
import { buildEmailHtml } from '@/services/emailBuilder';
import {
  requestGoogleAccessToken,
  createGmailDraft,
  createEmlBlob,
  getGmailWebComposeUrl,
  type AttachmentItem,
} from '@/services/gmailService';
import { downloadBlob } from '@/services/pdfService';
import { FileDropzone } from '@/components/ui/file-dropzone';

export function TabDispatchEmail() {
  const {
    downloads,
    reportMetadata,
    emailState,
    setEmailState,
    settings,
    setActiveTab,
  } = useAudit();

  const [isDrafting, setIsDrafting] = useState(false);
  const [draftResult, setDraftResult] = useState<{ draftId: string; viewUrl: string } | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  if (!downloads || !reportMetadata) {
    return (
      <Card className="rounded-xl border border-slate-200/80 bg-white p-12 text-center shadow-xs">
        <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <Mail className="size-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">Awaiting Audit Report Generation</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Please generate an audit report in Step 1 first to compile the scores, observations, and attachments.
        </p>
        <div className="mt-5">
          <Button
            type="button"
            onClick={() => setActiveTab('generate')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg px-4 py-2 gap-1.5 shadow-xs"
          >
            Go to Generate Report
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </Card>
    );
  }

  const handleEmailTypeChange = (newType: 'Report Email' | 'Closure Email') => {
    if (!emailState.observations || !emailState.scoreData || !reportMetadata) return;

    const rebuilt = buildEmailHtml(
      newType,
      reportMetadata,
      emailState.observations,
      emailState.scoreData
    );

    setEmailState((prev) => ({
      ...prev,
      emailType: newType,
      subject: rebuilt.subject,
      html: rebuilt.html,
    }));
  };

  const handleRemoveAdditional = (idx: number) => {
    setEmailState((prev) => ({
      ...prev,
      additionalAttachments: prev.additionalAttachments.filter((_, i) => i !== idx),
    }));
  };

  const getAttachmentsList = (): AttachmentItem[] => {
    const list: AttachmentItem[] = [];
    if (emailState.attachZip && downloads.zip) {
      list.push({
        blob: downloads.zip,
        filename: 'Audit_Report_Package.zip',
        mimeType: 'application/zip',
      });
    }
    if (emailState.attachPdf && downloads.final) {
      list.push({
        blob: downloads.final,
        filename: downloads.final_name,
        mimeType: 'application/pdf',
      });
    }
    if (emailState.additionalAttachments?.length > 0) {
      emailState.additionalAttachments.forEach((f) => {
        list.push({
          blob: f,
          filename: f.name,
          mimeType: f.type || 'application/octet-stream',
        });
      });
    }
    return list;
  };

  const handleCreateDraft = async () => {
    const clientId = settings.googleClientId || '123563855658-75uqhm7c28orvndc7me6ralsfus3np9g.apps.googleusercontent.com';

    // Synchronously open blank window on click to guarantee popup blocker doesn't block it
    const draftWindow = window.open('about:blank', '_blank');
    if (draftWindow) {
      try {
        draftWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Opening Gmail Draft...</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background-color: #f8fafc;
                  color: #0f172a;
                }
                .container {
                  text-align: center;
                  padding: 2.5rem;
                  background: white;
                  border-radius: 1rem;
                  box-shadow: 0 4px 20px -2px rgba(0,0,0,0.06);
                  border: 1px solid #e2e8f0;
                  max-width: 380px;
                }
                .spinner {
                  width: 40px;
                  height: 40px;
                  border: 3.5px solid #e2e8f0;
                  border-top-color: #2563eb;
                  border-radius: 50%;
                  animation: spin 0.8s linear infinite;
                  margin: 0 auto 1.25rem;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                h3 { margin: 0 0 0.5rem; font-size: 1.15rem; font-weight: 700; color: #0f172a; }
                p { margin: 0; color: #64748b; font-size: 0.85rem; line-height: 1.5; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="spinner"></div>
                <h3>Creating Gmail Draft...</h3>
                <p>Generating formatted score tables and packaging attachments. Opening Gmail automatically...</p>
              </div>
            </body>
          </html>
        `);
      } catch {
        // ignore
      }
    }

    try {
      setIsDrafting(true);
      setDraftError(null);
      setDraftResult(null);

      const token = await requestGoogleAccessToken(clientId);
      const attachments = getAttachmentsList();

      const res = await createGmailDraft(
        token,
        emailState.to,
        emailState.cc,
        emailState.subject,
        emailState.html,
        attachments
      );

      setDraftResult(res);
      setIsDrafting(false);

      // Automatically redirect the tab directly to Gmail Drafts
      const draftsUrl = res.viewUrl || 'https://mail.google.com/mail/u/0/#drafts';
      if (draftWindow && !draftWindow.closed) {
        draftWindow.location.replace(draftsUrl);
        draftWindow.focus();
      } else {
        window.open(draftsUrl, '_blank');
      }
    } catch (err: unknown) {
      if (draftWindow && !draftWindow.closed) {
        draftWindow.close();
      }
      setIsDrafting(false);
      const rawMsg = err instanceof Error ? err.message : String(err);
      setDraftError(rawMsg);
    }
  };

  const handleOpenGmailWeb = () => {
    const composeUrl = getGmailWebComposeUrl(emailState.to, emailState.cc, emailState.subject, '');
    window.open(composeUrl, '_blank');
  };

  const handleDownloadEml = async () => {
    try {
      const attachments = getAttachmentsList();
      const emlBlob = await createEmlBlob(
        emailState.to,
        emailState.cc,
        emailState.subject,
        emailState.html,
        attachments
      );
      downloadBlob(emlBlob, `${emailState.subject || 'Audit_Dispatch'}.eml`);
    } catch (err: unknown) {
      alert('Error creating EML: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(emailState.html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const isOriginError = draftError && (
    draftError.toLowerCase().includes('origin') ||
    draftError.toLowerCase().includes('redirect_uri') ||
    draftError.toLowerCase().includes('unauthorized') ||
    draftError.toLowerCase().includes('popup_closed')
  );

  return (
    <div className="space-y-6">
      {/* Parameters & Configuration Card */}
      <Card className="rounded-xl border border-slate-200/80 shadow-xs bg-white">
        <CardContent className="p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Email Configuration
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select email format and configure recipient auditor addresses.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Client</Label>
              <Select value="TATA Capital" disabled>
                <SelectTrigger className="h-10 border-slate-200 text-xs bg-slate-50">
                  <SelectValue placeholder="TATA Capital" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TATA Capital">TATA Capital</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email Type</Label>
              <Select
                value={emailState.emailType}
                onValueChange={(val) => {
                  if (val) handleEmailTypeChange(val as 'Report Email' | 'Closure Email');
                }}
              >
                <SelectTrigger className="h-10 border-slate-200 text-xs">
                  <SelectValue placeholder="Select Email Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Report Email">Report Email</SelectItem>
                  <SelectItem value="Closure Email">Closure Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subject & Recipients */}
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Subject Line</Label>
              <Input
                value={emailState.subject}
                onChange={(e) => setEmailState((prev) => ({ ...prev, subject: e.target.value }))}
                className="text-xs font-medium h-10 border-slate-200 focus:border-blue-600 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  To <span className="text-slate-400 font-normal lowercase">(comma separated)</span>
                </Label>
                <Input
                  placeholder="auditee@tatacapital.com, manager@tatacapital.com"
                  value={emailState.to}
                  onChange={(e) => setEmailState((prev) => ({ ...prev, to: e.target.value }))}
                  className="text-xs h-10 border-slate-200 focus:border-blue-600 rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  CC <span className="text-slate-400 font-normal lowercase">(comma separated)</span>
                </Label>
                <Input
                  placeholder="compliance@tatacapital.com, audit@kgac.in"
                  value={emailState.cc}
                  onChange={(e) => setEmailState((prev) => ({ ...prev, cc: e.target.value }))}
                  className="text-xs h-10 border-slate-200 focus:border-blue-600 rounded-lg"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attachments Card */}
      <Card className="rounded-xl border border-slate-200/80 shadow-xs bg-white">
        <CardContent className="p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Attachments Configuration
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select which generated packages to include in the dispatch.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* ZIP Package Option */}
            <div
              onClick={() =>
                setEmailState((prev) => ({
                  ...prev,
                  attachZip: !prev.attachZip,
                }))
              }
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
                emailState.attachZip
                  ? 'border-blue-500 bg-blue-50/30 shadow-2xs'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={emailState.attachZip}
                  onCheckedChange={(checked) =>
                    setEmailState((prev) => ({
                      ...prev,
                      attachZip: !!checked,
                    }))
                  }
                  className="mt-0.5"
                />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Archive className="size-4 text-blue-600" />
                  <span className="text-xs font-semibold text-slate-900">Audit_Report_Package.zip</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Complete bundle: Populated Excel + Observation PDFs + Merged Report
                </p>
                <Badge variant="outline" className="text-[10px] font-mono border-slate-200 text-slate-600 mt-0.5">
                  {(downloads.zip.size / (1024 * 1024)).toFixed(2)} MB
                </Badge>
              </div>
            </div>

            {/* Final PDF Option */}
            <div
              onClick={() =>
                setEmailState((prev) => ({
                  ...prev,
                  attachPdf: !prev.attachPdf,
                }))
              }
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
                emailState.attachPdf
                  ? 'border-blue-500 bg-blue-50/30 shadow-2xs'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={emailState.attachPdf}
                  onCheckedChange={(checked) =>
                    setEmailState((prev) => ({
                      ...prev,
                      attachPdf: !!checked,
                    }))
                  }
                  className="mt-0.5"
                />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <FileText className="size-4 text-red-600" />
                  <span className="text-xs font-semibold text-slate-900 truncate">{downloads.final_name}</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Final merged PDF with checklist report and annexures
                </p>
                <Badge variant="outline" className="text-[10px] font-mono border-slate-200 text-slate-600 mt-0.5">
                  {(downloads.final.size / (1024 * 1024)).toFixed(2)} MB
                </Badge>
              </div>
            </div>
          </div>

          {/* Additional Attachments */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Paperclip className="size-3.5" />
              Additional Files
            </Label>

            <FileDropzone
              id="additional-files-dropzone"
              multiple
              onFilesSelect={(newFiles) => {
                setEmailState((prev) => ({
                  ...prev,
                  additionalAttachments: [...prev.additionalAttachments, ...newFiles],
                }));
              }}
              onFileSelect={(file) => {
                if (file) {
                  setEmailState((prev) => ({
                    ...prev,
                    additionalAttachments: [...prev.additionalAttachments, file],
                  }));
                }
              }}
              title="Upload Additional Files"
              subtitle="Click or drag & drop extra attachments here (PDF, Excel, Images)"
              icon={<Paperclip className="size-5" />}
              iconBgColor="bg-slate-100"
              iconColor="text-slate-700"
              className="p-5"
            />

            {emailState.additionalAttachments.length > 0 ? (
              <div className="space-y-1.5">
                {emailState.additionalAttachments.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                  >
                    <span className="truncate max-w-sm font-medium text-slate-700">{file.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAdditional(idx)}
                        className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                No additional annexures attached.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live Email Preview */}
      <Card className="rounded-xl border border-slate-200/80 shadow-xs bg-white">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Email Preview
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Formatted HTML email body with client score parameter breakdown.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyHtml}
                className="gap-1.5 text-xs text-slate-700 border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer shadow-2xs"
              >
                {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                {copied ? 'HTML Copied' : 'Copy HTML'}
              </Button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-5 bg-white overflow-x-auto shadow-inner max-h-[500px] overflow-y-auto">
            <div
              dangerouslySetInnerHTML={{ __html: emailState.html }}
              className="prose prose-sm max-w-none text-slate-800"
            />
          </div>
        </CardContent>
      </Card>

      {/* Dispatch Action Buttons */}
      <Card className="rounded-xl border border-slate-200/80 shadow-xs bg-white">
        <CardContent className="p-6 space-y-4">
          {draftResult && (
            <Alert className="rounded-xl border-emerald-200 bg-emerald-50 text-emerald-900">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <AlertTitle className="text-xs font-semibold text-emerald-950">
                Gmail Draft Created Successfully
              </AlertTitle>
              <AlertDescription className="text-xs text-emerald-800 mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span>The draft has been saved to your Gmail account with the formatted HTML body and attachments.</span>
                <a
                  href={draftResult.viewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold underline text-emerald-900 hover:text-emerald-950 shrink-0"
                >
                  Open Gmail Drafts <ExternalLink className="size-3" />
                </a>
              </AlertDescription>
            </Alert>
          )}

          {draftError && (
            <Alert variant="destructive" className="rounded-xl border-red-200 bg-red-50 text-red-900">
              <AlertCircle className="size-4 text-red-600" />
              <AlertTitle className="text-xs font-semibold">Gmail Authorization Notice</AlertTitle>
              <AlertDescription className="text-xs text-red-800 mt-1 space-y-2">
                <p>{draftError}</p>
                {isOriginError && (
                  <div className="p-2.5 rounded bg-white/70 border border-red-200 text-[11px] text-slate-700 space-y-1">
                    <p className="font-semibold text-slate-900 flex items-center gap-1">
                      <Info className="size-3.5 text-blue-600" />
                      Domain Authorization:
                    </p>
                    <p>
                      To enable 1-click Gmail drafting from this URL, add <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">{currentOrigin}</code> to <strong>Authorized JavaScript origins</strong> in Google Cloud Console.
                    </p>
                    <p className="font-medium text-slate-900">
                      In the meantime, you can use the <strong>Open in Gmail Web</strong> or <strong>Download .EML</strong> options below!
                    </p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Primary Action: Direct Gmail Draft API */}
            <Button
              type="button"
              size="lg"
              onClick={handleCreateDraft}
              disabled={isDrafting}
              className="w-full gap-2 bg-red-600 hover:bg-red-700 text-white font-medium cursor-pointer h-11 text-xs rounded-lg shadow-xs"
            >
              {isDrafting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating Draft...
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Create Gmail Draft
                </>
              )}
            </Button>

            {/* Alternative Action 1: Gmail Web Compose link */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleOpenGmailWeb}
              className="w-full gap-2 bg-white border-slate-200 hover:bg-slate-50 text-slate-800 font-medium cursor-pointer h-11 text-xs rounded-lg shadow-2xs"
            >
              <ExternalLink className="size-4 text-blue-600" />
              Open in Gmail Web
            </Button>

            {/* Alternative Action 2: Download .EML for Outlook / Desktop */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleDownloadEml}
              className="w-full gap-2 bg-white border-slate-200 hover:bg-slate-50 text-slate-800 font-medium cursor-pointer h-11 text-xs rounded-lg shadow-2xs"
            >
              <Download className="size-4 text-slate-600" />
              Download .EML (Outlook)
            </Button>
          </div>
          <p className="text-[11px] text-slate-400 text-center">
            Create drafts directly in Gmail with OAuth, open Gmail Web composer, or download standard .EML for Microsoft Outlook.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
