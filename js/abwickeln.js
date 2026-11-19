// =========================================================
// Abwickeln – Fassaden und Dachflächen flach legen
//
// Eingang: die Dreiecke der Gebäudehülle (aus ifc-lesen.js), in Meter.
// web-ifc liefert sie so, dass y nach oben zeigt.
//
// So gehen wir vor (wie beim Zeichnen einer Ansicht):
//   1. Jedes Dreieck bekommt seine Richtung (Normale = zeigt nach außen).
//   2. Senkrechte Dreiecke von Wänden → Fassade, schräge/waagerechte
//      Dreiecke von Dächern, die nach oben zeigen → Dach. Nach unten
//      zeigende Dreiecke von Decken (und Morphs) → Untersicht („decke“),
//      z. B. die Decke über einem Rücksprung im Erdgeschoss (seit 19.11.).
//   3. Dreiecke in derselben Ebene kommen in eine Gruppe.
//   4. Außen ist eine Gruppe, wenn ein „Blick“ von ihr nach außen
//      kein anderes Bauteil trifft (Strahltest). So fallen innere
//      Schichten und Innenseiten weg, auch bei L- oder U-Formen.
//      Seit 19.11. zusätzlich: Seitenwände eines Rücksprungs (der Blick
//      trifft die gegenüberliegende Seitenwand, aber zur Seite ist es offen)
//      und Untersichten (unter der Decke ist es zur Seite offen).
//      Zwei „Außenflächen“ Rücken an Rücken auf derselben Wand: nur die,
//      die wirklich ins Freie schaut, bleibt.
//   5. Jede Gruppe wird flach gelegt (u nach rechts, v nach oben, so
//      wie man sie von außen sieht) und zu Umrissen mit Löchern
//      (Fenster, Türen) zusammengefügt. Rücksprung-Seitenwände und
//      Untersichten werden an den Wänden davor zugeschnitten.
// Ausgang: Liste von Flächen mit Umriss und Löchern in Meter.

// Rücksprünge (z. B. Arkade, Eingangsnische) bekommen erst ab dieser Tiefe
// eigene Seitenwände. Flachere Seitenflächen sind Laibungen von Fenstern und
// Türen (so tief wie die Wand) – die bleiben wie bisher nur Löcher.
const RUECKSPRUNG_MIN_TIEFE = 0.7; // m
// Untersichten erst ab dieser Höhe über dem tiefsten Punkt des Modells –
// die Unterseite einer Bodenplatte oder eines Morphs auf dem Gelände zählt nicht.
const UNTERSICHT_MIN_HOEHE = 0.5; // m
// =========================================================

// ---------- kleine Vektor-Helfer (3D) ----------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const laenge = (a) => Math.hypot(a[0], a[1], a[2]);
const einheit = (a) => {
  const l = laenge(a);
  return l > 0 ? mul(a, 1 / l) : [0, 0, 0];
};

// Fläche eines flachen Polygons (positiv = gegen den Uhrzeigersinn)
export function flaeche2d(p) {
  let f = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    f += a[0] * b[1] - b[0] * a[1];
  }
  return f / 2;
}

// Liegt Punkt p im Polygon? (Strahl-Zählverfahren)
export function imPolygon(p, poly) {
  let drin = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) drin = !drin;
  }
  return drin;
}

// ---------------------------------------------------------
// Hauptaufgabe
// huelle: [{ art: "wand" | "dach" | "decke" | "proxy", bauteil, dreiecke: Float64Array (9 Zahlen je Dreieck) }]
// wahlFuerProxy: Map bauteil → "ignorieren" | "koerper" | "wand" | "dach"
// ---------------------------------------------------------
export function flaechenFinden(huelle, wahlFuerProxy = new Map()) {
  // 1. Alle Dreiecke mit Richtung, je Bauteil mit umgebender Kiste
  const stuecke = [];    // Wände, Dächer, Decken, Morphs
  const oeffnungen = []; // Fenster und Türen: verdecken nur beim Seitenblick (siehe 4.)
  for (const teil of huelle) {
    const art = teil.art === "proxy" ? wahlFuerProxy.get(teil.bauteil) || "ignorieren" : teil.art;
    if (art === "ignorieren") continue;
    const liste = [];
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    const d = teil.dreiecke;
    for (let i = 0; i + 8 < d.length; i += 9) {
      const a = [d[i], d[i + 1], d[i + 2]];
      const b = [d[i + 3], d[i + 4], d[i + 5]];
      const c = [d[i + 6], d[i + 7], d[i + 8]];
      for (const p of [a, b, c]) {
        for (let k = 0; k < 3; k++) {
          if (p[k] < min[k]) min[k] = p[k];
          if (p[k] > max[k]) max[k] = p[k];
        }
      }
      const kreuz = cross(sub(b, a), sub(c, a));
      const l = laenge(kreuz);
      if (l < 1e-9) continue; // Dreieck ohne Fläche
      liste.push({ a, b, c, n: mul(kreuz, 1 / l), flaeche: l / 2, art });
    }
    if (!liste.length) continue;
    (art === "oeffnung" ? oeffnungen : stuecke).push({ dreiecke: liste, min, max });
  }

  // Körper: Bauteile, die sich berühren (5 cm Spiel), bilden einen Baukörper.
  // Steht ein zweiter Körper daneben (z. B. ein Morph als Nebengebäude), ist der
  // Raum dazwischen Außenraum – er verdeckt beim „Blick nach außen“ nichts.
  const eltern = stuecke.map((s, i) => i);
  const wurzel = (i) => (eltern[i] === i ? i : (eltern[i] = wurzel(eltern[i])));
  for (let i = 0; i < stuecke.length; i++) {
    for (let j = i + 1; j < stuecke.length; j++) {
      const A = stuecke[i], B = stuecke[j];
      let beruehren = true;
      for (let k = 0; k < 3; k++) if (A.max[k] + 0.05 < B.min[k] || B.max[k] + 0.05 < A.min[k]) beruehren = false;
      if (beruehren) eltern[wurzel(i)] = wurzel(j);
    }
  }
  const alle = [];
  const proKoerper = new Map(); // Körper → seine Dreiecke
  stuecke.forEach((s, i) => {
    const k = wurzel(i);
    if (!proKoerper.has(k)) proKoerper.set(k, []);
    for (const d of s.dreiecke) {
      d.koerper = k;
      alle.push(d);
      proKoerper.get(k).push(d);
    }
  });

  // Tiefster Punkt des Modells (für Untersichten, siehe UNTERSICHT_MIN_HOEHE)
  let yBoden = Infinity;
  for (const d of alle) yBoden = Math.min(yBoden, d.a[1], d.b[1], d.c[1]);

  // 2. Wofür kommt ein Dreieck in Frage?
  //    Senkrechte Kanten von Decken zählen zur Fassade (z. B. die Stirnseite
  //    der Decke über einem Rücksprung), ihre Unterseite wird Untersicht.
  const kandidaten = [];
  for (const d of alle) {
    const ny = d.n[1];
    let wofuer = null;
    if ((d.art === "wand" || d.art === "koerper" || d.art === "decke") && Math.abs(ny) <= 0.25) wofuer = "fassade";
    if ((d.art === "dach" || d.art === "koerper") && ny > 0.25) wofuer = "dach";
    if ((d.art === "decke" || d.art === "koerper") && ny < -0.25) {
      const y = (d.a[1] + d.b[1] + d.c[1]) / 3;
      if (y > yBoden + UNTERSICHT_MIN_HOEHE) wofuer = "decke";
    }
    if (wofuer) kandidaten.push({ ...d, wofuer });
  }

  // 3. Nach Ebenen gruppieren: gleiche Richtung und gleicher Abstand –
  //    oder fast gleiche Richtung und direkt angrenzend (Morphs sind oft
  //    nicht ganz eben und bestehen aus leicht geknickten Dreiecken)
  const gruppen = [];
  const nah = (p, q) => Math.abs(p[0] - q[0]) < 0.005 && Math.abs(p[1] - q[1]) < 0.005 && Math.abs(p[2] - q[2]) < 0.005;
  for (const d of kandidaten) {
    const abstand = dot(d.n, d.a);
    let g = gruppen.find(
      (g) =>
        g.wofuer === d.wofuer &&
        g.koerper === d.koerper &&
        dot(g.n, d.n) > 0.999 &&
        (Math.abs(g.abstand - abstand) < 0.003 || g.punkte.some((p) => nah(p, d.a) || nah(p, d.b) || nah(p, d.c)))
    );
    if (!g) {
      g = { wofuer: d.wofuer, koerper: d.koerper, n: d.n, abstand, dreiecke: [], punkte: [] };
      gruppen.push(g);
    }
    g.dreiecke.push(d);
    g.punkte.push(d.a, d.b, d.c);
  }
  // Mittlere Ebene je Gruppe (nach Fläche gewichtet)
  for (const g of gruppen) {
    let summe = [0, 0, 0];
    for (const d of g.dreiecke) summe = add(summe, mul(d.n, d.flaeche));
    g.n = einheit(summe);
    let gewicht = 0, abst = 0;
    for (const d of g.dreiecke) {
      abst += dot(g.n, mul(add(add(d.a, d.b), d.c), 1 / 3)) * d.flaeche;
      gewicht += d.flaeche;
    }
    g.abstand = abst / gewicht;
  }

  // 4. Außen oder innen? Strahltest von der Mitte jedes Dreiecks nach außen
  //    „gerade“   = der Blick geradeaus trifft nichts
  //    „seitlich“ = geradeaus trifft er die gegenüberliegende Wand, aber von
  //                 der Mitte dazwischen ist es zur Seite offen (Rücksprung)
  //    Geprüft wird nur gegen den eigenen Körper (siehe 1.).
  const blickFrei = (o, r, ohne, koerper) => {
    for (const h of proKoerper.get(koerper)) if (h !== ohne && abstandBis(o, r, h) < Infinity) return false;
    return true;
  };
  const naechsterTreffer = (o, r, ohne, koerper) => {
    let beste = Infinity;
    for (const h of proKoerper.get(koerper)) {
      if (h === ohne) continue;
      const t = abstandBis(o, r, h);
      if (t < beste) beste = t;
    }
    return beste;
  };
  // Fenster und Türen gelten beim Seitenblick als geschlossen: Wer nur durch
  // ein Fenster hinaussieht, steht in einem Raum, nicht in einem Rücksprung.
  const oeffnungTrifft = (o, r) => {
    for (const oe of oeffnungen) {
      if (!kisteTrifft(o, r, oe.min, oe.max)) continue;
      for (const h of oe.dreiecke) if (abstandBis(o, r, h) < Infinity) return true;
    }
    return false;
  };
  const seitlichFrei = (o, r, koerper) => blickFrei(o, r, null, koerper) && !oeffnungTrifft(o, r);
  // Untersicht: 10 cm unter der Decke waagerecht in vier Richtungen schauen.
  // Ist es zu einer Seite offen, liegt darunter Außenraum (Rücksprung, Durchgang).
  // Unter einer Decke im Haus treffen alle vier Blicke eine Wand (oder ein Fenster).
  const untersichtFrei = (mitte, koerper) => {
    const p = [mitte[0], mitte[1] - 0.1, mitte[2]];
    for (const r of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) if (seitlichFrei(p, r, koerper)) return true;
    return false;
  };
  const pruefen = (d) => {
    const mitte = mul(add(add(d.a, d.b), d.c), 1 / 3);
    if (d.wofuer === "decke") return untersichtFrei(mitte, d.koerper) ? "gerade" : null;
    const start = add(mitte, mul(d.n, 0.002));
    const t = naechsterTreffer(start, d.n, d, d.koerper);
    if (t === Infinity) return "gerade";
    if (d.wofuer !== "fassade") return null;
    const quer = cross(d.n, [0, 1, 0]);
    if (laenge(quer) < 0.5) return null;
    const q = einheit(quer);
    const m = add(start, mul(d.n, t / 2)); // Mitte zwischen dieser und der gegenüberliegenden Wand
    return seitlichFrei(m, q, d.koerper) || seitlichFrei(m, mul(q, -1), d.koerper) ? "seitlich" : null;
  };
  for (const g of gruppen) {
    let gerade = 0, seitlich = 0, gesamt = 0;
    for (const d of g.dreiecke) {
      gesamt += d.flaeche;
      const art = pruefen(d);
      if (art === "gerade") gerade += d.flaeche;
      else if (art === "seitlich") seitlich += d.flaeche;
    }
    g.anteilGerade = gerade / gesamt;
    g.aussen = gerade + seitlich >= 0.5 * gesamt; // mehr als die Hälfte sieht ins Freie
    g.nurSeitlich = g.aussen && gerade < 0.5 * gesamt; // nur über den Seitenblick (Rücksprung)
  }

  // Zwei „Außenflächen“ Rücken an Rücken (die beiden Seiten derselben Wand,
  // 2 cm bis 1 m auseinander): Nur eine schaut wirklich ins Freie. Die andere
  // „sieht“ nur durch Fenster und Türen gegenüber hinaus – sie fällt weg.
  for (const g of gruppen) {
    if (!g.aussen || g.wofuer !== "fassade") continue;
    for (const h of gruppen) {
      if (h === g || !h.aussen || h.wofuer !== "fassade" || h.koerper !== g.koerper) continue;
      if (dot(g.n, h.n) > -0.99) continue;
      const tiefe = g.abstand + h.abstand; // h liegt so weit hinter g
      if (tiefe < 0.02 || tiefe > 1) continue;
      if (!ueberlappen(g, h)) continue;
      const [stark, schwach] = g.anteilGerade >= h.anteilGerade ? [g, h] : [h, g];
      if (stark.anteilGerade >= 0.9 && schwach.anteilGerade < 0.9) schwach.aussen = false;
    }
  }

  // 5. Flach legen und zu Umrissen zusammenfügen
  const flaechen = [];
  for (const g of gruppen) {
    if (!g.aussen) continue;
    const { u, v } = achsen(g.n);
    const ursprung = mul(g.n, g.abstand); // ein Punkt auf der Ebene
    const zu2d = (p) => {
      const r = sub(p, ursprung);
      return [dot(r, u), dot(r, v)];
    };
    const dreiecke2d = g.dreiecke.map((d) => [zu2d(d.a), zu2d(d.b), zu2d(d.c)]);
    for (const region of vereinigen(dreiecke2d)) {
      // Kleine Stücke und schmale Streifen weglassen, z. B. die Ränder der
      // Fensterlaibungen (oft nur 1 cm breit). Mittlere Breite ≈ 2 · Fläche / Umfang.
      let umfang = 0;
      for (let k = 0; k < region.aussen.length; k++) {
        const a = region.aussen[k], b = region.aussen[(k + 1) % region.aussen.length];
        umfang += Math.hypot(b[0] - a[0], b[1] - a[1]);
      }
      if (region.flaeche < 0.2 || (2 * region.flaeche) / umfang < 0.05) continue;
      flaechen.push({
        wofuer: g.wofuer,
        n: g.n,
        ursprung,
        u,
        v,
        aussen: region.aussen,
        loecher: region.loecher,
        flaeche: region.flaeche,
        nurSeitlich: g.nurSeitlich,
        koerper: g.koerper,
      });
    }
  }

  // 6. Rücksprung-Seitenwände und Untersichten an den Wänden davor zuschneiden.
  //    Beispiel: Die Decke über einem Rücksprung reicht in der IFC ein Stück
  //    in die Wände hinein – sichtbar (und gelasert) wird nur der Teil
  //    zwischen den Wänden. Dasselbe für die Seitenwände, die in die Rückwand laufen.
  const fassaden = flaechen.filter((f) => f.wofuer === "fassade");
  const ergebnis = [];
  for (const f of flaechen) {
    if (f.wofuer === "decke" || f.nurSeitlich) {
      vorWaendenZuschneiden(f, fassaden.filter((g) => g.koerper === f.koerper));
      if (f.aussen.length < 3 || f.flaeche < 0.2) continue;
    }
    if (f.nurSeitlich) {
      // nur echte Rücksprünge: tiefer als eine Fensterlaibung
      const us = f.aussen.map((p) => p[0]);
      if (Math.max(...us) - Math.min(...us) < RUECKSPRUNG_MIN_TIEFE) continue;
    }
    ergebnis.push(f);
  }
  return ergebnis;
}

// Überlappen zwei Gruppen, von vorne gesehen? (Ausdehnung in den beiden
// Richtungen der Ebene von g, mindestens 30 cm gemeinsam)
function ueberlappen(g, h) {
  const { u, v } = achsen(g.n);
  const spanne = (gruppe, r) => {
    let min = Infinity, max = -Infinity;
    for (const p of gruppe.punkte) {
      const w = dot(p, r);
      if (w < min) min = w;
      if (w > max) max = w;
    }
    return [min, max];
  };
  for (const r of [u, v]) {
    const [a0, a1] = spanne(g, r), [b0, b1] = spanne(h, r);
    if (Math.min(a1, b1) - Math.max(a0, b0) < 0.3) return false;
  }
  return true;
}

// Fläche f an den Fassaden zuschneiden, vor denen sie liegt und deren Ebene
// sie durchschneidet (alles hinter so einer Wand liegt im Haus).
function vorWaendenZuschneiden(f, fassaden) {
  const mitte = (() => {
    let s = [0, 0];
    for (const p of f.aussen) s = [s[0] + p[0], s[1] + p[1]];
    return zu3d(f, [s[0] / f.aussen.length, s[1] / f.aussen.length]);
  })();
  const kiste = (fl) => {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const p of fl.aussen) {
      const q = zu3d(fl, p);
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], q[k]);
        max[k] = Math.max(max[k], q[k]);
      }
    }
    return { min, max };
  };
  for (const g of fassaden) {
    if (g === f) continue;
    if (Math.abs(dot(g.n, f.n)) > 0.9) continue; // parallel: schneidet nicht
    const ebene = dot(g.n, g.ursprung);
    if (dot(g.n, mitte) - ebene <= 0.01) continue; // f liegt nicht vor g
    const seite = (p) => dot(g.n, zu3d(f, p)) - ebene; // ≥ 0 = vor der Wand g
    if (Math.min(...f.aussen.map(seite)) > -0.005) continue; // nichts dahinter
    // Reicht die Wand g überhaupt bis an f heran? (umgebende Kisten, 5 cm Spiel)
    const kg = kiste(g), kf = kiste(f);
    let trifft = true;
    for (let k = 0; k < 3; k++) {
      if (kg.max[k] + 0.05 < kf.min[k] || kf.max[k] + 0.05 < kg.min[k]) trifft = false;
    }
    if (!trifft) continue;
    f.aussen = halbebeneSchneiden(f.aussen, seite);
    f.loecher = f.loecher.map((l) => halbebeneSchneiden(l, seite)).filter((l) => l.length >= 3 && Math.abs(flaeche2d(l)) > 1e-4);
    if (f.aussen.length < 3) break;
  }
  f.flaeche = f.aussen.length >= 3 ? flaeche2d(f.aussen) + f.loecher.reduce((s, l) => s + flaeche2d(l), 0) : 0;
}

// Vieleck an einer Geraden abschneiden: behalten wird, wo seite(p) ≥ 0 ist
function halbebeneSchneiden(poly, seite) {
  const neu = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const sa = seite(a), sb = seite(b);
    if (sa >= 0) neu.push(a);
    if ((sa >= 0) !== (sb >= 0)) {
      const t = sa / (sa - sb);
      neu.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return vereinfachen(neu);
}

// Von 2D (u, v) zurück in 3D
export function zu3d(f, p) {
  return add(f.ursprung, add(mul(f.u, p[0]), mul(f.v, p[1])));
}

// Von 3D in die flache Ansicht der Fläche
export function zu2dVon(f, p) {
  const r = sub(p, f.ursprung);
  return [dot(r, f.u), dot(r, f.v)];
}

// Achsen der flachen Ansicht: v nach oben (bzw. die Dachneigung hinauf),
// u nach rechts, so wie man die Fläche von außen sieht
function achsen(n) {
  const oben = [0, 1, 0];
  let v = sub(oben, mul(n, dot(oben, n)));
  if (laenge(v) < 1e-6) v = [0, 0, -1]; // Flachdach: „oben“ in der Zeichnung ist Norden
  v = einheit(v);
  const u = einheit(cross(mul(n, -1), v));
  return { u, v };
}

// Geht ein Strahl (Start o, Richtung r) durch eine achsparallele Kiste (min, max)?
// Schneller Vortest, bevor die Dreiecke eines Fensters geprüft werden.
function kisteTrifft(o, r, min, max) {
  let t0 = 0, t1 = Infinity;
  for (let k = 0; k < 3; k++) {
    if (Math.abs(r[k]) < 1e-12) {
      if (o[k] < min[k] - 1e-6 || o[k] > max[k] + 1e-6) return false;
      continue;
    }
    let a = (min[k] - o[k]) / r[k], b = (max[k] - o[k]) / r[k];
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
    if (t0 > t1) return false;
  }
  return true;
}

// Trifft ein Strahl (Start o, Richtung r) das Dreieck h? (Möller-Trumbore)
// Ergebnis: Abstand bis zum Treffer, oder Infinity, wenn er nicht trifft
function abstandBis(o, r, h) {
  const e1 = sub(h.b, h.a), e2 = sub(h.c, h.a);
  const p = cross(r, e2);
  const det = dot(e1, p);
  if (Math.abs(det) < 1e-12) return Infinity;
  const inv = 1 / det;
  const s = sub(o, h.a);
  const u = dot(s, p) * inv;
  if (u < 0 || u > 1) return Infinity;
  const q = cross(s, e1);
  const v = dot(r, q) * inv;
  if (v < 0 || u + v > 1) return Infinity;
  const t = dot(e2, q) * inv;
  return t > 1e-6 ? t : Infinity;
}

// ---------------------------------------------------------
// Flache Dreiecke zu Umrissen mit Löchern zusammenfügen.
// Idee: Jede Kante zwischen zwei Dreiecken kommt zweimal vor,
// einmal hin und einmal zurück – die heben sich auf. Übrig bleiben
// nur die Randkanten: der Außenumriss und die Ränder der Löcher.
// ---------------------------------------------------------
function vereinigen(dreiecke) {
  const RASTER = 1e4; // auf 0,1 mm runden, damit gleiche Punkte gleich sind
  const punkte = new Map();
  const schluessel = (p) => {
    const x = Math.round(p[0] * RASTER), y = Math.round(p[1] * RASTER);
    const k = x + "," + y;
    if (!punkte.has(k)) punkte.set(k, [x / RASTER, y / RASTER]);
    return k;
  };

  const kanten = [];
  for (const dreieck of dreiecke) {
    let [a, b, c] = dreieck;
    if (flaeche2d([a, b, c]) < 0) [b, c] = [c, b]; // alle gegen den Uhrzeigersinn
    const ka = schluessel(a), kb = schluessel(b), kc = schluessel(c);
    if (ka === kb || kb === kc || kc === ka) continue;
    kanten.push([ka, kb], [kb, kc], [kc, ka]);
  }

  // T-Stöße: Kanten an Punkten teilen, die genau auf ihnen liegen
  const liste = [...punkte.entries()];
  const geteilt = [];
  for (const [ka, kb] of kanten) {
    const A = punkte.get(ka), B = punkte.get(kb);
    const d = [B[0] - A[0], B[1] - A[1]];
    const l2 = d[0] * d[0] + d[1] * d[1];
    const dazwischen = [];
    for (const [k, P] of liste) {
      if (k === ka || k === kb) continue;
      if (P[0] < Math.min(A[0], B[0]) - 2e-4 || P[0] > Math.max(A[0], B[0]) + 2e-4) continue;
      if (P[1] < Math.min(A[1], B[1]) - 2e-4 || P[1] > Math.max(A[1], B[1]) + 2e-4) continue;
      const t = ((P[0] - A[0]) * d[0] + (P[1] - A[1]) * d[1]) / l2;
      if (t <= 1e-6 || t >= 1 - 1e-6) continue;
      const abstand = Math.abs((P[0] - A[0]) * d[1] - (P[1] - A[1]) * d[0]) / Math.sqrt(l2);
      if (abstand < 2e-4) dazwischen.push([t, k]);
    }
    dazwischen.sort((x, y) => x[0] - y[0]);
    let vorher = ka;
    for (const [, k] of dazwischen) {
      geteilt.push([vorher, k]);
      vorher = k;
    }
    geteilt.push([vorher, kb]);
  }

  // Hin- und Rückkanten heben sich auf
  const zaehler = new Map();
  for (const [ka, kb] of geteilt) {
    const k = ka + "|" + kb;
    zaehler.set(k, (zaehler.get(k) || 0) + 1);
  }
  const rand = [];
  for (const [k, anzahl] of zaehler) {
    const [ka, kb] = k.split("|");
    if (anzahl > (zaehler.get(kb + "|" + ka) || 0)) rand.push([ka, kb]);
  }

  // Randkanten zu geschlossenen Linienzügen verbinden
  const ausgehend = new Map();
  for (const kante of rand) {
    const l = ausgehend.get(kante[0]) || [];
    l.push(kante);
    ausgehend.set(kante[0], l);
  }
  const benutzt = new Set();
  const schleifen = [];
  for (const start of rand) {
    if (benutzt.has(start)) continue;
    const schleife = [];
    let kante = start;
    while (kante && !benutzt.has(kante)) {
      benutzt.add(kante);
      schleife.push(punkte.get(kante[0]));
      const P = punkte.get(kante[0]), Q = punkte.get(kante[1]);
      const rein = [Q[0] - P[0], Q[1] - P[1]];
      const moeglich = (ausgehend.get(kante[1]) || []).filter((k) => !benutzt.has(k));
      // Bei mehreren Möglichkeiten am stärksten nach links abbiegen,
      // so bleiben sich berührende Umrisse getrennt
      let beste = null, besterWinkel = -Infinity;
      for (const k of moeglich) {
        const R = punkte.get(k[1]);
        const raus = [R[0] - Q[0], R[1] - Q[1]];
        const w = Math.atan2(rein[0] * raus[1] - rein[1] * raus[0], rein[0] * raus[0] + rein[1] * raus[1]);
        if (w > besterWinkel) {
          besterWinkel = w;
          beste = k;
        }
      }
      kante = beste;
    }
    const einfach = vereinfachen(schleife);
    if (einfach.length >= 3) schleifen.push(einfach);
  }

  // Außenumrisse (gegen den Uhrzeigersinn) und Löcher (im Uhrzeigersinn)
  const regionen = schleifen
    .filter((s) => flaeche2d(s) > 0)
    .map((s) => ({ aussen: s, loecher: [], flaeche: flaeche2d(s) }));
  for (const loch of schleifen.filter((s) => flaeche2d(s) < 0)) {
    // Das Loch gehört zum kleinsten Umriss, in dem die Mitte seiner ersten Kante liegt
    const a = loch[0], b = loch[1];
    const mitte = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const ziel = regionen.filter((r) => imPolygon(mitte, r.aussen)).sort((x, y) => x.flaeche - y.flaeche)[0];
    if (ziel) {
      ziel.loecher.push(loch);
      ziel.flaeche += flaeche2d(loch);
    }
  }
  return regionen;
}

// Punkte auf einer geraden Linie und doppelte Punkte entfernen
function vereinfachen(punkte) {
  const p = punkte.slice();
  let i = 0, ohneAenderung = 0;
  while (p.length > 3 && ohneAenderung < p.length) {
    i = i % p.length;
    const a = p[(i - 1 + p.length) % p.length], b = p[i], c = p[(i + 1) % p.length];
    const ab = [b[0] - a[0], b[1] - a[1]], bc = [c[0] - b[0], c[1] - b[1]];
    const lab = Math.hypot(ab[0], ab[1]), lbc = Math.hypot(bc[0], bc[1]);
    const sinus = lab > 0 && lbc > 0 ? (ab[0] * bc[1] - ab[1] * bc[0]) / (lab * lbc) : 0;
    const gerade = lab < 1e-4 || (Math.abs(sinus) < 1e-3 && ab[0] * bc[0] + ab[1] * bc[1] > 0);
    if (gerade) {
      p.splice(i, 1);
      ohneAenderung = 0;
    } else {
      i++;
      ohneAenderung++;
    }
  }
  return p;
}
