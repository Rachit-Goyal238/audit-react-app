import { useState } from 'react';
import {
  Server,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAudit } from '@/context/AuditContext';
import { checkGotenbergHealth, type GotenbergHealthResult } from '@/services/gotenbergService';

export function SettingsPage() {
  const { settings, setSettings } = useAudit();
  const [testingHealth, setTestingHealth] = useState(false);
  const [healthResult, setHealthResult] = useState<GotenbergHealthResult | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const handleTestConnection = async () => {
    try {
      setTestingHealth(true);
      setHealthResult(null);
      const res = await checkGotenbergHealth(settings.gotenbergUrl);
      setHealthResult(res);
    } finally {
      setTestingHealth(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const dockerCommand = 'docker run --rm -p 3000:3000 gotenberg/gotenberg:8';
  const gcloudCommand =
    'gcloud run deploy gotenberg \\\n  --image=gotenberg/gotenberg:8 \\\n  --platform=managed \\\n  --region=us-central1 \\\n  --allow-unauthenticated \\\n  --memory=2Gi \\\n  --cpu=2';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          System & Conversion Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure the Gotenberg LibreOffice conversion API backend and Google Identity Services for Gmail dispatching.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gotenberg API Configuration */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="size-4 text-primary" />
                Gotenberg LibreOffice API
              </CardTitle>
              <Badge variant={settings.gotenbergUrl ? 'secondary' : 'outline'} className="text-[10px]">
                Port 3000
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Stateless Docker container executing headless LibreOffice conversions with strict print borders.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="gotenbergUrl" className="text-xs font-medium">
                Gotenberg API Endpoint URL
              </Label>
              <div className="flex gap-2">
                <Input
                  id="gotenbergUrl"
                  value={settings.gotenbergUrl}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, gotenbergUrl: e.target.value }))
                  }
                  placeholder="e.g. http://localhost:3000 or https://gotenberg-xxx.a.run.app"
                  className="text-xs font-mono h-9"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={testingHealth}
                  className="gap-1.5 shrink-0 text-xs cursor-pointer"
                >
                  <RefreshCw className={`size-3.5 ${testingHealth ? 'animate-spin' : ''}`} />
                  Test Ping
                </Button>
              </div>
            </div>

            {healthResult && (
              <Alert
                variant={healthResult.isUp ? 'default' : 'destructive'}
                className={healthResult.isUp ? 'border-emerald-500 bg-emerald-500/10' : ''}
              >
                {healthResult.isUp ? (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="size-4" />
                )}
                <AlertTitle className="text-xs font-semibold">
                  {healthResult.isUp ? 'Connected to Gotenberg!' : 'Health Check Failed'}
                </AlertTitle>
                <AlertDescription className="text-xs">
                  {healthResult.statusText}
                  {healthResult.details && <div className="mt-1 font-mono text-[10px]">{healthResult.details}</div>}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="gotenbergApiKey" className="text-xs font-medium">
                Optional Bearer Token / API Key
              </Label>
              <Input
                id="gotenbergApiKey"
                type="password"
                value={settings.gotenbergApiKey}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, gotenbergApiKey: e.target.value }))
                }
                placeholder="Leave blank for unauthenticated local Docker"
                className="text-xs font-mono h-9"
              />
            </div>

            <div className="flex items-start gap-2 pt-2 border-t">
              <Checkbox
                id="mockFallback"
                checked={settings.useMockFallback}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, useMockFallback: !!checked }))
                }
                className="mt-0.5"
              />
              <div className="grid gap-0.5 leading-none">
                <label
                  htmlFor="mockFallback"
                  className="text-xs font-medium cursor-pointer"
                >
                  Enable Client-side Fallback Synthesizer
                </label>
                <p className="text-[11px] text-muted-foreground">
                  If Gotenberg API is unavailable, synthesizes a preview PDF client-side so you can test without stopping.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Google Identity Services / Gmail Config */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="size-4 text-primary" />
                Google Identity Services (Gmail API)
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                OAuth 2.0
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Replaces the legacy Flask OAuth server with browser-native Google GIS implicit client token flow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="googleClientId" className="text-xs font-medium">
                Google OAuth Client ID
              </Label>
              <Input
                id="googleClientId"
                value={settings.googleClientId}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, googleClientId: e.target.value }))
                }
                placeholder="xxxx-yyyy.apps.googleusercontent.com"
                className="text-xs font-mono h-9"
              />
              <p className="text-[11px] text-muted-foreground">
                Created in Google Cloud Console with scope:{' '}
                <code className="text-[10px] bg-muted px-1 rounded">https://www.googleapis.com/auth/gmail.compose</code>
              </p>
            </div>

            <div className="p-3 rounded-lg border bg-muted/30 text-xs space-y-2">
              <div className="font-semibold flex items-center gap-1.5 text-foreground">
                <ShieldCheck className="size-4 text-emerald-600" />
                Zero Backend Secrets Architecture
              </div>
              <p className="text-muted-foreground leading-relaxed">
                By utilizing Google GIS client-side token flow, client secrets are never exposed or stored. All drafting calls occur directly between the user's browser and Gmail REST API.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deployment Quick Reference for Gotenberg */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Terminal className="size-4 text-primary" />
            <CardTitle className="text-base">Deploying Gotenberg on Google Cloud Run or Docker</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Gotenberg replaces the heavy Oracle VM with a lightweight container that scales to zero.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span>Local Development (Run locally in 5 seconds via Docker):</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] gap-1 px-2"
                onClick={() => copyToClipboard(dockerCommand, 'docker')}
              >
                {copiedSnippet === 'docker' ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                {copiedSnippet === 'docker' ? 'Copied' : 'Copy Command'}
              </Button>
            </div>
            <pre className="p-3 bg-black/90 text-emerald-400 font-mono text-xs rounded-lg overflow-x-auto">
              {dockerCommand}
            </pre>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span>Production Deployment (Google Cloud Run Serverless - ~$1/month):</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] gap-1 px-2"
                onClick={() => copyToClipboard(gcloudCommand, 'gcloud')}
              >
                {copiedSnippet === 'gcloud' ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                {copiedSnippet === 'gcloud' ? 'Copied' : 'Copy Command'}
              </Button>
            </div>
            <pre className="p-3 bg-black/90 text-sky-300 font-mono text-xs rounded-lg overflow-x-auto leading-relaxed">
              {gcloudCommand}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
