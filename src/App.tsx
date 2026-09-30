import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuditProvider } from '@/context/AuditContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { GeneratorPage } from '@/pages/GeneratorPage';

export function App() {
  return (
    <BrowserRouter>
      <AuditProvider>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-600/10">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<GeneratorPage />} />
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
