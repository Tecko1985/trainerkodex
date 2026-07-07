const APP_VERSION = "1.3";

const APP_CHANGELOG = [
  {
    version: "1.3",
    groups: [
      {
        title: "Einstellungen",
        items: [
          "Doppelte Versionsanzeige im Einstellungen-Button entfernt."
        ]
      }
    ]
  },
  {
    version: "1.2",
    groups: [
      {
        title: "Bestätigungsübersicht (nur Admins)",
        items: [
          "Automatisch angelegte Trainer (über die zentrale Nutzerverwaltung) erscheinen jetzt als „offen — noch nicht bestätigt“, bis die Person den Kodex selbst bestätigt."
        ]
      }
    ]
  },
  {
    version: "1.1",
    groups: [
      {
        title: "Bestätigungsübersicht (nur Admins)",
        items: [
          "Zentrales Trainerprofil (Lizenz + betreute Mannschaft) wird jetzt neben jeder Bestätigung angezeigt, sofern in der Tools-Übersicht gepflegt."
        ]
      }
    ]
  },
  {
    version: "1.0",
    groups: [
      {
        title: "Kodex bestätigen",
        items: [
          "Verhaltenskodex zum Lesen direkt in der Seite, Bestätigung per Name und digitaler Unterschrift.",
          "Vor- und Nachname werden automatisch aus dem Nutzerkonto vorbelegt (bleiben editierbar).",
          "Wer schon bestätigt hat, sieht beim erneuten Öffnen eine Quittung mit Datum und Unterschrift statt erneut das Formular."
        ]
      },
      {
        title: "Anmeldung & Speicherung",
        items: [
          "Automatische Nextcloud-Synchronisierung über die zentrale Anmeldung (Tools-Übersicht) — kein separates Passwort auf dem Gerät nötig."
        ]
      },
      {
        title: "Bestätigungsübersicht (nur Admins)",
        items: [
          "Übersicht aller abgegebenen Bestätigungen in einem eigenen Einstellungen-Tab.",
          "Einzelne oder alle Bestätigungen löschen, zusätzlich durch ein zentrales Aktions-Passwort serverseitig geschützt."
        ]
      },
      {
        title: "Sonstiges",
        items: [
          "Vereinswappen im Header.",
          "Scrollbalken beim Kodex-Text immer sichtbar."
        ]
      }
    ]
  }
];
