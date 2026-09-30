import React, { useState } from 'react';
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
  FilePlus,
  Trash2,
  Download,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  type AttachmentItem,
} from '@/services/gmailService';
import { downloadBlob } from '@/services/pdfService';

export function TabDispatchEmail() {
  const {
    downloads,
    reportMetadata,
    emailState,
    setEmailState,
    settings,
  } = useAudit();

  const [isDrafting, setIsDrafting] = useState(false);
  const [draftResult, setDraftResult] = useState<{ draftId: string; viewUrl: string } | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!downloads || !reportMetadata) {
    return (
      <div className="p-12 text-center border rounded-xl bg-card">
        <Mail className="size-12 text-muted-foreground mx-auto mb-3 opacity-40" />
        <h3 className="text-base font-semibold text-foreground">Awaiting Report Generation</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Please generate an audit report in the first tab to configure and preview the email.
        </p>
      </div>
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setEmailState((prev) => ({
        ...prev,
        additionalAttachments: [...prev.additionalAttachments, ...newFiles],
      }));
    }
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
    if (!settings.googleClientId) {
      setDraftError(
        'Google Client ID is not configured in Settings. Please set your OAuth 2.0 Client ID in the top right Settings modal, or use the "Download .EML / Outlook" option below.'
      );
      return;
    }

    try {
      setIsDrafting(true);
      setDraftError(null);

      const token = await requestGoogleAccessToken(settings.googleClientId);
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
      window.open('https://mail.google.com/mail/u/0/#drafts', '_blank');
    } catch (err: unknown) {
      setIsDrafting(false);
      setDraftError(err instanceof Error ? err.message : String(err));
    }
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

  return (
    <div className="space-y-6">
      {/* Email Configuration (1:1 with upload.py lines 6-20) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Email Configuration</CardTitle>
          <CardDescription className="text-xs">
            Configure client parameters and format type for draft generation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Client</Label>
              <Select value="TATA Capital" disabled>
                <SelectTrigger>
                  <SelectValue placeholder="TATA Capital" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TATA Capital">TATA Capital</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Email Type</Label>
              <Select
                value={emailState.emailType}
                onValueChange={(val) => {
                  if (val) handleEmailTypeChange(val as 'Report Email' | 'Closure Email');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Email Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Report Email">Report Email</SelectItem>
                  <SelectItem value="Closure Email">Closure Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Details (1:1 with upload.py lines 50-60) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Email Details</CardTitle>
          <CardDescription className="text-xs">
            Review subject line and configure auditor recipient addresses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Subject Line (Auto-Formatted)</Label>
            <Input
              value={emailState.subject}
              onChange={(e) => setEmailState((prev) => ({ ...prev, subject: e.target.value }))}
              className="text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">To (Comma separated)</Label>
              <Input
                placeholder="auditee@tatacapital.com, manager@tatacapital.com"
                value={emailState.to}
                onChange={(e) => setEmailState((prev) => ({ ...prev, to: e.target.value }))}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">CC (Comma separated)</Label>
              <Input
                placeholder="compliance@tatacapital.com, audit@kgac.in"
                value={emailState.cc}
                onChange={(e) => setEmailState((prev) => ({ ...prev, cc: e.target.value }))}
                className="text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attachment Options (1:1 with upload.py lines 62-110) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Attachments Configuration</CardTitle>
          <CardDescription className="text-xs">
            Select standard generated packages or attach additional annexures.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* ZIP Package Option */}
            <div
              onClick={() =>
                setEmailState((prev) => ({
                  ...prev,
                  attachZip: !prev.attachZip,
                }))
              }
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer select-none transition-colors ${
                emailState.attachZip ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
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
                  className="mt-1"
                />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Archive className="size-4 text-primary" />
                  <span className="text-xs font-semibold">Audit_Report_Package.zip</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Complete bundle: Populated Excel + Individual PDFs + Final Merged Report
                </p>
                <Badge variant="outline" className="text-[10px] font-mono mt-1">
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
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer select-none transition-colors ${
                emailState.attachPdf ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
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
                  className="mt-1"
                />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <FileText className="size-4 text-emerald-600" />
                  <span className="text-xs font-semibold truncate">{downloads.final_name}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Final merged PDF with checklist report, evidence slices, and annexures
                </p>
                <Badge variant="outline" className="text-[10px] font-mono mt-1">
                  {(downloads.final.size / (1024 * 1024)).toFixed(2)} MB
                </Badge>
              </div>
            </div>
          </div>

          {/* Additional Attachments */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Paperclip className="size-3.5" />
                Additional Attachments
              </Label>
              <label className="cursor-pointer">
                <Input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <span className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                  <FilePlus className="size-3.5" /> Add files
                </span>
              </label>
            </div>

            {emailState.additionalAttachments.length > 0 ? (
              <div className="space-y-1.5">
                {emailState.additionalAttachments.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-1.5 rounded-md bg-muted/40 border text-xs"
                  >
                    <span className="truncate max-w-sm">{file.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleRemoveAdditional(idx)}
                        className="text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">
                No additional annexures attached.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live Email Preview (1:1 with Streamlit HTML preview) */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Live Email Preview</CardTitle>
            <CardDescription className="text-xs">
              Rendered with branded TATA tables, color-coded score parameters, and auditor signature.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyHtml}
            className="gap-1.5 text-xs cursor-pointer"
          >
            {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
            {copied ? 'Copied!' : 'Copy HTML'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-6 bg-white overflow-x-auto shadow-inner max-h-[500px] overflow-y-auto">
            <div
              dangerouslySetInnerHTML={{ __html: emailState.html }}
              className="prose prose-sm max-w-none text-black"
            />
          </div>
        </CardContent>
      </Card>

      {/* Dispatch Actions (1:1 with draft.py lines 6-52) */}
      <Card>
        <CardContent className="p-6 space-y-4">
          {draftResult && (
            <Alert className="border-emerald-500 bg-emerald-500/10">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <AlertTitle className="text-xs font-semibold text-emerald-800">
                ✅ Gmail Draft Created Successfully!
              </AlertTitle>
              <AlertDescription className="text-xs text-emerald-700">
                The draft has been saved directly to your Gmail account with the formatted HTML body and attachments.
                <a
                  href={draftResult.viewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold underline ml-1 hover:text-emerald-900"
                >
                  Open Gmail Drafts <ExternalLink className="size-3" />
                </a>
              </AlertDescription>
            </Alert>
          )}

          {draftError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle className="text-xs font-semibold">Gmail Authorization Notice</AlertTitle>
              <AlertDescription className="text-xs">{draftError}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              type="button"
              size="lg"
              onClick={handleCreateDraft}
              disabled={isDrafting}
              className="w-full gap-2 bg-red-600 hover:bg-red-700 text-white font-medium cursor-pointer h-12 text-sm shadow-sm"
            >
              {isDrafting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating Gmail Draft...
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  📨 Generate Gmail Draft
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleDownloadEml}
              className="w-full gap-2 border-primary/30 hover:border-primary text-foreground font-medium cursor-pointer h-12 text-sm shadow-sm"
            >
              <Download className="size-4 text-primary" />
              📥 Download .EML (Outlook / Mail)
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Tip: You can create a direct Gmail draft via OAuth in Google Cloud, or download the standard .EML file to open directly in Microsoft Outlook or Apple Mail.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
