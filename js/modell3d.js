// =========================================================
// Modell-Vorschau: die fertigen Pappteile wieder in 3D zusammensetzen
//
// Jedes Teil (aus js/schichten.js) ist ein flacher Umriss in mm.
// Wir legen ihn zurück an seine Fassade bzw. Dachfläche, schieben ihn
// um seine Tiefe nach innen (Innenschicht hinter der Außenschicht) und
// geben ihm seine Pappdicke. So sieht man das Modell so, wie es nach
// dem Kleben aussieht – mit Eckenausgleich, Fenstern und Dach.
// Geritzte Fenster/Türen (eine Schicht) erscheinen als dünne blaue Linien.
//
// Ergebnis: Dreiecke für den Betrachter (js/betrachter.js):
//   [{ dreiecke: Float32Array (mm, z nach oben), farbe: [r, g, b] }]
// =========================================================

import { zu3d } from "./abwickeln.js";

// Farben der Vorschau (in main.js auch für die Legende benutzt)
export const FARBEN = {
  A: [216, 205, 189],     // Außenschicht / eine Schicht: Graupappe hell
  I: [169, 157, 138],     // Innenschicht: Graupappe dunkler
  dach: [178, 142, 122],  // Dach: gedecktes, warmes Braungrau (seit 19.11., vorher kräftiges Orange-Rot)
  decke: [140, 150, 160], // Untersicht (U): kühles Grau, damit man sie von unten erkennt
};

// ---------------------------------------------------------
// Vieleck (mit Löchern) in Dreiecke zerlegen („Ohren abschneiden“).
// Löcher werden über eine schmale Brücke an den Umriss angehängt.
// ---------------------------------------------------------
function flaecheVon(ring) {
  let s = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}

function lochEinhaengen(umriss, loch) {
  // Punkt des Lochs ganz rechts
  let mi = 0;
  for (let i = 1; i < loch.length; i++) if (loch[i][0] > loch[mi][0]) mi = i;
  const M = loch[mi];
  // Strahl nach rechts: nächste Kante des Umrisses
  let besteX = Infinity, pi = -1;
  for (let i = 0; i < umriss.length; i++) {
    const a = umriss[i], b = umriss[(i + 1) % umriss.length];
    if ((a[1] - M[1]) * (b[1] - M[1]) > 0 || a[1] === b[1]) continue;
    const x = a[0] + ((M[1] - a[1]) * (b[0] - a[0])) / (b[1] - a[1]);
    if (x >= M[0] && x < besteX) {
      besteX = x;
      pi = a[0] > b[0] ? i : (i + 1) % umriss.length;
    }
  }
  if (pi < 0) return umriss; // sollte nicht vorkommen
  const gedreht = [...loch.slice(mi), ...loch.slice(0, mi)];
  return [...umriss.slice(0, pi + 1), ...gedreht, M, umriss[pi], ...umriss.slice(pi + 1)];
}

function zerlegen(aussen, loecher) {
  let umriss = aussen.slice();
  if (flaecheVon(umriss) < 0) umriss.reverse(); // gegen den Uhrzeigersinn
  const lochListe = loecher
    .map((l) => (flaecheVon(l) > 0 ? l.slice().reverse() : l.slice())) // im Uhrzeigersinn
    .sort((a, b) => Math.max(...b.map((p) => p[0])) - Math.max(...a.map((p) => p[0])));
  for (const l of lochListe) umriss = lochEinhaengen(umriss, l);

  const dreiecke = [];
  const idx = umriss.map((p, i) => i);
  const P = umriss;
  const kreuz = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const gleich = (p, q) => Math.abs(p[0] - q[0]) < 1e-9 && Math.abs(p[1] - q[1]) < 1e-9;
  const innen = (p, a, b, c) => {
    if (gleich(p, a) || gleich(p, b) || gleich(p, c)) return false;
    return kreuz(a, b, p) > 1e-9 && kreuz(b, c, p) > 1e-9 && kreuz(c, a, p) > 1e-9;
  };
  let schutz = 0;
  while (idx.length > 3 && schutz++ < 10000) {
    let geschnitten = false;
    for (let i = 0; i < idx.length; i++) {
      const ia = idx[(i - 1 + idx.length) % idx.length], ib = idx[i], ic = idx[(i + 1) % idx.length];
      const a = P[ia], b = P[ib], c = P[ic];
      if (kreuz(a, b, c) <= 1e-12) continue; // nicht konvex
      let frei = true;
      for (const j of idx) {
        if (j === ia || j === ib || j === ic) continue;
        if (innen(P[j], a, b, c)) { frei = false; break; }
      }
      if (!frei) continue;
      dreiecke.push([a, b, c]);
      idx.splice(i, 1);
      geschnitten = true;
      break;
    }
    if (!geschnitten) break; // Notbremse: Rest als Fächer
  }
  for (let i = 1; i + 1 < idx.length; i++) dreiecke.push([P[idx[0]], P[idx[i]], P[idx[i + 1]]]);
  return dreiecke;
}

// ---------------------------------------------------------
// Alle Teile eines Gebäudes in 3D
// flaechen: aus abwickeln.js (Meter), teile: aus schichten.js (mm),
// k: mm im Modell je Meter (1000 / Maßstab), ritzFarbe: z. B. "#0000ff"
// versatz: [x, y] in mm, um mehrere Gebäude nebeneinander zu stellen
// ---------------------------------------------------------
export function modellTeile(flaechen, teile, k, ritzFarbe, versatz = [0, 0]) {
  const ritzRgb = ((z) => [(z >> 16) & 255, (z >> 8) & 255, z & 255])(parseInt(ritzFarbe.replace("#", ""), 16));
  const nachFarbe = new Map(); // Farbe → Zahlenliste
  const hinzu = (farbe, ...punkte) => {
    const schluessel = farbe.join(",");
    if (!nachFarbe.has(schluessel)) nachFarbe.set(schluessel, { farbe, zahlen: [] });
    const liste = nachFarbe.get(schluessel).zahlen;
    for (const p of punkte) liste.push(p[0], p[1], p[2]);
  };

  for (const t of teile) {
    const f = flaechen[t.flaecheIndex];
    if (!f) continue;
    const farbe = t.wofuer === "dach" ? FARBEN.dach : t.wofuer === "decke" ? FARBEN.decke : t.schicht === "I" ? FARBEN.I : FARBEN.A;
    // 2D-Punkt des Teils (mm) + Tiefe (mm, nach innen) → 3D-Punkt im Betrachter (mm, z oben)
    const punkt = (p, tief) => {
      const w = zu3d(f, [p[0] / k, p[1] / k]); // Meter, web-ifc: y oben, Norden = −z
      const x = w[0] * k - f.n[0] * tief, y = w[1] * k - f.n[1] * tief, z = w[2] * k - f.n[2] * tief;
      return [x + versatz[0], -z + versatz[1], y];
    };
    // Seit 19.11. reichen die Wände selbst bis unter die Dachplatte
    // (schichten.js, waendeBisZumDach) – das Dach sitzt genau an seiner Stelle
    const t0 = t.tiefe || 0, t1 = t0 + t.dicke;

    // Vorder- und Rückseite
    for (const [a, b, c] of zerlegen(t.aussen, t.loecher)) {
      hinzu(farbe, punkt(a, t0), punkt(b, t0), punkt(c, t0));
      hinzu(farbe, punkt(a, t1), punkt(c, t1), punkt(b, t1));
    }
    // Schnittkanten rundherum (Umriss und Löcher)
    for (const ring of [t.aussen, ...t.loecher]) {
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length];
        hinzu(farbe, punkt(a, t0), punkt(b, t0), punkt(b, t1), punkt(a, t0), punkt(b, t1), punkt(a, t1));
      }
    }
    // Geritzte Öffnungen: dünne blaue Streifen knapp vor der Außenseite
    const breite = 0.35; // mm
    for (const r of t.ritzlinien || []) {
      const pts = r.geschlossen ? [...r.punkte, r.punkte[0]] : r.punkte;
      for (let i = 0; i + 1 < pts.length; i++) {
        const a = pts[i], b = pts[i + 1];
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const q = [(-(b[1] - a[1]) / l) * breite, ((b[0] - a[0]) / l) * breite];
        const a1 = [a[0] - q[0], a[1] - q[1]], a2 = [a[0] + q[0], a[1] + q[1]];
        const b1 = [b[0] - q[0], b[1] - q[1]], b2 = [b[0] + q[0], b[1] + q[1]];
        const vorne = t0 - 0.05;
        hinzu(ritzRgb, punkt(a1, vorne), punkt(b1, vorne), punkt(b2, vorne), punkt(a1, vorne), punkt(b2, vorne), punkt(a2, vorne));
      }
    }
  }
  return [...nachFarbe.values()].map((e) => ({ dreiecke: new Float32Array(e.zahlen), farbe: e.farbe }));
}

// Umgebendes Rechteck (x/y in mm) einer Teile-Liste, für das Nebeneinanderstellen
export function grundrissBreite(stuecke) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const s of stuecke) {
    const d = s.dreiecke;
    for (let i = 0; i < d.length; i += 3) {
      x0 = Math.min(x0, d[i]); x1 = Math.max(x1, d[i]);
      y0 = Math.min(y0, d[i + 1]); y1 = Math.max(y1, d[i + 1]);
    }
  }
  return Number.isFinite(x0) ? { x0, x1, y0, y1 } : { x0: 0, x1: 0, y0: 0, y1: 0 };
}
