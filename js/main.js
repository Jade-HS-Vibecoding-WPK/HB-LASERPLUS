// =========================================================
// Bedienung der Seite
//
// Diese Datei ist wie die Haustechnik: Sie sorgt dafür, dass
// etwas passiert, wenn man klickt oder eine Datei ablegt.
//
// Ablauf:
//   1. Datei ablegen → IFC lesen (js/ifc-lesen.js) → Bauteil-Liste
//   2. Einstellungen (js/einstellungen.js)
//   3. „Laserplatten erstellen“:
//        Flächen flach legen (js/abwickeln.js)
//        → Ecken und Schichten (js/schichten.js)
//        → auf Platten verteilen, Nummern daneben (js/verteilen.js)
//        → Vorschau, DXF je Platte (js/dxf.js), Übersichtsblatt (js/uebersicht.js)
//   Ändert sich danach eine Einstellung, wird sofort neu gerechnet.
// =========================================================

import { einstellungenStarten, beiAenderung, holeEinstellungen } from "./einstellungen.js";
import { platteAlsDxf, dxfHerunterladen, rahmenLinie, EBENEN } from "./dxf.js";
import { flaechenFinden } from "./abwickeln.js";
import { eckenFinden, teileBauen } from "./schichten.js";
import { verteilen } from "./verteilen.js";
import { uebersichtBauen } from "./uebersicht.js";

// ---------------------------------------------------------
// Bauteile der Seite
// ---------------------------------------------------------
const ablage = document.getElementById("ablage");
const dateiEingabe = document.getElementById("datei-eingabe");
const dateiStatus = document.getElementById("datei-status");
const bauteileFeld = document.getElementById("bauteile");
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
let ifcInfo = null;          // Ergebnis von ifcLesen (Bauteil-Liste und Dreiecke)
let dateiName = "";
const proxyWahl = new Map(); // nicht klassifizierte Bauteile: was sind sie?
let flaechen = null;         // flach gelegte Flächen (hängen nur von der Datei ab)
let ecken = null;
let ergebnis = null;         // Teile und Platten (hängen auch von den Einstellungen ab)

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

function zeigeStatus(text, art) {
  dateiStatus.textContent = text;
  dateiStatus.className = "datei-status " + art;
  dateiStatus.hidden = false;
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
// Datei annehmen, prüfen und lesen
// ---------------------------------------------------------
let leseNummer = 0; // damit eine alte Datei nicht die Liste einer neuen überschreibt

function zuruecksetzen() {
  ifcInfo = null;
  flaechen = null;
  ecken = null;
  ergebnis = null;
  proxyWahl.clear();
  bauteileFeld.hidden = true;
  erstellenKnopf.disabled = true;
  erstellenHinweis.textContent = "Zuerst oben eine IFC-Datei ablegen.";
  zeigeErgebnis();
}

function dateiAnnehmen(datei) {
  if (!datei) return;
  leseNummer++;
  zuruecksetzen();

  if (!datei.name.toLowerCase().trim().endsWith(".ifc")) {
    zeigeStatus(
      "„" + datei.name + "“ ist keine IFC-Datei. Exportiere dein Modell in Archicad als .ifc und lege diese Datei hier ab.",
      "fehler"
    );
    return;
  }
  if (datei.size === 0) {
    zeigeStatus("„" + datei.name + "“ ist leer. Exportiere die IFC-Datei bitte noch einmal.", "fehler");
    return;
  }
  zeigeStatus(datei.name + " · " + groesseLesbar(datei.size) + " · wird gelesen …", "ok");
  dateiLesen(datei);
}

async function dateiLesen(datei) {
  const nummer = leseNummer;
  try {
    // Der IFC-Leser wird erst geladen, wenn er gebraucht wird (er ist groß)
    const { ifcLesen } = await import("./ifc-lesen.js");
    const info = await ifcLesen(datei);
    if (nummer !== leseNummer) return;
    ifcInfo = info;
    dateiName = datei.name;
    // Nicht klassifizierte Bauteile: Gibt es sonst keine Wände und kein Dach,
    // ist der Morph wohl das ganze Gebäude
    const sonstLeer = info.waende.aussen + info.waende.ohneAngabe === 0 && info.daecher === 0;
    for (const p of info.ohneKlasse) proxyWahl.set(p.id, sonstLeer ? "koerper" : "ignorieren");
    zeigeStatus(datei.name + " · " + groesseLesbar(datei.size) + " · gelesen", "ok");
    zeigeBauteile(info);
    erstellenKnopf.disabled = false;
    erstellenHinweis.textContent = "Prüfe kurz die Einstellungen, dann los.";
  } catch (fehler) {
    if (nummer !== leseNummer) return;
    console.error(fehler);
    if (fehler && fehler.art === "oeffnen") {
      zeigeStatus(
        "„" + datei.name + "“ ließ sich nicht als IFC lesen. Exportiere die Datei in Archicad noch einmal als IFC (2x3 oder 4) und lege sie neu ab.",
        "fehler"
      );
    } else {
      zeigeStatus(
        "Der IFC-Leser ließ sich nicht starten. Lade die Seite neu. Passiert es wieder, prüfe, ob der Ordner lib/web-ifc vollständig ist.",
        "fehler"
      );
    }
  }
}

// ---------------------------------------------------------
// Bauteil-Liste (Bereich 1)
// ---------------------------------------------------------
function zeigeBauteile(e) {
  const titel = element("h3", "titel text-xs font-bold text-leise mb-2", "Das steckt in deiner Datei");
  const kopf = element("p", "text-sm text-leise mb-4", "Format " + e.schema + " · Einheit " + e.einheit);

  const liste = element("dl", "grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm");
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

  const hinweise = element("ul", "mt-4 space-y-2 text-sm");
  if (e.hinweise.length === 0) {
    hinweise.append(element("li", "", "✓ Außenwände und Dach sind da. Mehr brauchen wir für die Fassaden nicht."));
  }
  for (const text of e.hinweise) {
    const punkt = element("li", "flex gap-2");
    punkt.append(element("span", "text-akzent font-bold", "!"), element("span", "", text));
    hinweise.append(punkt);
  }

  const teile = [titel, kopf, liste, hinweise];

  // Auswahl für nicht klassifizierte Bauteile (z. B. Morphs)
  if (e.ohneKlasse.length) {
    const kasten = element("div", "mt-5 pt-4 border-t border-linie");
    kasten.append(element("h4", "titel text-xs font-bold text-leise mb-3", "Nicht klassifiziert – was ist das?"));
    for (const p of e.ohneKlasse) {
      const reihe = element("label", "flex flex-wrap items-center gap-3 text-sm mb-2");
      reihe.append(element("span", "min-w-[10rem]", p.name));
      const auswahl = element("select", "feld w-auto");
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
      auswahl.value = proxyWahl.get(p.id) || "ignorieren";
      auswahl.addEventListener("change", () => {
        proxyWahl.set(p.id, auswahl.value);
        flaechen = null; // neu flach legen
        ecken = null;
        if (ergebnis) berechnen();
      });
      reihe.append(auswahl);
      kasten.append(reihe);
    }
    teile.push(kasten);
  }

  bauteileFeld.replaceChildren(...teile);
  bauteileFeld.hidden = false;
}

// ---------------------------------------------------------
// Laserplatten berechnen (Bereich 3)
// ---------------------------------------------------------
function berechnen() {
  if (!ifcInfo) return;
  const e = holeEinstellungen();
  if (!flaechen) {
    flaechen = flaechenFinden(ifcInfo.huelle, proxyWahl);
    ecken = eckenFinden(flaechen);
  }
  const teile = teileBauen(flaechen, ecken, e);
  const { platten, zuGross } = verteilen(teile, e);
  ergebnis = { teile, platten, zuGross, einstellungen: e };
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
  if (!hatErgebnis) return;

  const { teile, platten, zuGross, einstellungen: e } = ergebnis;

  // Warnungen und Hinweise
  const warnungen = [];
  if (teile.length === 0) {
    warnungen.push("Es wurden keine Außenflächen gefunden. Prüfe die Bauteil-Liste oben (Außenwände, Dach, nicht klassifizierte Bauteile).");
  }
  for (const t of zuGross) {
    warnungen.push(
      `${t.name} ist zu groß für die Platte (${Math.round(t.b)} × ${Math.round(t.h)} mm). ` +
        "Wähle einen kleineren Maßstab (z. B. 1:200) oder eine größere Platte. Das Teil wird nicht verkleinert."
    );
  }
  if (ecken.some((c) => flaechen[c.i].wofuer === "fassade" && Math.abs(Math.cos(c.phi)) > 0.02)) {
    warnungen.push("Die Wände haben schräge Ecken (nicht 90°). Dort bleibt beim Kleben eine kleine Keilfuge, weil der Laser senkrecht schneidet.");
  }
  for (const text of warnungen) {
    const punkt = element("li", "flex gap-2");
    punkt.append(element("span", "text-akzent font-bold", "!"), element("span", "", text));
    warnungenFeld.append(punkt);
  }
  warnungenFeld.hidden = warnungen.length === 0;

  // Zusammenfassung
  const fassaden = new Set(teile.filter((t) => t.wofuer === "fassade").map((t) => t.flaecheIndex)).size;
  const dach = teile.filter((t) => t.wofuer === "dach").length;
  plattenFeld.append(
    element(
      "p",
      "text-sm",
      `${fassaden} Fassaden (je Außen- und Innenschicht) und ${dach} Dachflächen = ${teile.length} Teile ` +
        `auf ${platten.length} ${platten.length === 1 ? "Platte" : "Platten"} (Maßstab 1:${e.massstab}).`
    )
  );

  // Je Platte: Überschrift, DXF-Knopf, Bild
  platten.forEach((platte, i) => {
    const block = element("div", "");
    const kopf = element("div", "flex flex-wrap items-center justify-between gap-2 mb-2");
    kopf.append(
      element("h3", "titel text-xs font-bold text-leise", `Platte ${i + 1} von ${platten.length} · ${platte.teile.length} Teile`)
    );
    const knopf = element("button", "knopf text-sm", `DXF Platte ${i + 1}`);
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
  const basis = dateiName.replace(/\.ifc\s*$/i, "").trim().replace(/[^A-Za-z0-9ÄÖÜäöüß_-]+/g, "-");
  return basis || "Modell";
}

function platteHerunterladen(i) {
  if (!ergebnis) return;
  const { platten, einstellungen: e } = ergebnis;
  const zwei = (z) => String(z).padStart(2, "0");
  const text = platteAlsDxf(platten[i], e.farben);
  dxfHerunterladen(text, `${dateiBasis()}_Platte-${zwei(i + 1)}-von-${zwei(platten.length)}.dxf`);
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
      dateiName,
      einstellungen: ergebnis.einstellungen,
      flaechen,
      teile: ergebnis.teile,
      platten: ergebnis.platten,
      ecken,
    })
  );
  window.print();
});

// ---------------------------------------------------------
// Datei ablegen: Knopf „Datei auswählen“ oder Ziehen
// ---------------------------------------------------------
dateiEingabe.addEventListener("change", () => {
  dateiAnnehmen(dateiEingabe.files[0]);
  dateiEingabe.value = ""; // damit dieselbe Datei nochmal gewählt werden kann
});

ablage.addEventListener("dragover", (ereignis) => {
  ereignis.preventDefault();          // sonst öffnet der Browser die Datei selbst
  ablage.classList.add("drueber");    // Fläche färbt sich, solange man darüber ist
});
ablage.addEventListener("dragleave", (ereignis) => {
  if (!ablage.contains(ereignis.relatedTarget)) ablage.classList.remove("drueber");
});
ablage.addEventListener("drop", (ereignis) => {
  ereignis.preventDefault();
  ablage.classList.remove("drueber");
  const dateien = ereignis.dataTransfer.files;
  if (dateien.length > 1) {
    leseNummer++;
    zuruecksetzen();
    zeigeStatus("Bitte lege nur eine Datei ab, ein Gebäude pro Durchgang.", "fehler");
    return;
  }
  dateiAnnehmen(dateien[0]);
});

// Daneben fallen gelassene Dateien nicht vom Browser öffnen lassen
window.addEventListener("dragover", (ereignis) => ereignis.preventDefault());
window.addEventListener("drop", (ereignis) => ereignis.preventDefault());
