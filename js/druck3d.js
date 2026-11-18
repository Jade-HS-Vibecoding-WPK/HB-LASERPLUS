// =========================================================
// ZUSATZ 3D: Seite „Erstelle deine 3D-Druck-Datei“
//
// Aufbau wie die Laser-Seite:
//   1. IFC-Dateien ablegen (je Datei ein Gebäude), Karten mit ✕
//   2. Einstellungen für den 3D-Druck (Maßstab, Druckbett, Sockel, Dach)
//   3. 3D-Vorschau (js/betrachter.js) und STL-Knöpfe (js/stl.js)
//
// Das Modell besteht aus den Dreiecken der Gebäudehülle aus der IFC
// (Außenwände samt Schichten, Dach, gewählte Morphs), im Maßstab,
// z nach oben, auf den Boden gestellt. Auf Wunsch mit Sockelplatte
// und mit dem Dach als eigener Datei (abnehmbar).
//
// Ehrlich: Die IFC-Bauteile sind einzelne Körper, die sich berühren
// oder überlappen. Die meisten Slicer kommen damit zurecht – ob es
// sauber druckt, zeigt erst der Slicer.
//
// Downloads: Die STL-Knöpfe speichern erst, wenn jemand darauf klickt.
// =========================================================

import { stlBinaer, stlHerunterladen } from "./stl.js";
import { Betrachter } from "./betrachter.js";

const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------
// Einstellungen (eigene, getrennt von der Laser-Seite)
// ---------------------------------------------------------
const SPEICHER_NAME = "ifc-laser-3d-einstellungen";
const STARTWERTE = {
  massstab: 200,       // 1:200
  bettBreite: 220,     // mm
  bettTiefe: 220,      // mm
  bettHoehe: 250,      // mm
  sockel: true,
  sockelDicke: 2,      // mm
  sockelRand: 3,       // mm rund ums Gebäude
  dachGetrennt: false,
};
const FELDER = {
  massstab: "d3-massstab",
  bettBreite: "d3-bett-breite",
  bettTiefe: "d3-bett-tiefe",
  bettHoehe: "d3-bett-hoehe",
  sockelDicke: "d3-sockel-dicke",
  sockelRand: "d3-sockel-rand",
};
const HAKEN = { sockel: "d3-sockel", dachGetrennt: "d3-dach-getrennt" };

function einstellungenLaden() {
  try {
    const gespeichert = JSON.parse(localStorage.getItem(SPEICHER_NAME) || "{}");
    return { ...STARTWERTE, ...gespeichert };
  } catch {
    return { ...STARTWERTE };
  }
}
let e = einstellungenLaden();

function einstellungenSpeichern() {
  try {
    localStorage.setItem(SPEICHER_NAME, JSON.stringify(e));
  } catch {
    // ohne Speicher (z. B. privates Fenster): gilt bis zum Neuladen
  }
}

function felderFuellen() {
  for (const [name, id] of Object.entries(FELDER)) $(id).value = String(e[name]);
  for (const [name, id] of Object.entries(HAKEN)) $(id).checked = !!e[name];
  $("d3-sockel-felder").hidden = !e.sockel;
}

function felderLesen() {
  for (const [name, id] of Object.entries(FELDER)) {
    const zahl = parseFloat($(id).value);
    // Nur sinnvolle Zahlen übernehmen (Sockel-Rand darf 0 sein), sonst alten Wert behalten
    if (Number.isFinite(zahl) && (zahl > 0 || (name === "sockelRand" && zahl === 0))) e[name] = zahl;
  }
  for (const [name, id] of Object.entries(HAKEN)) e[name] = $(id).checked;
  $("d3-sockel-felder").hidden = !e.sockel;
}

// ---------------------------------------------------------
// Gebäude (IFC-Dateien) – wie auf der Laser-Seite, eigene Liste
// ---------------------------------------------------------
const MAX_GEBAEUDE = 12;
const gebaeude = []; // { datei, info, proxyWahl, version, karte }
let lesenKette = Promise.resolve();
let modelle = null;  // fertige Modelle je Gebäude (nach „3D-Modell erstellen“)
let betrachter = null;

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

const mm = (z) => z.toLocaleString("de-DE", { maximumFractionDigits: 1 });

function zeigeHinweise(texte) {
  const status = $("d3-status");
  status.textContent = texte.join("\n");
  status.className = "datei-status fehler";
  status.hidden = texte.length === 0;
}

function dateiPruefen(datei) {
  if (!datei.name.toLowerCase().trim().endsWith(".ifc")) {
    return "„" + datei.name + "“ ist keine IFC-Datei. Exportiere dein Modell in Archicad als .ifc und lege diese Datei hier ab.";
  }
  if (datei.size === 0) return "„" + datei.name + "“ ist leer. Exportiere die IFC-Datei bitte noch einmal.";
  return null;
}

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
    const g = { datei, info: null, proxyWahl: new Map(), version: 0, karte: null };
    gebaeude.push(g);
    karteBauen(g);
    lesen(g);
  }
  zeigeHinweise(hinweise);
  listeAktualisieren();
}

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
  lesen(g);
  listeAktualisieren();
}

function gebaeudeEntfernen(g) {
  const i = gebaeude.indexOf(g);
  if (i < 0) return;
  gebaeude.splice(i, 1);
  g.version++;
  g.karte.li.remove();
  zeigeHinweise([]);
  listeAktualisieren();
  const naechstes = gebaeude[i] || gebaeude[i - 1];
  (naechstes ? naechstes.karte.entfernen : $("d3-eingabe").closest("label")).focus();
}

function lesen(g) {
  const version = ++g.version;
  karteFuellen(g, "wird gelesen …");
  const gilt = () => version === g.version && gebaeude.includes(g);
  lesenKette = lesenKette.then(async () => {
    if (!gilt()) return;
    try {
      const { ifcLesen } = await import("./ifc-lesen.js");
      const info = await ifcLesen(g.datei);
      if (!gilt()) return;
      g.info = info;
      const sonstLeer = info.waende.aussen + info.waende.ohneAngabe === 0 && info.daecher === 0;
      for (const p of info.ohneKlasse) g.proxyWahl.set(p.id, sonstLeer ? "koerper" : "ignorieren");
      karteFuellen(g, "✓ gelesen");
      kurzInfoZeigen(g);
    } catch (fehler) {
      if (!gilt()) return;
      console.error(fehler);
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

function listeAktualisieren() {
  const mehrere = gebaeude.length > 1;
  gebaeude.forEach((g, i) => (g.karte.nummer.textContent = mehrere ? `Gebäude ${i + 1} · ` : ""));
  $("d3-ablage").classList.toggle("ablage-kompakt", gebaeude.length > 0);
  $("d3-ablage-titel").textContent = gebaeude.length ? "Weitere IFC-Dateien hierher ziehen" : "IFC-Dateien hierher ziehen";
  const fertig = gebaeude.filter((g) => g.info).length;
  $("d3-erstellen").disabled = fertig === 0;
  if (gebaeude.length === 0) {
    $("d3-hinweis").textContent = "Zuerst eine IFC-Datei ablegen.";
    modelle = null;
    ergebnisZeigen();
    return;
  }
  if (modelle) {
    if (fertig) berechnen();
    else {
      modelle = null;
      ergebnisZeigen();
    }
  } else {
    $("d3-hinweis").textContent = fertig < gebaeude.length ? "Dateien werden gelesen …" : "Prüfe kurz die Einstellungen, dann los.";
  }
}

// Karten aus derselben Vorlage wie auf der Laser-Seite
function karteBauen(g) {
  const li = $("karten-vorlage").content.firstElementChild.cloneNode(true);
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
  ablegenAnschliessen(li, (dateien) => (dateien.length === 1 ? dateiTauschen(g, dateien[0]) : dateienAnnehmen(dateien)));
  $("d3-liste").append(li);
}

function karteFuellen(g, zustand) {
  const k = g.karte;
  k.name.textContent = g.datei.name;
  k.li.title = g.datei.name;
  k.info.textContent = groesseLesbar(g.datei.size) + " · " + zustand;
  k.entfernen.setAttribute("aria-label", "„" + g.datei.name + "“ entfernen");
  if (!g.info) k.details.hidden = true;
}

// Kurze Bauteil-Liste in der Karte, dazu die Auswahl für nicht klassifizierte Morphs
function kurzInfoZeigen(g) {
  const e2 = g.info;
  const inhalt = [
    element("p", "", `Außenwände ${e2.waende.aussen} · Dächer ${e2.daecher} · Fenster ${e2.fenster} · Türen ${e2.tueren} · ohne Klassifizierung ${e2.ohneKlasse.length}`),
  ];
  for (const text of e2.hinweise) {
    const punkt = element("p", "flex gap-2 mt-2");
    punkt.append(element("span", "text-akzent font-bold", "!"), element("span", "", text));
    inhalt.push(punkt);
  }
  for (const p of e2.ohneKlasse) {
    const reihe = element("label", "flex flex-wrap items-center gap-3 mt-3");
    reihe.append(element("span", "min-w-[8rem]", p.name));
    const auswahl = element("select", "feld w-auto max-w-full");
    for (const [wert, text] of [["koerper", "Wand und Dach (ganzer Gebäudekörper)"], ["wand", "Wand"], ["dach", "Dach"], ["ignorieren", "Ignorieren"]]) {
      const option = element("option", "", text);
      option.value = wert;
      auswahl.append(option);
    }
    auswahl.value = g.proxyWahl.get(p.id) || "ignorieren";
    auswahl.addEventListener("change", () => {
      g.proxyWahl.set(p.id, auswahl.value);
      if (modelle) berechnen();
    });
    reihe.append(auswahl);
    inhalt.push(reihe);
  }
  g.karte.bauteile.replaceChildren(...inhalt);
  g.karte.details.hidden = false;
  g.karte.details.open = gebaeude.length === 1 || e2.hinweise.length > 0;
}

function tastaturFuerDateiknopf(knopf) {
  knopf.addEventListener("keydown", (ereignis) => {
    if (ereignis.key === "Enter" || ereignis.key === " ") {
      ereignis.preventDefault();
      knopf.querySelector("input").click();
    }
  });
}

function ablegenAnschliessen(ziel, beiAblegen) {
  ziel.addEventListener("dragover", (ereignis) => {
    ereignis.preventDefault();
    ereignis.stopPropagation();
    ziel.classList.add("drueber");
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
// Modell bauen: Dreiecke in mm, z nach oben, auf den Boden gestellt
// ---------------------------------------------------------
function modellBauen(g) {
  const k = 1000 / e.massstab; // Meter → mm im Modell
  const koerper = [], dach = [];
  for (const teil of g.info.huelle) {
    const art = teil.art === "proxy" ? g.proxyWahl.get(teil.bauteil) || "ignorieren" : teil.art;
    if (art === "ignorieren") continue;
    const ziel = art === "dach" ? dach : koerper;
    const d = teil.dreiecke;
    // web-ifc: y nach oben, Norden = −z  →  3D-Druck: z nach oben, Norden = +y
    for (let i = 0; i < d.length; i += 3) ziel.push(d[i] * k, -d[i + 2] * k, d[i + 1] * k);
  }

  // Lage: Grundriss in der Mitte (0, 0), tiefster Punkt auf z = 0 (bzw. auf dem Sockel)
  const rahmen = (zahlen) => {
    const r = { x0: Infinity, y0: Infinity, z0: Infinity, x1: -Infinity, y1: -Infinity, z1: -Infinity };
    for (let i = 0; i < zahlen.length; i += 3) {
      r.x0 = Math.min(r.x0, zahlen[i]); r.x1 = Math.max(r.x1, zahlen[i]);
      r.y0 = Math.min(r.y0, zahlen[i + 1]); r.y1 = Math.max(r.y1, zahlen[i + 1]);
      r.z0 = Math.min(r.z0, zahlen[i + 2]); r.z1 = Math.max(r.z1, zahlen[i + 2]);
    }
    return r;
  };
  const alle = rahmen(koerper.concat(dach));
  if (!Number.isFinite(alle.x0)) return null;
  const sockelDicke = e.sockel ? e.sockelDicke : 0;
  const dx = -(alle.x0 + alle.x1) / 2, dy = -(alle.y0 + alle.y1) / 2, dz = -alle.z0 + sockelDicke;
  const schieben = (zahlen) => {
    const f = new Float32Array(zahlen.length);
    for (let i = 0; i < zahlen.length; i += 3) {
      f[i] = zahlen[i] + dx; f[i + 1] = zahlen[i + 1] + dy; f[i + 2] = zahlen[i + 2] + dz;
    }
    return f;
  };
  const koerperF = schieben(koerper), dachF = schieben(dach);

  // Sockelplatte: Kasten unter dem Grundriss der Wände (plus Rand)
  let sockelF = new Float32Array(0);
  if (e.sockel) {
    const r = rahmen(koerperF.length ? koerperF : dachF);
    sockelF = kasten(r.x0 - e.sockelRand, r.y0 - e.sockelRand, 0, r.x1 + e.sockelRand, r.y1 + e.sockelRand, sockelDicke);
  }

  // STL-Inhalte: Gebäude (mit Sockel, mit Dach wenn nicht getrennt) und ggf. Dach allein
  const gebaeudeTeile = e.dachGetrennt ? [koerperF, sockelF] : [koerperF, dachF, sockelF];
  const gebaeudeStl = verbinden(gebaeudeTeile);
  let dachStl = null;
  if (e.dachGetrennt && dachF.length) {
    // Dach für den Druck auf den Boden stellen
    const r = rahmen(dachF);
    dachStl = new Float32Array(dachF.length);
    for (let i = 0; i < dachF.length; i += 3) {
      dachStl[i] = dachF[i]; dachStl[i + 1] = dachF[i + 1]; dachStl[i + 2] = dachF[i + 2] - r.z0;
    }
  }
  const masse = (zahlen) => {
    const r = rahmen(zahlen);
    return { b: r.x1 - r.x0, t: r.y1 - r.y0, h: r.z1 - r.z0 };
  };
  return {
    vorschau: [
      { dreiecke: koerperF, farbe: [207, 198, 184] },   // Wände: Graupappe-Ton
      { dreiecke: dachF, farbe: [214, 120, 92] },       // Dach: Coral-Ton
      { dreiecke: sockelF, farbe: [160, 152, 142] },    // Sockel: dunkler
    ],
    gebaeudeStl,
    dachStl,
    masse: masse(gebaeudeStl),
    dachMasse: dachStl ? masse(dachStl) : null,
  };
}

// Geschlossener Kasten aus 12 Dreiecken (Normalen nach außen)
function kasten(x0, y0, z0, x1, y1, z1) {
  const p = [
    [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
    [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
  ];
  const seiten = [
    [0, 2, 1], [0, 3, 2], // unten
    [4, 5, 6], [4, 6, 7], // oben
    [0, 1, 5], [0, 5, 4], // vorne (y0)
    [1, 2, 6], [1, 6, 5], // rechts (x1)
    [2, 3, 7], [2, 7, 6], // hinten (y1)
    [3, 0, 4], [3, 4, 7], // links (x0)
  ];
  const f = new Float32Array(seiten.length * 9);
  seiten.forEach((s, i) => s.forEach((ecke, j) => f.set(p[ecke], i * 9 + j * 3)));
  return f;
}

function verbinden(listen) {
  const f = new Float32Array(listen.reduce((s, l) => s + l.length, 0));
  let o = 0;
  for (const l of listen) {
    f.set(l, o);
    o += l.length;
  }
  return f;
}

// Passt ein Teil aufs Druckbett (auch um 90° gedreht)?
function passt(m) {
  return m.h <= e.bettHoehe && ((m.b <= e.bettBreite && m.t <= e.bettTiefe) || (m.t <= e.bettBreite && m.b <= e.bettTiefe));
}

// Kleinster runder Maßstab, bei dem es passt (in 10er-Schritten)
function passenderMassstab(m) {
  const faktor = Math.max(
    m.h / e.bettHoehe,
    Math.min(Math.max(m.b / e.bettBreite, m.t / e.bettTiefe), Math.max(m.t / e.bettBreite, m.b / e.bettTiefe))
  );
  return Math.ceil((e.massstab * faktor) / 10) * 10;
}

// ---------------------------------------------------------
// Berechnen und zeigen
// ---------------------------------------------------------
function berechnen() {
  const fertig = gebaeude.filter((g) => g.info);
  modelle = fertig.map((g) => ({ nummer: gebaeude.indexOf(g) + 1, name: g.datei.name, modell: modellBauen(g) }));
  ergebnisZeigen();
}

function dateiBasis(name) {
  return name.replace(/\.ifc\s*$/i, "").trim().replace(/[^A-Za-z0-9ÄÖÜäöüß_-]+/g, "-") || "Modell";
}

function ergebnisZeigen() {
  const leer = !modelle || modelle.length === 0;
  $("d3-leer").hidden = !leer;
  $("d3-masse").textContent = "";
  $("d3-downloads").replaceChildren();
  $("d3-warnungen").replaceChildren();
  $("d3-warnungen").hidden = true;
  $("d3-auswahl-zeile").hidden = true;
  $("d3-alle").hidden = true;
  if (leer) {
    if (betrachter) betrachter.setzen([], null);
    return;
  }

  // Auswahl, welches Gebäude in der Vorschau zu sehen ist
  const auswahl = $("d3-auswahl");
  const vorher = auswahl.value;
  auswahl.replaceChildren(...modelle.map((m) => {
    const o = element("option", "", `Gebäude ${m.nummer} · ${m.name}`);
    o.value = String(m.nummer);
    return o;
  }));
  if (modelle.some((m) => String(m.nummer) === vorher)) auswahl.value = vorher;
  $("d3-auswahl-zeile").hidden = modelle.length < 2;
  vorschauZeigen();

  // Warnungen und STL-Knöpfe je Gebäude
  const warnungen = [];
  const mehrere = modelle.length > 1;
  for (const m of modelle) {
    const wer = mehrere ? `Gebäude ${m.nummer}: ` : "";
    if (!m.modell) {
      warnungen.push(`${wer}Keine Geometrie gefunden. Prüfe die Bauteil-Liste in der Karte (Außenwände, Dach, Morphs).`);
      continue;
    }
    const teile = [["", m.modell.masse], ["Dach: ", m.modell.dachMasse]].filter(([, ms]) => ms);
    for (const [was, ms] of teile) {
      if (!passt(ms)) {
        warnungen.push(
          `${wer}${was}${mm(ms.b)} × ${mm(ms.t)} × ${mm(ms.h)} mm passt nicht aufs Druckbett (${e.bettBreite} × ${e.bettTiefe} × ${e.bettHoehe} mm). ` +
            `Bei Maßstab 1:${passenderMassstab(ms)} würde es passen.`
        );
      }
    }
    const basis = dateiBasis(m.name);
    const knopf = element("button", "knopf haupt-knopf text-sm", mehrere ? `STL Gebäude ${m.nummer}` : "STL herunterladen");
    knopf.type = "button";
    knopf.addEventListener("click", () => stlHerunterladen(stlBinaer(m.modell.gebaeudeStl), `${basis}_3D_1-${e.massstab}.stl`));
    $("d3-downloads").append(knopf);
    if (m.modell.dachStl) {
      const dachKnopf = element("button", "knopf text-sm", mehrere ? `STL Dach ${m.nummer}` : "STL Dach");
      dachKnopf.type = "button";
      dachKnopf.addEventListener("click", () => stlHerunterladen(stlBinaer(m.modell.dachStl), `${basis}_3D-Dach_1-${e.massstab}.stl`));
      $("d3-downloads").append(dachKnopf);
    }
  }
  $("d3-alle").hidden = $("d3-downloads").children.length < 2;
  for (const text of warnungen) {
    const punkt = element("li", "flex gap-2");
    punkt.append(element("span", "text-akzent font-bold", "!"), element("span", "", text));
    $("d3-warnungen").append(punkt);
  }
  $("d3-warnungen").hidden = warnungen.length === 0;
}

// Gewähltes Gebäude im Betrachter zeigen, mit Maßen
function vorschauZeigen() {
  if (!modelle || !modelle.length) return;
  const nummer = Number($("d3-auswahl").value) || modelle[0].nummer;
  const m = modelle.find((x) => x.nummer === nummer) || modelle[0];
  if (!m.modell) {
    betrachter.setzen([], null);
    $("d3-masse").textContent = "";
    return;
  }
  betrachter.setzen(m.modell.vorschau.filter((t) => t.dreiecke.length), { b: e.bettBreite, t: e.bettTiefe });
  const ms = m.modell.masse;
  let text = `Größe ${mm(ms.b)} × ${mm(ms.t)} × ${mm(ms.h)} mm (Breite × Tiefe × Höhe) bei 1:${e.massstab}`;
  if (m.modell.dachMasse) text += ` · Dach ${mm(m.modell.dachMasse.b)} × ${mm(m.modell.dachMasse.t)} × ${mm(m.modell.dachMasse.h)} mm`;
  text += passt(ms) && (!m.modell.dachMasse || passt(m.modell.dachMasse)) ? " · ✓ passt aufs Druckbett" : " · passt nicht aufs Druckbett";
  $("d3-masse").textContent = text;
}

// ---------------------------------------------------------
// Start: alles anschließen
// ---------------------------------------------------------
export function druck3dStarten() {
  felderFuellen();
  betrachter = new Betrachter($("d3-canvas"));

  const formular = $("d3-einstellungen");
  formular.addEventListener("input", () => {
    felderLesen();
    einstellungenSpeichern();
    if (modelle) berechnen();
  });
  formular.addEventListener("change", felderFuellen); // ungültige Eingaben zurücksetzen

  $("d3-eingabe").addEventListener("change", () => {
    dateienAnnehmen([...$("d3-eingabe").files]);
    $("d3-eingabe").value = "";
  });
  tastaturFuerDateiknopf($("d3-eingabe").closest("label"));
  ablegenAnschliessen($("d3-ablage"), dateienAnnehmen);

  $("d3-erstellen").addEventListener("click", () => {
    $("d3-erstellen").disabled = true;
    $("d3-hinweis").textContent = "Wird berechnet …";
    setTimeout(() => {
      try {
        berechnen();
        $("d3-hinweis").textContent = "Fertig. Änderst du eine Einstellung, rechnet die App sofort neu.";
        $("d3-bereich-vorschau").scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (fehler) {
        console.error(fehler);
        $("d3-hinweis").textContent = "Beim Berechnen ist ein Fehler passiert. Bitte sag Bescheid, mit welcher Datei.";
      }
      $("d3-erstellen").disabled = false;
    }, 30);
  });

  $("d3-auswahl").addEventListener("change", vorschauZeigen);
  $("d3-ansicht").addEventListener("click", () => betrachter.zuruecksetzen());
  $("d3-alle").addEventListener("click", () => {
    // nacheinander, damit der Browser jede Datei annimmt
    [...$("d3-downloads").children].forEach((knopf, i) => setTimeout(() => knopf.click(), i * 500));
  });
  ergebnisZeigen();
}
