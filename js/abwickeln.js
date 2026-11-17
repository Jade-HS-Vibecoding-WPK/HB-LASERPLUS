// =========================================================
// Abwickeln – Fassaden und Dachflächen flach legen
//
// Eingang: die Dreiecke der Gebäudehülle (aus ifc-lesen.js), in Meter.
// web-ifc liefert sie so, dass y nach oben zeigt.
//
// So gehen wir vor (wie beim Zeichnen einer Ansicht):
//   1. Jedes Dreieck bekommt seine Richtung (Normale = zeigt nach außen).
//   2. Senkrechte Dreiecke von Wänden → Fassade, schräge/waagerechte
//      Dreiecke von Dächern, die nach oben zeigen → Dach.
//   3. Dreiecke in derselben Ebene kommen in eine Gruppe.
//   4. Außen ist eine Gruppe, wenn ein „Blick“ von ihr nach außen
//      kein anderes Bauteil trifft (Strahltest). So fallen innere
//      Schichten und Innenseiten weg, auch bei L- oder U-Formen.
//   5. Jede Gruppe wird flach gelegt (u nach rechts, v nach oben, so
//      wie man sie von außen sieht) und zu Umrissen mit Löchern
//      (Fenster, Türen) zusammengefügt.
// Ausgang: Liste von Flächen mit Umriss und Löchern in Meter.
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
// huelle: [{ art: "wand" | "dach" | "proxy", bauteil, dreiecke: Float64Array (9 Zahlen je Dreieck) }]
// wahlFuerProxy: Map bauteil → "ignorieren" | "koerper" | "wand" | "dach"
// ---------------------------------------------------------
export function flaechenFinden(huelle, wahlFuerProxy = new Map()) {
  // 1. Alle Dreiecke mit Richtung
  const alle = [];
  for (const teil of huelle) {
    const art = teil.art === "proxy" ? wahlFuerProxy.get(teil.bauteil) || "ignorieren" : teil.art;
    if (art === "ignorieren") continue;
    const d = teil.dreiecke;
    for (let i = 0; i + 8 < d.length; i += 9) {
      const a = [d[i], d[i + 1], d[i + 2]];
      const b = [d[i + 3], d[i + 4], d[i + 5]];
      const c = [d[i + 6], d[i + 7], d[i + 8]];
      const kreuz = cross(sub(b, a), sub(c, a));
      const l = laenge(kreuz);
      if (l < 1e-9) continue; // Dreieck ohne Fläche
      alle.push({ a, b, c, n: mul(kreuz, 1 / l), flaeche: l / 2, art });
    }
  }

  // 2. Wofür kommt ein Dreieck in Frage?
  const kandidaten = [];
  for (const d of alle) {
    const ny = d.n[1];
    let wofuer = null;
    if ((d.art === "wand" || d.art === "koerper") && Math.abs(ny) <= 0.25) wofuer = "fassade";
    if ((d.art === "dach" || d.art === "koerper") && ny > 0.25) wofuer = "dach";
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
        dot(g.n, d.n) > 0.999 &&
        (Math.abs(g.abstand - abstand) < 0.003 || g.punkte.some((p) => nah(p, d.a) || nah(p, d.b) || nah(p, d.c)))
    );
    if (!g) {
      g = { wofuer: d.wofuer, n: d.n, abstand, dreiecke: [], punkte: [] };
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
  const frei = (d) => {
    const start = add(mul(add(add(d.a, d.b), d.c), 1 / 3), mul(d.n, 0.002));
    for (const h of alle) if (h !== d && trifft(start, d.n, h)) return false;
    return true;
  };
  for (const g of gruppen) {
    let freiFlaeche = 0, gesamt = 0;
    for (const d of g.dreiecke) {
      gesamt += d.flaeche;
      if (frei(d)) freiFlaeche += d.flaeche;
    }
    g.aussen = freiFlaeche >= 0.5 * gesamt; // mehr als die Hälfte sieht ins Freie
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
      if (region.flaeche < 0.02) continue; // Splitter kleiner als 0,02 m² weglassen
      flaechen.push({
        wofuer: g.wofuer,
        n: g.n,
        ursprung,
        u,
        v,
        aussen: region.aussen,
        loecher: region.loecher,
        flaeche: region.flaeche,
      });
    }
  }
  return flaechen;
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

// Trifft ein Strahl (Start o, Richtung r) das Dreieck h? (Möller-Trumbore)
function trifft(o, r, h) {
  const e1 = sub(h.b, h.a), e2 = sub(h.c, h.a);
  const p = cross(r, e2);
  const det = dot(e1, p);
  if (Math.abs(det) < 1e-12) return false;
  const inv = 1 / det;
  const s = sub(o, h.a);
  const u = dot(s, p) * inv;
  if (u < 0 || u > 1) return false;
  const q = cross(s, e1);
  const v = dot(r, q) * inv;
  if (v < 0 || u + v > 1) return false;
  return dot(e2, q) * inv > 1e-6;
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
