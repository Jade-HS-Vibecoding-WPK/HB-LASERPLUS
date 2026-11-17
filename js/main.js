// =========================================================
// Bedienung der Seite
//
// Diese Datei ist wie die Haustechnik: Sie sorgt dafür, dass
// etwas passiert, wenn man klickt oder eine Datei ablegt.
//
// Schon angeschlossen:
//   - Datei ablegen oder auswählen, prüfen, Namen anzeigen
//   - Einstellungen merken und Farben zurücksetzen (js/einstellungen.js)
//   - leere Laserplatte folgt Rahmenfarbe und Plattengröße
// Kommt noch:
//   - Vorschau der Teile auf der Laserplatte zeichnen
//   - Test-DXF herunterladen
//   - Mittwoch: IFC-Datei wirklich einlesen
// =========================================================

import { einstellungenStarten, beiAenderung, holeEinstellungen } from "./einstellungen.js";
import { platteAlsDxf, dxfHerunterladen, rahmenLinie, EBENEN, RAND_ABSTAND, zuNahAmRahmen } from "./dxf.js";

// ---------------------------------------------------------
// Einstellungen anschließen
// ---------------------------------------------------------
einstellungenStarten();

// ---------------------------------------------------------
// Probeplatte (Etappe 1, noch ohne IFC):
// zwei rote Rechtecke zum Nachmessen, mit dem Mindestabstand
// RAND_ABSTAND (10 mm, Werkstatt-Regel) zum Rahmen
// ---------------------------------------------------------
function rechteck(x, y, breite, hoehe, ebene) {
  return {
    ebene,
    punkte: [[x, y], [x + breite, y], [x + breite, y + hoehe], [x, y + hoehe]],
    geschlossen: true,
  };
}

function probeplatte(e) {
  return {
    breite: e.platteBreite,
    hoehe: e.platteHoehe,
    linien: [
      rechteck(RAND_ABSTAND, RAND_ABSTAND, 100, 50, "SCHNITT"),            // 100 × 50 mm
      rechteck(RAND_ABSTAND + 110, RAND_ABSTAND, 50, 50, "SCHNITT"),       //  50 × 50 mm, 10 mm daneben
    ],
  };
}

// ---------------------------------------------------------
// Vorschau wie die echte Laserplatte:
// dieselben Linien und Farben, die auch in der DXF stehen
// ---------------------------------------------------------
const vorschau = document.getElementById("vorschau");

function zeichneVorschau(platte, farben) {
  const { breite, hoehe } = platte;
  const alleLinien = [...platte.linien, rahmenLinie(breite, hoehe)];
  // In der DXF zeigt y nach oben, am Bildschirm nach unten → umdrehen
  const formen = alleLinien.map((linie) => {
    const punkte = linie.punkte.map(([x, y]) => x + "," + (hoehe - y)).join(" ");
    const farbe = farben[EBENEN[linie.ebene]];
    const art = linie.geschlossen ? "polygon" : "polyline";
    return `<${art} points="${punkte}" fill="none" stroke="${farbe}" stroke-width="1.5" vector-effect="non-scaling-stroke" />`;
  });
  vorschau.innerHTML =
    `<svg viewBox="0 0 ${breite} ${hoehe}" width="100%" height="100%" role="img" ` +
    `aria-label="Laserplatte ${breite} × ${hoehe} mm">${formen.join("")}</svg>`;
  vorschau.style.aspectRatio = breite + " / " + hoehe;
  vorschau.style.outline = "none"; // der Rahmen ist jetzt in der Zeichnung
  vorschau.style.padding = "0";
}

beiAenderung((e) => zeichneVorschau(probeplatte(e), e.farben));

// ---------------------------------------------------------
// Knopf „DXF herunterladen“ – zurzeit die Probeplatte
// ---------------------------------------------------------
const dxfKnopf = document.getElementById("dxf-herunterladen");
dxfKnopf.disabled = false;
dxfKnopf.addEventListener("click", () => {
  const e = holeEinstellungen();
  const platte = probeplatte(e);
  // Werkstatt-Regel prüfen, bevor die Datei entsteht
  if (zuNahAmRahmen(platte).length > 0) {
    alert(
      "Mindestens ein Teil liegt näher als " + RAND_ABSTAND + " mm am gelben Rahmen. " +
      "Die Werkstatt würde es evtl. nicht ganz ausschneiden. Vergrößere die Laserplatte in den Einstellungen."
    );
    return;
  }
  const text = platteAlsDxf(platte, e.farben);
  dxfHerunterladen(text, "Probeplatte-01.dxf");
});

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
