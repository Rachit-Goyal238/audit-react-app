import { Link, useLocation } from 'react-router-dom';
import { FileSpreadsheet, Server, Sparkles, Sliders, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAudit } from '@/context/AuditContext';

export function Navbar() {
  const location = useLocation();
  const { settings } = useAudit();

  const navItems = [
    { label: 'Audit Generator', path: '/', icon: FileSpreadsheet },
    { label: 'Templates & Specs', path: '/templates', icon: Sparkles },
    { label: 'Cloud Run & Gotenberg', path: '/settings', icon: Server },
    { label: 'Architecture Guide', path: '/architecture', icon: BookOpen },
  ];

  return (
    <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="size-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-sm">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <div className="font-semibold text-base leading-tight tracking-tight text-foreground flex items-center gap-2">
                Audit Dispatcher
                <Badge variant="secondary" className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0">
                  Path B
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Streamlit to React + Gotenberg Migration
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-secondary text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                <Icon className="size-4" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/settings" className="hidden lg:flex items-center gap-2">
            <Badge
              variant={settings.useMockFallback ? 'outline' : 'default'}
              className="text-xs font-normal gap-1 cursor-pointer py-1"
            >
              <span
                className={`size-2 rounded-full ${
                  settings.useMockFallback ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                }`}
              />
              {settings.useMockFallback ? 'Gotenberg: Mock Fallback' : 'Gotenberg: Cloud Run'}
            </Badge>
          </Link>
          <Link
            to="/settings"
            className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
            title="Settings"
          >
            <Sliders className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
