import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TabGenerateReport } from '@/components/tabs/TabGenerateReport';
import { TabDispatchEmail } from '@/components/tabs/TabDispatchEmail';
import { useAudit } from '@/context/AuditContext';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, Mail } from 'lucide-react';

export function GeneratorPage() {
  const { activeTab, setActiveTab, downloads } = useAudit();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Title (1:1 with app.py line 77) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            Audit Report Generator &amp; Dispatcher
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            1:1 Migration of the TATA Capital &amp; YesBank Streamlit automation platform with Gotenberg API.
          </p>
        </div>
        {downloads && (
          <Badge className="bg-emerald-600 text-white font-mono text-xs py-1 px-2.5 self-start sm:self-auto">
            Report Ready for Dispatch
          </Badge>
        )}
      </div>

      {/* 2-Tab Navigation (1:1 with app.py line 122: st.tabs(["1. Generate Report", "2. Dispatch Email"])) */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'generate' | 'email')}
        className="w-full space-y-6"
      >
        <TabsList className="grid w-full sm:w-[420px] grid-cols-2 h-11 p-1 bg-muted">
          <TabsTrigger
            value="generate"
            className="flex items-center gap-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="size-4" />
            1. Generate Report
          </TabsTrigger>
          <TabsTrigger
            value="email"
            className="flex items-center gap-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs cursor-pointer"
          >
            <Mail className="size-4" />
            2. Dispatch Email
            {downloads && (
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="focus-visible:outline-none">
          <TabGenerateReport />
        </TabsContent>

        <TabsContent value="email" className="focus-visible:outline-none">
          <TabDispatchEmail />
        </TabsContent>
      </Tabs>
    </div>
  );
}
