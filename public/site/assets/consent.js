/* VetoCare : fenêtre d'autorisation (mesure d'audience + notifications) et activation automatique
   des notifications. Chargé par toutes les pages du site (statiques et « Mon compte »).
   Les règles d'accord reprennent celles de src/lib/consent.ts (mêmes clés de stockage). */
(function () {
  if (window.vcConsent) return;
  var PURPOSES = { analytics: ["analytics_storage"] };
  var MAX_AGE_DAYS = { denied: 183, granted: 365 };
  var DAY_MS = 86400000;
  var NOTIFY_KEY = "vc_notifications";
  var CONSENT_COUNTRIES = "AT,BE,BG,HR,CY,CZ,DK,EE,FI,FR,DE,GR,HU,IE,IT,LV,LT,LU,MT,NL,PL,PT,RO,SK,SI,ES,SE,IS,LI,NO,GB,CH,RE,GP,MQ,GF,YT,MF,AX,CA".split(",");
  var region;
  var unsaved = {};

  function gtag() { if (typeof window.gtag === "function") window.gtag.apply(null, arguments); else (window.dataLayer = window.dataLayer || []).push(arguments); }
  function gpc() { return navigator.globalPrivacyControl === true; }

  function isConsentRequiredRegion() {
    if (!region) region = lookup();
    return region;
  }
  function lookup() {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var t = ctrl ? setTimeout(function () { ctrl.abort(); }, 2000) : null;
    return fetch("/cdn-cgi/trace", ctrl ? { signal: ctrl.signal } : {})
      .then(function (res) {
        if (!res.ok) return true;
        return res.text().then(function (trace) {
          var h = (trace.match(/^h=(.+)$/m) || [])[1];
          var host = h ? h.trim().toLowerCase().replace(/:\d+$/, "") : "";
          if (host !== location.hostname) return true;
          var c = (trace.match(/^loc=([A-Z0-9]{2})$/m) || [])[1];
          if (!c || c === "XX" || c === "T1") return true;
          return CONSENT_COUNTRIES.indexOf(c) >= 0;
        });
      })
      .catch(function () { return true; })
      .finally(function () { if (t) clearTimeout(t); });
  }

  function storedAnswer(p) {
    if (unsaved[p]) return { choice: unsaved[p], stale: false };
    try {
      var s = JSON.parse(localStorage.getItem("cookie_consent_" + p) || "null");
      if (!s || (s.choice !== "granted" && s.choice !== "denied") || typeof s.at !== "number") return null;
      return { choice: s.choice, stale: Date.now() - s.at >= MAX_AGE_DAYS[s.choice] * DAY_MS };
    } catch (e) { return null; }
  }
  function storedChoice(p) {
    var a = storedAnswer(p);
    return a && !(a.stale && a.choice === "granted") ? a.choice : null;
  }
  function readChoice(p) { return gpc() ? "denied" : storedChoice(p); }
  function canTrack(p) {
    var c = readChoice(p);
    if (c !== null) return Promise.resolve(c === "granted");
    return isConsentRequiredRegion().then(function (req) {
      var l = readChoice(p);
      return l !== null ? l === "granted" : !req;
    });
  }
  function applySignals(p, choice) {
    if (!PURPOSES[p]) return;
    if (gpc()) choice = "denied";
    var u = {};
    PURPOSES[p].forEach(function (s) { u[s] = choice; });
    gtag("consent", "update", u);
  }
  function restoreChoices(list) {
    list.forEach(function (p) {
      var c = readChoice(p);
      if (c) return applySignals(p, c);
      isConsentRequiredRegion().then(function (req) { if (readChoice(p) === null) applySignals(p, req ? "denied" : "granted"); });
    });
  }
  function saveChoices(choices) {
    Object.keys(choices).forEach(function (p) {
      if (!PURPOSES[p]) return;
      var choice = choices[p];
      try {
        localStorage.setItem("cookie_consent_" + p, JSON.stringify({ choice: choice, at: Date.now() }));
        if (choice === "denied" && localStorage.getItem("cookie_consent") !== null) localStorage.setItem("cookie_consent", "denied");
        delete unsaved[p];
      } catch (e) { unsaved[p] = choice; }
      applySignals(p, readChoice(p) || choice);
    });
    window.dispatchEvent(new Event("consent-change"));
  }
  function needsAnswer(list) {
    return isConsentRequiredRegion().then(function (req) {
      return req && !gpc() && list.some(function (p) { var a = storedAnswer(p); return a ? a.stale : true; });
    });
  }
  window.addEventListener("storage", function (e) {
    if (e.key === null || e.key === "cookie_consent_analytics") { delete unsaved.analytics; restoreChoices(["analytics"]); }
  });

  /* ---------- Notifications ---------- */
  function notifyChoice() {
    try { var s = JSON.parse(localStorage.getItem(NOTIFY_KEY) || "null"); return s && (s.choice === "granted" || s.choice === "denied") ? s.choice : null; } catch (e) { return null; }
  }
  function saveNotify(choice) { try { localStorage.setItem(NOTIFY_KEY, JSON.stringify({ choice: choice, at: Date.now() })); } catch (e) {} }
  var pushSupported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  var framed = window.top !== window.self;

  function sessionToken() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || !/^sb-.+-auth-token$/.test(k)) continue;
        var s = JSON.parse(localStorage.getItem(k) || "null");
        var cur = s && (s.access_token ? s : s.currentSession);
        if (cur && cur.access_token && (!cur.expires_at || cur.expires_at * 1000 > Date.now() + 30000)) return cur.access_token;
      }
    } catch (e) {}
    return null;
  }
  function keyBytes(b64u) {
    var s = atob(b64u.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64u.length + 3) % 4));
    return Uint8Array.from(s, function (c) { return c.charCodeAt(0); });
  }
  /* Abonne cet appareil sans rien demander : seulement si la personne a dit oui et que le navigateur l'autorise déjà. */
  function autoSubscribe() {
    if (!pushSupported || framed || notifyChoice() !== "granted" || Notification.permission !== "granted") return Promise.resolve(false);
    var token = sessionToken();
    if (!token) return Promise.resolve(false);
    return navigator.serviceWorker.getRegistration("/push-sw/")
      .then(function (reg) { return reg || navigator.serviceWorker.register("/push-sw.js", { scope: "/push-sw/" }); })
      .then(function (reg) {
        return reg.pushManager.getSubscription().then(function (sub) {
          if (sub) return sub;
          return fetch("/api/push-subscribe").then(function (r) { return r.json(); }).then(function (d) {
            return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(d.publicKey) });
          });
        });
      })
      .then(function (sub) {
        var j = sub.toJSON();
        var tz = "Africa/Kinshasa";
        try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch (e) {}
        return fetch("/api/push-subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
          body: JSON.stringify({ endpoint: j.endpoint, keys: j.keys, time_zone: tz }),
        }).then(function (r) { return r.ok; });
      })
      .catch(function () { return false; });
  }
  /* À appeler pendant un clic : le navigateur n'affiche sa question qu'à ce moment-là. */
  function askNotifications() {
    if (!pushSupported || framed) return Promise.resolve();
    var p = Notification.permission === "default" ? Notification.requestPermission() : Promise.resolve(Notification.permission);
    return Promise.resolve(p).then(function () { return autoSubscribe(); });
  }

  /* ---------- Fenêtre ---------- */
  var css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "/site/assets/consent.css";
  document.head.appendChild(css);

  var root, lastFocus;
  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
  function close() { if (root) { root.remove(); root = null; } if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); }
  function notifyNote() {
    if (framed) return "Ouvrez VetoCare dans son propre onglet pour que le téléphone vous le demande.";
    if (!pushSupported) return /iphone|ipad|ipod/i.test(navigator.userAgent) ? "Sur iPhone, ajoutez d’abord VetoCare à l’écran d’accueil." : "Ce navigateur ne reçoit pas les notifications.";
    if (Notification.permission === "denied") return "Elles sont bloquées dans les réglages du navigateur.";
    return "Votre téléphone vous demandera de confirmer.";
  }

  function decide(analytics, notify) {
    saveChoices({ analytics: analytics });
    saveNotify(notify);
    var ask = notify === "granted" ? askNotifications() : Promise.resolve();
    close();
    return ask;
  }

  function open(settings) {
    if (root) close();
    lastFocus = document.activeElement;
    var a = readChoice("analytics") === "granted";
    var n = notifyChoice() === "granted";
    root = el(
      '<section class="vc-cb' + (location.pathname.indexOf("/site/") === 0 ? " vc-cb-tabs" : "") + '" role="dialog" aria-modal="false" aria-labelledby="vc-cb-t" tabindex="-1">' +
        '<p class="vc-cb-t" id="vc-cb-t">Vos choix sur VetoCare</p>' +
        '<p class="vc-cb-p">Nous comptons les visites sans cookies. Si vous acceptez, nous mesurons aussi les clics. ' +
        'Vous pouvez aussi recevoir sur votre téléphone les rappels de soins et d’objectifs. ' +
        '<a href="/cookies">Politique de cookies</a></p>' +
        '<div class="vc-cb-set" hidden>' +
          '<div class="vc-cb-row"><div><b>Nécessaires</b><small>Connexion, mode sombre, vos choix. Toujours actifs.</small></div><span class="vc-cb-on">Toujours</span></div>' +
          '<label class="vc-cb-row"><div><b>Mesure d’audience, fournie par Lovable</b><small>' + (gpc() ? "Votre navigateur demande de ne pas être suivi : ce choix reste désactivé." : "Les clics sur les boutons et les liens.") + '</small></div>' +
            '<input type="checkbox" class="vc-cb-sw" data-k="analytics"' + (a && !gpc() ? " checked" : "") + (gpc() ? " disabled" : "") + '></label>' +
          '<label class="vc-cb-row"><div><b>Notifications sur ce téléphone</b><small>Rappels de soins et d’objectifs. ' + notifyNote() + '</small></div>' +
            '<input type="checkbox" class="vc-cb-sw" data-k="notify"' + (n ? " checked" : "") + '></label>' +
          '<button type="button" class="vc-cb-b vc-cb-pri" data-a="save">Enregistrer mes choix</button>' +
        '</div>' +
        '<div class="vc-cb-act">' +
          '<button type="button" class="vc-cb-b vc-cb-pri" data-a="all">Tout accepter</button>' +
          '<button type="button" class="vc-cb-b vc-cb-pri" data-a="none">Tout refuser</button>' +
          '<button type="button" class="vc-cb-b vc-cb-link" data-a="settings">Paramètres des cookies</button>' +
        '</div>' +
      '</section>'
    );
    document.body.appendChild(root);
    var set = root.querySelector(".vc-cb-set");
    var showSettings = function () { set.hidden = false; root.querySelector('[data-a="settings"]').hidden = true; };
    if (settings) showSettings();
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-a]");
      if (!b) return;
      var act = b.getAttribute("data-a");
      if (act === "all") decide("granted", "granted");
      else if (act === "none") decide("denied", "denied");
      else if (act === "settings") showSettings();
      else if (act === "save") {
        var aOn = root.querySelector('[data-k="analytics"]').checked;
        var nOn = root.querySelector('[data-k="notify"]').checked;
        decide(aOn ? "granted" : "denied", nOn ? "granted" : "denied");
      }
    });
    root.addEventListener("keydown", function (e) { if (e.key === "Escape" && !set.hidden) close(); });
    root.focus({ preventScroll: true });
  }

  function needsNotifyAnswer() { return notifyChoice() === null; }

  /* Oui déjà donné mais le navigateur n'a pas encore posé sa question (ex. réponse donnée dans l'aperçu) :
     on la pose au prochain clic sur la page, une seule fois. */
  function askOnNextClick() {
    if (!pushSupported || framed || notifyChoice() !== "granted" || Notification.permission !== "default") return;
    var once = function () {
      document.removeEventListener("click", once, true);
      if (notifyChoice() === "granted" && Notification.permission === "default") askNotifications();
    };
    document.addEventListener("click", once, true);
  }

  function start() {
    restoreChoices(["analytics"]);
    needsAnswer(["analytics"]).then(function (need) { if (need || needsNotifyAnswer()) open(false); });
    autoSubscribe();
    askOnNextClick();
    document.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-cookie-settings]");
      if (b) { e.preventDefault(); open(true); }
    });
  }

  window.vcConsent = {
    readChoice: readChoice,
    canTrack: canTrack,
    saveChoices: saveChoices,
    needsAnswer: needsAnswer,
    open: function () { open(true); },
    notifyChoice: notifyChoice,
    saveNotify: saveNotify,
    autoSubscribe: autoSubscribe,
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else setTimeout(start, 0);
})();
