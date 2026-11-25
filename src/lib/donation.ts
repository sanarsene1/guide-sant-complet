/** Don par WhatsApp : le numéro et le message viennent de la table `donation_settings`. */
export const DEFAULT_DONATION = {
  whatsappNumber: "+243994531426",
  message: "Bonjour VetoCare, je souhaite faire un don pour soutenir le projet. Comment puis-je procéder ?",
} as const;

/** Lien WhatsApp « cliquer pour discuter » : chiffres seuls, sans « + », message encodé. */
export function whatsappDonationUrl(number: string, message: string): string {
  const digits = number.replace(/\D/g, "");
  const text = message.trim();
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
