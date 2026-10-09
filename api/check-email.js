const { resolveMx } = require("node:dns/promises");
const disposableList = require("../data/disposable-domains.json");

const disposableDomains = new Set(
  disposableList.map((domain) => String(domain).toLowerCase())
);

const emailRegex =
  /^(?=.{1,254}$)(?=.{1,64}@)[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.(?:[A-Za-z]{2,63}|xn--[A-Za-z0-9-]{2,59})$/;

async function checkEmail(email) {
  const normalizedEmail = email.trim();
  const domain = normalizedEmail.split("@").pop().toLowerCase();

  if (!emailRegex.test(normalizedEmail)) {
    return {
      email: normalizedEmail,
      status: "invalid",
      reason: "Syntaxe incorrecte"
    };
  }

  if (disposableDomains.has(domain)) {
    return {
      email: normalizedEmail,
      status: "invalid",
      reason: "Domaine e-mail jetable connu"
    };
  }

  try {
    const mxRecords = await resolveMx(domain);

    if (!mxRecords || mxRecords.length === 0) {
      return {
        email: normalizedEmail,
        status: "invalid",
        reason: "Aucun enregistrement MX"
      };
    }

    return {
      email: normalizedEmail,
      status: "valid",
      reason: "Domaine avec enregistrement MX"
    };
  } catch (error) {
    const permanentDnsErrors = [
      "ENODATA",
      "ENOTFOUND",
      "NXDOMAIN",
      "ENONAME"
    ];

    if (permanentDnsErrors.includes(error.code)) {
      return {
        email: normalizedEmail,
        status: "invalid",
        reason: "Domaine inexistant ou sans enregistrement MX"
      };
    }

    return {
      email: normalizedEmail,
      status: "unknown",
      reason: "Vérification DNS impossible pour le moment"
    };
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      error: "Utilise une requête POST."
    });
  }

  const body = req.body || {};
  const emails = body.emails;

  if (
    !Array.isArray(emails) ||
    emails.length < 1 ||
    emails.length > 100 ||
    !emails.every((email) => typeof email === "string")
  ) {
    return res.status(400).json({
      error: "Fournis de 1 à 100 adresses sous forme de texte."
    });
  }

  try {
    const results = await Promise.all(
      emails.map((email) => checkEmail(email))
    );

    return res.status(200).json({ results });
  } catch (error) {
    console.error("Erreur API de vérification :", error);

    return res.status(500).json({
      error: "Erreur serveur pendant la vérification DNS."
    });
  }
};