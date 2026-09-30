export interface GmailDraftResult {
  draftId: string;
  messageId: string;
  viewUrl: string;
}

export interface AttachmentItem {
  blob: Blob;
  filename: string;
  mimeType?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

let cachedAccessToken: string | null = null;

export async function requestGoogleAccessToken(clientId: string): Promise<string> {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  if (!window.google?.accounts?.oauth2) {
    // Dynamically load Google Identity Services SDK if not already in document
    await loadGisScript();
  }

  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services SDK failed to load. Check your internet connection.'));
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/gmail.compose',
      callback: (resp) => {
        if (resp.error) {
          reject(new Error(`OAuth error: ${resp.error}`));
        } else if (resp.access_token) {
          cachedAccessToken = resp.access_token;
          resolve(resp.access_token);
        } else {
          reject(new Error('Failed to retrieve access token.'));
        }
      },
    });

    tokenClient.requestAccessToken();
  });
}

function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Google GIS script.'));
    document.head.appendChild(script);
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function buildMimeMessage(
  to: string,
  cc: string,
  subject: string,
  htmlBody: string,
  attachments: AttachmentItem[] = []
): Promise<string> {
  const boundary = `====boundary_${Date.now()}_${Math.random().toString(36).slice(2, 8)}====`;
  let mime = '';

  if (to.trim()) {
    mime += `To: ${to.trim()}\r\n`;
  }
  if (cc.trim()) {
    mime += `Cc: ${cc.trim()}\r\n`;
  }

  // RFC 2047 encoded subject
  const encodedSubject = btoa(unescape(encodeURIComponent(subject)));
  mime += `Subject: =?UTF-8?B?${encodedSubject}?=\r\n`;
  mime += `MIME-Version: 1.0\r\n`;
  mime += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;

  // HTML Body part
  mime += `--${boundary}\r\n`;
  mime += `Content-Type: text/html; charset="UTF-8"\r\n`;
  mime += `Content-Transfer-Encoding: base64\r\n\r\n`;
  mime += `${btoa(unescape(encodeURIComponent(htmlBody)))}\r\n\r\n`;

  // Attachments
  for (const item of attachments) {
    const base64Data = await blobToBase64(item.blob);
    const mimeType = item.mimeType || 'application/octet-stream';

    mime += `--${boundary}\r\n`;
    mime += `Content-Type: ${mimeType}; name="${item.filename}"\r\n`;
    mime += `Content-Disposition: attachment; filename="${item.filename}"\r\n`;
    mime += `Content-Transfer-Encoding: base64\r\n\r\n`;

    // 76 chars line wrapping per standard MIME spec
    for (let i = 0; i < base64Data.length; i += 76) {
      mime += `${base64Data.slice(i, i + 76)}\r\n`;
    }
    mime += `\r\n`;
  }

  mime += `--${boundary}--\r\n`;
  return mime;
}

export async function createGmailDraft(
  accessToken: string,
  to: string,
  cc: string,
  subject: string,
  htmlBody: string,
  attachments: AttachmentItem[] = []
): Promise<GmailDraftResult> {
  const mimeMessage = await buildMimeMessage(to, cc, subject, htmlBody, attachments);

  // Base64URL encode for Gmail API
  const base64UrlMessage = btoa(unescape(encodeURIComponent(mimeMessage)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        raw: base64UrlMessage,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return {
    draftId: result.id,
    messageId: result.message?.id || '',
    viewUrl: 'https://mail.google.com/mail/u/0/#drafts',
  };
}

/**
 * Creates an .eml file blob that can be opened in Outlook, Windows Mail, or Thunderbird.
 */
export async function createEmlBlob(
  to: string,
  cc: string,
  subject: string,
  htmlBody: string,
  attachments: AttachmentItem[] = []
): Promise<Blob> {
  const mime = await buildMimeMessage(to, cc, subject, htmlBody, attachments);
  return new Blob([mime], { type: 'message/rfc822' });
}
