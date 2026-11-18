// =========================================================
// Bedienung der Seite
//
// Diese Datei ist wie die Haustechnik: Sie sorgt dafür, dass
// etwas passiert, wenn man klickt oder eine Datei ablegt.
//
// Ablauf:
//   1. Eine oder mehrere IFC-Dateien ablegen – je Datei ein Gebäude.
//      Jede Datei wird gelesen (js/ifc-lesen.js) und bekommt eine Karte
//      mit ✕ (entfernen), „Andere Datei wählen“ (austauschen) und ihrer
//      Bauteil-Liste.
//   2. Einstellungen (js/einstellungen.js), gelten für alle Gebäude.
//   3. „Laserplatten erstellen“:
//        je Gebäude Flächen flach legen (js/abwickeln.js)
//        → Ecken und Schichten (js/schichten.js)
//        → alle Teile gemeinsam auf Platten verteilen (js/verteilen.js)
//        → Vorschau, DXF je Platte (js/dxf.js), Übersichtsblatt (js/uebersicht.js)
//   Ändert sich danach eine Einstellung oder die Liste der Gebäude,
//   wird sofort neu gerechnet.
//
// Nummern: bei einem Gebäude A-001 / I-001 / D-001, bei mehreren mit
// der Gebäude-Nummer davor, z. B. 2-A-001.
// =========================================================

import { einstellungenStarten, beiAenderung, holeEinstellungen } from "./einstellungen.js";
import { platteAlsDxf, dxfHerunterladen, rahmenLinie, EBENEN } from "./dxf.js";
import { flaechenFinden } from "./abwickeln.js";
import { eckenFinden, teileBauen } from "./schichten.js";
import { verteilen } from "./verteilen.js";
import { uebersichtBauen } from "./uebersicht.js";
import { farbmodusStarten } from "./farbmodus.js";
import { Betrachter } from "./betrachter.js"; // 3D-Vorschau (von Svenjas Zusatz 3D übernommen, unverändert)
import { modellTeile, grundrissBreite } from "./modell3d.js";
import { staffageTeile } from "./staffage.js";

// Knopf hell/dunkel (Sonne/Mond) anschließen
farbmodusStarten();

// ---------------------------------------------------------
// Startseite: erscheint bei jedem Öffnen und Neuladen.
// „Erstelle deine Laserdatei“ blendet sie aus und gibt die Arbeitsseite frei.
// ---------------------------------------------------------
const startseite = document.getElementById("startseite");
const arbeitsseite = document.getElementById("arbeitsseite");
const startKnopf = document.getElementById("start-knopf");

// Startseite sanft ausblenden (Fade, siehe .startseite.ausblenden in style.css)
function startseiteSchliessen() {
  if (startseite.classList.contains("ausblenden")) return; // läuft schon
  arbeitsseite.inert = false;
  document.documentElement.classList.remove("start-offen");
  window.scrollTo(0, 0);
  startseite.classList.add("ausblenden");
  // Nach dem Fade ganz entfernen (Dauer wie in style.css, 1,6 s).
  // Falls das Fade abgeschaltet ist („weniger Bewegung“), passiert es sofort.
  const FADE_MS = 1600;
  const ohneBewegung = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  setTimeout(() => { startseite.hidden = true; }, ohneBewegung ? 0 : FADE_MS + 100);
}

// Ein Klick irgendwo auf die Startseite (auch auf den Knopf) blendet sie aus –
// nur nicht der Knopf für hell/dunkel
startseite.addEventListener("click", (ereignis) => {
  if (ereignis.target.closest(".farbmodus-knopf")) return;
  startseiteSchliessen();
});
startKnopf.focus();

// ---------------------------------------------------------
// Bauteile der Seite
// ---------------------------------------------------------
const ablage = document.getElementById("ablage");
const ablageTitel = document.getElementById("ablage-titel");
const dateiEingabe = document.getElementById("datei-eingabe");
const dateiWaehlenKnopf = dateiEingabe.closest("label");
const dateiStatus = document.getElementById("datei-status");
const dateiListe = document.getElementById("datei-liste");
const kartenVorlage = document.getElementById("karten-vorlage");
const erstellenKnopf = document.getElementById("erstellen");
const erstellenHinweis = document.getElementById("erstellen-hinweis");
const warnungenFeld = document.getElementById("warnungen");
const leerePlatte = document.getElementById("vorschau");
const leerText = document.getElementById("vorschau-text");
const plattenFeld = document.getElementById("platten");
const alleDxfKnopf = document.getElementById("dxf-herunterladen");
const druckKnopf = document.getElementById("uebersicht-drucken");
const druckblatt = document.getElementById("druckblatt");

// ---------------------------------------------------------
// Was wir uns merken (alles nur hier im Browser)
// ---------------------------------------------------------
const MAX_GEBAEUDE = 12;
// Alle abgelegten Gebäude, in der Reihenfolge des Ablegens. Je Gebäude:
//   datei      – die IFC-Datei
//   info       – Ergebnis von ifcLesen (Bauteil-Liste und Dreiecke), null solange gelesen wird
//   proxyWahl  – nicht klassifizierte Bauteile: was sind sie?
//   flaechen, ecken – flach gelegte Flächen (hängen nur von der Datei ab)
//   version    – zählt hoch, wenn die Datei ausgetauscht wird (altes Lesen zählt dann nicht mehr)
//   karte      – die Karte auf der Seite
const gebaeude = [];
let ergebnis = null; // Teile und Platten (hängen auch von den Einstellungen ab)
let lesenKette = Promise.resolve(); // Dateien werden nacheinander gelesen

// ---------------------------------------------------------
// Kleine Helfer
// ---------------------------------------------------------
function element(tag, klassen, text) {
  const neu = document.createElement(tag);
  if (klassen) neu.className = klassen;
  if (text !== undefined) neu.textContent = text;
  return neu;
}

function groesseLesbar(byte) {
  if (byte < 1024) return byte + " Byte";
  if (byte < 1024 * 1024) return (byte / 1024).toLocaleString("de-DE", { maximumFractionDigits: 0 }) + " KB";
  return (byte / 1024 / 1024).toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " MB";
}

// Hinweise in der Ablagefläche zeigen (z. B. Datei passt nicht). Leere Liste = ausblenden.
function zeigeHinweise(texte) {
  dateiStatus.textContent = texte.join("\n");
  dateiStatus.className = "datei-status fehler";
  dateiStatus.hidden = texte.length === 0;
}

// Mit der Tastatur bedienbar: Enter oder Leertaste öffnet die Dateiauswahl im Knopf
function tastaturFuerDateiknopf(knopf) {
  knopf.addEventListener("keydown", (ereignis) => {
    if (ereignis.key === "Enter" || ereignis.key === " ") {
      ereignis.preventDefault();
      knopf.querySelector("input").click();
    }
  });
}

// Ziehen und Ablegen auf einer Fläche anschließen
function ablegenAnschliessen(ziel, beiAblegen) {
  ziel.addEventListener("dragover", (ereignis) => {
    ereignis.preventDefault();       // sonst öffnet der Browser die Datei selbst
    ereignis.stopPropagation();
    ziel.classList.add("drueber");   // Fläche färbt sich, solange man darüber ist
  });
  ziel.addEventListener("dragleave", (ereignis) => {
    if (!ziel.contains(ereignis.relatedTarget)) ziel.classList.remove("drueber");
  });
  ziel.addEventListener("drop", (ereignis) => {
    ereignis.preventDefault();
    ereignis.stopPropagation();
    ziel.classList.remove("drueber");
    beiAblegen([...ereignis.dataTransfer.files]);
  });
}

// ---------------------------------------------------------
// Laserplatte als Bild (SVG): dieselben Linien und Farben wie in der DXF.
// In der DXF zeigt y nach oben, am Bildschirm nach unten → umdrehen.
// ---------------------------------------------------------
function plattenSvg(platte, farben) {
  const { breite, hoehe } = platte;
  const alle = [...platte.linien, rahmenLinie(breite, hoehe)];
  const formen = alle.map((linie) => {
    const punkte = linie.punkte.map(([x, y]) => x.toFixed(2) + "," + (hoehe - y).toFixed(2)).join(" ");
    const farbe = farben[EBENEN[linie.ebene]];
    const art = linie.geschlossen ? "polygon" : "polyline";
    return `<${art} points="${punkte}" fill="none" stroke="${farbe}" stroke-width="1.2" vector-effect="non-scaling-stroke" stroke-linejoin="round" />`;
  });
  return (
    `<svg viewBox="0 0 ${breite} ${hoehe}" width="100%" height="100%" role="img" ` +
    `aria-label="Laserplatte ${breite} × ${hoehe} mm">${formen.join("")}</svg>`
  );
}

// Leere Platte, solange noch nichts erstellt ist
function zeichneLeerePlatte(e) {
  leerePlatte.innerHTML = plattenSvg({ breite: e.platteBreite, hoehe: e.platteHoehe, linien: [] }, e.farben);
  leerePlatte.style.aspectRatio = e.platteBreite + " / " + e.platteHoehe;
}

// ---------------------------------------------------------
// Einstellungen: bei jeder Änderung Vorschau bzw. Platten neu
// ---------------------------------------------------------
einstellungenStarten();
beiAenderung((e) => {
  zeichneLeerePlatte(e);
  if (ergebnis) berechnen();
});

// ---------------------------------------------------------
// Gebäude (IFC-Dateien) annehmen, lesen, austauschen, entfernen
// ---------------------------------------------------------
function dateiPruefen(datei) {
  if (!datei.name.toLowerCase().trim().endsWith(".ifc")) {
    return "„" + datei.name + "“ ist keine IFC-Datei. Exportiere dein Modell in Archicad als .ifc und lege diese Datei hier ab.";
  }
  if (datei.size === 0) return "„" + datei.name + "“ ist leer. Exportiere die IFC-Datei bitte noch einmal.";
  return null;
}

// Neue Dateien dazunehmen (je Datei ein Gebäude)
function dateienAnnehmen(dateien) {
  const hinweise = [];
  for (const datei of dateien) {
    const fehler = dateiPruefen(datei);
    if (fehler) {
      hinweise.push(fehler);
      continue;
    }
    if (gebaeude.length >= MAX_GEBAEUDE) {
      hinweise.push(`Höchstens ${MAX_GEBAEUDE} Gebäude auf einmal. „${datei.name}“ wurde nicht übernommen.`);
      continue;
    }
    const g = { datei, info: null, proxyWahl: new Map(), flaechen: null, ecken: null, version: 0, karte: null };
    gebaeude.push(g);
    karteBauen(g);
    lesen(g);
  }
  zeigeHinweise(hinweise);
  listeAktualisieren();
}

// „Andere Datei wählen“ oder Datei auf die Karte gezogen: nur dieses Gebäude austauschen
function dateiTauschen(g, datei) {
  const fehler = dateiPruefen(datei);
  if (fehler) {
    zeigeHinweise([fehler]);
    return;
  }
  zeigeHinweise([]);
  g.datei = datei;
  g.info = null;
  g.proxyWahl = new Map();
  g.flaechen = null;
  g.ecken = null;
  lesen(g);
  listeAktualisieren();
}

// ✕ auf der Karte: dieses Gebäude aus der Seite nehmen.
// Die Datei auf dem Rechner bleibt natürlich.
function gebaeudeEntfernen(g) {
  const i = gebaeude.indexOf(g);
  if (i < 0) return;
  gebaeude.splice(i, 1);
  g.version++; // ein noch laufendes Lesen zählt nicht mehr
  g.karte.li.remove();
  zeigeHinweise([]);
  listeAktualisieren();
  // Tastatur: weiter beim nächsten Gebäude oder bei „Dateien auswählen“
  const naechstes = gebaeude[i] || gebaeude[i - 1];
  (naechstes ? naechstes.karte.entfernen : dateiWaehlenKnopf).focus();
}

// Datei lesen (nacheinander, damit der IFC-Leser nicht doppelt arbeitet)
function lesen(g) {
  const version = ++g.version;
  karteFuellen(g, "wird gelesen …");
  const gilt = () => version === g.version && gebaeude.includes(g);
  lesenKette = lesenKette.then(async () => {
    if (!gilt()) return;
    try {
      // Der IFC-Leser wird erst geladen, wenn er gebraucht wird (er ist groß)
      const { ifcLesen } = await import("./ifc-lesen.js");
      const info = await ifcLesen(g.datei);
      if (!gilt()) return;
      g.info = info;
      // Nicht klassifizierte Bauteile: Gibt es sonst keine Wände und kein Dach,
      // ist der Morph wohl das ganze Gebäude
      const sonstLeer = info.waende.aussen + info.waende.ohneAngabe === 0 && info.daecher === 0;
      for (const p of info.ohneKlasse) g.proxyWahl.set(p.id, sonstLeer ? "koerper" : "ignorieren");
      karteFuellen(g, "✓ gelesen");
      bauteileZeigen(g);
    } catch (fehler) {
      if (!gilt()) return;
      console.error(fehler);
      // Die Datei ließ sich nicht lesen: Karte wieder weg, Hinweis in der Ablagefläche
      gebaeude.splice(gebaeude.indexOf(g), 1);
      g.karte.li.remove();
      zeigeHinweise([
        fehler && fehler.art === "oeffnen"
          ? "„" + g.datei.name + "“ ließ sich nicht als IFC lesen. Exportiere die Datei in Archicad noch einmal als IFC (2x3 oder 4) und lege sie neu ab."
          : "Der IFC-Leser ließ sich nicht starten. Lade die Seite neu. Passiert es wieder, prüfe, ob der Ordner lib/web-ifc vollständig ist.",
      ]);
    }
    listeAktualisieren();
  });
}

// Nach jeder Änderung an der Liste: Nummern, Ablagefläche, Knopf, ggf. neu rechnen
function listeAktualisieren() {
  const mehrere = gebaeude.length > 1;
  gebaeude.forEach((g, i) => {
    g.karte.nummer.textContent = mehrere ? `Gebäude ${i + 1} · ` : "";
  });
  ablage.classList.toggle("ablage-kompakt", gebaeude.length > 0);
  ablageTitel.textContent = gebaeude.length ? "Weitere IFC-Dateien hierher ziehen" : "IFC-Dateien hierher ziehen";

  const fertig = gebaeude.filter((g) => g.info).length;
  erstellenKnopf.disabled = fertig === 0;
  if (gebaeude.length === 0) {
    erstellenHinweis.textContent = "Zuerst eine IFC-Datei ablegen.";
    ergebnis = null;
    zeigeErgebnis();
    return;
  }
  if (ergebnis) {
    // Es gab schon Platten: gleich mit dem neuen Stand neu rechnen
    if (fertig) berechnen();
    else {
      ergebnis = null;
      zeigeErgebnis();
    }
  } else {
    erstellenHinweis.textContent = fertig < gebaeude.length ? "Dateien werden gelesen …" : "Prüfe kurz die Einstellungen, dann los.";
  }
}

// ---------------------------------------------------------
// Karte je Gebäude (Bereich 1)
// ---------------------------------------------------------
function karteBauen(g) {
  const li = kartenVorlage.content.firstElementChild.cloneNode(true);
  const karte = {
    li,
    nummer: li.querySelector(".karte-nummer"),
    name: li.querySelector(".karte-name"),
    info: li.querySelector(".karte-info"),
    tauschen: li.querySelector(".karte-tauschen"),
    details: li.querySelector(".karte-details"),
    bauteile: li.querySelector(".karte-bauteile"),
    entfernen: li.querySelector(".datei-entfernen"),
  };
  g.karte = karte;
  karte.entfernen.addEventListener("click", () => gebaeudeEntfernen(g));
  karte.tauschen.addEventListener("change", () => {
    if (karte.tauschen.files[0]) dateiTauschen(g, karte.tauschen.files[0]);
    karte.tauschen.value = "";
  });
  tastaturFuerDateiknopf(karte.tauschen.closest("label"));
  // Eine Datei auf die Karte ziehen = austauschen; mehrere = dazunehmen
  ablegenAnschliessen(li, (dateien) => {
    if (dateien.length === 1) dateiTauschen(g, dateien[0]);
    else dateienAnnehmen(dateien);
  });
  dateiListe.append(li);
}

function karteFuellen(g, zustand) {
  const k = g.karte;
  k.name.textContent = g.datei.name;
  k.li.title = g.datei.name; // ganzer Name beim Darüberfahren, falls er abgeschnitten ist
  k.info.textContent = groesseLesbar(g.datei.size) + " · " + zustand;
  k.entfernen.setAttribute("aria-label", "„" + g.datei.name + "“ entfernen");
  if (!g.info) k.details.hidden = true;
}

// Bauteil-Liste eines Gebäudes in seine Karte schreiben
function bauteileZeigen(g) {
  const e = g.info;
  const kopf = element("p", "text-leise mb-3", "Format " + e.schema + " · Einheit " + e.einheit);

  const liste = element("dl", "grid grid-cols-[auto_1fr] gap-x-6 gap-y-1");
  const zeile = (name, wert, zusatz) => {
    liste.append(element("dt", "text-leise", name));
    const feld = element("dd", "font-bold", wert);
    if (zusatz) feld.append(element("span", "font-normal text-leise", " · " + zusatz));
    liste.append(feld);
  };
  const w = e.waende;
  zeile("Außenwände", String(w.aussen), w.aussenFrei ? "davon " + w.aussenFrei + " freie Form / Morph" : "");
  if (w.ohneAngabe) zeile("Wände ohne Angabe", String(w.ohneAngabe), "weder „Außen“ noch „Innen“");
  if (w.innen) zeile("Innenwände", String(w.innen), "werden nicht verwendet");
  if (e.vorhangfassaden) zeile("Vorhangfassaden", String(e.vorhangfassaden), "noch nicht unterstützt");
  // Die Zahl der Dachflächen (Ebenen) steht nach „Laserplatten erstellen“ in Bereich 3
  zeile("Dächer", String(e.daecher), e.dachplatten ? "aus " + e.dachplatten + " Dachplatten" : "");
  zeile("Fenster", String(e.fenster), "");
  zeile("Türen", String(e.tueren), "");
  if (e.decken) zeile("Decken / Böden", String(e.decken), "werden nicht verwendet");
  zeile("Ohne Klassifizierung", String(e.ohneKlasse.length), "");

  const hinweise = element("ul", "mt-3 space-y-2");
  if (e.hinweise.length === 0) {
    hinweise.append(element("li", "", "✓ Außenwände und Dach sind da. Mehr brauchen wir für die Fassaden nicht."));
  }
  for (const text of e.hinweise) {
    const punkt = element("li", "flex gap-2");
    punkt.append(element("span", "text-akzent font-bold", "!"), element("span", "", text));
    hinweise.append(punkt);
  }
  const inhalt = [kopf, liste, hinweise];

  // Auswahl für nicht klassifizierte Bauteile (z. B. Morphs)
  if (e.ohneKlasse.length) {
    const kasten = element("div", "mt-4 pt-3 border-t border-linie");
    kasten.append(element("p", "titel text-xs font-bold text-leise mb-3", "Nicht klassifiziert – was ist das?"));
    for (const p of e.ohneKlasse) {
      const reihe = element("label", "flex flex-wrap items-center gap-3 mb-2");
      reihe.append(element("span", "min-w-[8rem]", p.name));
      const auswahl = element("select", "feld w-auto max-w-full"); // nie breiter als die Karte (Handy)
      for (const [wert, text] of [
        ["koerper", "Wand und Dach (ganzer Gebäudekörper)"],
        ["wand", "Wand"],
        ["dach", "Dach"],
        ["ignorieren", "Ignorieren"],
      ]) {
        const option = element("option", "", text);
        option.value = wert;
        auswahl.append(option);
      }
      auswahl.value = g.proxyWahl.get(p.id) || "ignorieren";
      auswahl.addEventListener("change", () => {
        g.proxyWahl.set(p.id, auswahl.value);
        g.flaechen = null; // neu flach legen
        g.ecken = null;
        if (ergebnis) berechnen();
      });
      reihe.append(auswahl);
      kasten.append(reihe);
    }
    inhalt.push(kasten);
  }

  g.karte.bauteile.replaceChildren(...inhalt);
  g.karte.details.hidden = false;
  // Aufgeklappt bei nur einem Gebäude oder wenn es Hinweise gibt
  g.karte.details.open = gebaeude.length === 1 || e.hinweise.length > 0;
}

// ---------------------------------------------------------
// Laserplatten berechnen (Bereich 3)
// ---------------------------------------------------------
function berechnen() {
  const fertig = gebaeude.filter((g) => g.info);
  if (!fertig.length) {
    ergebnis = null;
    zeigeErgebnis();
    return;
  }
  const e = holeEinstellungen();
  const mehrere = gebaeude.length > 1;
  const teile = [];
  const liste = [];
  for (const g of fertig) {
    const nummer = gebaeude.indexOf(g) + 1;
    if (!g.flaechen) {
      g.flaechen = flaechenFinden(g.info.huelle, g.proxyWahl);
      g.ecken = eckenFinden(g.flaechen);
    }
    // Bei mehreren Gebäuden steht die Gebäude-Nummer vor der Teilenummer (2-A-001)
    for (const t of teileBauen(g.flaechen, g.ecken, e, mehrere ? nummer + "-" : "")) {
      teile.push({ ...t, gebaeude: nummer });
    }
    liste.push({ nummer, name: g.datei.name, flaechen: g.flaechen, ecken: g.ecken });
  }
  // Menschen und Bäume (Staffage) kommen mit auf die Platten
  teile.push(...staffageTeile(e));
  // Alle Teile aller Gebäude teilen sich die Platten (spart Pappe)
  const { platten, zuGross } = verteilen(teile, e);
  ergebnis = { teile, platten, zuGross, einstellungen: e, gebaeude: liste, mehrere };
  zeigeErgebnis();
}

erstellenKnopf.addEventListener("click", () => {
  erstellenKnopf.disabled = true;
  erstellenHinweis.textContent = "Wird berechnet …";
  // kurz warten, damit der Hinweis sichtbar wird, dann rechnen
  setTimeout(() => {
    try {
      berechnen();
      erstellenHinweis.textContent = "Fertig. Änderst du eine Einstellung, rechnet die App sofort neu.";
      document.getElementById("bereich-vorschau").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (fehler) {
      console.error(fehler);
      erstellenHinweis.textContent = "Beim Berechnen ist ein Fehler passiert. Bitte sag Bescheid, mit welcher Datei.";
    }
    erstellenKnopf.disabled = false;
  }, 30);
});

// ---------------------------------------------------------
// Modell-Vorschau (Bereich 3): alle Pappteile in 3D zusammengesetzt,
// so wie das Modell nach dem Kleben aussieht. Ändert sich eine
// Einstellung (z. B. Wandaufbau), wird neu gerechnet und neu gezeigt.
// Mehrere Gebäude stehen nebeneinander (nicht in ihrer echten Lage).
// ---------------------------------------------------------
var modellBetrachter = null; // „var“, weil modellZeigen schon beim Start aufgerufen werden kann

function modellZeigen() {
  const modellFeld = document.getElementById("modell3d");
  const modellLeinwand = document.getElementById("modell-canvas");
  const modellLegende = document.getElementById("modell-legende");
  if (!ergebnis || ergebnis.teile.length === 0) {
    modellFeld.hidden = true;
    return;
  }
  modellFeld.hidden = false;
  if (!modellBetrachter) modellBetrachter = new Betrachter(modellLeinwand);
  const { teile, einstellungen: e, gebaeude: liste } = ergebnis;
  const k = 1000 / e.massstab;
  const alle = [];
  let naechstesX = 0;
  for (const b of liste) {
    const eigene = teile.filter((t) => t.gebaeude === b.nummer);
    if (!eigene.length) continue;
    // erst ohne Versatz bauen, um die Breite zu kennen, dann daneben stellen
    const probe = modellTeile(b.flaechen, eigene, k, e.farben.ritzen);
    const r = grundrissBreite(probe);
    const versatz = [naechstesX - r.x0, 0];
    alle.push(...(versatz[0] === 0 ? probe : modellTeile(b.flaechen, eigene, k, e.farben.ritzen, versatz)));
    naechstesX += r.x1 - r.x0 + 20; // 2 cm Abstand zwischen den Gebäuden
  }
  modellBetrachter.setzen(alle, null);
  const aufbau = e.wandaufbau || "zwei";
  const eintraege = [
    [[216, 205, 189], aufbau === "zwei" ? "Außenschicht (A)" : "Wand (A)"],
    ...(aufbau === "zwei" ? [[[169, 157, 138], "Innenschicht (I)"]] : []),
    [[205, 97, 72], "Dach (D)"],
  ];
  modellLegende.replaceChildren(
    ...eintraege.map(([farbe, text]) => {
      const eintrag = element("span", "inline-flex items-center gap-1 mr-3");
      const punkt = element("span", "inline-block w-3 h-3 rounded-sm");
      punkt.style.background = `rgb(${farbe.join(",")})`;
      eintrag.append(punkt, document.createTextNode(text));
      return eintrag;
    }),
    document.createTextNode(
      (aufbau === "eine-geritzt" ? "Blaue Linien = geritzt. " : "") +
        "Echte Maße und Pappdicken, so wie die Teile auf den Platten. Ziehen = drehen, Mausrad = zoomen, Doppelklick = zurück." +
        (liste.length > 1 ? " Mehrere Gebäude stehen nebeneinander, nicht in ihrer echten Lage." : "")
    )
  );
}

// ---------------------------------------------------------
// Ergebnis zeigen: Warnungen, Platten, Knöpfe
// ---------------------------------------------------------
function zeigeErgebnis() {
  const hatErgebnis = !!ergebnis;
  leerePlatte.hidden = hatErgebnis;
  leerText.hidden = hatErgebnis;
  plattenFeld.hidden = !hatErgebnis;
  alleDxfKnopf.disabled = !hatErgebnis || ergebnis.platten.length === 0;
  druckKnopf.disabled = !hatErgebnis || ergebnis.platten.length === 0;
  warnungenFeld.replaceChildren();
  warnungenFeld.hidden = true;
  plattenFeld.replaceChildren();
  modellZeigen();
  if (!hatErgebnis) return;

  const { teile, platten, zuGross, einstellungen: e, gebaeude: liste, mehrere } = ergebnis;

  // Warnungen und Hinweise
  const warnungen = [];
  if (teile.length === 0) {
    warnungen.push("Es wurden keine Außenflächen gefunden. Prüfe die Bauteil-Liste oben (Außenwände, Dach, nicht klassifizierte Bauteile).");
  } else if (mehrere) {
    for (const b of liste) {
      if (!teile.some((t) => t.gebaeude === b.nummer)) {
        warnungen.push(`Gebäude ${b.nummer} („${b.name}“): Es wurden keine Außenflächen gefunden. Prüfe seine Bauteil-Liste oben.`);
      }
    }
  }
  for (const t of zuGross) {
    warnungen.push(
      `${t.name} ist zu groß für die Platte (${Math.round(t.b)} × ${Math.round(t.h)} mm). ` +
        "Wähle einen kleineren Maßstab (z. B. 1:200) oder eine größere Platte. Das Teil wird nicht verkleinert."
    );
  }
  const schraeg = liste.some((b) => b.ecken.some((c) => b.flaechen[c.i].wofuer === "fassade" && Math.abs(Math.cos(c.phi)) > 0.02));
  if (schraeg) {
    warnungen.push("Die Wände haben schräge Ecken (nicht 90°). Dort bleibt beim Kleben eine kleine Keilfuge, weil der Laser senkrecht schneidet.");
  }
  for (const text of warnungen) {
    const punkt = element("li", "flex gap-2");
    punkt.append(element("span", "text-akzent font-bold", "!"), element("span", "", text));
    warnungenFeld.append(punkt);
  }
  warnungenFeld.hidden = warnungen.length === 0;

  // Zusammenfassung
  const fassaden = new Set(teile.filter((t) => t.wofuer === "fassade").map((t) => t.gebaeude + ":" + t.flaecheIndex)).size;
  const dach = teile.filter((t) => t.wofuer === "dach").length;
  plattenFeld.append(
    element(
      "p",
      "text-sm",
      (mehrere ? `${liste.length} Gebäude: ` : "") +
        `${fassaden} Fassaden (${
          (e.wandaufbau || "zwei") === "zwei" ? "je Außen- und Innenschicht" : e.wandaufbau === "eine-geritzt" ? "je eine Schicht, Öffnungen geritzt" : "je eine Schicht, ohne Öffnungen"
        }) und ${dach} Dachflächen` +
        (e.menschen ? `, ${e.menschen} ${e.menschen === 1 ? "Mensch" : "Menschen"}` : "") +
        (e.baeume ? `, ${e.baeume} ${e.baeume === 1 ? "Baum" : "Bäume"} (je 2 Teile)` : "") +
        ` = ${teile.length} Teile ` +
        `auf ${platten.length} ${platten.length === 1 ? "Platte" : "Platten"} (Maßstab 1:${e.massstab}).`
    )
  );
  // Verschiedene Pappdicken: getrennte Platten, das sagen wir deutlich
  const dicken = [...new Set(platten.map((p) => p.dicke))];
  if (dicken.length > 1) {
    const teilText = dicken
      .map((d) => {
        const anzahl = platten.filter((p) => p.dicke === d).length;
        return `${anzahl} ${anzahl === 1 ? "Platte" : "Platten"} ${mmText(d)} Pappe`;
      })
      .join(" und ");
    plattenFeld.append(
      element("p", "text-sm", `Weil du verschiedene Pappdicken gewählt hast, liegen die Teile getrennt: ${teilText}. Achte beim Lasern auf die richtige Pappe.`)
    );
  }

  // Je Platte: Überschrift, DXF-Knopf, Bild
  platten.forEach((platte, i) => {
    const block = element("div", "");
    const kopf = element("div", "flex flex-wrap items-center justify-between gap-2 mb-2");
    kopf.append(
      element(
        "h3",
        "titel text-xs font-bold text-leise",
        `Platte ${i + 1} von ${platten.length} · Pappe ${mmText(platte.dicke)} · ${platte.teile.length} Teile`
      )
    );
    const knopf = element("button", "knopf text-sm", `DXF Platte ${i + 1} (${mmText(platte.dicke)})`);
    knopf.type = "button";
    knopf.addEventListener("click", () => platteHerunterladen(i));
    kopf.append(knopf);
    const bild = element("div", "platte rounded-sm");
    bild.style.aspectRatio = platte.breite + " / " + platte.hoehe;
    bild.innerHTML = plattenSvg(platte, e.farben);
    block.append(kopf, bild);
    plattenFeld.append(block);
  });
}

// ---------------------------------------------------------
// Herunterladen und Drucken
// ---------------------------------------------------------
function dateiBasis() {
  if (!ergebnis || ergebnis.gebaeude.length !== 1) return "Mehrere-Gebaeude";
  const basis = ergebnis.gebaeude[0].name.replace(/\.ifc\s*$/i, "").trim().replace(/[^A-Za-z0-9ÄÖÜäöüß_-]+/g, "-");
  return basis || "Modell";
}

function platteHerunterladen(i) {
  if (!ergebnis) return;
  const { platten, einstellungen: e } = ergebnis;
  const zwei = (z) => String(z).padStart(2, "0");
  const text = platteAlsDxf(platten[i], e.farben);
  // Pappdicke im Dateinamen, z. B. „…_Platte-02-von-03_Pappe-1-5mm.dxf“
  const dicke = String(platten[i].dicke).replace(".", "-") + "mm";
  dxfHerunterladen(text, `${dateiBasis()}_Platte-${zwei(i + 1)}-von-${zwei(platten.length)}_Pappe-${dicke}.dxf`);
}

// 1.5 → „1,5 mm“
function mmText(z) {
  return String(z).replace(".", ",") + " mm";
}

alleDxfKnopf.addEventListener("click", () => {
  if (!ergebnis) return;
  // nacheinander, damit der Browser jede Datei annimmt
  ergebnis.platten.forEach((p, i) => setTimeout(() => platteHerunterladen(i), i * 500));
});

druckKnopf.addEventListener("click", () => {
  if (!ergebnis) return;
  druckblatt.replaceChildren(
    uebersichtBauen({
      einstellungen: ergebnis.einstellungen,
      gebaeude: ergebnis.gebaeude,
      teile: ergebnis.teile,
      platten: ergebnis.platten,
      mehrere: ergebnis.mehrere,
    })
  );
  window.print();
});

// ---------------------------------------------------------
// Dateien ablegen: Knopf „Dateien auswählen“ oder Ziehen
// ---------------------------------------------------------
dateiEingabe.addEventListener("change", () => {
  dateienAnnehmen([...dateiEingabe.files]);
  dateiEingabe.value = ""; // damit dieselben Dateien nochmal gewählt werden können
});
tastaturFuerDateiknopf(dateiWaehlenKnopf);
ablegenAnschliessen(ablage, dateienAnnehmen);

// Daneben fallen gelassene Dateien nicht vom Browser öffnen lassen
window.addEventListener("dragover", (ereignis) => ereignis.preventDefault());
window.addEventListener("drop", (ereignis) => ereignis.preventDefault());
