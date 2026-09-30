import { TabGenerateReport } from '@/components/tabs/TabGenerateReport';
import { TabDispatchEmail } from '@/components/tabs/TabDispatchEmail';
import { useAudit } from '@/context/AuditContext';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, Mail, CheckCircle2 } from 'lucide-react';

export function GeneratorPage() {
  const { activeTab, setActiveTab, downloads } = useAudit();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Audit Report Generator
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automate Excel checklist compilation, observation extraction, and PDF report generation.
          </p>
        </div>
        {downloads && (
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs py-1 px-3 self-start sm:self-auto flex items-center gap-1.5 shadow-xs">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            Report Package Ready for Dispatch
          </Badge>
        )}
      </div>

      {/* 2-Tab Navigation - team-allocation-calendar segmented control design */}
      <div className="flex justify-start">
        <div className="inline-flex p-1 bg-slate-200/60 rounded-xl border border-slate-200/70 shadow-inner gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('generate')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'generate'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FileSpreadsheet className="size-4" />
            1. Generate Report
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'email'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Mail className="size-4" />
            2. Dispatch Email
            {downloads && (
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'generate' && <TabGenerateReport />}
        {activeTab === 'email' && <TabDispatchEmail />}
      </div>
    </div>
  );
}
