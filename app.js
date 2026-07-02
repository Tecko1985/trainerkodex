let appData = { bestaetigungen: {} };
let currentUsername = null;
let currentIsAdmin = false;
let currentVorname = null;
let currentNachname = null;
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

// Fallback, falls der Gateway (noch) kein vorname/nachname liefert (älterer, noch nicht
// neu deployter admin-worker.js). Rät den Namen aus dem username (Format "vorname.nachname",
// siehe generateUsername() in admin-worker.js) — verlustbehaftet, da Umlaute/Sonderzeichen
// bei der username-Erzeugung transliteriert werden (z.B. ö -> o) und Kollisions-Suffixe
// angehängt sein können. Wird nur benutzt, wenn me() keine echten Namen liefert.
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

function activateTab(name) {
  document.querySelectorAll("nav button[data-tab]").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".tab-section").forEach((s) => s.classList.remove("active"));
  const btn = document.querySelector('nav button[data-tab="' + name + '"]');
  if (btn) btn.classList.add("active");
  const section = document.getElementById("tab-" + name);
  if (section) section.classList.add("active");
}

function setupTabs() {
  document.querySelectorAll("nav button[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });
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
    const fallback = deriveNameFromUsername(currentUsername);
    document.getElementById("f-vorname").value = currentVorname || fallback.vorname;
    document.getElementById("f-nachname").value = currentNachname || fallback.nachname;
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
  if (currentIsAdmin) renderUebersicht();
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
  setupTabs();

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
    currentIsAdmin = !!me.isAdmin;
    currentVorname = me.vorname || null;
    currentNachname = me.nachname || null;
    document.getElementById("nav-einstellungen").style.display = currentIsAdmin ? "" : "none";
    const data = await gatewayLoad();
    appData = data && typeof data === "object" ? data : { bestaetigungen: {} };
    if (!appData.bestaetigungen) appData.bestaetigungen = {};
    startApp();
    renderOwnStatus();
    if (currentIsAdmin) renderUebersicht();
  } catch (e) {
    if (e instanceof NotLoggedInError) {
      showConnectScreen();
    } else {
      showConnectScreen("Fehler beim Laden: " + e.message);
    }
  }
}

window.addEventListener("DOMContentLoaded", () => { init(); });
