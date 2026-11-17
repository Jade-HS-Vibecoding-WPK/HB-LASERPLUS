// =========================================================
// Bedienung der Seite
//
// Diese Datei ist wie die Haustechnik: Sie sorgt dafür, dass
// etwas passiert, wenn man klickt oder eine Datei ablegt.
//
// Schon angeschlossen:
//   - Datei ablegen oder auswählen, prüfen, Namen anzeigen
// Kommt noch:
//   - Einstellungen speichern und Farben zurücksetzen
//   - Vorschau der Laserplatte zeichnen
//   - Test-DXF herunterladen
//   - Mittwoch: IFC-Datei wirklich einlesen
// =========================================================

// Die Bauteile der Seite, die wir brauchen
const ablage = document.getElementById("ablage");
const dateiEingabe = document.getElementById("datei-eingabe");
const dateiStatus = document.getElementById("datei-status");

// Hier merken wir uns die abgelegte Datei für später (Mittwoch: einlesen).
// Sie bleibt nur im Browser auf diesem Rechner.
export let aktuelleDatei = null;

// ---------------------------------------------------------
// Größe lesbar machen, z. B. 2 345 678 Byte → „2,2 MB“
// ---------------------------------------------------------
function groesseLesbar(byte) {
  if (byte < 1024) return byte + " Byte";
  if (byte < 1024 * 1024) return (byte / 1024).toLocaleString("de-DE", { maximumFractionDigits: 0 }) + " KB";
  return (byte / 1024 / 1024).toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " MB";
}

// ---------------------------------------------------------
// Rückmeldung unter der Ablagefläche anzeigen
// art = "ok" (grüner Haken) oder "fehler" (Hinweis)
// ---------------------------------------------------------
function zeigeStatus(text, art) {
  dateiStatus.textContent = text;
  dateiStatus.className = "datei-status " + art;
  dateiStatus.hidden = false;
}

// ---------------------------------------------------------
// Eine Datei annehmen und prüfen
// ---------------------------------------------------------
function dateiAnnehmen(datei) {
  if (!datei) return;

  // Nur .ifc-Dateien (Groß- oder Kleinschreibung egal)
  if (!datei.name.toLowerCase().endsWith(".ifc")) {
    aktuelleDatei = null;
    zeigeStatus(
      "„" + datei.name + "“ ist keine IFC-Datei. Exportiere dein Modell in Archicad als .ifc und lege diese Datei hier ab.",
      "fehler"
    );
    return;
  }

  // Leere Datei abfangen
  if (datei.size === 0) {
    aktuelleDatei = null;
    zeigeStatus("„" + datei.name + "“ ist leer. Exportiere die IFC-Datei bitte noch einmal.", "fehler");
    return;
  }

  aktuelleDatei = datei;
  zeigeStatus(datei.name + " · " + groesseLesbar(datei.size) + " · bereit", "ok");
}

// ---------------------------------------------------------
// Weg 1: Knopf „Datei auswählen“
// ---------------------------------------------------------
dateiEingabe.addEventListener("change", () => {
  dateiAnnehmen(dateiEingabe.files[0]);
  dateiEingabe.value = ""; // damit dieselbe Datei nochmal gewählt werden kann
});

// ---------------------------------------------------------
// Weg 2: Datei auf die Ablagefläche ziehen
// ---------------------------------------------------------
ablage.addEventListener("dragover", (ereignis) => {
  ereignis.preventDefault();          // sonst öffnet der Browser die Datei selbst
  ablage.classList.add("drueber");    // Fläche färbt sich, solange man darüber ist
});

ablage.addEventListener("dragleave", (ereignis) => {
  // nur zurücksetzen, wenn man die Fläche wirklich verlässt
  if (!ablage.contains(ereignis.relatedTarget)) ablage.classList.remove("drueber");
});

ablage.addEventListener("drop", (ereignis) => {
  ereignis.preventDefault();
  ablage.classList.remove("drueber");
  const dateien = ereignis.dataTransfer.files;
  if (dateien.length > 1) {
    zeigeStatus("Bitte lege nur eine Datei ab, ein Gebäude pro Durchgang.", "fehler");
    return;
  }
  dateiAnnehmen(dateien[0]);
});

// Daneben fallen gelassene Dateien nicht vom Browser öffnen lassen
window.addEventListener("dragover", (ereignis) => ereignis.preventDefault());
window.addEventListener("drop", (ereignis) => ereignis.preventDefault());
