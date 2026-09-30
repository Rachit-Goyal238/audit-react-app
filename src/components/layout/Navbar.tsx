import { Link } from 'react-router-dom';
import { SettingsDialog } from './SettingsDialog';

export function Navbar() {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/60 bg-white/95 px-4 backdrop-blur-md shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] md:px-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex items-center justify-center">
            <img
              src="/logo.png"
              alt="KGAC Logo"
              className="h-8 w-auto object-contain"
              onError={(e) => {
                // If logo.png fails to load, fallback gracefully to a crisp icon
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent && !parent.querySelector('.fallback-icon')) {
                  const fallback = document.createElement('div');
                  fallback.className = 'fallback-icon size-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs';
                  fallback.innerHTML = '<svg class="size-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>';
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-tight">
              Audit Report Generator
            </h1>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              Audit &amp; Compliance Automation Suite
            </p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-[11px] font-medium text-slate-600">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Engine Active</span>
        </div>
        <SettingsDialog />
      </div>
    </header>
  );
}
