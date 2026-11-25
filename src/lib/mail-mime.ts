/** Construction d’un e-mail (texte + pièce jointe) au format attendu par l’API Gmail. */
export type MailAttachment = { filename: string; mime: string; bytes: Uint8Array };
export type MailMessage = { to: string; subject: string; text: string; attachment?: MailAttachment };

export const b64 = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const utf8 = (s: string) => new TextEncoder().encode(s);
const header = (v: string) => (/^[\x20-\x7e]*$/.test(v) ? v : `=?UTF-8?B?${b64(utf8(v))}?=`);
const lines76 = (s: string) => s.replace(/.{1,76}/g, "$&\r\n");

/** Message RFC 2822 encodé en base64url (champ `raw` de l’API Gmail). */
export function buildRawMail(mail: MailMessage): string {
  const boundary = `vc_${crypto.randomUUID()}`;
  const parts = [
    `To: ${mail.to}`,
    `Subject: ${header(mail.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    lines76(b64(utf8(mail.text))),
  ];
  if (mail.attachment) {
    parts.push(
      `--${boundary}`,
      `Content-Type: ${mail.attachment.mime}; name="${mail.attachment.filename}"`,
      `Content-Disposition: attachment; filename="${mail.attachment.filename}"`,
      "Content-Transfer-Encoding: base64",
      "",
      lines76(b64(mail.attachment.bytes)),
    );
  }
  parts.push(`--${boundary}--`, "");
  return b64(utf8(parts.join("\r\n"))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
