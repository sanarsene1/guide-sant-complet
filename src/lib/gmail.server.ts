/**
 * Envoi d’e-mails depuis le compte Gmail du propriétaire (serveur uniquement).
 * Appelle directement l’API Gmail de Google avec les secrets GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET
 * et GMAIL_REFRESH_TOKEN : fonctionne de la même façon sur Lovable et sur Cloudflare.
 */
import { buildRawMail, type MailMessage } from "./mail-mime";

export type { MailAttachment } from "./mail-mime";

async function gmailAccessToken(): Promise<string> {
  const clientId = process.env["GMAIL_CLIENT_ID"];
  const clientSecret = process.env["GMAIL_CLIENT_SECRET"];
  const refreshToken = process.env["GMAIL_REFRESH_TOKEN"];
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Gmail n'est pas configuré (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET ou GMAIL_REFRESH_TOKEN manquant).");
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Gmail token refresh failed [${res.status}]: ${body}`);
    throw new Error(`Gmail token refresh failed [${res.status}]: ${body}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("Gmail token refresh returned no access_token");
  return json.access_token;
}

export async function sendGmail(mail: MailMessage) {
  const token = await gmailAccessToken();
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: buildRawMail(mail) }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Gmail send failed [${res.status}]: ${body}`);
    throw new Error(`Gmail send failed [${res.status}]: ${body}`);
  }
}
