// Persistenz über das zentrale ToolsUebersicht-Login-Gateway.
// Adaptiert aus E:\TrainerCheckliste\db.js (gleiches Gateway-Muster), ohne
// FileStore/lokalen WebDAV-Modus — Trainerkodex hatte nie einen lokalen Modus.
const GATEWAY_URL = "https://landingpage.michel-brunner.workers.dev";
const TOKEN_STORAGE_KEY = "tu_session_token";
const GATEWAY_APP_ID = "trainerkodex";

class NotLoggedInError extends Error {
  constructor(message) {
    super(message || "Nicht angemeldet");
    this.name = "NotLoggedInError";
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message || "Daten wurden zwischenzeitlich von einem anderen Gerät geändert");
    this.name = "ConflictError";
  }
}

// ETag des zuletzt geladenen/geschriebenen Stands. Wird bei dav-save mitgeschickt,
// damit der Worker Konflikte (anderes Gerät hat inzwischen gespeichert) erkennt.
let gatewayRev = null;

function getSessionToken() {
  try { return localStorage.getItem(TOKEN_STORAGE_KEY); } catch (_) { return null; }
}

async function gatewayRequest(payload) {
  const token = getSessionToken();
  if (!token) throw new NotLoggedInError();
  const resp = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify(payload)
  });
  if (resp.status === 401) throw new NotLoggedInError("Sitzung abgelaufen");
  if (resp.status === 403) throw new Error("Kein Zugriff auf dieses Tool.");
  if (resp.status === 409) throw new ConflictError();
  if (!resp.ok) throw new Error(`Gateway-Fehler (HTTP ${resp.status})`);
  return resp.json();
}

async function gatewayLoad() {
  const body = await gatewayRequest({ action: "dav-load", app: GATEWAY_APP_ID });
  gatewayRev = typeof body.rev === "string" ? body.rev : null;
  return body.data; // Objekt oder null (Datei noch nicht vorhanden)
}

async function gatewaySave(dataObj) {
  const payload = { action: "dav-save", app: GATEWAY_APP_ID, data: dataObj };
  if (gatewayRev) payload.rev = gatewayRev;
  const body = await gatewayRequest(payload);
  gatewayRev = typeof body.rev === "string" ? body.rev : null;
}

// Liefert {username, isAdmin, groupIds, vorname, nachname} der eingeloggten Person
// (vorname/nachname können null sein, falls der Worker noch nicht auf dem Stand ist,
// der sie mitliefert — siehe deriveNameFromUsername()-Fallback in app.js).
async function fetchMe() {
  return gatewayRequest({ action: "me" });
}

// Zentrales Trainerprofil (Lizenz + Mannschaften) ALLER Nutzer, nicht nur der
// eigenen — für die Admin-Übersicht der Bestätigungen (Zeile-Anreicherung).
async function fetchTrainerProfiles() {
  const body = await gatewayRequest({ action: "list-trainer-profiles" });
  return Array.isArray(body.profiles) ? body.profiles : [];
}

// Serverseitige Prüfung eines Aktions-Passworts (z.B. Bestätigungen löschen). Das
// Passwort liegt als Worker-Secret im landingpage-Worker, nicht im Quellcode.
// Bewusst ohne Login-Token (die Aktion ist im Worker nicht an eine Sitzung gebunden).
// Gibt true/false zurück; wirft, wenn die Prüfung selbst nicht möglich ist.
async function verifyActionPassword(scope, password) {
  let resp;
  try {
    resp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify-action-password", scope, password })
    });
  } catch (_) {
    throw new Error("Keine Verbindung zum Server — Passwortprüfung nicht möglich.");
  }
  if (resp.status === 403) return false;
  if (resp.ok) return true;
  const body = await resp.json().catch(() => ({}));
  if (resp.status === 400 && body.error === "Unbekannte Aktion") {
    throw new Error("Der Server kennt die Passwortprüfung noch nicht — das Worker-Update (landingpage) muss erst deployed werden.");
  }
  throw new Error(body.error || ("Passwortprüfung fehlgeschlagen (HTTP " + resp.status + ")"));
}
