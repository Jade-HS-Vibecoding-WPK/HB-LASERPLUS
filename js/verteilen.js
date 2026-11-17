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
// Reihenfolge in der Datei je Teil: zuerst die Löcher, dann der Umriss,
// damit sich das Teil nicht vorher aus der Platte löst.
// =========================================================

import { RAND_ABSTAND } from "./dxf.js";
import { textLinien } from "./linienschrift.js";

const ABSTAND = 3;          // mm zwischen zwei Teilen
const SCHRIFT = 3;          // mm Höhe der Nummer
const SCHRIFT_ABSTAND = 1.5; // mm zwischen Nummer und Teil

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
  return { aussen: form.aussen.map(d), loecher: form.loecher.map((l) => l.map(d)) };
}

// teile: aus schichten.js (aussen/loecher in mm), e: Einstellungen
export function verteilen(teile, e) {
  const W = e.platteBreite, H = e.platteHoehe;
  const nutzB = W - 2 * RAND_ABSTAND, nutzH = H - 2 * RAND_ABSTAND;

  const kaesten = [];
  const zuGross = [];
  for (const teil of teile) {
    const text = textLinien(teil.name, SCHRIFT);
    const mass = (r) => ({ b: Math.max(r.b, text.breite), h: r.h + SCHRIFT + SCHRIFT_ABSTAND });
    let form = { aussen: teil.aussen, loecher: teil.loecher };
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
    kaesten.push({ teil, form, r, text, b: m.b, h: m.h, gedreht });
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
    if (y + k.h > H - RAND_ABSTAND + 1e-6) neuePlatte();

    // Teil oben im Kasten, Nummer darunter
    const dx = x - k.r.x0;
    const dy = y + SCHRIFT + SCHRIFT_ABSTAND - k.r.y0;
    const schieben = (p) => [p[0] + dx, p[1] + dy];
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
