<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

<!-- AGENT-MEMORY:BEGIN -->
- Static site rules (pages, nav, data files) live in `public/site/AGENTS.md`. Why: keeps this file small.
- The account page `/espace-veterinaire` is a React route styled only with tokens from `src/styles.css` (mirroring `public/site/assets/home-tokens.css`) and the `brand`/`google`/`soft` Button variants; it never loads the static `style.css`. Successful sign-in (email, phone code, Google, confirm link with `?welcome=1`) always ends at `HOME_AFTER_SIGN_IN` from `src/lib/auth-helpers.ts`. Why: the old page used the legacy bright green and stayed on the form after login.
- Static-site account links are rewritten by `vcAccount()` (`assets/app.js`) to `/mon-compte`, showing name/photo from `localStorage['vc-account']` (written by the React account pages). Why: signed-in visitors never pass through sign-in.
- `/mon-compte` (`?tab=`): `GROUPS` feeds sidebar + phone hamburger; `useAccountSession` retries before redirecting to sign-in. Why: no false bounce.
- Dark mode: React pages only, `.dark` tokens + `src/lib/theme.ts` (`vc-theme`), applied pre-paint in `__root.tsx`. Why: no flash.
- Course rules (pass, brevet, unlock order, resume, exam draw) live only in `src/lib/formations/grading.ts`, pre-exam survey in `feedback.ts`; `certificate.ts` feeds `CertificateCard` + PDF. Why: page, account and PDFs agree.
- "Mes formations": Cisco hero → `/formations` catalog (subjects in `subjects.ts`, carousel per subject). Why: NetAcad layout.
- Push: VAPID keys derive from the `VAPID_SEED` secret (`src/lib/push.server.ts`); the hourly managed schedule `vetocare-push-tick` calls `/api/public/jobs/push-tick` (goal reminders/achievement, care-reminder eve/day). Timing rules live only in `goals.ts` and `reminder-schedule.ts`; the one-time welcome push (`sendWelcomeOnce` in `push.server.ts`, rules in `welcome.ts`, row per user in `welcome_notices`) fires when a device subscribes (tested in `notifications-rules.test.ts`). Why: one hourly job serves every notification.
- Consent/notification banner: one vanilla `public/site/assets/consent.js` (skill Consent Mode semantics, keys `cookie_consent_analytics` + `vc_notifications`) loads on static and React pages; on yes it subscribes via `/api/push-subscribe` (and re-asks the browser on the next click if the yes was given where the browser could not ask). The in-account "Recevoir les notifications" box follows `showPushBox` in `src/lib/push-visibility.ts` (tested). Policy at `/cookies`. Why: no bundler on the static site.
- Feedback e-mails: `emailCourseFeedback` (`src/lib/feedback.functions.ts`) is fired in the background when the pre-exam survey is saved; it claims `course_feedback.emailed_at` once, builds the PDF and sends through `src/lib/gmail.server.ts`, which calls the Gmail API directly with the `GMAIL_CLIENT_ID`/`GMAIL_CLIENT_SECRET`/`GMAIL_REFRESH_TOKEN` secrets (no Lovable connector). Why: the owner self-hosts on Cloudflare, where the connector gateway is unavailable.
- Donations: every "Soutenir" link points to the `/don` server route (`src/routes/don.ts`), which reads the single `donation_settings` row (WhatsApp number + message, public read-only) and 302-redirects to a `wa.me` link built by `src/lib/donation.ts`; there is no donation page. Why: the owner changes the number/message in the database, not in code.
- Course photos: one image per course step at `public/formations/img/<courseId>-<intro|chapterId>.webp`, path from `stepImage` in `src/lib/formations/images.ts`, shown on the first intro page and first page of each chapter; `formations-images.test.ts` fails when a step lacks its file. Why: a new chapter must ship with its photo.
<!-- AGENT-MEMORY:END -->
