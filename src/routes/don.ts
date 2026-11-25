import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_DONATION, whatsappDonationUrl } from "@/lib/donation";

/** « Soutenir » / « Faire un don » : ouvre WhatsApp avec le numéro et le message enregistrés. */
export const Route = createFileRoute("/don")({
  server: {
    handlers: {
      GET: async () => {
        let number: string = DEFAULT_DONATION.whatsappNumber;
        let message: string = DEFAULT_DONATION.message;
        const url = process.env["SUPABASE_URL"] ?? import.meta.env['VITE_SUPABASE_URL'];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'];
        if (url && key) {
          const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
          const { data, error } = await db.from("donation_settings").select("whatsapp_number, message").eq("id", 1).maybeSingle();
          if (error) console.error("donation_settings:", error.message);
          if (data?.whatsapp_number) {
            number = data.whatsapp_number;
            message = data.message;
          }
        }
        return new Response(null, {
          status: 302,
          headers: { Location: whatsappDonationUrl(number, message), "Cache-Control": "no-store" },
        });
      },
    },
  },
});
