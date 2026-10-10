import { useState } from 'react';
import { Sliders, Copy, Check, Info, Server, Key, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAudit } from '@/context/AuditContext';

export function SettingsDialog() {
  const { settings, setSettings } = useAudit();
  const [open, setOpen] = useState(false);
  const [gotenbergUrl, setGotenbergUrl] = useState(settings.gotenbergUrl);
  const [gotenbergApiKey, setGotenbergApiKey] = useState(settings.gotenbergApiKey);
  const [googleClientId, setGoogleClientId] = useState(settings.googleClientId);
  const [copiedOrigin, setCopiedOrigin] = useState(false);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const handleOpenClick = () => {
    setGotenbergUrl(settings.gotenbergUrl);
    setGotenbergApiKey(settings.gotenbergApiKey);
    setGoogleClientId(settings.googleClientId);
    setOpen(true);
  };

  const handleSave = () => {
    setSettings((prev) => ({
      ...prev,
      gotenbergUrl: gotenbergUrl.trim(),
      gotenbergApiKey: gotenbergApiKey.trim(),
      googleClientId: googleClientId.trim(),
    }));
    setOpen(false);
  };

  const handleResetDefaults = () => {
    const defaultClientId = '123563855658-75uqhm7c28orvndc7me6ralsfus3np9g.apps.googleusercontent.com';
    const defaultGotenberg = import.meta.env.VITE_GOTENBERG_URL || '';
    setGotenbergUrl(defaultGotenberg);
    setGotenbergApiKey('');
    setGoogleClientId(defaultClientId);
  };

  const handleCopyOrigin = async () => {
    try {
      await navigator.clipboard.writeText(currentOrigin);
      setCopiedOrigin(true);
      setTimeout(() => setCopiedOrigin(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleOpenClick}
        className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg h-9 w-9 cursor-pointer"
        title="System Settings"
      >
        <Sliders className="h-4 w-4" />
        <span className="sr-only">Settings</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg p-6 bg-white rounded-xl shadow-lg border border-slate-200">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Sliders className="h-5 w-5 text-blue-600" />
              System Configuration
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Configure backend conversion and Google OAuth parameters.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Gotenberg API */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-slate-500" />
                Gotenberg PDF Conversion Service
              </Label>
              <Input
                value={gotenbergUrl}
                onChange={(e) => setGotenbergUrl(e.target.value)}
                placeholder="e.g. https://gotenberg-cr-xxxx.run.app or leave blank for /api/convert"
                className="text-xs font-mono h-9"
              />
              <p className="text-[11px] text-slate-500">
                Leave blank to use the default automated Vercel backend proxy (`/api/convert`).
              </p>
            </div>

            {/* Gotenberg API Key */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-slate-500" />
                Gotenberg API Key (Optional)
              </Label>
              <Input
                type="password"
                value={gotenbergApiKey}
                onChange={(e) => setGotenbergApiKey(e.target.value)}
                placeholder="Optional Gotenberg basic auth/bearer token"
                className="text-xs font-mono h-9"
              />
            </div>

            {/* Google OAuth Client ID */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-slate-500" />
                Google OAuth Client ID (Gmail Drafts)
              </Label>
              <Input
                value={googleClientId}
                onChange={(e) => setGoogleClientId(e.target.value)}
                placeholder="xxxx.apps.googleusercontent.com"
                className="text-xs font-mono h-9"
              />
            </div>

            {/* Origin Whitelist Card */}
            <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-800">Authorized JavaScript Origin:</span>
                  <p className="mt-0.5">
                    To create Gmail drafts directly from this domain, add this web address to your Google Cloud Console OAuth credentials:
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded border border-slate-200 font-mono text-[11px] text-slate-700">
                <span className="truncate flex-1">{currentOrigin}</span>
                <button
                  type="button"
                  onClick={handleCopyOrigin}
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-[10px] font-sans font-semibold shrink-0 cursor-pointer"
                >
                  {copiedOrigin ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Copy URL
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetDefaults}
              className="text-xs text-slate-500 hover:text-slate-800 gap-1.5 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset Defaults
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 cursor-pointer"
              >
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
