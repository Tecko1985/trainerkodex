let appData = { bestaetigungen: {} };
let currentUsername = null;
let sigPad = null;

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("de-DE") + ", " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr";
}

// Bestenfalls-Ableitung eines Anzeigenamens aus dem username (Format "vorname.nachname",
// siehe generateUsername() in admin-worker.js). Nur eine Vorbelegung — die Felder
// bleiben editierbar, da Umlaute/Sonderzeichen beim Erzeugen des username verlustbehaftet
// transliteriert werden (z.B. ö -> o) und Kollisions-Suffixe angehängt sein können.
function deriveNameFromUsername(username) {
  const parts = String(username || "").split(".");
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  return { vorname: cap(parts[0] || ""), nachname: cap(parts.slice(1).join(" ") || "") };
}

function renderKodexText() {
  document.getElementById("kodex-text").innerHTML = KODEX_HTML;
  document.getElementById("placeholder-banner").style.display = KODEX_IS_PLACEHOLDER ? "flex" : "none";
}

function renderChangelog() {
  const list = document.getElementById("changelog-list");
  list.innerHTML = APP_CHANGELOG.map((entry) => `
    <div class="changelog-entry">
      <span class="cv">Version ${escapeHtml(entry.version)}</span>
      ${entry.groups.map((g) => `
        <div class="changelog-group">
          <div class="cg-title">${escapeHtml(g.title)}</div>
          <ul class="cg-items">${g.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
        </div>
      `).join("")}
    </div>
  `).join("");
}

function renderUebersicht() {
  const rows = Object.values(appData.bestaetigungen || {})
    .sort((a, b) => String(b.datum || "").localeCompare(String(a.datum || "")));
  document.getElementById("uebersicht-empty").style.display = rows.length ? "none" : "block";
  document.getElementById("uebersicht-rows").innerHTML = rows.map((r) => `
    <div class="confirm-row">
      <span class="confirm-name">${escapeHtml(r.vorname + " " + r.nachname)}</span>
      <span class="muted">${escapeHtml(fmtDate(r.datum))}</span>
    </div>
  `).join("");
}

function showFormError(msg) {
  const el = document.getElementById("form-error");
  el.textContent = msg || "";
  el.style.display = msg ? "block" : "none";
}

function renderOwnStatus() {
  const mine = appData.bestaetigungen[currentUsername];
  showFormError("");
  if (mine) {
    document.getElementById("view-form").style.display = "none";
    document.getElementById("view-receipt").style.display = "block";
    document.getElementById("receipt-text").textContent =
      `${mine.vorname} ${mine.nachname} hat den Kodex am ${fmtDate(mine.datum)} bestätigt.`;
    const img = document.getElementById("receipt-sig");
    img.src = mine.unterschrift || "";
    img.style.display = mine.unterschrift ? "block" : "none";
  } else {
    document.getElementById("view-form").style.display = "block";
    document.getElementById("view-receipt").style.display = "none";
    const { vorname, nachname } = deriveNameFromUsername(currentUsername);
    document.getElementById("f-vorname").value = vorname;
    document.getElementById("f-nachname").value = nachname;
  }
}

async function submitConfirmation() {
  const vorname = document.getElementById("f-vorname").value.trim();
  const nachname = document.getElementById("f-nachname").value.trim();

  if (!vorname || !nachname) { showFormError("Bitte Vor- und Nachname ausfüllen."); return; }
  if (sigPad.isEmpty()) { showFormError("Bitte im Feld unten unterschreiben."); return; }
  showFormError("");

  const unterschrift = sigPad.toDataURL();
  const entry = { vorname, nachname, unterschrift, datum: new Date().toISOString(), kodexVersion: KODEX_VERSION };

  const btn = document.getElementById("btn-submit");
  btn.disabled = true;
  btn.textContent = "Wird gespeichert…";

  appData.bestaetigungen[currentUsername] = entry;

  try {
    await gatewaySave(appData);
  } catch (e) {
    if (e instanceof ConflictError) {
      // Nur der eigene Schlüssel wurde verändert -> nach Neuladen einfach erneut
      // draufsetzen und speichern, statt die gerade abgegebene Bestätigung zu verwerfen.
      try {
        const data = await gatewayLoad();
        appData = data && typeof data === "object" ? data : { bestaetigungen: {} };
        if (!appData.bestaetigungen) appData.bestaetigungen = {};
        appData.bestaetigungen[currentUsername] = entry;
        await gatewaySave(appData);
      } catch (e2) {
        btn.disabled = false;
        btn.textContent = "Ich bestätige";
        showFormError("Speichern fehlgeschlagen: " + e2.message);
        return;
      }
    } else {
      btn.disabled = false;
      btn.textContent = "Ich bestätige";
      showFormError("Speichern fehlgeschlagen: " + e.message);
      return;
    }
  }

  btn.disabled = false;
  btn.textContent = "Ich bestätige";
  renderOwnStatus();
  renderUebersicht();
}

function startApp() {
  document.getElementById("connect-screen").style.display = "none";
  document.getElementById("app-shell").style.display = "block";
  // Canvas war bis eben in einem display:none-Vorfahren -> Backing-Bitmap nachziehen.
  sigPad.resize();
}

function showConnectScreen(errorMsg) {
  document.getElementById("connect-screen").style.display = "block";
  document.getElementById("app-shell").style.display = "none";
  const err = document.getElementById("cloud-error");
  err.style.display = errorMsg ? "block" : "none";
  err.textContent = errorMsg || "";
}

async function init() {
  document.getElementById("version-badge").textContent = "v" + APP_VERSION;
  document.getElementById("version-badge-2").textContent = "v" + APP_VERSION;
  renderKodexText();
  renderChangelog();

  sigPad = createSignaturePad(document.getElementById("sig-canvas"), () => {});
  document.getElementById("btn-sig-clear").addEventListener("click", () => sigPad.clear());
  document.getElementById("btn-submit").addEventListener("click", submitConfirmation);

  if (!getSessionToken()) {
    showConnectScreen();
    return;
  }

  try {
    const me = await fetchMe();
    currentUsername = me.username;
    const data = await gatewayLoad();
    appData = data && typeof data === "object" ? data : { bestaetigungen: {} };
    if (!appData.bestaetigungen) appData.bestaetigungen = {};
    startApp();
    renderOwnStatus();
    renderUebersicht();
  } catch (e) {
    if (e instanceof NotLoggedInError) {
      showConnectScreen();
    } else {
      showConnectScreen("Fehler beim Laden: " + e.message);
    }
  }
}

window.addEventListener("DOMContentLoaded", () => { init(); });
