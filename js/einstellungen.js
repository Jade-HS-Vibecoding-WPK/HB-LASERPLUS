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
  // Wandaufbau: "zwei" = Außen- und Innenschicht (Standard),
  // "eine-geritzt" = eine Schicht, Fenster/Türen geritzt,
  // "eine-ohne" = eine Schicht ohne Fenster/Türen
  wandaufbau: "zwei",
  farben: { ...HOCHSCHUL_FARBEN },
};

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
  dickenfelderAnpassen();
}

// Bei einer Schicht gibt es nur eine Pappdicke für die Wand:
// Das Feld „Pappdicke innen“ heißt dann „Pappdicke Wand“, „außen“ verschwindet.
function dickenfelderAnpassen() {
  const eineSchicht = aktuell.wandaufbau !== "zwei";
  document.getElementById("dicke-innen-text").textContent = eineSchicht ? "Pappdicke Wand und Dach" : "Pappdicke innen";
  document.getElementById("dicke-aussen-feld").style.display = eineSchicht ? "none" : "";
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
  const aufbau = document.getElementById("wandaufbau").value;
  if (WANDAUFBAU.includes(aufbau)) aktuell.wandaufbau = aufbau;
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
  const farbe = (wert, ersatz) => (typeof wert === "string" && /^#[0-9a-f]{6}$/i.test(wert) ? wert.toLowerCase() : ersatz);
  const f = werte.farben || {};
  return {
    massstab: zahl(werte.massstab, STARTWERTE.massstab),
    dickeInnen: dicke(werte.dickeInnen, STARTWERTE.dickeInnen),
    dickeAussen: dicke(werte.dickeAussen, STARTWERTE.dickeAussen),
    platteBreite: zahl(werte.platteBreite, STARTWERTE.platteBreite),
    platteHoehe: zahl(werte.platteHoehe, STARTWERTE.platteHoehe),
    wandaufbau: WANDAUFBAU.includes(werte.wandaufbau) ? werte.wandaufbau : STARTWERTE.wandaufbau,
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
  if (zeigen) ueberschreiben.textContent = "„" + zuletztVorlage + "“ überschreiben";
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
    speichernKnopf.textContent = an ? "Speichern" : "Als Vorlage speichern";
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
