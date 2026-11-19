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
import { blobHerunterladen } from "./dxf.js"; // ZIP herunterladen (seit 19.11.)

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
      // Morphs (seit 19.11.) wie auf der Laser-Seite immer als Wand und Dach,
      // z. B. ein Nebengebäude neben dem Haus
      const sonstLeer = info.waende.aussen + info.waende.ohneAngabe === 0 && info.daecher === 0;
      for (const p of info.ohneKlasse) g.proxyWahl.set(p.id, sonstLeer || p.morph ? "koerper" : "ignorieren");
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
//
// Seit 19.11.:
//   - Jeder Baukörper (z. B. Haus und Nebengebäude) wird einzeln nach unten
//     geschoben, bis er auf der Platte steht – sonst „schwebt“ ein Körper, der
//     in der IFC höher steht, und der Slicer will Stützen ergänzen.
//   - Mit Sockel sinkt jeder Körper EINSENKEN mm in die Platte ein, damit
//     Platte und Gebäude für den Slicer fest zusammenhängen.
//   - Ohne Sockel rücken getrennte Baukörper dicht zusammen (ABSTAND_KOERPER),
//     das spart Platz auf dem Druckbett. Mit Sockel bleibt ihre echte Lage.
// ---------------------------------------------------------
const EINSENKEN = 0.2;       // mm in die Sockelplatte
const ABSTAND_KOERPER = 5;   // mm zwischen Baukörpern ohne Sockel
const FARBE_WAND = [207, 198, 184], FARBE_DACH = [214, 120, 92], FARBE_SOCKEL = [160, 152, 142];

// Umgebende Kiste einer Zahlenliste (x, y, z, x, y, z, …)
function rahmen(zahlen) {
  const r = { x0: Infinity, y0: Infinity, z0: Infinity, x1: -Infinity, y1: -Infinity, z1: -Infinity };
  for (let i = 0; i < zahlen.length; i += 3) {
    r.x0 = Math.min(r.x0, zahlen[i]); r.x1 = Math.max(r.x1, zahlen[i]);
    r.y0 = Math.min(r.y0, zahlen[i + 1]); r.y1 = Math.max(r.y1, zahlen[i + 1]);
    r.z0 = Math.min(r.z0, zahlen[i + 2]); r.z1 = Math.max(r.z1, zahlen[i + 2]);
  }
  return r;
}

// Zahlenliste verschieben (neue Liste)
function verschoben(zahlen, dx, dy, dz) {
  const f = new Float32Array(zahlen.length);
  for (let i = 0; i < zahlen.length; i += 3) {
    f[i] = zahlen[i] + dx; f[i + 1] = zahlen[i + 1] + dy; f[i + 2] = zahlen[i + 2] + dz;
  }
  return f;
}

function modellBauen(g) {
  const k = 1000 / e.massstab; // Meter → mm im Modell

  // 1. Jedes Bauteil in Druck-Koordinaten, mit umgebender Kiste
  const stuecke = [];
  for (const teil of g.info.huelle) {
    // Fenster und Türen (seit 19.11. in der Hülle, nur für die Laser-Seite)
    // werden nicht gedruckt – die Öffnungen bleiben offen wie bisher
    if (teil.art === "oeffnung") continue;
    const art = teil.art === "proxy" ? g.proxyWahl.get(teil.bauteil) || "ignorieren" : teil.art;
    if (art === "ignorieren") continue;
    const d = teil.dreiecke;
    const zahlen = new Float32Array(d.length);
    // web-ifc: y nach oben, Norden = −z  →  3D-Druck: z nach oben, Norden = +y
    for (let i = 0; i < d.length; i += 3) {
      zahlen[i] = d[i] * k; zahlen[i + 1] = -d[i + 2] * k; zahlen[i + 2] = d[i + 1] * k;
    }
    if (zahlen.length) stuecke.push({ dach: art === "dach", zahlen, r: rahmen(zahlen) });
  }
  if (!stuecke.length) return null;

  // 2. Baukörper: Bauteile, die sich berühren (5 cm Spiel in echt), gehören zusammen
  const spiel = 0.05 * k;
  const eltern = stuecke.map((s, i) => i);
  const wurzel = (i) => (eltern[i] === i ? i : (eltern[i] = wurzel(eltern[i])));
  for (let i = 0; i < stuecke.length; i++) {
    for (let j = i + 1; j < stuecke.length; j++) {
      const a = stuecke[i].r, b = stuecke[j].r;
      const beruehren =
        a.x1 + spiel >= b.x0 && b.x1 + spiel >= a.x0 &&
        a.y1 + spiel >= b.y0 && b.y1 + spiel >= a.y0 &&
        a.z1 + spiel >= b.z0 && b.z1 + spiel >= a.z0;
      if (beruehren) eltern[wurzel(i)] = wurzel(j);
    }
  }
  const gruppen = new Map();
  stuecke.forEach((s, i) => {
    const w = wurzel(i);
    if (!gruppen.has(w)) gruppen.set(w, []);
    gruppen.get(w).push(s);
  });
  const koerperListe = [...gruppen.values()].map((liste) => {
    const r = rahmen(verbinden(liste.map((s) => s.zahlen)));
    return { liste, r, dx: 0, dy: 0 };
  });

  // 3. Ohne Sockel: Baukörper dicht nebeneinander, in Reihen übers Druckbett
  if (!e.sockel && koerperListe.length > 1) {
    koerperListe.sort((a, b) => a.r.x0 - b.r.x0);
    let x = 0, y = 0, reihenTiefe = 0;
    for (const kp of koerperListe) {
      const breite = kp.r.x1 - kp.r.x0, tiefe = kp.r.y1 - kp.r.y0;
      if (x > 0 && x + breite > e.bettBreite) {
        x = 0;
        y += reihenTiefe + ABSTAND_KOERPER;
        reihenTiefe = 0;
      }
      kp.dx = x - kp.r.x0;
      kp.dy = y - kp.r.y0;
      x += breite + ABSTAND_KOERPER;
      reihenTiefe = Math.max(reihenTiefe, tiefe);
    }
  }

  // 4. Jeden Baukörper auf die Platte stellen (mit Sockel leicht eingesenkt)
  const sockelDicke = e.sockel ? e.sockelDicke : 0;
  const unten = e.sockel ? sockelDicke - EINSENKEN : 0;
  const waende = [], daecher = [], daecherEinzeln = [];
  for (const kp of koerperListe) {
    const dz = unten - kp.r.z0;
    const dachTeile = [];
    for (const s of kp.liste) {
      const f = verschoben(s.zahlen, kp.dx, kp.dy, dz);
      (s.dach ? dachTeile : waende).push(f);
    }
    if (dachTeile.length) {
      daecher.push(...dachTeile);
      daecherEinzeln.push(verbinden(dachTeile));
    }
  }

  // 5. Grundriss in die Mitte (0, 0)
  const alle = rahmen(verbinden([...waende, ...daecher]));
  const mx = -(alle.x0 + alle.x1) / 2, my = -(alle.y0 + alle.y1) / 2;
  const koerperF = verschoben(verbinden(waende), mx, my, 0);
  const dachF = verschoben(verbinden(daecher), mx, my, 0);

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
    // Jedes Dach einzeln auf den Boden stellen (bei mehreren Baukörpern liegen
    // sie nebeneinander wie ihre Gebäude)
    dachStl = verbinden(daecherEinzeln.map((d) => verschoben(d, mx, my, -rahmen(d).z0)));
  }
  const masse = (zahlen) => {
    const r = rahmen(zahlen);
    return { b: r.x1 - r.x0, t: r.y1 - r.y0, h: r.z1 - r.z0 };
  };
  // Dateien, die gedruckt werden – je eine Seite in der Vorschau (Pfeile ‹ ›)
  const dateien = [
    {
      art: "gebaeude",
      stl: gebaeudeStl,
      vorschau: e.dachGetrennt
        ? [{ dreiecke: koerperF, farbe: FARBE_WAND }, { dreiecke: sockelF, farbe: FARBE_SOCKEL }]
        : [{ dreiecke: koerperF, farbe: FARBE_WAND }, { dreiecke: dachF, farbe: FARBE_DACH }, { dreiecke: sockelF, farbe: FARBE_SOCKEL }],
      masse: masse(gebaeudeStl),
    },
  ];
  if (dachStl) dateien.push({ art: "dach", stl: dachStl, vorschau: [{ dreiecke: dachStl, farbe: FARBE_DACH }], masse: masse(dachStl) });
  return {
    dateien,
    gebaeudeStl,
    dachStl,
    masse: masse(gebaeudeStl),
    dachMasse: dachStl ? masse(dachStl) : null,
    koerperAnzahl: koerperListe.length,
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
  return (
    name
      .replace(/\.ifc\s*$/i, "")
      .trim()
      .replace(/[^A-Za-z0-9ÄÖÜäöüß_-]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "") || "Modell"
  );
}

// Alle Druck-Dateien aller Gebäude, in der Reihenfolge der Vorschau-Seiten
// (je Gebäude: Gebäude, dann ggf. das abnehmbare Dach)
let dateiListe = [];
let aktuelleDatei = 0; // welche Datei die Vorschau gerade zeigt

function dateienSammeln() {
  const mehrere = modelle.length > 1;
  const liste = [];
  for (const m of modelle) {
    if (!m.modell) continue;
    const basis = dateiBasis(m.name);
    for (const d of m.modell.dateien) {
      const dach = d.art === "dach";
      liste.push({
        ...d,
        titel: (dach ? "Dach (abnehmbar)" : "Gebäude") + (mehrere ? ` ${m.nummer} · ${m.name}` : ""),
        knopf: (dach ? "STL Dach" : "STL Gebäude") + (mehrere ? ` ${m.nummer}` : "") + " herunterladen",
        dateiname: `${basis}_3D${dach ? "-Dach" : ""}_1-${e.massstab}.stl`,
      });
    }
  }
  return liste;
}

function ergebnisZeigen() {
  const leer = !modelle || modelle.length === 0;
  $("d3-leer").hidden = !leer;
  $("d3-masse").textContent = "";
  $("d3-downloads").replaceChildren();
  $("d3-warnungen").replaceChildren();
  $("d3-warnungen").hidden = true;
  $("d3-blaettern").hidden = true;
  $("d3-alle").hidden = true;
  dateiListe = [];
  if (leer) {
    if (betrachter) betrachter.setzen([], null);
    return;
  }

  // Warnungen je Gebäude
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
  }
  for (const text of warnungen) {
    const punkt = element("li", "flex gap-2");
    punkt.append(element("span", "text-akzent font-bold", "!"), element("span", "", text));
    $("d3-warnungen").append(punkt);
  }
  $("d3-warnungen").hidden = warnungen.length === 0;

  // Je Druck-Datei ein Knopf (ohne Füllfarbe, beim Darüberfahren orange).
  // Ein Klick lädt die Datei und zeigt sie auch in der Vorschau.
  dateiListe = dateienSammeln();
  dateiListe.forEach((d, i) => {
    const knopf = element("button", "knopf knopf-umriss text-sm", d.knopf);
    knopf.type = "button";
    knopf.addEventListener("click", () => {
      stlHerunterladen(stlBinaer(d.stl), d.dateiname);
      aktuelleDatei = i;
      vorschauZeigen();
    });
    $("d3-downloads").append(knopf);
  });
  $("d3-alle").hidden = dateiListe.length < 2;
  if (aktuelleDatei >= dateiListe.length) aktuelleDatei = 0;
  vorschauZeigen();
}

// Die gewählte Druck-Datei im Betrachter zeigen, mit Maßen und Pfeilen ‹ ›
function vorschauZeigen() {
  if (!dateiListe.length) {
    if (betrachter) betrachter.setzen([], null);
    $("d3-masse").textContent = "";
    $("d3-blaettern").hidden = true;
    return;
  }
  const d = dateiListe[aktuelleDatei];
  $("d3-blaettern").hidden = dateiListe.length < 2;
  $("d3-datei-titel").textContent = `Datei ${aktuelleDatei + 1} von ${dateiListe.length} · ${d.titel}`;
  $("d3-zurueck").disabled = aktuelleDatei === 0;
  $("d3-weiter").disabled = aktuelleDatei === dateiListe.length - 1;
  betrachter.setzen(d.vorschau.filter((t) => t.dreiecke.length), { b: e.bettBreite, t: e.bettTiefe });
  const ms = d.masse;
  $("d3-masse").textContent =
    `${d.art === "dach" ? "Dach" : "Größe"} ${mm(ms.b)} × ${mm(ms.t)} × ${mm(ms.h)} mm (Breite × Tiefe × Höhe) bei 1:${e.massstab}` +
    (passt(ms) ? " · ✓ passt aufs Druckbett" : " · passt nicht aufs Druckbett");
}

// ---------------------------------------------------------
// Alle STL auf einmal (seit 19.11.): EINE ZIP-Datei mit einer STL je
// Druck-Datei. Viele Browser nehmen nur den ersten von mehreren Downloads an.
// Unkomprimiert („stored“), ohne Bibliothek.
// ---------------------------------------------------------
const CRC_TABELLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABELLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
// Inhalt (ArrayBuffer, Uint8Array/Float32Array oder Blob) → Bytes
async function alsBytes(inhalt) {
  if (inhalt instanceof Blob) return new Uint8Array(await inhalt.arrayBuffer());
  if (inhalt instanceof ArrayBuffer) return new Uint8Array(inhalt);
  if (ArrayBuffer.isView(inhalt)) return new Uint8Array(inhalt.buffer, inhalt.byteOffset, inhalt.byteLength);
  return new TextEncoder().encode(String(inhalt));
}
async function zipAusDateien(dateien) {
  const kodierer = new TextEncoder();
  const jetzt = new Date();
  const zeit = (jetzt.getHours() << 11) | (jetzt.getMinutes() << 5) | (jetzt.getSeconds() >> 1);
  const datum = ((jetzt.getFullYear() - 1980) << 9) | ((jetzt.getMonth() + 1) << 5) | jetzt.getDate();
  const stuecke = [], verzeichnis = [];
  let versatz = 0;
  for (const d of dateien) {
    const name = kodierer.encode(d.name);
    const daten = await alsBytes(d.inhalt);
    const pruef = crc32(daten);
    const kopf = new DataView(new ArrayBuffer(30));
    kopf.setUint32(0, 0x04034b50, true);
    kopf.setUint16(4, 20, true);
    kopf.setUint16(6, 0x0800, true);
    kopf.setUint16(10, zeit, true);
    kopf.setUint16(12, datum, true);
    kopf.setUint32(14, pruef, true);
    kopf.setUint32(18, daten.length, true);
    kopf.setUint32(22, daten.length, true);
    kopf.setUint16(26, name.length, true);
    stuecke.push(new Uint8Array(kopf.buffer), name, daten);
    const eintrag = new DataView(new ArrayBuffer(46));
    eintrag.setUint32(0, 0x02014b50, true);
    eintrag.setUint16(4, 20, true);
    eintrag.setUint16(6, 20, true);
    eintrag.setUint16(8, 0x0800, true);
    eintrag.setUint16(12, zeit, true);
    eintrag.setUint16(14, datum, true);
    eintrag.setUint32(16, pruef, true);
    eintrag.setUint32(20, daten.length, true);
    eintrag.setUint32(24, daten.length, true);
    eintrag.setUint16(28, name.length, true);
    eintrag.setUint32(42, versatz, true);
    verzeichnis.push(new Uint8Array(eintrag.buffer), name);
    versatz += 30 + name.length + daten.length;
  }
  const groesse = verzeichnis.reduce((s, t) => s + t.length, 0);
  const ende = new DataView(new ArrayBuffer(22));
  ende.setUint32(0, 0x06054b50, true);
  ende.setUint16(8, dateien.length, true);
  ende.setUint16(10, dateien.length, true);
  ende.setUint32(12, groesse, true);
  ende.setUint32(16, versatz, true);
  return new Blob([...stuecke, ...verzeichnis, new Uint8Array(ende.buffer)], { type: "application/zip" });
}

async function alleStlHerunterladen() {
  if (!dateiListe.length) return;
  if (dateiListe.length === 1) {
    stlHerunterladen(stlBinaer(dateiListe[0].stl), dateiListe[0].dateiname);
    return;
  }
  const zip = await zipAusDateien(dateiListe.map((d) => ({ name: d.dateiname, inhalt: stlBinaer(d.stl) })));
  const basis = modelle.length === 1 ? dateiBasis(modelle[0].name) : "Mehrere-Gebaeude";
  blobHerunterladen(zip, `${basis}_3D-Druck_1-${e.massstab}_${dateiListe.length}-STL.zip`);
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

  // Pfeile ‹ › über der Vorschau: zwischen den Druck-Dateien blättern
  $("d3-zurueck").addEventListener("click", () => {
    if (aktuelleDatei > 0) aktuelleDatei--;
    vorschauZeigen();
  });
  $("d3-weiter").addEventListener("click", () => {
    if (aktuelleDatei < dateiListe.length - 1) aktuelleDatei++;
    vorschauZeigen();
  });
  $("d3-ansicht").addEventListener("click", () => betrachter.zuruecksetzen());
  $("d3-alle").addEventListener("click", () => {
    alleStlHerunterladen().catch((fehler) => console.error(fehler));
  });
  ergebnisZeigen();
}
