import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuditProvider } from '@/context/AuditContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { GeneratorPage } from '@/pages/GeneratorPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { TemplatesPage } from '@/pages/TemplatesPage';
import { ArchitecturePage } from '@/pages/ArchitecturePage';

export function App() {
  return (
    <BrowserRouter>
      <AuditProvider>
        <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/20">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<GeneratorPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/architecture" element={<ArchitecturePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuditProvider>
    </BrowserRouter>
  );
}

export default App;
