
document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  // =========================================================
  // CONFIGURATION
  // =========================================================

  const PAYMENT_URL =
    "https://emailcheckpro.lemonsqueezy.com/checkout/buy/cf58e559-a415-4635-addd-53987ffede12";

  const FREE_EMAIL_LIMIT = 100;
  const RESET_INTERVAL = 24 * 60 * 60 * 1000;

  const COUNTER_KEY = "email_counter";
  const RESET_TIME_KEY = "last_reset_time";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // =========================================================
  // ÉLÉMENTS HTML
  // =========================================================

  const emailInput = document.querySelector("#emailInput");
  const btnVerify = document.querySelector("#btnVerify");
  const btnClear = document.querySelector("#btnClear");

  const statsSection = document.querySelector("#statsSection");
  const validPercentage = document.querySelector("#validPercentage");
  const progressBar = document.querySelector("#progressBar");
  const totalInfo = document.querySelector("#totalInfo");

  const resultSection = document.querySelector("#resultSection");

  const validCount = document.querySelector("#validCount");
  const validList = document.querySelector("#validList");

  const invalidCount = document.querySelector("#invalidCount");
  const invalidList = document.querySelector("#invalidList");

  const btnExportTxt = document.querySelector("#btnExportTxt");
  const btnExportCsv = document.querySelector("#btnExportCsv");
  const btnCopyInvalid = document.querySelector("#btnCopyInvalid");

  const statusMessage = document.querySelector("#statusMessage");

  // =========================================================
  // VÉRIFICATION DES ÉLÉMENTS HTML
  // =========================================================

  const requiredElements = [
    emailInput,
    btnVerify,
    btnClear,
    statsSection,
    validPercentage,
    progressBar,
    totalInfo,
    resultSection,
    validCount,
    validList,
    invalidCount,
    invalidList,
    btnExportTxt,
    btnExportCsv,
    btnCopyInvalid,
    statusMessage
  ];

  for (let i = 0; i < requiredElements.length; i++) {
    if (!requiredElements[i]) {
      console.error(
        "Email Cleaner : un élément HTML requis est introuvable. Vérifie les identifiants dans index.html."
      );
      return;
    }
  }

  // =========================================================
  // DONNÉES
  // =========================================================

  let validEmails = [];
  let invalidEmails = [];

  // =========================================================
  // LOCALSTORAGE : COMPTEUR ET RÉINITIALISATION
  // =========================================================

  function getStoredCounter() {
    const value = localStorage.getItem(COUNTER_KEY);

    if (value === null || value.trim() === "") {
      return 0;
    }

    const counter = Number(value);

    if (
      !Number.isFinite(counter) ||
      !Number.isInteger(counter) ||
      counter < 0
    ) {
      return 0;
    }

    return counter;
  }

  function getStoredResetTime() {
    const value = localStorage.getItem(RESET_TIME_KEY);

    if (value === null || value.trim() === "") {
      return null;
    }

    const timestamp = Number(value);

    if (
      !Number.isFinite(timestamp) ||
      !Number.isInteger(timestamp) ||
      timestamp <= 0
    ) {
      return null;
    }

    return timestamp;
  }

  function initializeFreeLimit() {
    const now = Date.now();

    const lastResetTime = getStoredResetTime();
    const counter = getStoredCounter();

    // Première utilisation ou timestamp invalide.
    if (lastResetTime === null) {
      localStorage.setItem(COUNTER_KEY, "0");
      localStorage.setItem(RESET_TIME_KEY, String(now));

      return {
        counter: 0,
        resetTime: now
      };
    }

    // Réinitialisation après 24 heures.
    if (
      now < lastResetTime ||
      now - lastResetTime >= RESET_INTERVAL
    ) {
      localStorage.setItem(COUNTER_KEY, "0");
      localStorage.setItem(RESET_TIME_KEY, String(now));

      return {
        counter: 0,
        resetTime: now
      };
    }

    // Corriger un compteur absent ou invalide.
    const safeCounter = Math.min(counter, FREE_EMAIL_LIMIT);

    localStorage.setItem(
      COUNTER_KEY,
      String(safeCounter)
    );

    return {
      counter: safeCounter,
      resetTime: lastResetTime
    };
  }

  function saveUsage(counter, resetTime) {
    localStorage.setItem(COUNTER_KEY, String(counter));
    localStorage.setItem(RESET_TIME_KEY, String(resetTime));
  }

  // =========================================================
  // PAYWALL LEMON SQUEEZY
  // =========================================================

  function showPaywall(currentUsage, requestedCount) {
    const remaining = Math.max(
      0,
      FREE_EMAIL_LIMIT - currentUsage
    );

    const message =
      "Limite gratuite atteinte !\n\n" +
      "Votre quota est de " +
      FREE_EMAIL_LIMIT +
      " e-mails par période de 24 heures.\n\n" +
      "E-mails déjà analysés : " +
      currentUsage +
      "\n" +
      "E-mails dans cette demande : " +
      requestedCount +
      "\n" +
      "E-mails encore disponibles : " +
      remaining +
      "\n\n" +
      "Voulez-vous ouvrir la page de paiement ?";

    statusMessage.textContent =
      "Analyse bloquée : limite gratuite dépassée.";

    if (window.confirm(message)) {
      window.location.href = PAYMENT_URL;
    }
  }

  // =========================================================
  // EXTRACTION DES E-MAILS
  // =========================================================

  function getEmailsFromInput() {
    return emailInput.value
      .split(/[\n,;]+/)
      .map(function (email) {
        return email.trim();
      })
      .filter(function (email) {
        return email.length > 0;
      });
  }

  // =========================================================
  // SUPPRESSION DES DOUBLONS
  // =========================================================

  function removeDuplicates(emails) {
    const seen = {};
    const uniqueEmails = [];

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      const normalized = email.toLowerCase();

      if (!Object.prototype.hasOwnProperty.call(seen, normalized)) {
        seen[normalized] = true;
        uniqueEmails.push(email);
      }
    }

    return uniqueEmails;
  }

  // =========================================================
  // VALIDATION
  // =========================================================

  function isValidEmail(email) {
    return emailRegex.test(email);
  }

  // =========================================================
  // AFFICHAGE DES LISTES
  // =========================================================

  function renderEmailList(container, emails, emptyMessage) {
    container.innerHTML = "";

    if (emails.length === 0) {
      const item = document.createElement("li");

      item.className = "empty-message";
      item.textContent = emptyMessage;

      container.appendChild(item);
      return;
    }

    for (let i = 0; i < emails.length; i++) {
      const item = document.createElement("li");

      // textContent empêche l'interprétation du contenu comme HTML.
      item.textContent = emails[i];

      container.appendChild(item);
    }
  }

  // =========================================================
  // STATISTIQUES
  // =========================================================

  function updateStatistics(total) {
    let percentage = 0;

    if (total > 0) {
      percentage = (validEmails.length / total) * 100;
    }

    const roundedPercentage = Math.round(percentage * 10) / 10;

    validPercentage.textContent = roundedPercentage + "%";
    progressBar.style.width = roundedPercentage + "%";

    const progressTrack = progressBar.parentElement;

    if (progressTrack) {
      progressTrack.setAttribute(
        "aria-valuenow",
        String(roundedPercentage)
      );
    }

    if (total === 1) {
      totalInfo.textContent = "1 e-mail analysé";
    } else {
      totalInfo.textContent = total + " e-mails analysés";
    }
  }

  function updateResults(total) {
    validCount.textContent = String(validEmails.length);
    invalidCount.textContent = String(invalidEmails.length);

    renderEmailList(
      validList,
      validEmails,
      "Aucun e-mail valide."
    );

    renderEmailList(
      invalidList,
      invalidEmails,
      "Aucun e-mail invalide."
    );

    updateStatistics(total);

    statsSection.style.display = "block";
    resultSection.style.display = "block";
  }

  // =========================================================
  // VÉRIFICATION PRINCIPALE
  // =========================================================

  function verifyEmails() {
    let inputEmails;

    // Vérifier le stockage avant de consommer le quota.
    try {
      inputEmails = getEmailsFromInput();

      if (inputEmails.length === 0) {
        statusMessage.textContent =
          "Veuillez saisir au moins une adresse e-mail.";
        return;
      }

      const usage = initializeFreeLimit();
      const currentCounter = usage.counter;
      const resetTime = usage.resetTime;
      const requestedCount = inputEmails.length;

      // Refuser toute demande qui dépasse le quota restant.
      if (
        currentCounter + requestedCount >
        FREE_EMAIL_LIMIT
      ) {
        showPaywall(currentCounter, requestedCount);
        return;
      }

      // Nettoyer et classer les adresses.
      const uniqueEmails = removeDuplicates(inputEmails);
      const newValidEmails = [];
      const newInvalidEmails = [];

      for (let i = 0; i < uniqueEmails.length; i++) {
        const email = uniqueEmails[i];

        if (isValidEmail(email)) {
          newValidEmails.push(email);
        } else {
          newInvalidEmails.push(email);
        }
      }

      // Le quota compte chaque entrée non vide, doublons inclus.
      const newCounter = currentCounter + requestedCount;

      saveUsage(newCounter, resetTime);

      // Publier les résultats après l'enregistrement du quota.
      validEmails = newValidEmails;
      invalidEmails = newInvalidEmails;

      updateResults(uniqueEmails.length);

      statusMessage.textContent =
        uniqueEmails.length +
        " adresse(s) unique(s) affichée(s). " +
        requestedCount +
        " e-mail(s) consommé(s). Quota : " +
        newCounter +
        "/" +
        FREE_EMAIL_LIMIT +
        ".";
    } catch (error) {
      console.error("Erreur pendant la vérification :", error);

      statusMessage.textContent =
        "Impossible de vérifier les e-mails. Vérifie que le stockage local de ton navigateur est activé.";
    }
  }

  // =========================================================
  // EFFACER L'INTERFACE
  // =========================================================

  function clearApplication() {
    emailInput.value = "";

    validEmails = [];
    invalidEmails = [];

    validCount.textContent = "0";
    invalidCount.textContent = "0";

    renderEmailList(
      validList,
      [],
      "Aucun résultat pour le moment."
    );

    renderEmailList(
      invalidList,
      [],
      "Aucun résultat pour le moment."
    );

    validPercentage.textContent = "0%";
    progressBar.style.width = "0%";

    const progressTrack = progressBar.parentElement;

    if (progressTrack) {
      progressTrack.setAttribute("aria-valuenow", "0");
    }

    totalInfo.textContent = "0 e-mail analysé";

    statsSection.style.display = "none";
    resultSection.style.display = "none";

    statusMessage.textContent = "";

    // Le bouton Effacer ne réinitialise jamais le quota.
    emailInput.focus();
  }

  // =========================================================
  // TÉLÉCHARGEMENT DE FICHIERS
  // =========================================================

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob(
      [content],
      {
        type: mimeType + ";charset=utf-8"
      }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  // =========================================================
  // EXPORT TXT
  // =========================================================

  function exportValidEmailsAsTxt() {
    if (validEmails.length === 0) {
      statusMessage.textContent =
        "Aucun e-mail valide à exporter.";
      return;
    }

    downloadFile(
      validEmails.join("\r\n"),
      "emails-valides.txt",
      "text/plain"
    );

    statusMessage.textContent =
      validEmails.length +
      " e-mail(s) valide(s) exporté(s) en TXT.";
  }

  // =========================================================
  // EXPORT CSV POUR EXCEL
  // =========================================================

  function escapeCsvCell(value) {
    const text = String(value);

    if (
      text.indexOf(",") !== -1 ||
      text.indexOf('"') !== -1 ||
      text.indexOf("\n") !== -1 ||
      text.indexOf("\r") !== -1
    ) {
      return '"' + text.replace(/"/g, '""') + '"';
    }

    return text;
  }

  function exportValidEmailsAsCsv() {
    if (validEmails.length === 0) {
      statusMessage.textContent =
        "Aucun e-mail valide à exporter.";
      return;
    }

    const rows = [escapeCsvCell("email")];

    for (let i = 0; i < validEmails.length; i++) {
      rows.push(escapeCsvCell(validEmails[i]));
    }

    const csvContent = "\uFEFF" + rows.join("\r\n");

    downloadFile(
      csvContent,
      "emails-valides.csv",
      "text/csv"
    );

    statusMessage.textContent =
      validEmails.length +
      " e-mail(s) valide(s) exporté(s) en CSV.";
  }

  // =========================================================
  // COPIER LES E-MAILS INVALIDES
  // =========================================================

  function copyInvalidEmails() {
    if (invalidEmails.length === 0) {
      statusMessage.textContent =
        "Aucun e-mail invalide à copier.";
      return;
    }

    const content = invalidEmails.join("\r\n");

    // API moderne du presse-papiers.
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(content)
        .then(function () {
          statusMessage.textContent =
            invalidEmails.length +
            " e-mail(s) invalide(s) copié(s).";
        })
        .catch(function () {
          fallbackCopy(content);
        });

      return;
    }

    fallbackCopy(content);
  }

  function fallbackCopy(content) {
    const temporaryTextarea = document.createElement("textarea");

    temporaryTextarea.value = content;
    temporaryTextarea.setAttribute("readonly", "");

    temporaryTextarea.style.position = "fixed";
    temporaryTextarea.style.left = "-9999px";
    temporaryTextarea.style.top = "0";

    document.body.appendChild(temporaryTextarea);

    temporaryTextarea.focus();
    temporaryTextarea.select();

    let copied = false;

    try {
      copied = document.execCommand("copy");
    } catch (error) {
      copied = false;
    }

    document.body.removeChild(temporaryTextarea);

    if (copied) {
      statusMessage.textContent =
        invalidEmails.length +
        " e-mail(s) invalide(s) copié(s).";
    } else {
      statusMessage.textContent =
        "Copie impossible. Sélectionne les adresses manuellement.";
    }
  }

  // =========================================================
  // ÉVÉNEMENTS
  // =========================================================

  btnVerify.addEventListener("click", verifyEmails);

  btnClear.addEventListener("click", clearApplication);

  btnExportTxt.addEventListener(
    "click",
    exportValidEmailsAsTxt
  );

  btnExportCsv.addEventListener(
    "click",
    exportValidEmailsAsCsv
  );

  btnCopyInvalid.addEventListener(
    "click",
    copyInvalidEmails
  );

  emailInput.addEventListener("keydown", function (event) {
    if (event.ctrlKey && event.key === "Enter") {
      event.preventDefault();
      verifyEmails();
    }
  });

  // =========================================================
  // INITIALISATION
  // =========================================================

  try {
    initializeFreeLimit();

    renderEmailList(
      validList,
      [],
      "Aucun résultat pour le moment."
    );

    renderEmailList(
      invalidList,
      [],
      "Aucun résultat pour le moment."
    );
  } catch (error) {
    console.error("Erreur LocalStorage :", error);

    statusMessage.textContent =
      "Le stockage local est indisponible. Active-le dans ton navigateur puis recharge la page.";

    btnVerify.disabled = true;
  }
});