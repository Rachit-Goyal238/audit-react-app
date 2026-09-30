export function Footer() {
  return (
    <footer className="border-t border-slate-200/60 bg-white/70 py-4 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <p className="flex items-center gap-1.5 font-medium">
          <span>&copy; {new Date().getFullYear()} KGAC. Audit &amp; Compliance Automation Suite.</span>
        </p>
        <p className="text-[11px] text-slate-400">
          Internal Enterprise Tool
        </p>
      </div>
    </footer>
  );
}
