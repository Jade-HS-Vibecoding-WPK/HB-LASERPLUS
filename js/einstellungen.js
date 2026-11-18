// =========================================================
// Einstellungen und Laserfarben
//
// Hier steht alles, was man in Bereich 2 einstellt.
// Die Seite merkt sich die Werte im Browser auf diesem Rechner
// („localStorage“, eine Art Notizzettel im Browser).
// Nichts davon geht an einen Server.
// =========================================================

import { wand3dZeichnen } from "./wand3d.js";

// Name des Notizzettels im Browser
const SPEICHER_NAME = "ifc-laser-einstellungen";

// Laserfarben der Hochschul-Werkstatt (Stand 17.11.2026)
export const HOCHSCHUL_FARBEN = {
  schneiden: "#ff0000", // Rot  – durchschneiden
  ritzen: "#0000ff",    // Blau – Teilenummern anritzen
  rahmen: "#ffff00",    // Gelb – Rahmen in Plattengröße
  gravieren: "#000000", // Schwarz – Flächen gravieren
};

// Startwerte, wenn noch nichts gespeichert ist
export const STARTWERTE = {
  massstab: 100,     // 1:100
  dickeInnen: 2,     // mm
  dickeAussen: 1,    // mm
  platteBreite: 1000, // mm
  platteHoehe: 600,   // mm
  // Wandaufbau: "zwei" = Außen- und Innenschicht (Standard),
  // "eine-geritzt" = eine Schicht, Fenster/Türen geritzt,
  // "eine-ohne" = eine Schicht ohne Fenster/Türen
  wandaufbau: "zwei",
  // Staffage (Menschen und Bäume), seit 18.11.
  menschen: 0,
  baeume: 0,
  baumHoehe: 10, // m
  staffageDicke: 1, // mm, Pappe für Menschen und Bäume
  farben: { ...HOCHSCHUL_FARBEN },
};

// Anzahl-Felder (0 ist erlaubt) mit Höchstwert
const ANZAHLFELDER = { menschen: ["menschen", 50], baeume: ["baeume", 30] };
const BAUMHOEHEN = [6, 10, 15];

// Erlaubte Werte für den Wandaufbau
export const WANDAUFBAU = ["zwei", "eine-geritzt", "eine-ohne"];

// Welche Einstellung gehört zu welchem Feld auf der Seite
const FELDER = {
  massstab: "massstab",
  dickeInnen: "dicke-innen",
  dickeAussen: "dicke-aussen",
  platteBreite: "platte-breite",
  platteHoehe: "platte-hoehe",
};
const FARBFELDER = {
  schneiden: "farbe-schneiden",
  ritzen: "farbe-ritzen",
  rahmen: "farbe-rahmen",
  gravieren: "farbe-gravieren",
};

// Die aktuellen Werte (andere Dateien lesen sie mit holeEinstellungen())
let aktuell = laden();

export function holeEinstellungen() {
  return { ...aktuell, farben: { ...aktuell.farben } };
}

// ---------------------------------------------------------
// Laden und Speichern
// ---------------------------------------------------------
function laden() {
  try {
    const text = localStorage.getItem(SPEICHER_NAME);
    if (!text) return kopieStartwerte();
    const gespeichert = JSON.parse(text);
    // Mit Startwerten auffüllen, falls etwas fehlt
    const werte = {
      ...kopieStartwerte(),
      ...gespeichert,
      farben: { ...HOCHSCHUL_FARBEN, ...(gespeichert.farben || {}) },
    };
    if (!WANDAUFBAU.includes(werte.wandaufbau)) werte.wandaufbau = STARTWERTE.wandaufbau;
    return werte;
  } catch {
    // Notizzettel nicht lesbar (z. B. privates Fenster): Startwerte nehmen
    return kopieStartwerte();
  }
}

function speichern() {
  try {
    localStorage.setItem(SPEICHER_NAME, JSON.stringify(aktuell));
  } catch {
    // Speichern nicht möglich – die Seite funktioniert trotzdem, vergisst aber beim Neuladen
  }
}

function kopieStartwerte() {
  return { ...STARTWERTE, farben: { ...STARTWERTE.farben } };
}

// ---------------------------------------------------------
// Werte in die Felder schreiben bzw. aus den Feldern lesen
// ---------------------------------------------------------
function felderFuellen() {
  for (const [name, id] of Object.entries(FELDER)) {
    document.getElementById(id).value = String(aktuell[name]);
  }
  for (const [name, id] of Object.entries(FARBFELDER)) {
    document.getElementById(id).value = aktuell.farben[name];
  }
  document.getElementById("wandaufbau").value = aktuell.wandaufbau;
  for (const [name, [id]] of Object.entries(ANZAHLFELDER)) {
    document.getElementById(id).value = String(aktuell[name]);
  }
  document.getElementById("baum-hoehe").value = String(aktuell.baumHoehe);
  document.getElementById("staffage-dicke").value = String(aktuell.staffageDicke);
  dickenfelderAnpassen();
}

// Bei einer Schicht gibt es nur eine Pappdicke für die Wand:
// Das Feld „Pappdicke innen“ heißt dann „Pappdicke Wand“, „außen“ verschwindet.
function dickenfelderAnpassen() {
  const eineSchicht = aktuell.wandaufbau !== "zwei";
  document.getElementById("dicke-innen-text").textContent = eineSchicht ? "Pappdicke Wand und Dach" : "Pappdicke innen";
  document.getElementById("dicke-aussen-feld").style.display = eineSchicht ? "none" : "";
  wandbildZeichnen();
}

// ---------------------------------------------------------
// Vorschaubild zum Wandaufbau (unter der Auswahl „Wandaufbau“):
// links eine kleine Fassade (Ansicht), rechts ein Schnitt durch die Wand.
// Linien in den eingestellten Laserfarben: Rot = schneiden, Blau = ritzen.
// Nur eine Skizze – sie zeigt das Prinzip, nicht dein Gebäude.
// ---------------------------------------------------------
function wandbildZeichnen() {
  const ort = document.getElementById("wandaufbau-bild");
  if (!ort) return;
  const aufbau = aktuell.wandaufbau;
  const rot = aktuell.farben.schneiden, blau = aktuell.farben.ritzen;
  const pappeAussen = "#d8cdbd", pappeInnen = "#a99d8a"; // Graupappe hell / dunkler (innen)
  const punkte = (liste) => liste.map((p) => p.join(",")).join(" ");

  // --- Ansicht: Haus mit Satteldach, ein Fenster, eine Tür bis zum Boden ---
  const fenster = [[38, 62], [72, 62], [72, 88], [38, 88]];
  const fenster2 = [[118, 62], [146, 62], [146, 88], [118, 88]];
  const tuer = [[84, 122], [84, 84], [104, 84], [104, 122]]; // offen nach unten
  const wandOhneTuer = [[20, 122], [20, 44], [92, 12], [164, 44], [164, 122]];
  const wandMitTuer = [[20, 122], [20, 44], [92, 12], [164, 44], [164, 122], [104, 122], [104, 84], [84, 84], [84, 122]];
  let ansicht = "";
  if (aufbau === "zwei") {
    // hinten die Innenschicht (geschlossen, dunkler), davor die Außenschicht mit Löchern
    ansicht +=
      `<polygon points="${punkte(wandOhneTuer)}" fill="${pappeInnen}" />` +
      `<path d="M${punkte(wandMitTuer)}Z M${punkte(fenster)}Z M${punkte(fenster2)}Z" fill="${pappeAussen}" fill-rule="evenodd" stroke="${rot}" stroke-width="1.6" />`;
  } else {
    ansicht += `<polygon points="${punkte(wandOhneTuer)}" fill="${pappeAussen}" stroke="${rot}" stroke-width="1.6" />`;
    if (aufbau === "eine-geritzt") {
      ansicht +=
        `<polygon points="${punkte(fenster)}" fill="none" stroke="${blau}" stroke-width="1.4" />` +
        `<polygon points="${punkte(fenster2)}" fill="none" stroke="${blau}" stroke-width="1.4" />` +
        `<polyline points="${punkte(tuer)}" fill="none" stroke="${blau}" stroke-width="1.4" />`;
    }
  }

  // --- Schnitt durch die Wand (Pappdicken stark vergrößert) ---
  const F = 9; // 1 mm = 9 Bildpunkte
  const x0 = 236, y0 = 18, h = 104;
  let schnitt = "";
  let dickeText;
  if (aufbau === "zwei") {
    const ta = aktuell.dickeAussen * F, ti = aktuell.dickeInnen * F;
    schnitt +=
      `<rect x="${x0}" y="${y0}" width="${ta}" height="${h}" fill="${pappeAussen}" stroke="${rot}" stroke-width="1.2" />` +
      `<rect x="${x0 + ta}" y="${y0}" width="${ti}" height="${h}" fill="${pappeInnen}" stroke="${rot}" stroke-width="1.2" />` +
      `<text x="${x0 + ta / 2}" y="${y0 + h + 12}" text-anchor="middle">A</text>` +
      `<text x="${x0 + ta + ti / 2}" y="${y0 + h + 12}" text-anchor="middle">I</text>`;
    dickeText = `${zahlText(aktuell.dickeAussen)} + ${zahlText(aktuell.dickeInnen)} mm`;
  } else {
    const t = aktuell.dickeInnen * F;
    schnitt +=
      `<rect x="${x0}" y="${y0}" width="${t}" height="${h}" fill="${pappeAussen}" stroke="${rot}" stroke-width="1.2" />` +
      `<text x="${x0 + t / 2}" y="${y0 + h + 12}" text-anchor="middle">A</text>`;
    dickeText = `${zahlText(aktuell.dickeInnen)} mm`;
  }
  schnitt +=
    `<text x="${x0 - 8}" y="${y0 + h / 2}" text-anchor="end">außen</text>` +
    `<text x="${x0 + 52}" y="${y0 + h / 2}" text-anchor="start">innen</text>` +
    `<text x="${x0 + 14}" y="${y0 + h + 25}" text-anchor="middle">${dickeText}</text>`;

  const beschreibung = {
    zwei: "Zwei Pappen je Fassade: außen (A) mit ausgeschnittenen Fenstern und Türen, dahinter innen (I) geschlossen.",
    "eine-geritzt": "Eine Pappe je Fassade, geschlossen. Fenster und Türen werden nur angeritzt (blau).",
    "eine-ohne": "Eine Pappe je Fassade, geschlossen, ohne Fenster und Türen – ein reines Massenmodell.",
  }[aufbau];

  ort.innerHTML =
    `<svg viewBox="0 0 330 152" role="img" aria-label="Skizze Wandaufbau: ${beschreibung}">` +
    `<text x="92" y="6" text-anchor="middle" class="wandbild-titel">Ansicht</text>` +
    ansicht +
    `<text x="250" y="6" text-anchor="middle" class="wandbild-titel">Schnitt</text>` +
    schnitt +
    `</svg>` +
    // 3D-Skizze einer Hausecke zum Drehen (js/wand3d.js)
    `<div class="wand3d">` +
    `<p class="wand3d-titel">3D-Ecke · ziehen = drehen, Mausrad = zoomen, Doppelklick = zurück</p>` +
    `<svg id="wand3d-svg" tabindex="0" role="img" aria-label="3D-Skizze einer Hausecke zum Drehen"></svg>` +
    `</div>` +
    `<figcaption>${beschreibung} <span class="leise-klein">Skizze, Pappdicken vergrößert. In 3D: Die Nordwand läuft an der Ecke durch, die Westwand ist gekürzt.</span></figcaption>`;

  wand3dZeichnen(document.getElementById("wand3d-svg"), {
    aufbau,
    dickeAussen: aktuell.dickeAussen,
    dickeInnen: aktuell.dickeInnen,
    farben: aktuell.farben,
  });
}

// 1.5 → „1,5“
function zahlText(z) {
  return String(z).replace(".", ",");
}

function felderLesen() {
  for (const [name, id] of Object.entries(FELDER)) {
    const zahl = parseFloat(document.getElementById(id).value);
    // Nur sinnvolle Zahlen übernehmen (größer als 0), sonst alten Wert behalten
    if (Number.isFinite(zahl) && zahl > 0) aktuell[name] = zahl;
  }
  for (const [name, id] of Object.entries(FARBFELDER)) {
    aktuell.farben[name] = document.getElementById(id).value;
  }
  // (das Vorschaubild zum Wandaufbau wird in dickenfelderAnpassen neu gezeichnet,
  //  so folgt es auch den Pappdicken und Linienfarben)
  const aufbau = document.getElementById("wandaufbau").value;
  if (WANDAUFBAU.includes(aufbau)) aktuell.wandaufbau = aufbau;
  // Menschen und Bäume: ganze Zahlen ab 0, nach oben begrenzt
  for (const [name, [id, max]] of Object.entries(ANZAHLFELDER)) {
    const z = parseInt(document.getElementById(id).value, 10);
    if (Number.isFinite(z) && z >= 0) aktuell[name] = Math.min(z, max);
  }
  const hoehe = parseFloat(document.getElementById("baum-hoehe").value);
  if (BAUMHOEHEN.includes(hoehe)) aktuell.baumHoehe = hoehe;
  const sDicke = parseFloat(document.getElementById("staffage-dicke").value);
  if (DICKEN.includes(sDicke)) aktuell.staffageDicke = sDicke;
  dickenfelderAnpassen();
}

// ---------------------------------------------------------
// Bei jeder Änderung: merken und Bescheid sagen
// ---------------------------------------------------------
const zuhoerer = [];

// Andere Teile der Seite (z. B. die Vorschau) können sich hier anmelden
export function beiAenderung(funktion) {
  zuhoerer.push(funktion);
  funktion(holeEinstellungen());
}

function geaendert() {
  speichern();
  for (const funktion of zuhoerer) funktion(holeEinstellungen());
}

// ---------------------------------------------------------
// Start: Felder füllen und Knöpfe anschließen
// ---------------------------------------------------------
export function einstellungenStarten() {
  felderFuellen();

  const formular = document.getElementById("einstellungen");
  // Die Vorlagen-Felder haben eigene Knöpfe und zählen hier nicht mit
  const istVorlagenFeld = (ziel) => ziel.id.startsWith("vorlage-");
  // „input“ reagiert sofort beim Tippen oder Farbe-Ziehen
  formular.addEventListener("input", (ereignis) => {
    if (istVorlagenFeld(ereignis.target)) return;
    felderLesen();
    geaendert();
  });
  // Beim Verlassen eines Feldes ungültige Eingaben wieder zurücksetzen
  formular.addEventListener("change", (ereignis) => {
    if (istVorlagenFeld(ereignis.target)) return;
    felderFuellen();
  });

  // Zurück auf die Werkstatt-Werte geht über die Vorlage „Jade HS Standard“
  // (der frühere Knopf „Auf Hochschul-Werte zurücksetzen“ wurde am 18.11. entfernt).
  vorlagenStarten();
}

// =========================================================
// VORLAGEN
//
// Eine Vorlage ist ein Satz Einstellungen unter einem Namen,
// z. B. „Werkstatt Jade“ oder „Wettbewerb 1:200“ – ähnlich wie
// gespeicherte Favoriten in Archicad.
// Sie liegen nur in diesem Browser auf diesem Rechner.
// Mit „Als Datei speichern“ / „Datei laden“ kann man sie
// mitnehmen oder weitergeben.
// =========================================================

const VORLAGEN_NAME = "ifc-laser-vorlagen";     // Notizzettel im Browser
// Feste Vorlage der Jade Hochschule, nicht löschbar.
// Sie setzt NUR Plattengröße (1000 × 600 mm) und Laserfarben der Werkstatt.
// Maßstab und Pappdicken bleiben, wie sie sind – die wählt jede Person selbst.
const HOCHSCHULE = "Jade HS Standard";
const KEINE = "";                                // „eigene Werte, nicht gespeichert“
const DICKEN = [1, 1.5, 2];                      // erlaubte Pappdicken in mm

// Alle eigenen Vorlagen: { "Name": { massstab, dickeInnen, ... , farben } }
let vorlagen = vorlagenLaden();

function vorlagenLaden() {
  try {
    const text = localStorage.getItem(VORLAGEN_NAME);
    const daten = text ? JSON.parse(text) : {};
    const sauber = {};
    for (const [name, werte] of Object.entries(daten)) {
      const geprueft = werteAufraeumen(werte);
      if (geprueft) sauber[name] = geprueft;
    }
    return sauber;
  } catch {
    return {};
  }
}

function vorlagenSpeichern() {
  try {
    localStorage.setItem(VORLAGEN_NAME, JSON.stringify(vorlagen));
    return true;
  } catch {
    return false;
  }
}

// Werte prüfen, die von außen kommen (gespeichert oder aus einer Datei).
// Unsinnige Werte werden durch die Startwerte ersetzt.
// Ergebnis: saubere Werte oder null, wenn gar nichts Brauchbares drin ist.
function werteAufraeumen(werte) {
  if (!werte || typeof werte !== "object") return null;
  const zahl = (wert, ersatz) => {
    const z = parseFloat(wert);
    return Number.isFinite(z) && z > 0 ? z : ersatz;
  };
  const dicke = (wert, ersatz) => (DICKEN.includes(parseFloat(wert)) ? parseFloat(wert) : ersatz);
  const anzahl = (wert, max) => {
    const z = parseInt(wert, 10);
    return Number.isFinite(z) && z >= 0 ? Math.min(z, max) : 0;
  };
  const farbe = (wert, ersatz) => (typeof wert === "string" && /^#[0-9a-f]{6}$/i.test(wert) ? wert.toLowerCase() : ersatz);
  const f = werte.farben || {};
  return {
    massstab: zahl(werte.massstab, STARTWERTE.massstab),
    dickeInnen: dicke(werte.dickeInnen, STARTWERTE.dickeInnen),
    dickeAussen: dicke(werte.dickeAussen, STARTWERTE.dickeAussen),
    platteBreite: zahl(werte.platteBreite, STARTWERTE.platteBreite),
    platteHoehe: zahl(werte.platteHoehe, STARTWERTE.platteHoehe),
    wandaufbau: WANDAUFBAU.includes(werte.wandaufbau) ? werte.wandaufbau : STARTWERTE.wandaufbau,
    menschen: anzahl(werte.menschen, 50),
    baeume: anzahl(werte.baeume, 30),
    baumHoehe: BAUMHOEHEN.includes(parseFloat(werte.baumHoehe)) ? parseFloat(werte.baumHoehe) : STARTWERTE.baumHoehe,
    staffageDicke: dicke(werte.staffageDicke, STARTWERTE.staffageDicke),
    farben: {
      schneiden: farbe(f.schneiden, HOCHSCHUL_FARBEN.schneiden),
      ritzen: farbe(f.ritzen, HOCHSCHUL_FARBEN.ritzen),
      rahmen: farbe(f.rahmen, HOCHSCHUL_FARBEN.rahmen),
      gravieren: farbe(f.gravieren, HOCHSCHUL_FARBEN.gravieren),
    },
  };
}

// Sind zwei Wertesätze gleich? (damit die Auswahl die passende Vorlage zeigt)
function gleich(a, b) {
  return JSON.stringify(werteAufraeumen(a)) === JSON.stringify(werteAufraeumen(b));
}

// Die Werte der Jade-HS-Vorlage auf die aktuellen Werte legen:
// Platte und Farben von der Werkstatt, Maßstab und Pappdicken bleiben.
function mitJadeHs(werte) {
  return {
    ...werte,
    platteBreite: STARTWERTE.platteBreite,
    platteHoehe: STARTWERTE.platteHoehe,
    farben: { ...HOCHSCHUL_FARBEN },
  };
}

// Welche Vorlage passt zu den aktuellen Werten?
// Zuerst die eigenen Vorlagen (alle Werte gleich).
// Hat man eine eigene Vorlage gewählt und danach etwas geändert,
// gilt sie als „geändert“ (KEINE) – auch wenn Platte und Farben
// zufällig zu Jade HS passen.
// Sonst Jade HS Standard (nur Platte und Farben gleich).
function passendeVorlage() {
  for (const [name, werte] of Object.entries(vorlagen)) {
    if (gleich(aktuell, werte)) return name;
  }
  if (zuletztVorlage && vorlagen[zuletztVorlage]) return KEINE;
  if (gleich(aktuell, mitJadeHs(aktuell))) return HOCHSCHULE;
  return KEINE;
}

// Rückmeldung unter den Vorlagen-Knöpfen
function vorlageMeldung(text) {
  document.getElementById("vorlage-status").textContent = text;
}

// Die eigene Vorlage, mit der man zuletzt gearbeitet hat (gewählt, gespeichert
// oder geladen). Ändert man danach etwas, kann man sie damit überschreiben.
let zuletztVorlage = null;

// Auswahlliste neu füllen
function auswahlFuellen() {
  const auswahl = document.getElementById("vorlage-auswahl");
  const passend = passendeVorlage();
  auswahl.innerHTML = "";

  // Gibt es die zuletzt benutzte Vorlage noch?
  if (zuletztVorlage && !vorlagen[zuletztVorlage]) zuletztVorlage = null;
  // Passen die Werte gerade zu einer eigenen Vorlage, ist das die aktuelle
  if (vorlagen[passend]) zuletztVorlage = passend;

  const option = (wert, text) => {
    const o = document.createElement("option");
    o.value = wert;
    o.textContent = text; // textContent: Namen werden nie als HTML gelesen
    auswahl.appendChild(o);
  };
  if (passend === KEINE) {
    option(KEINE, zuletztVorlage
      ? "„" + zuletztVorlage + "“ geändert (nicht gespeichert)"
      : "Eigene Werte (nicht gespeichert)");
  }
  option(HOCHSCHULE, HOCHSCHULE);
  for (const name of Object.keys(vorlagen).sort((a, b) => a.localeCompare(b, "de"))) option(name, name);

  auswahl.value = passend;
  // Löschen geht nur bei eigenen Vorlagen
  document.getElementById("vorlage-loeschen").disabled = passend === KEINE || passend === HOCHSCHULE;

  // „Überschreiben“ nur zeigen, wenn eine eigene Vorlage geändert wurde
  const ueberschreiben = document.getElementById("vorlage-ueberschreiben");
  const zeigen = passend === KEINE && zuletztVorlage !== null && !auswahl.hidden;
  ueberschreiben.hidden = !zeigen;
  if (zeigen) {
    const text = "„" + zuletztVorlage + "“ überschreiben";
    ueberschreiben.title = text;
    ueberschreiben.setAttribute("aria-label", text);
  }
}

// Werte einer Vorlage übernehmen und alles neu rechnen
function vorlageAnwenden(werte) {
  aktuell = { ...werteAufraeumen(werte) };
  felderFuellen();
  geaendert();
}

// Datei herunterladen (bleibt auf dem Rechner)
function dateiHerunterladen(text, dateiname) {
  const blob = new Blob([text], { type: "application/json" });
  const adresse = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = adresse;
  link.download = dateiname;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(adresse), 1000);
}

// Name für Dateien ohne Sonderzeichen: „Wettbewerb 1:200“ → „Wettbewerb-1-200“
function dateiName(name) {
  return name.normalize("NFKD").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "Vorlage";
}

// Sicherheitsfrage ohne Pop-up-Fenster (die gehen nicht in jedem Browser):
// Der erste Klick fragt nach, ein zweiter Klick innerhalb von 5 Sekunden bestätigt.
let wartetAufBestaetigung = null;
function zweimalKlicken(schluessel, frage) {
  if (wartetAufBestaetigung === schluessel) {
    wartetAufBestaetigung = null;
    return true;
  }
  wartetAufBestaetigung = schluessel;
  vorlageMeldung(frage);
  setTimeout(() => {
    if (wartetAufBestaetigung === schluessel) wartetAufBestaetigung = null;
  }, 5000);
  return false;
}

// Neue Vorlage unter einem Namen ablegen (fragt bei gleichem Namen nach)
function alsVorlageAblegen(name, werte) {
  if (name === HOCHSCHULE) {
    vorlageMeldung("„" + HOCHSCHULE + "“ ist fest eingebaut. Wähle bitte einen anderen Namen.");
    return false;
  }
  if (vorlagen[name] && !zweimalKlicken("ueberschreiben:" + name,
    "Es gibt schon eine Vorlage „" + name + "“. Mach es innerhalb von 5 Sekunden nochmal, um sie zu überschreiben.")) return false;
  vorlagen[name] = werteAufraeumen(werte);
  if (!vorlagenSpeichern()) {
    vorlageMeldung("Dein Browser erlaubt hier kein Speichern (z. B. im privaten Fenster). Nutze „Als Datei speichern“.");
    return false;
  }
  return true;
}

function vorlagenStarten() {
  const auswahl = document.getElementById("vorlage-auswahl");
  auswahlFuellen();

  // Bei jeder Änderung prüfen, ob die Werte noch zu einer Vorlage passen
  zuhoerer.push(auswahlFuellen);

  // Vorlage aus der Liste wählen
  auswahl.addEventListener("change", () => {
    const name = auswahl.value;
    if (name === HOCHSCHULE) {
      zuletztVorlage = null;
      vorlageAnwenden(mitJadeHs(aktuell));
      vorlageMeldung("Plattengröße 1000 × 600 mm und Laserfarben der Werkstatt eingestellt. Maßstab und Pappdicken sind geblieben.");
      return;
    }
    if (vorlagen[name]) {
      vorlageAnwenden(vorlagen[name]);
      vorlageMeldung("Vorlage „" + name + "“ geladen.");
    }
  });

  // Aktuelle Werte als Vorlage speichern
  // Speichern in zwei Schritten:
  // 1. Klick auf „Als Vorlage speichern“: Die Auswahlliste wird zum Namensfeld.
  // 2. Namen eintippen und nochmal klicken (oder Enter): gespeichert.
  const nameFeld = document.getElementById("vorlage-name");
  const beschriftung = document.getElementById("vorlage-beschriftung");
  const speichernKnopf = document.getElementById("vorlage-speichern");
  const loeschenKnopf = document.getElementById("vorlage-loeschen");
  const abbrechenKnopf = document.getElementById("vorlage-abbrechen");
  let benennen = false;

  // Geänderte Vorlage mit den aktuellen Werten überschreiben (zweiter Klick bestätigt)
  const ueberschreibenKnopf = document.getElementById("vorlage-ueberschreiben");
  ueberschreibenKnopf.addEventListener("click", () => {
    const name = zuletztVorlage;
    if (!name || !vorlagen[name]) return;
    if (!zweimalKlicken("ueberschreiben:" + name,
      "Klick nochmal auf „" + name + " überschreiben“, um die Vorlage mit den jetzigen Werten zu ersetzen.")) return;
    vorlagen[name] = werteAufraeumen(aktuell);
    if (!vorlagenSpeichern()) {
      vorlageMeldung("Dein Browser erlaubt hier kein Speichern (z. B. im privaten Fenster). Nutze „Als Datei speichern“.");
      return;
    }
    auswahlFuellen();
    vorlageMeldung("Vorlage „" + name + "“ mit den jetzigen Werten überschrieben.");
  });

  function benennenUmschalten(an) {
    benennen = an;
    if (an) ueberschreibenKnopf.hidden = true;
    auswahl.hidden = an;
    nameFeld.hidden = !an;
    loeschenKnopf.hidden = an;
    abbrechenKnopf.hidden = !an;
    beschriftung.textContent = an ? "Name der neuen Vorlage" : "Vorlage wählen";
    // Symbol wechseln: Lesezeichen mit Plus ↔ Haken (bestätigen)
    const text = an ? "Speichern" : "Als Vorlage speichern";
    speichernKnopf.title = text;
    speichernKnopf.setAttribute("aria-label", text);
    speichernKnopf.classList.toggle("bestaetigen", an);
    if (!an) auswahlFuellen(); // Liste und „Überschreiben“-Knopf wieder richtig zeigen
    if (an) {
      nameFeld.value = "";
      nameFeld.focus();
      vorlageMeldung("Gib der Vorlage einen Namen und klick auf „Speichern“ (oder drück Enter).");
    }
  }

  speichernKnopf.addEventListener("click", () => {
    if (!benennen) {
      benennenUmschalten(true);
      return;
    }
    const name = nameFeld.value.trim().slice(0, 60);
    if (!name) {
      vorlageMeldung("Bitte gib zuerst einen Namen ein.");
      nameFeld.focus();
      return;
    }
    if (alsVorlageAblegen(name, aktuell)) {
      benennenUmschalten(false);
      auswahlFuellen();
      vorlageMeldung("Vorlage „" + name + "“ gespeichert. Du findest sie in der Liste.");
    }
  });

  abbrechenKnopf.addEventListener("click", () => {
    benennenUmschalten(false);
    vorlageMeldung("Abgebrochen, nichts gespeichert.");
  });

  // Enter speichert, Esc bricht ab (und das Formular wird nicht abgeschickt)
  nameFeld.addEventListener("keydown", (ereignis) => {
    if (ereignis.key === "Enter") {
      ereignis.preventDefault();
      speichernKnopf.click();
    } else if (ereignis.key === "Escape") {
      abbrechenKnopf.click();
    }
  });

  // Gewählte Vorlage löschen
  document.getElementById("vorlage-loeschen").addEventListener("click", () => {
    const name = auswahl.value;
    if (!vorlagen[name]) return;
    if (!zweimalKlicken("loeschen:" + name,
      "Klick nochmal auf „Vorlage löschen“, um „" + name + "“ wirklich zu löschen.")) return;
    delete vorlagen[name];
    vorlagenSpeichern();
    auswahlFuellen();
    vorlageMeldung("Vorlage „" + name + "“ gelöscht.");
  });

  // Aktuelle Werte als Datei speichern (zum Mitnehmen oder Weitergeben)
  document.getElementById("vorlage-export").addEventListener("click", () => {
    const passend = passendeVorlage();
    const name = passend === KEINE || passend === HOCHSCHULE ? "Meine Vorlage" : passend;
    const inhalt = { art: "ifc-laser-vorlage", version: 1, name, werte: werteAufraeumen(aktuell) };
    dateiHerunterladen(JSON.stringify(inhalt, null, 2), "Vorlage-" + dateiName(name) + ".json");
    vorlageMeldung("Datei „Vorlage-" + dateiName(name) + ".json“ liegt in deinem Download-Ordner.");
  });

  // Vorlage aus einer Datei laden
  const importFeld = document.getElementById("vorlage-import");
  // Symbol-Knopf „Datei laden“ auch mit der Tastatur bedienbar (Enter / Leertaste)
  document.getElementById("vorlage-import-knopf").addEventListener("keydown", (ereignis) => {
    if (ereignis.key === "Enter" || ereignis.key === " ") {
      ereignis.preventDefault();
      importFeld.click();
    }
  });
  importFeld.addEventListener("change", async () => {
    const datei = importFeld.files[0];
    importFeld.value = ""; // damit dieselbe Datei nochmal gewählt werden kann
    if (!datei) return;
    try {
      const inhalt = JSON.parse(await datei.text());
      if (!inhalt || inhalt.art !== "ifc-laser-vorlage" || !inhalt.werte) throw new Error("keine Vorlage");
      const name = String(inhalt.name || datei.name.replace(/\.json$/i, "")).trim().slice(0, 60) || "Geladene Vorlage";
      if (!alsVorlageAblegen(name, inhalt.werte)) return;
      vorlageAnwenden(vorlagen[name]);
      vorlageMeldung("Vorlage „" + name + "“ aus der Datei geladen und gespeichert.");
    } catch {
      vorlageMeldung("„" + datei.name + "“ ist keine Vorlage dieser Seite. Nimm eine Datei, die du hier mit „Als Datei speichern“ erstellt hast.");
    }
  });
}
