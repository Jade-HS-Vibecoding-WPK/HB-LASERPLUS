// =========================================================
// Schichten, Ecken und Nummern
//
// Aus jeder Fassadenfläche werden (Einstellung „Wandaufbau“):
//   zwei Pappen (Standard):
//   - Außenschicht (A): mit Fenstern und Türen als Löcher
//   - Innenschicht (I): geschlossen, tragend
//   oder eine Pappe (A), geschlossen, Fenster und Türen
//   wahlweise angeritzt oder ganz weggelassen
// Jede Dachfläche wird eine Pappe (eine Schicht, Dicke = Pappdicke innen).
//
// Nummern: A-001 = Außenschicht, I-001 = Innenschicht derselben Fassade,
// D-001 = Dachfläche. Fassaden im Uhrzeigersinn ab Norden, Dach getrennt.
//
// Eckenausgleich (wie in CLAUDE.md beschrieben):
//   An jeder Ecke läuft eine Fläche durch, die andere wird gekürzt.
//   Durchlaufend und gekürzt wechseln sich rund ums Gebäude ab.
//   Rechnung über parallel versetzte Linien im Grundriss, damit die
//   Außenmaße stimmen – auch bei schrägen Winkeln. Bei schrägen Ecken
//   bleibt eine kleine Keilfuge, weil der Laser senkrecht schneidet.
//   Am First (und an Graten/Kehlen) gilt dieselbe Regel für die Dachplatten.
//
// Maße: Die Flächen kommen in Meter, die Teile gehen in mm im Modellmaßstab.
// =========================================================

import { zu3d } from "./abwickeln.js";

// ---------- Vektor-Helfer (3D) ----------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const laenge = (a) => Math.hypot(a[0], a[1], a[2]);

// Mittelpunkt einer Fläche in 3D (Mittel der Umrisspunkte)
function mitte3d(f) {
  let s = [0, 0];
  for (const p of f.aussen) s = [s[0] + p[0], s[1] + p[1]];
  return zu3d(f, [s[0] / f.aussen.length, s[1] / f.aussen.length]);
}

// Länge des gemeinsamen Stücks zweier Kanten in 3D (fast gleiche Linie, überlappend).
// Großzügig (3 cm), weil Morph-Flächen oft leicht verdreht sind.
function gemeinsam(a, b, c, d) {
  const ab = sub(b, a);
  const l = laenge(ab);
  const cd = sub(d, c);
  const lcd = laenge(cd);
  if (l < 1e-6 || lcd < 1e-6) return 0;
  const e = mul(ab, 1 / l);
  if (Math.abs(dot(e, mul(cd, 1 / lcd))) < 0.998) return 0; // nicht parallel
  const abstand = (p) => laenge(cross(sub(p, a), e));
  if (abstand(c) > 0.03 || abstand(d) > 0.03) return 0; // nicht auf derselben Linie
  const tc = dot(sub(c, a), e), td = dot(sub(d, a), e);
  const von = Math.max(0, Math.min(tc, td)), bis = Math.min(l, Math.max(tc, td));
  return bis - von;
}

// Winkel an einer Ecke: konvex = Außenecke (die andere Fläche liegt hinter dieser Ebene)
function eckWinkel(fi, fj, punkt) {
  const konvex = dot(sub(mitte3d(fj), punkt), fi.n) < 0;
  const psi = Math.acos(Math.max(-1, Math.min(1, dot(fi.n, fj.n))));
  const phi = konvex ? Math.PI - psi : Math.PI + psi; // Innenwinkel des Gebäudes
  return { konvex, phi };
}

// ---------------------------------------------------------
// Ecken finden.
// Ergebnis je Ecke: { i, j, kanten2d: {i: [A, B], j: [A, B]}, konvex, phi, durch, gemischt }
//   phi = Innenwinkel des Gebäudes an der Ecke (90° beim Rechteck)
//   kanten2d = die Eckkante in der flachen Ansicht jeder der beiden Flächen
//   durch = Index der Fläche, die an dieser Ecke durchläuft
// ---------------------------------------------------------
export function eckenFinden(flaechen) {
  const ecken = [...fassadenEcken(flaechen), ...dachEcken(flaechen)];

  // Rollen verteilen: abwechselnd durchlaufend (0) und gekürzt (1),
  // angefangen bei der größten Fläche
  const farbe = new Map();
  const reihenfolge = flaechen.map((f, i) => i).sort((a, b) => flaechen[b].flaeche - flaechen[a].flaeche);
  for (const start of reihenfolge) {
    if (farbe.has(start)) continue;
    farbe.set(start, 0);
    const schlange = [start];
    while (schlange.length) {
      const f = schlange.shift();
      for (const c of ecken) {
        const g = c.i === f ? c.j : c.j === f ? c.i : null;
        if (g === null || farbe.has(g)) continue;
        farbe.set(g, 1 - farbe.get(f));
        schlange.push(g);
      }
    }
  }
  for (const c of ecken) {
    if (farbe.get(c.i) !== farbe.get(c.j)) {
      c.durch = farbe.get(c.i) === 0 ? c.i : c.j;
    } else {
      // ungerade Eckenzahl: hier ist eine Platte „gemischt“
      c.durch = flaechen[c.i].flaeche >= flaechen[c.j].flaeche ? c.i : c.j;
      c.gemischt = true;
    }
  }
  return ecken;
}

// ---------------------------------------------------------
// Fassaden-Ecken über den Grundriss: Jede Fassade ist dort eine Linie.
// Schneiden sich zwei Linien nahe an je einem Ende beider Fassaden
// (höchstens 30 cm entfernt), ist dort eine Ecke. Beide Fassaden werden
// genau an den Schnittpunkt angepasst. So stören kleine Überstände oder
// Lücken aus Archicad (z. B. an Innenecken) nicht.
// ---------------------------------------------------------
function fassadenEcken(flaechen) {
  const SUCHWEITE = 0.3; // m
  const fassaden = flaechen.map((f, i) => i).filter((i) => flaechen[i].wofuer === "fassade");
  const enden = new Map();
  for (const i of fassaden) {
    const us = flaechen[i].aussen.map((p) => p[0]);
    enden.set(i, { umin: Math.min(...us), umax: Math.max(...us) });
  }
  const grundriss = (f, u) => {
    const p = zu3d(f, [u, 0]);
    return [p[0], p[2]];
  };

  // Alle möglichen Ecken sammeln
  const kandidaten = [];
  for (const i of fassaden) {
    for (const j of fassaden) {
      if (j <= i) continue;
      const fi = flaechen[i], fj = flaechen[j];
      const di = [fi.u[0], fi.u[2]], dj = [fj.u[0], fj.u[2]];
      const nenner = di[0] * dj[1] - di[1] * dj[0];
      if (Math.abs(nenner) < 0.05) continue; // (fast) parallel
      const ei = enden.get(i), ej = enden.get(j);
      const ai = grundriss(fi, ei.umin), aj = grundriss(fj, ej.umin);
      const w = [aj[0] - ai[0], aj[1] - ai[1]];
      const si = (w[0] * dj[1] - w[1] * dj[0]) / nenner;
      const sj = (w[0] * di[1] - w[1] * di[0]) / nenner;
      const ui = ei.umin + si, uj = ej.umin + sj; // Schnittpunkt in u jeder Fassade
      const endeI = Math.abs(ui - ei.umin) < Math.abs(ui - ei.umax) ? "umin" : "umax";
      const endeJ = Math.abs(uj - ej.umin) < Math.abs(uj - ej.umax) ? "umin" : "umax";
      const abI = Math.abs(ui - ei[endeI]), abJ = Math.abs(uj - ej[endeJ]);
      if (abI > SUCHWEITE || abJ > SUCHWEITE) continue;
      kandidaten.push({ i, j, ui, uj, endeI, endeJ, guete: abI + abJ });
    }
  }

  // Beste zuerst, jedes Fassadenende nur einmal
  kandidaten.sort((a, b) => a.guete - b.guete);
  const belegt = new Set();
  const ecken = [];
  for (const c of kandidaten) {
    const ki = c.i + c.endeI, kj = c.j + c.endeJ;
    if (belegt.has(ki) || belegt.has(kj)) continue;
    belegt.add(ki);
    belegt.add(kj);
    // Fassadenenden genau auf den Schnittpunkt setzen
    anpassen(flaechen[c.i], enden.get(c.i)[c.endeI], c.ui);
    anpassen(flaechen[c.j], enden.get(c.j)[c.endeJ], c.uj);
    const punkt = zu3d(flaechen[c.i], [c.ui, 0]);
    const { konvex, phi } = eckWinkel(flaechen[c.i], flaechen[c.j], punkt);
    if (Math.abs(Math.sin(phi)) < 0.05) continue;
    ecken.push({
      i: c.i,
      j: c.j,
      konvex,
      phi,
      kanten2d: { [c.i]: [[c.ui, -1000], [c.ui, 1000]], [c.j]: [[c.uj, -1000], [c.uj, 1000]] },
    });
  }
  return ecken;
}

// Alle Punkte am Ende einer Fassade (u ≈ alt) auf u = neu setzen
function anpassen(f, alt, neu) {
  const schieb = (p) => (Math.abs(p[0] - alt) < 0.002 ? [neu, p[1]] : p);
  f.aussen = f.aussen.map(schieb);
}

// ---------------------------------------------------------
// Dach-Ecken (First, Grat, Kehle): Dachflächen mit einer gemeinsamen Kante
// ---------------------------------------------------------
function dachEcken(flaechen) {
  const daecher = flaechen.map((f, i) => i).filter((i) => flaechen[i].wofuer === "dach");
  const kanten = new Map();
  for (const i of daecher) {
    const f = flaechen[i];
    kanten.set(i, f.aussen.map((p, k) => ({ a2: p, b2: f.aussen[(k + 1) % f.aussen.length] })));
    for (const k of kanten.get(i)) {
      k.a = zu3d(f, k.a2);
      k.b = zu3d(f, k.b2);
    }
  }
  const ecken = [];
  for (const i of daecher) {
    for (const j of daecher) {
      if (j <= i) continue;
      if (dot(flaechen[i].n, flaechen[j].n) > 0.999) continue;
      let beste = null, besteLaenge = 0.05; // mindestens 5 cm gemeinsam
      for (const ki of kanten.get(i)) {
        for (const kj of kanten.get(j)) {
          const l = gemeinsam(ki.a, ki.b, kj.a, kj.b);
          if (l > besteLaenge) {
            besteLaenge = l;
            beste = { ki, kj };
          }
        }
      }
      if (!beste) continue;
      const { konvex, phi } = eckWinkel(flaechen[i], flaechen[j], beste.ki.a);
      if (Math.abs(Math.sin(phi)) < 0.05) continue;
      ecken.push({
        i,
        j,
        konvex,
        phi,
        kanten2d: { [i]: [beste.ki.a2, beste.ki.b2], [j]: [beste.kj.a2, beste.kj.b2] },
      });
    }
  }
  return ecken;
}

// ---------------------------------------------------------
// Himmelsrichtung einer Fläche aus ihrer Richtung (Normale).
// web-ifc dreht die IFC so, dass y oben ist: Norden = −z, Osten = +x.
// ---------------------------------------------------------
export function himmelsrichtung(n) {
  const grad = ((Math.atan2(n[0], -n[2]) * 180) / Math.PI + 360) % 360;
  const buchstabe = ["N", "O", "S", "W"][Math.round(grad / 90) % 4];
  const wort = { N: "Nord", O: "Ost", S: "Süd", W: "West" }[buchstabe];
  return { grad, buchstabe, wort };
}

// ---------------------------------------------------------
// Teile bauen: Schichten, Eckenausgleich, Nummern
// e = Einstellungen (massstab, dickeInnen, dickeAussen)
// vorsatz = steht vor jeder Nummer, bei mehreren Gebäuden z. B. „2-“ → „2-A-001“
// ---------------------------------------------------------
export function teileBauen(flaechen, ecken, e, vorsatz = "") {
  const k = 1000 / e.massstab; // Meter → mm im Modell
  const ta = e.dickeAussen, ti = e.dickeInnen, td = e.dickeInnen;
  // Wandaufbau (Einstellung): "zwei" = Außen- + Innenschicht,
  // "eine-geritzt" / "eine-ohne" = nur eine Schicht (Dicke = Pappdicke innen,
  // im Formular dann „Pappdicke Wand und Dach“ genannt)
  const aufbau = e.wandaufbau || "zwei";
  const eineSchicht = aufbau !== "zwei";

  // Nummern: Fassaden im Uhrzeigersinn ab Norden, danach das Dach
  const nummer = new Map();
  const fassaden = flaechen.map((f, i) => i).filter((i) => flaechen[i].wofuer === "fassade");
  const daecher = flaechen.map((f, i) => i).filter((i) => flaechen[i].wofuer === "dach");
  const nachRichtung = (a, b) => himmelsrichtung(flaechen[a].n).grad - himmelsrichtung(flaechen[b].n).grad;
  fassaden.sort(nachRichtung).forEach((i, z) => nummer.set(i, z + 1));
  daecher.sort(nachRichtung).forEach((i, z) => nummer.set(i, z + 1));
  const drei = (z) => String(z).padStart(3, "0");

  const teile = [];
  for (const index of [...fassaden, ...daecher]) {
    const f = flaechen[index];
    const r = himmelsrichtung(f.n);
    const meineEcken = ecken.filter((c) => c.i === index || c.j === index);

    // Schichten: tiefe = wie weit die Vorderseite hinter der echten Außenfläche liegt.
    // eKlein/eGross = bis zu welcher Tiefe der Nachbarfläche die Platte reicht
    // ritzen = Fenster und Türen nicht ausschneiden, sondern anritzen
    let schichten;
    if (f.wofuer !== "fassade") {
      schichten = [{ schicht: "", wort: "Dachplatte", tiefe: 0, dicke: td, mitLoechern: true, eKlein: 0, eGross: td }];
    } else if (eineSchicht) {
      const wort = aufbau === "eine-geritzt" ? "Wand, eine Schicht, Öffnungen geritzt" : "Wand, eine Schicht, ohne Öffnungen";
      schichten = [{ schicht: "A", wort, tiefe: 0, dicke: ti, mitLoechern: false, ritzen: aufbau === "eine-geritzt", eKlein: 0, eGross: ti }];
    } else {
      schichten = [
        { schicht: "A", wort: "Außenschicht", tiefe: 0, dicke: ta, mitLoechern: true, eKlein: 0, eGross: ta },
        { schicht: "I", wort: "Innenschicht", tiefe: ta, dicke: ti, mitLoechern: false, eKlein: ta, eGross: ta + ti },
      ];
    }

    for (const s of schichten) {
      // Fassaden: kleine Stufen (z. B. vom Dach eingeschnittene Giebelecken) glätten
      let umriss = f.wofuer === "fassade" ? stufenGlaetten(f.aussen) : f.aussen.map((p) => [p[0], p[1]]);
      // Geschlossene Wand (Innenschicht oder eine Schicht): auch Aussparungen am
      // unteren Rand (Türen bis zum Boden) füllen. Die Umrisse dieser Türen
      // merken wir uns, falls sie angeritzt werden sollen.
      const tuerAussparungen = [];
      if (f.wofuer === "fassade" && !s.mitLoechern) umriss = unterkanteSchliessen(umriss, tuerAussparungen);
      // Ritzlinien (in Meter): Fenster/Türen als geschlossene Linien,
      // Türen bis zum Boden als offener Linienzug (unten ist ja die Schnittkante –
      // dort darf nicht noch einmal geritzt werden, sonst brennt die Pappe)
      const ritzlinien = s.ritzen
        ? [
            ...f.loecher.map((l) => ({ punkte: l, geschlossen: true })),
            ...tuerAussparungen.map((t) => ({ punkte: t, geschlossen: false })),
          ]
        : [];
      const eckInfo = [];
      for (const c of meineEcken) {
        const laeuftDurch = c.durch === index;
        // Außenecke: die durchlaufende Platte reicht weiter (kleines e).
        // Innenecke: umgekehrt, dort muss die durchlaufende Platte länger werden.
        const eWert = laeuftDurch === c.konvex ? s.eKlein : s.eGross;
        const x = (eWert + s.tiefe * Math.cos(c.phi)) / Math.sin(c.phi); // mm, positiv = kürzer
        umriss = kanteVerschieben(umriss, c.kanten2d[index], x / k);
        eckInfo.push({ laeuftDurch, schraeg: Math.abs(Math.cos(c.phi)) > 0.02, gemischt: !!c.gemischt });
      }
      // Nummern: A-001 = Außenschicht, I-001 = Innenschicht derselben Fassade, D-001 = Dachfläche
      const zahl = drei(nummer.get(index));
      const name = vorsatz + (f.wofuer === "fassade" ? `${s.schicht}-${zahl}` : `D-${zahl}`);
      teile.push({
        name,
        nummer: vorsatz + zahl,
        flaecheIndex: index,
        wofuer: f.wofuer,
        schicht: s.schicht,
        beschreibung: f.wofuer === "fassade" ? `Fassade ${r.wort}, ${s.wort}` : `Dachfläche ${r.wort}`,
        dicke: s.dicke,
        tiefe: s.tiefe, // mm: wie weit die Vorderseite hinter der Außenfläche liegt (für die Modell-Vorschau)
        aussen: umriss.map((p) => [p[0] * k, p[1] * k]),
        loecher: s.mitLoechern ? f.loecher.map((l) => l.map((p) => [p[0] * k, p[1] * k])) : [],
        ritzlinien: ritzlinien.map((r) => ({ punkte: r.punkte.map((p) => [p[0] * k, p[1] * k]), geschlossen: r.geschlossen })),
        ecken: eckInfo,
      });
    }
  }
  return teile;
}

// ---------------------------------------------------------
// Kleine Stufen im Umriss glätten (kürzer als 30 cm).
// Zwei kurze Kanten hintereinander zwischen zwei langen Kanten werden
// entfernt, und die beiden langen Kanten werden verlängert, bis sie sich
// treffen. Beispiel: Eine Giebelwand, die an der Traufe vom Dach
// eingeschnitten ist – danach läuft die Seitenkante gerade bis zur Dachschräge.
// ---------------------------------------------------------
function stufenGlaetten(umriss, maxStufe = 0.3) {
  let p = umriss.map((q) => [q[0], q[1]]);
  const abstand = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  let geaendert = true;
  let schutz = 0;
  while (geaendert && p.length > 4 && schutz++ < 100) {
    geaendert = false;
    const n = p.length;
    for (let i = 0; i < n; i++) {
      const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n], d = p[(i + 2) % n], e = p[(i + 3) % n];
      // a→b lang, b→c kurz, c→d kurz, d→e lang
      if (abstand(b, c) >= maxStufe || abstand(c, d) >= maxStufe) continue;
      if (abstand(a, b) < maxStufe || abstand(d, e) < maxStufe) continue;
      const x = schnittpunkt(a, b, d, e);
      if (!x || abstand(x, c) > 0.5) continue;
      // b, c und d durch den Schnittpunkt x ersetzen
      const weg = new Set([(i + 1) % n, (i + 2) % n]);
      const neu = [];
      for (let k = 0; k < n; k++) {
        if (k === i) neu.push(x);
        else if (!weg.has(k)) neu.push(p[k]);
      }
      p = neu;
      geaendert = true;
      break;
    }
  }
  return p;
}

// Schnittpunkt der Geraden durch a-b und c-d (oder null, wenn parallel)
function schnittpunkt(a, b, c, d) {
  const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]];
  const nenner = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(nenner) < 1e-9) return null;
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / nenner;
  return [a[0] + r[0] * t, a[1] + r[1] * t];
}

// ---------------------------------------------------------
// Aussparungen am unteren Rand schließen (z. B. eine Tür, die bis zum
// Boden geht). Der Umriss läuft gegen den Uhrzeigersinn, die Unterkante
// also von links nach rechts. Verlässt er die Unterkante und kommt weiter
// rechts wieder auf ihr an, ohne seitlich darüber hinaus zu gehen, ist
// das eine Aussparung – sie wird durch eine gerade Linie ersetzt.
// ---------------------------------------------------------
// aussparungen (wahlweise): Liste, in die jede geschlossene Aussparung als
// offener Linienzug gelegt wird (von der Unterkante hoch, rüber, wieder runter).
function unterkanteSchliessen(umriss, aussparungen = null) {
  const n = umriss.length;
  const vmin = Math.min(...umriss.map((p) => p[1]));
  const unten = (p) => Math.abs(p[1] - vmin) < 1e-3;
  // Start beim Punkt ganz links auf der Unterkante
  let start = -1;
  for (let i = 0; i < n; i++) {
    if (unten(umriss[i]) && (start < 0 || umriss[i][0] < umriss[start][0])) start = i;
  }
  if (start < 0) return umriss;

  const neu = [];
  let i = 0;
  while (i < n) {
    const idx = (start + i) % n;
    const p = umriss[idx];
    neu.push(p);
    if (unten(p)) {
      // nächster Punkt, der wieder auf der Unterkante liegt
      let k = 1;
      while (i + k < n && !unten(umriss[(idx + k) % n])) k++;
      if (k > 1 && i + k < n) {
        const q = umriss[(idx + k) % n];
        let innerhalb = q[0] > p[0];
        for (let m = 1; m < k && innerhalb; m++) {
          const z = umriss[(idx + m) % n];
          innerhalb = z[0] >= p[0] - 1e-6 && z[0] <= q[0] + 1e-6;
        }
        if (innerhalb) {
          if (aussparungen) {
            const zug = [];
            for (let m = 0; m <= k; m++) zug.push(umriss[(idx + m) % n]);
            aussparungen.push(zug);
          }
          i += k; // Umweg überspringen, weiter bei q
          continue;
        }
      }
    }
    i++;
  }
  return neu.length >= 3 ? neu : umriss;
}

// ---------------------------------------------------------
// Eine Kante des Umrisses parallel verschieben (um x, in Meter).
// Positiv = ins Teil hinein (kürzer), negativ = nach außen (länger).
// Die Punkte auf der Kante rutschen dabei entlang ihrer Nachbarkanten,
// so bleibt z. B. eine schräge Giebelkante schräg.
// ---------------------------------------------------------
function kanteVerschieben(umriss, [A, B], x) {
  if (!Number.isFinite(x) || Math.abs(x) < 1e-9) return umriss;
  const dl = Math.hypot(B[0] - A[0], B[1] - A[1]);
  if (dl < 1e-9) return umriss;
  const d = [(B[0] - A[0]) / dl, (B[1] - A[1]) / dl];
  // Normale der Kante, die ins Teil zeigt
  let m = [-d[1], d[0]];
  let sx = 0, sy = 0;
  for (const p of umriss) {
    sx += p[0];
    sy += p[1];
  }
  const mitte = [sx / umriss.length, sy / umriss.length];
  if ((mitte[0] - A[0]) * m[0] + (mitte[1] - A[1]) * m[1] < 0) m = [-m[0], -m[1]];

  const aufKante = (p) => {
    const quer = (p[0] - A[0]) * m[0] + (p[1] - A[1]) * m[1];
    const laengs = (p[0] - A[0]) * d[0] + (p[1] - A[1]) * d[1];
    return Math.abs(quer) < 1e-3 && laengs > -0.01 && laengs < dl + 0.01;
  };
  const n = umriss.length;
  const neu = umriss.map((p, i) => {
    if (!aufKante(p)) return p;
    const vor = umriss[(i - 1 + n) % n], nach = umriss[(i + 1) % n];
    const nachbar = !aufKante(nach) ? nach : !aufKante(vor) ? vor : null;
    if (!nachbar) return [p[0] + m[0] * x, p[1] + m[1] * x];
    const w = [nachbar[0] - p[0], nachbar[1] - p[1]];
    const nenner = w[0] * m[0] + w[1] * m[1];
    // Läuft die Nachbarkante fast parallel zur Eckkante, einfach senkrecht verschieben
    if (Math.abs(nenner) < 0.1 * Math.hypot(w[0], w[1])) return [p[0] + m[0] * x, p[1] + m[1] * x];
    const t = x / nenner;
    return [p[0] + w[0] * t, p[1] + w[1] * t];
  });
  // doppelte Punkte entfernen
  return neu.filter((p, i) => {
    const q = neu[(i + 1) % neu.length];
    return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-5;
  });
}
