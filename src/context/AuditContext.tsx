import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  GeneratedDownloads,
  ReportMetadata,
  EmailState,
  AppSettings,
} from '../types/audit';

interface AuditContextType {
  activeTab: 'generate' | 'email';
  setActiveTab: (tab: 'generate' | 'email') => void;

  // Form Inputs (Tab 1)
  auditId: string;
  setAuditId: (id: string) => void;
  masterFile: File | null;
  setMasterFile: (f: File | null) => void;
  client: string;
  setClient: (c: string) => void;
  templateType: string;
  setTemplateType: (t: string) => void;
  reportPdf: File | null;
  setReportPdf: (f: File | null) => void;
  annexurePdf: File | null;
  setAnnexurePdf: (f: File | null) => void;

  // Generated Outputs (1:1 with session_state.downloads)
  downloads: GeneratedDownloads | null;
  setDownloads: (d: GeneratedDownloads | null) => void;
  reportMetadata: ReportMetadata | null;
  setReportMetadata: (m: ReportMetadata | null) => void;

  // Email Config & Preview (Tab 2)
  emailState: EmailState;
  setEmailState: React.Dispatch<React.SetStateAction<EmailState>>;

  // Settings
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;

  // Pipeline Status
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
  generationLogs: string[];
  addLog: (msg: string) => void;
  clearLogs: () => void;
}

const defaultEmailState: EmailState = {
  emailType: 'Report Email',
  subject: '',
  to: '',
  cc: '',
  attachZip: true,
  attachPdf: false,
  additionalAttachments: [],
  html: '',
  observations: [],
};

const defaultSettings: AppSettings = {
  gotenbergUrl:
    import.meta.env.VITE_GOTENBERG_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'),
  gotenbergApiKey: import.meta.env.VITE_GOTENBERG_API_KEY || '',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  useMockFallback: true,
};

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export function AuditProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<'generate' | 'email'>('generate');

  const [auditId, setAuditId] = useState<string>('');
  const [masterFile, setMasterFile] = useState<File | null>(null);
  const [client, setClient] = useState<string>('TATA Capital');
  const [templateType, setTemplateType] = useState<string>('Collection');
  const [reportPdf, setReportPdf] = useState<File | null>(null);
  const [annexurePdf, setAnnexurePdf] = useState<File | null>(null);

  const [downloads, setDownloads] = useState<GeneratedDownloads | null>(null);
  const [reportMetadata, setReportMetadata] = useState<ReportMetadata | null>(null);
  const [emailState, setEmailState] = useState<EmailState>(defaultEmailState);

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('audit_settings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);

  useEffect(() => {
    localStorage.setItem('audit_settings', JSON.stringify(settings));
  }, [settings]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setGenerationLogs((prev) => [...prev, `[${time}] ${msg}`]);
  };

  const clearLogs = () => {
    setGenerationLogs([]);
  };

  return (
    <AuditContext.Provider
      value={{
        activeTab,
        setActiveTab,
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
        reportMetadata,
        setReportMetadata,
        emailState,
        setEmailState,
        settings,
        setSettings,
        isGenerating,
        setIsGenerating,
        generationLogs,
        addLog,
        clearLogs,
      }}
    >
      {children}
    </AuditContext.Provider>
  );
}

export function useAudit() {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error('useAudit must be used within an AuditProvider');
  }
  return context;
}
