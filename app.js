document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  // ------------------------------------------
  // CONFIGURATION
  // ------------------------------------------

  const FREE_EMAIL_LIMIT = 100;
  const WINDOW_MS = 24 * 60 * 60 * 1000;

  const COUNTER_KEY = "email_counter";
  const RESET_KEY = "last_reset_time";

  const OWNER_KEY = "cle_secrete_proprietaire";
  const OWNER_SECRET = "MonCodeSuperSecret123!";

  const PAYMENT_URL =
    "https://emailcheckpro.lemonsqueezy.com/checkout/buy/cf58e559-a415-4635-addd-53987ffede12";

  const emailRegex =
    /^(?=.{1,254}$)(?=.{1,64}@)[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.(?:[A-Za-z]{2,63}|xn--[A-Za-z0-9-]{2,59})$/;

  const knownTypos = {
    "gamil.com": "gmail.com",
    "gamil.cm": "gmail.com",
    "gmial.com": "gmail.com",
    "gmail.con": "gmail.com",
    "gmai.com": "gmail.com",
    "yaho.com": "yahoo.com",
    "yahoo.con": "yahoo.com",
    "hotmial.com": "hotmail.com",
    "outlok.com": "outlook.com"
  };

  const fallbackDisposableDomains = [
    "yopmail.com",
    "yopmail.fr",
    "tempmail.com",
    "temp-mail.org",
    "guerrillamail.com",
    "mailinator.com",
    "10minutemail.com",
    "throwawaymail.com",
    "getnada.com"
  ];

  let disposableDomains = new Set(fallbackDisposableDomains);

  let validEmails = [];
  let invalidEmails = [];
  let isProcessing = false;

  // ------------------------------------------
  // ELEMENTS HTML
  // ------------------------------------------

  const emailInput = document.getElementById("emailInput");
  const btnVerify = document.getElementById("btnVerify");
  const btnClear = document.getElementById("btnClear");
  const btnCopyValid = document.getElementById("btnCopyValid");
  const btnCopyInvalid = document.getElementById("btnCopyInvalid");
  const btnExportTxt = document.getElementById("btnExportTxt");
  const btnExportCsv = document.getElementById("btnExportCsv");
  const btnUpgrade = document.getElementById("btnUpgrade");

  const statsSection = document.getElementById("statsSection");
  const resultSection = document.getElementById("resultSection");
  const validPercentage = document.getElementById("validPercentage");
  const progressBar = document.getElementById("progressBar");
  const totalInfo = document.getElementById("totalInfo");
  const validCount = document.getElementById("validCount");
  const invalidCount = document.getElementById("invalidCount");
  const validList = document.getElementById("validList");
  const invalidList = document.getElementById("invalidList");
  const statusMessage = document.getElementById("statusMessage");
  const quotaInfo = document.getElementById("quotaInfo");

  // ------------------------------------------
  // MODE PROPRIÉTAIRE
  // ------------------------------------------

  function isOwner() {
    return localStorage.getItem(OWNER_KEY) === OWNER_SECRET;
  }

  // IMPORTANT :
  // Ce mode est seulement un raccourci local.
  // Il n'est pas sécurisé : un utilisateur peut
  // lire le code et modifier son localStorage.
  // La route DNS conserve sa limite par requête.

  // ------------------------------------------
  // QUOTA GRATUIT : 100 ADRESSES / 24 H
  // ------------------------------------------

  function initializeFreeLimit() {
    const now = Date.now();

    let counter = Number(localStorage.getItem(COUNTER_KEY));
    let resetTime = Number(localStorage.getItem(RESET_KEY));

    if (!Number.isFinite(counter) || counter < 0) {
      counter = 0;
    }

    if (!Number.isFinite(resetTime) || resetTime <= 0) {
      resetTime = now;
      counter = 0;
      localStorage.setItem(COUNTER_KEY, "0");
      localStorage.setItem(RESET_KEY, String(resetTime));
    }

    if (now - resetTime >= WINDOW_MS) {
      counter = 0;
      resetTime = now;
      localStorage.setItem(COUNTER_KEY, "0");
      localStorage.setItem(RESET_KEY, String(resetTime));
    }

    return { counter, resetTime };
  }

  function saveUsage(counter, resetTime) {
    localStorage.setItem(COUNTER_KEY, String(counter));
    localStorage.setItem(RESET_KEY, String(resetTime));
  }

  function updateQuotaDisplay() {
    if (isOwner()) {
      quotaInfo.textContent =
        "Mode propriétaire local activé. Ce mode n'est pas une protection sécurisée.";
      return;
    }

    const usage = initializeFreeLimit();
    const remaining = Math.max(0, FREE_EMAIL_LIMIT - usage.counter);
    const resetDate = new Date(usage.resetTime + WINDOW_MS);

    quotaInfo.textContent =
      `Utilisation : ${usage.counter}/${FREE_EMAIL_LIMIT}. ` +
      `Restant : ${remaining}. Réinitialisation après : ` +
      resetDate.toLocaleString();
  }

  function showPaywall() {
    statusMessage.textContent =
      "Limite gratuite atteinte. Débloque l'accès pour continuer.";

    const shouldOpen = window.confirm(
      "Tu as atteint la limite gratuite de 100 e-mails sur 24 heures. " +
      "Veux-tu ouvrir la page de paiement ?"
    );

    if (shouldOpen) {
      window.open(PAYMENT_URL, "_blank", "noopener,noreferrer");
    }
  }

  // ------------------------------------------
  // CHARGEMENT DE LA LISTE DES DOMAINES JETABLES
  // ------------------------------------------

  async function loadDisposableDomains() {
    try {
      const response = await fetch("./data/disposable-domains.json");

      if (!response.ok) {
        throw new Error("Liste locale indisponible");
      }

      const domains = await response.json();

      if (Array.isArray(domains)) {
        disposableDomains = new Set([
          ...fallbackDisposableDomains,
          ...domains
        ].map((domain) => String(domain).trim().toLowerCase()));
      }
    } catch (error) {
      // Le tableau de secours reste disponible.
      console.warn("Utilisation de la liste jetable intégrée.");
    }
  }

  // ------------------------------------------
  // LECTURE DE LA LISTE FOURNIE
  // ------------------------------------------

  function getEmailsFromInput() {
    return emailInput.value
      .split(/[\n,;]+/)
      .map((email) => email.trim())
      .filter(Boolean);
  }

  // ------------------------------------------
  // SYNTAXE ET RAISONS DE REJET
  // ------------------------------------------

  function getSyntaxReason(email) {
    if ((email.match(/@/g) || []).length > 1) {
      return "Plusieurs caractères @";
    }

    if (!email.includes("@")) {
      return "Caractère @ manquant";
    }

    const parts = email.split("@");

    if (!parts[0] || !parts[1]) {
      return "Partie avant ou après @ manquante";
    }

    if (!/\.[A-Za-z]{2,63}$/.test(email)) {
      return "Extension manquante ou incorrecte";
    }

    if (email.includes("..")) {
      return "Points consécutifs interdits";
    }

    return "Syntaxe incorrecte";
  }

  function classifyInput(emails) {
    const uniqueEmails = [];
    const rejected = [];
    const seen = new Set();

    for (const originalEmail of emails) {
      const email = originalEmail.trim();
      const normalized = email.toLowerCase();

      if (!emailRegex.test(email)) {
        rejected.push({
          email,
          reason: getSyntaxReason(email),
          status: "invalid"
        });
        continue;
      }

      const domain = normalized.split("@")[1];

      if (knownTypos[domain]) {
        rejected.push({
          email,
          reason: `Domaine suspect. Vérifie si tu voulais écrire ${knownTypos[domain]}.`,
          status: "invalid"
        });
        continue;
      }

      if (disposableDomains.has(domain)) {
        rejected.push({
          email,
          reason: "Domaine e-mail jetable connu",
          status: "invalid"
        });
        continue;
      }

      if (seen.has(normalized)) {
        rejected.push({
          email,
          reason: "Doublon supprimé",
          status: "invalid"
        });
        continue;
      }

      seen.add(normalized);
      uniqueEmails.push(email);
    }

    return { uniqueEmails, rejected };
  }

  // ------------------------------------------
  // VÉRIFICATION DNS VIA LA ROUTE VERCEL
  // ------------------------------------------

  async function verifyEmailsWithDNS(emails) {
    const allResults = [];

    // La route accepte au maximum 100 adresses par requête.
    for (let start = 0; start < emails.length; start += 100) {
      const batch = emails.slice(start, start + 100);

      const response = await fetch("/api/check-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ emails: batch })
      });

      if (!response.ok) {
        throw new Error(
          "La vérification DNS a échoué. Vérifie le déploiement Vercel."
        );
      }

      const data = await response.json();

      if (!Array.isArray(data.results)) {
        throw new Error("Réponse DNS invalide.");
      }

      allResults.push(...data.results);
    }

    return allResults;
  }

  // ------------------------------------------
  // AFFICHAGE SÉCURISÉ DES LISTES
  // ------------------------------------------

  function renderValidEmails(emails) {
    validList.replaceChildren();

    for (const email of emails) {
      const li = document.createElement("li");
      li.dataset.email = email;
      li.textContent = email;
      validList.appendChild(li);
    }
  }

  function renderInvalidEmails(items) {
    invalidList.replaceChildren();

    for (const item of items) {
      const li = document.createElement("li");
      const address = document.createElement("span");
      const reason = document.createElement("small");

      address.textContent = item.email;
      reason.className = "reason";
      reason.textContent = item.reason;

      li.append(address, reason);
      invalidList.appendChild(li);
    }
  }

  function renderStats(total) {
    const good = validEmails.length;
    const rejected = invalidEmails.length;
    const percentage = total === 0 ? 0 : Math.round((good / total) * 100);

    totalInfo.textContent = String(total);
    validCount.textContent = String(good);
    invalidCount.textContent = String(rejected);
    validPercentage.textContent = `${percentage}%`;
    progressBar.style.width = `${percentage}%`;

    statsSection.hidden = false;
    resultSection.hidden = false;
  }

  // ------------------------------------------
  // VÉRIFICATION PRINCIPALE
  // ------------------------------------------

  async function verifyEmails() {
    if (isProcessing) return;

    const submittedEmails = getEmailsFromInput();

    if (submittedEmails.length === 0) {
      statusMessage.textContent = "Colle d'abord des adresses e-mail.";
      return;
    }

    const ownerMode = isOwner();
    let usage = null;

    // Le quota compte toutes les adresses non vides soumises,
    // avant la suppression des doublons.
    if (!ownerMode) {
      usage = initializeFreeLimit();

      if (usage.counter + submittedEmails.length > FREE_EMAIL_LIMIT) {
        showPaywall();
        updateQuotaDisplay();
        return;
      }
    }

    isProcessing = true;
    btnVerify.disabled = true;
    btnVerify.textContent = "Vérification en cours...";
    statusMessage.textContent =
      "Contrôle de la syntaxe, des doublons, des domaines et des enregistrements DNS...";

    try {
      await loadDisposableDomains();

      const classified = classifyInput(submittedEmails);
      const syntaxRejected = classified.rejected;

      let dnsResults;

      try {
        dnsResults = await verifyEmailsWithDNS(classified.uniqueEmails);
      } catch (dnsError) {
        // Si le serveur DNS ne répond pas, ne prétends pas
        // que les adresses ont été vérifiées.
        validEmails = [];
        invalidEmails = [
          ...syntaxRejected,
          ...classified.uniqueEmails.map((email) => ({
            email,
            reason: "Résultat inconnu : vérification DNS indisponible",
            status: "unknown"
          }))
        ];

        renderValidEmails(validEmails);
        renderInvalidEmails(invalidEmails);
        renderStats(classified.uniqueEmails.length + syntaxRejected.length);

        statusMessage.textContent =
          "La vérification DNS n'a pas abouti. Les adresses non vérifiées " +
          "ne sont pas déclarées valides. Vérifie que la route API est déployée.";

        return;
      }

      validEmails = [];
      invalidEmails = [...syntaxRejected];

      for (const result of dnsResults) {
        if (result.status === "valid") {
          validEmails.push(result.email);
        } else {
          invalidEmails.push({
            email: result.email,
            reason: result.reason || "Vérification impossible",
            status: result.status || "unknown"
          });
        }
      }

      renderValidEmails(validEmails);
      renderInvalidEmails(invalidEmails);
      renderStats(classified.uniqueEmails.length + syntaxRejected.length);

      statusMessage.textContent =
        `Terminé : ${validEmails.length} adresse(s) retenue(s), ` +
        `${invalidEmails.length} adresse(s) rejetée(s) ou à vérifier.`;

      // Enregistrer le quota après le traitement.
      if (!ownerMode && usage) {
        saveUsage(
          usage.counter + submittedEmails.length,
          usage.resetTime
        );
      }
    } catch (error) {
      console.error(error);
      statusMessage.textContent =
        "Une erreur est survenue pendant le traitement. Réessaie.";
    } finally {
      isProcessing = false;
      btnVerify.disabled = false;
      btnVerify.textContent = "Vérifier les e-mails";
      updateQuotaDisplay();
    }
  }

  // ------------------------------------------
  // COPIE D'UNE LISTE
  // ------------------------------------------

  async function copyText(text, emptyMessage, successMessage) {
    if (!text.trim()) {
      statusMessage.textContent = emptyMessage;
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      statusMessage.textContent = successMessage;
    } catch (error) {
      statusMessage.textContent =
        "Copie impossible. Vérifie les permissions du navigateur.";
    }
  }

  btnCopyValid.addEventListener("click", () => {
    copyText(
      validEmails.join("\n"),
      "Aucun e-mail valide à copier.",
      `${validEmails.length} e-mail(s) valide(s) copié(s).`
    );
  });

  btnCopyInvalid.addEventListener("click", () => {
    copyText(
      invalidEmails.map((item) => item.email).join("\n"),
      "Aucun e-mail rejeté à copier.",
      `${invalidEmails.length} résultat(s) copié(s).`
    );
  });

  // ------------------------------------------
  // EXPORT TXT
  // ------------------------------------------

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  btnExportTxt.addEventListener("click", () => {
    downloadFile(
      "emails-valides.txt",
      validEmails.join("\n"),
      "text/plain;charset=utf-8"
    );
  });

  // ------------------------------------------
  // EXPORT CSV
  // ------------------------------------------

  function escapeCsv(value) {
    return `"${String(value).replace(/"/g, '""')}"`;
  }

  btnExportCsv.addEventListener("click", () => {
    const rows = [
      ["Email", "Statut", "Raison"],
      ...validEmails.map((email) => [
        email,
        "Retenu",
        "Syntaxe et contrôle DNS réussis"
      ]),
      ...invalidEmails.map((item) => [
        item.email,
        item.status || "invalid",
        item.reason
      ])
    ];

    const csv = rows
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n");

    downloadFile(
      "rapport-emailcheckpro.csv",
      "\uFEFF" + csv,
      "text/csv;charset=utf-8"
    );
  });

  // ------------------------------------------
  // EFFACER : NE TOUCHE PAS AU QUOTA
  // ------------------------------------------

  btnClear.addEventListener("click", () => {
    emailInput.value = "";
    validEmails = [];
    invalidEmails = [];

    validList.replaceChildren();
    invalidList.replaceChildren();

    statsSection.hidden = true;
    resultSection.hidden = true;
    statusMessage.textContent = "";

    updateQuotaDisplay();
  });

  // ------------------------------------------
  // PAIEMENT
  // ------------------------------------------

  btnUpgrade.addEventListener("click", () => {
    window.open(PAYMENT_URL, "_blank", "noopener,noreferrer");
  });

  // ------------------------------------------
  // INITIALISATION
  // ------------------------------------------

  if (!isOwner()) {
    initializeFreeLimit();
  }

  updateQuotaDisplay();
});