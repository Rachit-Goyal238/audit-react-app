export function Footer() {
  return (
    <footer className="border-t bg-card/50 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div>
          <span className="font-semibold text-foreground">Audit Report Generator &amp; Dispatcher</span> — Standalone React 19 + Gotenberg Architecture
        </div>
        <div className="flex items-center gap-4">
          <span>ExcelJS / SheetJS</span>
          <span>•</span>
          <span>pdf-lib</span>
          <span>•</span>
          <span>Gotenberg Cloud Run</span>
          <span>•</span>
          <span>Google GIS</span>
        </div>
      </div>
    </footer>
  );
}
