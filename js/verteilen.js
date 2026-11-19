// =========================================================
// Verteilen – Teile auf Laserplatten legen
//
// „Regal-Verfahren“: Jedes Teil bekommt einen rechteckigen Kasten
// (Umriss + Platz für die Nummer darunter). Die Kästen kommen, die
// höchsten zuerst, in Reihen von unten nach oben auf die Platte –
// wie Bücher in ein Regal. Ist die Platte voll, beginnt eine neue.
//
// Werkstatt-Regeln:
//   - mindestens RAND_ABSTAND (10 mm) Abstand zum gelben Rahmen
//   - mindestens 3 mm zwischen den Teilen
//   - die Nummer steht NEBEN dem Teil (darunter), nie darauf, und wird geritzt
//   - Teile, die nicht auf die Platte passen, werden gemeldet, nicht verkleinert
// Reihenfolge in der Datei je Teil: zuerst die Ritzlinien (angeritzte
// Fenster/Türen bei einer Schicht), dann die Löcher, dann der Umriss,
// damit sich das Teil nicht vorher aus der Platte löst.
// =========================================================

import { RAND_ABSTAND } from "./dxf.js";
import { textLinien } from "./linienschrift.js";

const ABSTAND = 3;          // mm zwischen zwei Teilen
const SCHRIFT = 3;          // mm Höhe der Nummer
const SCHRIFT_ABSTAND = 1.5; // mm zwischen Nummer und Teil
// Plattenbeschriftung (seit 19.11.): oben links auf jeder Platte geritzt,
// z. B. „PLATTE 2 - PAPPE 1,5 MM“. Dafür bleibt oben ein Streifen frei.
const BESCHRIFTUNG_STREIFEN = SCHRIFT + ABSTAND; // mm

// Umgebendes Rechteck eines Umrisses
function rahmenVon(punkte) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of punkte) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y);
    x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { x0, y0, b: x1 - x0, h: y1 - y0 };
}

// Ein Teil um 90° drehen (für Teile, die nur hochkant passen)
function drehen(form) {
  const d = (p) => [p[1], -p[0]];
  return {
    aussen: form.aussen.map(d),
    loecher: form.loecher.map((l) => l.map(d)),
    ritzlinien: form.ritzlinien.map((r) => ({ punkte: r.punkte.map(d), geschlossen: r.geschlossen })),
  };
}

// ---------------------------------------------------------
// Eine Laserplatte ist EINE Pappe mit EINER Dicke. Darum werden die Teile
// zuerst nach Pappdicke getrennt (z. B. Außenschicht 1 mm, Innenschicht
// und Dach 2 mm) und jede Dicke bekommt ihre eigenen Platten.
// Sind alle Teile gleich dick, gibt es nur eine Gruppe – wie bisher.
// Jede Platte bekommt die Angabe „dicke“ (mm).
// ---------------------------------------------------------
// teile: aus schichten.js (aussen/loecher in mm), e: Einstellungen
export function verteilen(teile, e) {
  const dicken = [...new Set(teile.map((t) => t.dicke))].sort((a, b) => a - b);
  const platten = [];
  const zuGross = [];
  for (const dicke of dicken) {
    const ergebnis = verteilenEineDicke(teile.filter((t) => t.dicke === dicke), e);
    for (const p of ergebnis.platten) platten.push({ ...p, dicke });
    zuGross.push(...ergebnis.zuGross.map((z) => ({ ...z, dicke })));
  }
  // Jede Platte bekommt oben links ihre Nummer und Pappdicke (geritzt),
  // damit man die Pappe nach dem Lasern noch zuordnen kann
  platten.forEach((p, i) => {
    p.beschriftung = `PLATTE ${i + 1} - PAPPE ${String(p.dicke).replace(".", ",")} MM`;
    const text = textLinien(p.beschriftung, SCHRIFT);
    const x0 = RAND_ABSTAND, y0 = p.hoehe - RAND_ABSTAND - SCHRIFT;
    for (const strich of text.linien) {
      p.linien.push({ ebene: "RITZEN", punkte: strich.map(([x, y]) => [x + x0, y + y0]), geschlossen: false });
    }
  });
  return { platten, zuGross };
}

// Alle Teile einer Pappdicke auf Platten legen
function verteilenEineDicke(teile, e) {
  const W = e.platteBreite, H = e.platteHoehe;
  // oben bleibt der Streifen für die Plattenbeschriftung frei
  const nutzB = W - 2 * RAND_ABSTAND, nutzH = H - 2 * RAND_ABSTAND - BESCHRIFTUNG_STREIFEN;

  const kaesten = [];
  const zuGross = [];
  for (const teil of teile) {
    // Teile mit „ohneNummer“ (z. B. Menschen) bekommen keine geritzte Nummer
    // und brauchen darunter keinen Platz dafür
    const text = teil.ohneNummer ? { linien: [], breite: 0 } : textLinien(teil.name, SCHRIFT);
    const unten = teil.ohneNummer ? 0 : SCHRIFT + SCHRIFT_ABSTAND;
    const mass = (r) => ({ b: Math.max(r.b, text.breite), h: r.h + unten });
    let form = { aussen: teil.aussen, loecher: teil.loecher, ritzlinien: teil.ritzlinien || [] };
    let r = rahmenVon(form.aussen);
    let m = mass(r);
    let gedreht = false;
    if (m.b > nutzB || m.h > nutzH) {
      const form2 = drehen(form);
      const r2 = rahmenVon(form2.aussen);
      const m2 = mass(r2);
      if (m2.b <= nutzB && m2.h <= nutzH) {
        form = form2; r = r2; m = m2; gedreht = true;
      } else {
        zuGross.push({ name: teil.name, b: r.b, h: r.h });
        continue;
      }
    }
    kaesten.push({ teil, form, r, text, unten, b: m.b, h: m.h, gedreht });
  }

  // Höchste Kästen zuerst, dann breiteste
  kaesten.sort((a, b) => b.h - a.h || b.b - a.b);

  const platten = [];
  let platte = null, x = 0, y = 0, reihe = 0;
  const neuePlatte = () => {
    platte = { breite: W, hoehe: H, linien: [], teile: [] };
    platten.push(platte);
    x = RAND_ABSTAND;
    y = RAND_ABSTAND;
    reihe = 0;
  };
  for (const k of kaesten) {
    if (!platte) neuePlatte();
    if (x + k.b > W - RAND_ABSTAND + 1e-6) {
      // neue Reihe
      x = RAND_ABSTAND;
      y += reihe + ABSTAND;
      reihe = 0;
    }
    if (y + k.h > H - RAND_ABSTAND - BESCHRIFTUNG_STREIFEN + 1e-6) neuePlatte();

    // Teil oben im Kasten, Nummer darunter
    const dx = x - k.r.x0;
    const dy = y + k.unten - k.r.y0;
    const schieben = (p) => [p[0] + dx, p[1] + dy];
    // Zuerst ritzen (angeritzte Fenster/Türen bei einer Schicht), dann Löcher, dann Umriss
    for (const r of k.form.ritzlinien) platte.linien.push({ ebene: "RITZEN", punkte: r.punkte.map(schieben), geschlossen: r.geschlossen });
    for (const loch of k.form.loecher) platte.linien.push({ ebene: "SCHNITT", punkte: loch.map(schieben), geschlossen: true });
    platte.linien.push({ ebene: "SCHNITT", punkte: k.form.aussen.map(schieben), geschlossen: true });
    for (const strich of k.text.linien) {
      platte.linien.push({ ebene: "RITZEN", punkte: strich.map((p) => [p[0] + x, p[1] + y]), geschlossen: false });
    }
    platte.teile.push({ name: k.teil.name, teil: k.teil, b: k.r.b, h: k.r.h, gedreht: k.gedreht });

    x += k.b + ABSTAND;
    reihe = Math.max(reihe, k.h);
  }
  return { platten, zuGross };
}
