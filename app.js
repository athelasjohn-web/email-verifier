"use strict";

document.addEventListener("DOMContentLoaded", () => {
  /*
   * ============================================================
   * RÉCUPÉRATION DES ÉLÉMENTS HTML
   * ============================================================
   */

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

  /*
   * ============================================================
   * DONNÉES DE L'APPLICATION
   * ============================================================
   */

  let validEmails = [];
  let invalidEmails = [];

  /*
   * ============================================================
   * REGEX DE VALIDATION
   * ============================================================
   *
   * Cette expression est volontairement utilisée exactement
   * comme demandé.
   */

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /*
   * ============================================================
   * FONCTION : RÉCUPÉRER ET NETTOYER LES E-MAILS
   * ============================================================
   */

  function getEmailsFromInput() {
    return emailInput.value
      .split(/[\n,;]+/)
      .map((email) => email.trim())
      .filter((email) => email.length > 0);
  }

  /*
   * ============================================================
   * FONCTION : SUPPRIMER LES DOUBLONS
   * ============================================================
   *
   * La comparaison des doublons est insensible à la casse.
   * Exemple :
   *
   * Test@Email.com
   * test@email.com
   *
   * seront considérés comme le même e-mail.
   */

  function removeDuplicates(emails) {
    const seen = new Set();
    const uniqueEmails = [];

    emails.forEach((email) => {
      const normalizedEmail = email.toLowerCase();

      if (!seen.has(normalizedEmail)) {
        seen.add(normalizedEmail);
        uniqueEmails.push(email);
      }
    });

    return uniqueEmails;
  }

  /*
   * ============================================================
   * FONCTION : VÉRIFIER UN E-MAIL
   * ============================================================
   */

  function isValidEmail(email) {
    return emailRegex.test(email);
  }

  /*
   * ============================================================
   * FONCTION : ÉCHAPPER LE HTML
   * ============================================================
   *
   * Les listes sont également générées avec textContent plus
   * bas. Cette fonction permet néanmoins d'avoir une fonction
   * d'échappement disponible pour les éventuels messages HTML.
   */

  function escapeHtml(value) {
    const div = document.createElement("div");

    div.textContent = value;

    return div.innerHTML;
  }

  /*
   * ============================================================
   * FONCTION : AFFICHER UNE LISTE
   * ============================================================
   */

  function renderEmailList(container, emails, emptyMessage) {
    container.innerHTML = "";

    if (emails.length === 0) {
      const emptyItem = document.createElement("li");

      emptyItem.className = "empty-message";
      emptyItem.textContent = emptyMessage;

      container.appendChild(emptyItem);

      return;
    }

    emails.forEach((email) => {
      const listItem = document.createElement("li");

      /*
       * textContent est utilisé plutôt que innerHTML afin que
       * le contenu saisi par l'utilisateur ne soit pas interprété
       * comme du HTML.
       */
      listItem.textContent = email;

      container.appendChild(listItem);
    });
  }

  /*
   * ============================================================
   * FONCTION : METTRE À JOUR LES STATISTIQUES
   * ============================================================
   */

  function updateStatistics(total) {
    const validTotal = validEmails.length;

    let percentage = 0;

    if (total > 0) {
      percentage = (validTotal / total) * 100;
    }

    const roundedPercentage = Number(percentage.toFixed(1));

    validPercentage.textContent = `${roundedPercentage}%`;

    progressBar.style.width = `${roundedPercentage}%`;

    const progressTrack = progressBar.parentElement;

    progressTrack.setAttribute(
      "aria-valuenow",
      String(roundedPercentage)
    );

    if (total === 0) {
      totalInfo.textContent = "0 e-mail analysé";
    } else if (total === 1) {
      totalInfo.textContent = "1 e-mail analysé";
    } else {
      totalInfo.textContent = `${total} e-mails analysés`;
    }
  }

  /*
   * ============================================================
   * FONCTION : METTRE À JOUR LES COMPTEURS ET LES LISTES
   * ============================================================
   */

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
  }

  /*
   * ============================================================
   * FONCTION : AFFICHER LES RÉSULTATS
   * ============================================================
   */

  function showResults() {
    statsSection.style.display = "block";
    resultSection.style.display = "block";
  }

  /*
   * ============================================================
   * FONCTION : VÉRIFICATION PRINCIPALE
   * ============================================================
   */

  function verifyEmails() {
    const inputEmails = getEmailsFromInput();

    /*
     * Si aucun e-mail n'a été saisi.
     */
    if (inputEmails.length === 0) {
      validEmails = [];
      invalidEmails = [];

      updateResults(0);
      showResults();

      statusMessage.textContent =
        "Veuillez saisir au moins une adresse e-mail.";

      return;
    }

    /*
     * Suppression des doublons avant la vérification.
     */
    const uniqueEmails = removeDuplicates(inputEmails);

    validEmails = [];
    invalidEmails = [];

    /*
     * Vérification de chaque adresse.
     */
    uniqueEmails.forEach((email) => {
      if (isValidEmail(email)) {
        validEmails.push(email);
      } else {
        invalidEmails.push(email);
      }
    });

    /*
     * Mise à jour de l'interface.
     */
    updateResults(uniqueEmails.length);
    showResults();

    const validTotal = validEmails.length;
    const invalidTotal = invalidEmails.length;

    statusMessage.textContent =
      `${uniqueEmails.length} e-mail(s) analysé(s) : ` +
      `${validTotal} valide(s), ${invalidTotal} invalide(s).`;
  }

  /*
   * ============================================================
   * FONCTION : RÉINITIALISER L'APPLICATION
   * ============================================================
   */

  function clearApplication() {
    emailInput.value = "";

    validEmails = [];
    invalidEmails = [];

    validCount.textContent = "0";
    invalidCount.textContent = "0";

    validList.innerHTML = "";
    invalidList.innerHTML = "";

    validPercentage.textContent = "0%";

    progressBar.style.width = "0%";

    progressBar.parentElement.setAttribute(
      "aria-valuenow",
      "0"
    );

    totalInfo.textContent = "0 e-mail analysé";

    statsSection.style.display = "none";
    resultSection.style.display = "none";

    statusMessage.textContent = "";

    emailInput.focus();
  }

  /*
   * ============================================================
   * FONCTION : TÉLÉCHARGER UN FICHIER
   * ============================================================
   */

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob(
      [content],
      {
        type: `${mimeType};charset=utf-8`
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);

    link.click();

    link.remove();

    /*
     * Libération de l'URL temporaire.
     */
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  }

  /*
   * ============================================================
   * FONCTION : EXPORT TXT
   * ============================================================
   */

  function exportValidEmailsAsTxt() {
    if (validEmails.length === 0) {
      statusMessage.textContent =
        "Aucun e-mail valide à exporter.";

      return;
    }

    const content = validEmails.join("\n");

    downloadFile(
      content,
      "emails-valides.txt",
      "text/plain"
    );

    statusMessage.textContent =
      `${validEmails.length} e-mail(s) valide(s) exporté(s) en TXT.`;
  }

  /*
   * ============================================================
   * FONCTION : ÉCHAPPER UNE CELLULE CSV
   * ============================================================
   */

  function escapeCsvCell(value) {
    const stringValue = String(value);

    /*
     * Si une cellule contient une virgule, un guillemet ou
     * un retour à la ligne, elle doit être entourée de guillemets.
     */

    if (
      stringValue.includes(",") ||
      stringValue.includes('"') ||
      stringValue.includes("\n") ||
      stringValue.includes("\r")
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  /*
   * ============================================================
   * FONCTION : EXPORT CSV
   * ============================================================
   */

  function exportValidEmailsAsCsv() {
    if (validEmails.length === 0) {
      statusMessage.textContent =
        "Aucun e-mail valide à exporter.";

      return;
    }

    /*
     * BOM UTF-8 pour améliorer la compatibilité avec Excel.
     */
    const bom = "\uFEFF";

    const header = escapeCsvCell("email");

    const rows = validEmails.map((email) => {
      return escapeCsvCell(email);
    });

    const csvContent =
      bom +
      [header, ...rows].join("\r\n");

    downloadFile(
      csvContent,
      "emails-valides.csv",
      "text/csv"
    );

    statusMessage.textContent =
      `${validEmails.length} e-mail(s) valide(s) exporté(s) en CSV.`;
  }

  /*
   * ============================================================
   * FONCTION : COPIER LES INVALIDES
   * ============================================================
   */

  async function copyInvalidEmails() {
    if (invalidEmails.length === 0) {
      statusMessage.textContent =
        "Aucun e-mail invalide à copier.";

      return;
    }

    const content = invalidEmails.join("\n");

    try {
      /*
       * API Clipboard moderne.
       */
      await navigator.clipboard.writeText(content);

      statusMessage.textContent =
        `${invalidEmails.length} e-mail(s) invalide(s) copié(s) dans le presse-papiers.`;
    } catch (error) {
      /*
       * Fallback pour les navigateurs/environnements où
       * navigator.clipboard n'est pas disponible.
       */
      const temporaryTextarea =
        document.createElement("textarea");

      temporaryTextarea.value = content;

      temporaryTextarea.style.position = "fixed";
      temporaryTextarea.style.left = "-9999px";
      temporaryTextarea.style.top = "0";

      document.body.appendChild(temporaryTextarea);

      temporaryTextarea.focus();
      temporaryTextarea.select();

      let copied = false;

      try {
        copied = document.execCommand("copy");
      } catch (fallbackError) {
        copied = false;
      }

      temporaryTextarea.remove();

      if (copied) {
        statusMessage.textContent =
          `${invalidEmails.length} e-mail(s) invalide(s) copié(s) dans le presse-papiers.`;
      } else {
        statusMessage.textContent =
          "Impossible de copier automatiquement les e-mails. Veuillez les sélectionner manuellement.";
      }
    }
  }

  /*
   * ============================================================
   * ÉVÉNEMENTS
   * ============================================================
   */

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

  /*
   * ============================================================
   * RACCOURCI CLAVIER
   * ============================================================
   *
   * Ctrl + Entrée permet également de lancer la vérification.
   */

  emailInput.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.key === "Enter") {
      event.preventDefault();

      verifyEmails();
    }
  });

  /*
   * ============================================================
   * INITIALISATION
   * ============================================================
   */

  validList.innerHTML =
    '<li class="empty-message">Aucun résultat pour le moment.</li>';

  invalidList.innerHTML =
    '<li class="empty-message">Aucun résultat pour le moment.</li>';
});