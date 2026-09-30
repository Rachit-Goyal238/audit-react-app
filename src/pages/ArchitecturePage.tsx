import {
  Server,
  Cpu,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function ArchitecturePage() {
  const comparison = [
    {
      feature: 'Excel Parsing',
      legacy: 'Python pandas (high RAM on Oracle VM)',
      pathB: 'Client-side ExcelJS / SheetJS in browser RAM',
      benefit: 'Infinite concurrency, 0 server cost',
    },
    {
      feature: 'Template Population',
      legacy: 'Python openpyxl',
      pathB: 'ExcelJS client-side cell manipulation',
      benefit: 'Preserves fonts, formulas, and print setups',
    },
    {
      feature: 'Excel to PDF Conversion',
      legacy: 'Local headless LibreOffice via PyUNO on VM',
      pathB: 'Stateless Gotenberg Docker API (Cloud Run)',
      benefit: 'Scales to zero (~$1/mo) vs $40+/mo heavy VM',
    },
    {
      feature: 'PDF Merging & Annexures',
      legacy: 'PyMuPDF (fitz) and pypdf',
      pathB: 'pdf-lib purely in the browser',
      benefit: 'Fast client-side vector merging',
    },
    {
      feature: 'Email Dispatching',
      legacy: 'Flask server with stored client secrets',
      pathB: 'Google Identity Services (GIS) token client',
      benefit: 'Zero backend secrets, direct Gmail API call',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="font-mono text-xs">
            Path B / Hybrid Architecture
          </Badge>
          <Badge className="bg-emerald-600 text-white font-mono text-xs">
            Recommended Migration Strategy
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          System Architecture & Feasibility Report
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Detailed technical analysis of migrating the Python/Streamlit Audit Report Generator into a modern React application.
        </p>
      </div>

      {/* 3 Pillars Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Cpu className="size-5" />
            </div>
            <CardTitle className="text-base">90% Client-Side Processing</CardTitle>
            <CardDescription className="text-xs">
              Excel parsing, formula injection, and PDF merging run inside the auditor's browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            Eliminates multi-tenant RAM bottlenecks. Massive audit workbooks never congest your backend server.
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader className="pb-3">
            <div className="size-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center mb-2">
              <Server className="size-5" />
            </div>
            <CardTitle className="text-base">10% Gotenberg API Bottleneck</CardTitle>
            <CardDescription className="text-xs">
              Headless LibreOffice in a stateless Docker container on Google Cloud Run.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            Replaces the heavy Oracle VM. Scales to zero when idle, costing only fractions of a cent per conversion.
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="pb-3">
            <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
              <ShieldCheck className="size-5" />
            </div>
            <CardTitle className="text-base">Zero Backend Secrets</CardTitle>
            <CardDescription className="text-xs">
              Google GIS OAuth 2.0 creates drafts directly from browser to Gmail API.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            No OAuth refresh tokens or private keys need to be persisted on a server, reducing security risk.
          </CardContent>
        </Card>
      </div>

      {/* Migration Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legacy Streamlit vs. React Path B Comparison</CardTitle>
          <CardDescription className="text-xs">
            How each component of the Python pipeline maps to modern browser-first technologies.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="p-3 font-semibold text-foreground">Pipeline Stage</th>
                <th className="p-3 font-semibold text-muted-foreground">Legacy Python VM</th>
                <th className="p-3 font-semibold text-primary">React + Gotenberg Path B</th>
                <th className="p-3 font-semibold text-emerald-600">Architectural Advantage</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {comparison.map((item, idx) => (
                <tr key={idx} className="hover:bg-muted/30">
                  <td className="p-3 font-semibold text-foreground whitespace-nowrap">{item.feature}</td>
                  <td className="p-3 text-muted-foreground font-mono text-[11px]">{item.legacy}</td>
                  <td className="p-3 font-medium text-foreground">{item.pathB}</td>
                  <td className="p-3 text-emerald-600 font-medium">{item.benefit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* LibreOffice Bottleneck Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Why LibreOffice is Strictly Required for Excel-to-PDF</CardTitle>
          <CardDescription className="text-xs">
            Addressing why client-side libraries like jsPDF or pdfmake cannot replace LibreOffice for this workflow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
          <p>
            Audit reports generated from branded templates feature complex cell styles, auto-adjusting row heights, conditional formatting, and print area boundaries (<code className="bg-muted px-1 rounded text-foreground">fitToWidth = 1</code>).
          </p>
          <p>
            Client-side canvas or vector generators (like <code className="bg-muted px-1 rounded text-foreground">jsPDF</code>) do not understand Excel layout engines. Attempting to recreate the layout manually in JavaScript would require thousands of lines of fragile coordinate calculations.
          </p>
          <p>
            Hosting <strong>Gotenberg</strong> in a containerized serverless environment provides the best of both worlds: 100% pixel-perfect conversion fidelity while eliminating the ongoing cost and maintenance of an always-on VM.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
