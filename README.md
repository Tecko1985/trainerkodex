# Trainerkodex (v1.0)

Digitaler Verhaltenskodex für Trainer:innen und Funktionäre als eigenständige,
clientseitige Web-App ohne Build-Step (Vanilla HTML/CSS/JS) — Teil der
[Tools-Übersicht](https://tecko1985.github.io/ToolsUebersicht/) des 1. SC 1911
Heiligenstadt.

**Live:** https://tecko1985.github.io/trainerkodex/

---

## Funktionen

### Kodex lesen & bestätigen
- Der Verhaltenskodex wird als Text direkt in der Seite angezeigt.
- Bestätigung mit Vorname, Nachname (aus dem Login-Namen vorbelegt, editierbar)
  und einer digitalen Unterschrift (Maus, Touch oder Stift/Pen).
- Wer schon bestätigt hat, sieht beim erneuten Öffnen eine Quittung mit Datum
  und der eigenen Unterschrift statt erneut das Formular.

### Bestätigungsübersicht
- Liste aller bereits abgegebenen Bestätigungen (Name + Datum).

### Daten & Speicherung
- Automatische Nextcloud-Synchronisierung über die zentrale Anmeldung in der
  [Tools-Übersicht](https://tecko1985.github.io/ToolsUebersicht/): einmal dort
  anmelden, danach wird diese Seite automatisch geladen und gespeichert — auch
  am Handy, ohne WebDAV-Adresse, Benutzername oder App-Passwort auf dem Gerät.
- Nur wer das Tool in der Übersicht sehen darf, kann den Kodex öffnen
  (Gruppen-Rechte werden serverseitig geprüft).

---

## Lokal starten

`fetch()`-Aufrufe von einem `file://`-Origin verhalten sich inkonsistent (CORS).
Die App daher über einen lokalen Static-Server öffnen:

```
npx serve .
```

Hinweis: Die geteilte Anmeldung mit der Tools-Übersicht (`localStorage` unter
der Origin `tecko1985.github.io`) funktioniert nur auf der Live-Seite, nicht
unter `localhost`.

---

## Datenmodell

Eine JSON-Datei `{ bestaetigungen: { "<username>": {...} } }`, nach dem
Login-Namen geschlüsselt, zentral über den Login-Gateway der Tools-Übersicht
in der Vereins-Nextcloud gespeichert (siehe `db.js`,
`GATEWAY_URL`/`GATEWAY_APP_ID`). Jeder Eintrag: `vorname`, `nachname`,
`unterschrift` (PNG-DataURL), `datum` (ISO), `kodexVersion`.

Der Kodex-Wortlaut selbst liegt in `kodex-text.js` (`KODEX_HTML`,
`KODEX_VERSION`, `KODEX_IS_PLACEHOLDER`).
