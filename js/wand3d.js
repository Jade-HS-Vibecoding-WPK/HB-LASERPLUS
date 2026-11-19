// =========================================================
// 3D-Skizze einer Hausecke zum Drehen (VERSUCH, 18.11.)
//
// Zeigt zwei Wände, die sich an einer Außenecke treffen – so, wie die
// Pappen beim Wandaufbau zusammengeklebt werden:
//   - Wand Nord läuft an der Ecke durch, Wand West ist gekürzt
//   - zwei Schichten: Außenpappe mit Fenster/Tür-Loch, dahinter die Innenpappe
//   - eine Schicht: eine Pappe je Wand, Öffnungen geritzt (blau) oder keine
//
// Ohne Bibliothek: Jede Pappe ist ein Quader. Die Flächen werden gedreht,
// nach Entfernung sortiert (hinten zuerst) und als SVG gezeichnet.
// Bedienung: ziehen = drehen, Doppelklick = zurücksetzen.
// Zoomen gibt es bewusst nicht (seit 19.11.): Das Mausrad scrollt über
// dem Bild ganz normal die Seite weiter.
// Nur eine Skizze mit vergrößerten Pappdicken – nicht dein Gebäude.
// =========================================================

// Blickwinkel bleibt erhalten, wenn die Skizze neu gezeichnet wird
const START = { dreh: -0.62, kipp: -0.45 }; // schräg von außen und oben
let blick = { ...START };

const L = 60;  // Länge der gezeichneten Wandstücke
const H = 42;  // Wandhöhe
const F = 2.4; // Vergrößerung der Pappdicke (1 mm → 2,4 Einheiten)

// Quader von (x0,y0,z0) bis (x1,y1,z1); x = Osten, y = oben, z = Süden
function quader(x0, y0, z0, x1, y1, z1, art) {
  return { x0, y0, z0, x1, y1, z1, art };
}

// Die Pappen der Ecke als Quader, dazu Ritzlinien (auf der Außenfläche)
function eckeBauen(aufbau, dickeAussen, dickeInnen) {
  const teile = [];
  const ritzen = [];
  // Fenster in Wand Nord (Außenfläche z = 0), Tür in Wand West (Außenfläche x = 0)
  const fx0 = 22, fx1 = 38, fy0 = 16, fy1 = 30;
  const tz0 = 28, tz1 = 40, ty1 = 26;

  if (aufbau === "zwei") {
    const ta = dickeAussen * F, ti = dickeInnen * F;
    // Wand Nord, außen (läuft durch), ein Stück Pappe mit Fensterloch
    teile.push({ ...quader(0, 0, 0, L, H, ta, "aussen"), dicke: "z", loch: { a0: fx0, a1: fx1, y0: fy0, y1: fy1 } });
    // Wand Nord, innen (geschlossen), um die Außenpappe kürzer
    teile.push(quader(ta, 0, ta, L, H, ta + ti, "innen"));
    // Wand West, außen (gekürzt), ein Stück Pappe mit Türloch bis zum Boden
    teile.push({ ...quader(0, 0, ta, ta, H, L, "aussen"), dicke: "x", loch: { a0: tz0, a1: tz1, y0: 0, y1: ty1 } });
    // Wand West, innen (gekürzt um beide Pappen)
    teile.push(quader(ta, 0, ta + ti, ta + ti, H, L, "innen"));
  } else {
    const t = dickeInnen * F;
    teile.push(quader(0, 0, 0, L, H, t, "aussen"));   // Nord läuft durch
    teile.push(quader(0, 0, t, t, H, L, "aussen"));   // West gekürzt
    if (aufbau === "eine-geritzt") {
      // Fenster als geschlossenes Rechteck auf der Nordseite (z = 0)
      ritzen.push({ punkte: [[fx0, fy0, 0], [fx1, fy0, 0], [fx1, fy1, 0], [fx0, fy1, 0], [fx0, fy0, 0]], normale: [0, 0, -1] });
      // Tür als offenes „U“ auf der Westseite (x = 0), unten keine Linie
      ritzen.push({ punkte: [[0, 0, tz0], [0, ty1, tz0], [0, ty1, tz1], [0, 0, tz1]], normale: [-1, 0, 0] });
    }
  }
  return { teile, ritzen };
}

// Flächen einer Pappe mit ihrer Außen-Richtung (n).
// ringe = Umriss (und bei Pappen mit Loch zusätzlich das Loch).
// rang = Reihenfolge innerhalb der Pappe: Laibungen (0) zuerst,
// dann Kanten (1), zuletzt die großen Flächen (2) – so sieht man
// durchs Loch die Laibung, aber sie liegt nie über der Fläche.
function flaechenVon(q) {
  const { x0, y0, z0, x1, y1, z1 } = q;
  if (!q.loch) {
    return [
      { n: [0, 0, -1], ringe: [[[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]]], rang: 2 },
      { n: [0, 0, 1], ringe: [[[x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [x1, y0, z1]]], rang: 2 },
      { n: [-1, 0, 0], ringe: [[[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]]], rang: 2 },
      { n: [1, 0, 0], ringe: [[[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]]], rang: 2 },
      { n: [0, -1, 0], ringe: [[[x0, y0, z0], [x0, y0, z1], [x1, y0, z1], [x1, y0, z0]]], rang: 1 },
      { n: [0, 1, 0], ringe: [[[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]], rang: 1 },
    ];
  }
  // Pappe mit Loch: in eigenen Achsen rechnen.
  // a = entlang der Wand, y = oben, w = durch die Pappe (Dicke)
  const alongX = q.dicke === "z";
  const welt = (a, y, w) => (alongX ? [a, y, w] : [w, y, a]);
  const richtung = (na, ny, nw) => (alongX ? [na, ny, nw] : [nw, ny, na]);
  const a0 = alongX ? x0 : z0, a1 = alongX ? x1 : z1;
  const w0 = alongX ? z0 : x0, w1 = alongX ? z1 : x1;
  const l = q.loch;
  const rechteckAW = (w, aa0, aa1, yy0, yy1) => [welt(aa0, yy0, w), welt(aa1, yy0, w), welt(aa1, yy1, w), welt(aa0, yy1, w)];
  const flaechen = [
    // Vorder- und Rückseite mit Loch
    { n: richtung(0, 0, -1), ringe: [rechteckAW(w0, a0, a1, y0, y1), rechteckAW(w0, l.a0, l.a1, l.y0, l.y1)], rang: 2 },
    { n: richtung(0, 0, 1), ringe: [rechteckAW(w1, a0, a1, y0, y1), rechteckAW(w1, l.a0, l.a1, l.y0, l.y1)], rang: 2 },
    // Stirnseiten am Anfang und Ende der Wand
    { n: richtung(-1, 0, 0), ringe: [[welt(a0, y0, w0), welt(a0, y1, w0), welt(a0, y1, w1), welt(a0, y0, w1)]], rang: 1 },
    { n: richtung(1, 0, 0), ringe: [[welt(a1, y0, w0), welt(a1, y1, w0), welt(a1, y1, w1), welt(a1, y0, w1)]], rang: 1 },
    // Oberkante
    { n: richtung(0, 1, 0), ringe: [[welt(a0, y1, w0), welt(a1, y1, w0), welt(a1, y1, w1), welt(a0, y1, w1)]], rang: 1 },
    // Laibungen des Lochs (zeigen ins Loch hinein)
    { n: richtung(1, 0, 0), ringe: [[welt(l.a0, l.y0, w0), welt(l.a0, l.y1, w0), welt(l.a0, l.y1, w1), welt(l.a0, l.y0, w1)]], rang: 0 },
    { n: richtung(-1, 0, 0), ringe: [[welt(l.a1, l.y0, w0), welt(l.a1, l.y1, w0), welt(l.a1, l.y1, w1), welt(l.a1, l.y0, w1)]], rang: 0 },
    { n: richtung(0, -1, 0), ringe: [[welt(l.a0, l.y1, w0), welt(l.a1, l.y1, w0), welt(l.a1, l.y1, w1), welt(l.a0, l.y1, w1)]], rang: 0 },
  ];
  if (l.y0 > y0) {
    // Fenster: Brüstung oben (Laibung unten) und Unterkante der Pappe in einem Stück
    flaechen.push({ n: richtung(0, 1, 0), ringe: [[welt(l.a0, l.y0, w0), welt(l.a1, l.y0, w0), welt(l.a1, l.y0, w1), welt(l.a0, l.y0, w1)]], rang: 0 });
    flaechen.push({ n: richtung(0, -1, 0), ringe: [[welt(a0, y0, w0), welt(a1, y0, w0), welt(a1, y0, w1), welt(a0, y0, w1)]], rang: 1 });
  } else {
    // Tür bis zum Boden: Unterkante in zwei Stücken links und rechts der Tür
    flaechen.push({ n: richtung(0, -1, 0), ringe: [[welt(a0, y0, w0), welt(l.a0, y0, w0), welt(l.a0, y0, w1), welt(a0, y0, w1)]], rang: 1 });
    flaechen.push({ n: richtung(0, -1, 0), ringe: [[welt(l.a1, y0, w0), welt(a1, y0, w0), welt(a1, y0, w1), welt(l.a1, y0, w1)]], rang: 1 });
  }
  return flaechen;
}

// Drehen: erst um die senkrechte Achse (dreh), dann kippen (kipp)
function drehe([x, y, z]) {
  const cx = x - L / 2, cy = y - H / 2, cz = z - L / 2; // um die Mitte drehen
  const cd = Math.cos(blick.dreh), sd = Math.sin(blick.dreh);
  const x1 = cx * cd + cz * sd;
  const z1 = -cx * sd + cz * cd;
  const ck = Math.cos(blick.kipp), sk = Math.sin(blick.kipp);
  const y2 = cy * ck - z1 * sk;
  const z2 = cy * sk + z1 * ck;
  return [x1, y2, z2]; // z2 = Tiefe (größer = weiter weg)
}
const dreheRichtung = (n) => {
  const [a, b, c] = drehe([n[0] + L / 2, n[1] + H / 2, n[2] + L / 2]);
  return [a, b, c];
};

export function wand3dZeichnen(svg, { aufbau, dickeAussen, dickeInnen, farben }) {
  const { teile, ritzen } = eckeBauen(aufbau, dickeAussen, dickeInnen);
  const farbeAussen = [216, 205, 189]; // Graupappe hell
  const farbeInnen = [169, 157, 138];  // Graupappe dunkler (Innenschicht)
  const licht = [-0.45, 0.75, -0.5];   // Licht von vorne links oben (vor dem Drehen)

  // Reihenfolge der Pappen: hinten zuerst. Zwei Pappen (Quader) liegen
  // immer entlang mindestens einer Achse getrennt nebeneinander. Entlang
  // dieser Achse sieht man, welche weiter weg ist. Daraus eine Reihenfolge
  // bauen (wie beim Stapeln von Plänen: was hinten liegt, kommt zuerst).
  function reihenfolge() {
    // Wie stark zeigt jede Welt-Achse in die Tiefe (weg vom Betrachter)?
    const tief = [dreheRichtung([1, 0, 0])[2], dreheRichtung([0, 1, 0])[2], dreheRichtung([0, 0, 1])[2]];
    const min = (q, k) => [q.x0, q.y0, q.z0][k], max = (q, k) => [q.x1, q.y1, q.z1][k];
    // weiter(a, b) = true, wenn a hinter b liegt
    const weiter = (a, b) => {
      let beste = null, besteWert = 0;
      for (let k = 0; k < 3; k++) {
        if (max(a, k) <= min(b, k) + 1e-6 && Math.abs(tief[k]) > besteWert) { beste = -Math.sign(tief[k]); besteWert = Math.abs(tief[k]); }
        if (max(b, k) <= min(a, k) + 1e-6 && Math.abs(tief[k]) > besteWert) { beste = Math.sign(tief[k]); besteWert = Math.abs(tief[k]); }
      }
      return beste === 1;
    };
    // Einfaches Sortieren nach „liegt hinter“ (wenige Pappen, darum reicht das)
    const rest = [...teile];
    const fertig = [];
    while (rest.length) {
      let i = rest.findIndex((a) => !rest.some((b) => b !== a && weiter(b, a)));
      if (i < 0) i = 0; // sollte nicht vorkommen – zur Sicherheit
      fertig.push(rest.splice(i, 1)[0]);
    }
    return fertig;
  }

  function malen() {
    const flaechen = [];
    for (const q of reihenfolge()) {
      const eigene = flaechenVon(q).sort((a, b) => a.rang - b.rang);
      for (const f of eigene) {
        const n2 = dreheRichtung(f.n);
        if (n2[2] >= -1e-6) continue; // zeigt vom Betrachter weg → unsichtbar
        const ringe = f.ringe.map((r) => r.map(drehe));
        const tiefe = 0;
        const hell = 0.62 + 0.38 * Math.max(0, f.n[0] * licht[0] + f.n[1] * licht[1] + f.n[2] * licht[2]);
        const grund = q.art === "innen" ? farbeInnen : farbeAussen;
        const rgb = grund.map((c) => Math.round(c * hell));
        // Kante etwas dunkler als die Fläche (nicht rot: das hier sind Pappkanten, keine Laserlinien)
        const kante = rgb.map((c) => Math.round(c * 0.72));
        flaechen.push({ ringe, tiefe, farbe: `rgb(${rgb.join(",")})`, kante: `rgb(${kante.join(",")})` });
      }
    }
    // Ritzlinien nur zeigen, wenn ihre Fläche zum Betrachter zeigt
    const linien = [];
    for (const r of ritzen) {
      if (dreheRichtung(r.normale)[2] >= 0) continue;
      const pts = r.punkte.map((p) => drehe([p[0] + r.normale[0] * 0.05, p[1], p[2] + r.normale[2] * 0.05]));
      linien.push({ pts, tiefe: -Infinity });
    }
    // (Reihenfolge kommt schon aus reihenfolge(): Pappe für Pappe, hinten zuerst)

    const s = 2.1; // feste Größe (kein Zoom)
    const xy = (p) => `${(p[0] * s).toFixed(1)},${(-p[1] * s).toFixed(1)}`;
    let inhalt = "";
    for (const f of flaechen) {
      // Umriss und ggf. Loch als ein Pfad („evenodd“ = das Loch bleibt offen)
      const d = f.ringe.map((r) => "M" + r.map(xy).join(" L") + "Z").join(" ");
      inhalt += `<path d="${d}" fill="${f.farbe}" fill-rule="evenodd" stroke="${f.kante}" stroke-width="0.7" stroke-linejoin="round" />`;
    }
    for (const l of linien) {
      inhalt += `<polyline points="${l.pts.map(xy).join(" ")}" fill="none" stroke="${farben.ritzen}" stroke-width="1.6" />`;
    }
    svg.innerHTML = inhalt;
  }

  // ---------- Bedienung ----------
  svg.setAttribute("viewBox", "-110 -95 220 190");
  let ziehen = null;
  svg.onpointerdown = (e) => {
    ziehen = { x: e.clientX, y: e.clientY, dreh: blick.dreh, kipp: blick.kipp };
    svg.setPointerCapture(e.pointerId);
  };
  svg.onpointermove = (e) => {
    if (!ziehen) return;
    blick.dreh = ziehen.dreh + (e.clientX - ziehen.x) * 0.01;
    blick.kipp = Math.max(-1.4, Math.min(1.4, ziehen.kipp - (e.clientY - ziehen.y) * 0.01));
    malen();
  };
  svg.onpointerup = svg.onpointercancel = () => { ziehen = null; };
  // (kein Mausrad-Zoom mehr – das Mausrad scrollt die Seite)
  svg.ondblclick = () => {
    blick = { ...START };
    malen();
  };
  // Pfeiltasten (für Tastatur-Bedienung)
  svg.onkeydown = (e) => {
    const schritt = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, -0.15], ArrowDown: [0, 0.15] }[e.key];
    if (!schritt) return;
    e.preventDefault();
    blick.dreh += schritt[0];
    blick.kipp = Math.max(-1.4, Math.min(1.4, blick.kipp + schritt[1]));
    malen();
  };
  malen();
}
