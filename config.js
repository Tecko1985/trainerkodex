const APP_VERSION = "1.4";

const APP_CHANGELOG = [
  {
    version: "1.4",
    groups: [
      {
        title: "Bestätigungsübersicht",
        items: [
          "Admins können einzelne Bestätigungen löschen (Button je Zeile).",
          "Admins können alle Bestätigungen auf einmal löschen (Button \"Alle löschen\")."
        ]
      }
    ]
  },
  {
    version: "1.3",
    groups: [
      {
        title: "Vorbelegung",
        items: [
          "Vor- und Nachname werden jetzt mit dem echten Namen aus dem Nutzerkonto vorbelegt statt nur aus dem Nutzernamen geraten (sobald das Gateway-Update deployt ist)."
        ]
      }
    ]
  },
  {
    version: "1.2",
    groups: [
      {
        title: "Layout",
        items: [
          "Einstellungen-Button steht jetzt rechts in der Navigation (wie in der Tools-Übersicht).",
          "Versionshistorie ist in den Einstellungen-Tab umgezogen."
        ]
      }
    ]
  },
  {
    version: "1.1",
    groups: [
      {
        title: "Bestätigungsübersicht",
        items: [
          "Die Liste aller Bestätigungen ist jetzt in einem eigenen Einstellungen-Tab und nur für Admins sichtbar (wie beim Admin-Bereich der Tools-Übersicht). Reguläre Trainer:innen sehen weiterhin nur die eigene Bestätigung."
        ]
      }
    ]
  },
  {
    version: "1.0",
    groups: [
      {
        title: "Trainerkodex",
        items: [
          "Verhaltenskodex zum Lesen direkt in der Seite, Bestätigung per Name und digitaler Unterschrift.",
          "Automatische Nextcloud-Synchronisierung über die zentrale Anmeldung (Tools-Übersicht) — kein Passwort auf dem Gerät nötig.",
          "Wer schon bestätigt hat, sieht beim erneuten Öffnen eine Quittung mit Datum und Unterschrift statt erneut das Formular.",
          "Übersicht aller bereits abgegebenen Bestätigungen."
        ]
      }
    ]
  }
];
