/** Fenêtre d'autorisation partagée (public/site/assets/consent.js), présente sur toutes les pages. */
interface Window {
  vcConsent?: {
    open: () => void;
    saveNotify: (choice: "granted" | "denied") => void;
    notifyChoice: () => "granted" | "denied" | null;
  };
}
