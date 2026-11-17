// =========================================================
// Einstellungen und Laserfarben
//
// Hier steht alles, was man in Bereich 2 einstellt.
// Die Seite merkt sich die Werte im Browser auf diesem Rechner
// („localStorage“, eine Art Notizzettel im Browser).
// Nichts davon geht an einen Server.
// =========================================================

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
  farben: { ...HOCHSCHUL_FARBEN },
};

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
    return {
      ...kopieStartwerte(),
      ...gespeichert,
      farben: { ...HOCHSCHUL_FARBEN, ...(gespeichert.farben || {}) },
    };
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
  // „input“ reagiert sofort beim Tippen oder Farbe-Ziehen
  formular.addEventListener("input", () => {
    felderLesen();
    geaendert();
  });
  // Beim Verlassen eines Feldes ungültige Eingaben wieder zurücksetzen
  formular.addEventListener("change", felderFuellen);

  // Knopf „Auf Hochschul-Werte zurücksetzen“:
  // Laserfarben und Plattengröße (gelber Rahmen 1000 × 600 mm) der Werkstatt.
  // Maßstab und Pappdicken bleiben, die sind deine eigene Wahl.
  document.getElementById("farben-zuruecksetzen").addEventListener("click", () => {
    aktuell.farben = { ...HOCHSCHUL_FARBEN };
    aktuell.platteBreite = STARTWERTE.platteBreite;
    aktuell.platteHoehe = STARTWERTE.platteHoehe;
    felderFuellen();
    geaendert();
  });
}
