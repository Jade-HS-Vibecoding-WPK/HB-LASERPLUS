// =========================================================
// Übersichtsblatt zum Ausdrucken
//
// Inhalt:
//   - Grundriss mit den Nummern der Fassaden und Dachflächen, Nordpfeil,
//     Ecken-Nummern E1, E2 … (durchlaufende Fassade geht bis in die Ecke)
//   - Ecken: Detailskizze und Tabelle, welche Platte durchläuft und welche
//     gekürzt dagegen stößt (Wandecken und First/Grat/Kehle)
//   - Teileliste: Nummer, was es ist, Größe, auf welcher Platte
//   - Reihenfolge beim Kleben
//   - Hinweise (Bleistift-Tipp, Keilfugen an schrägen Ecken …)
// Alle Texte werden als reiner Text eingesetzt, nie als HTML.
// =========================================================

import { zu3d } from "./abwickeln.js";
import { himmelsrichtung } from "./schichten.js";

function element(tag, klasse, text) {
  const neu = document.createElement(tag);
  if (klasse) neu.className = klasse;
  if (text !== undefined) neu.textContent = text;
  return neu;
}

const SVG = "http://www.w3.org/2000/svg";
function svgElement(tag, attribute) {
  const neu = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attribute)) neu.setAttribute(k, v);
  return neu;
}

// ---------------------------------------------------------
// Ecken eines Gebäudes durchnummerieren: erst die Wandecken (E1, E2 …),
// dann die Dachkanten (First, Grat, Kehle). Dieselbe Reihenfolge gilt
// im Grundriss und in der Ecken-Tabelle.
// ---------------------------------------------------------
function eckenListe(flaechen, ecken) {
  const wand = ecken.filter((c) => flaechen[c.i].wofuer === "fassade");
  const dach = ecken.filter((c) => flaechen[c.i].wofuer === "dach");
  return [...wand, ...dach].map((c, z) => ({ nr: "E" + (z + 1), c, wand: flaechen[c.i].wofuer === "fassade" }));
}

// Eckpunkt einer Wandecke im Grundriss (x, z)
function eckPunkt(flaechen, c) {
  const p = zu3d(flaechen[c.i], [c.kanten2d[c.i][0][0], 0]);
  return [p[0], p[2]];
}

// ---------------------------------------------------------
// Grundriss: Fassaden als Linien, Dachflächen gestrichelt, Nummern
// Blick von oben, Norden oben (Norden = −z, Osten = +x)
// An jeder Wandecke: Die durchlaufende Fassade geht bis in die Ecke,
// die gekürzte hört kurz davor auf (wie im echten Modell). Dazu ein
// Kreis mit der Ecken-Nummer (E1, E2 …) außen an der Ecke.
// ---------------------------------------------------------
function grundriss(flaechen, nummerVon, ecken = []) {
  const linien = [];
  const texte = [];
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  const merke = (x, z) => {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    z0 = Math.min(z0, z); z1 = Math.max(z1, z);
  };

  // Welche Fassaden-Enden an einer Ecke gekürzt sind (dort Lücke zeichnen)
  const gekuerzt = []; // { index, punkt }
  const wandEcken = eckenListe(flaechen, ecken).filter((x) => x.wand);
  for (const { c } of wandEcken) {
    const kurz = c.durch === c.i ? c.j : c.i;
    gekuerzt.push({ index: kurz, punkt: eckPunkt(flaechen, c) });
  }

  // Größe des Grundrisses vorab grob bestimmen (für Lücke und Schrift)
  let gx0 = Infinity, gx1 = -Infinity, gz0 = Infinity, gz1 = -Infinity;
  for (const f of flaechen) {
    for (const p of f.aussen) {
      const q = zu3d(f, p);
      gx0 = Math.min(gx0, q[0]); gx1 = Math.max(gx1, q[0]);
      gz0 = Math.min(gz0, q[2]); gz1 = Math.max(gz1, q[2]);
    }
  }
  const groesse = Math.max(gx1 - gx0, gz1 - gz0, 1);
  const luecke = groesse / 45;

  flaechen.forEach((f, i) => {
    const nr = nummerVon.get(i);
    if (!nr) return;
    if (f.wofuer === "fassade") {
      const us = f.aussen.map((p) => p[0]);
      const a = zu3d(f, [Math.min(...us), 0]), b = zu3d(f, [Math.max(...us), 0]);
      let pa = [a[0], a[2]], pb = [b[0], b[2]];
      // gekürzte Enden ein Stück zurücknehmen, damit man sieht, wer durchläuft
      const len = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) || 1;
      const dir = [(pb[0] - pa[0]) / len, (pb[1] - pa[1]) / len];
      for (const g of gekuerzt) {
        if (g.index !== i) continue;
        const nahA = Math.hypot(g.punkt[0] - pa[0], g.punkt[1] - pa[1]);
        const nahB = Math.hypot(g.punkt[0] - pb[0], g.punkt[1] - pb[1]);
        if (nahA <= nahB) pa = [pa[0] + dir[0] * luecke, pa[1] + dir[1] * luecke];
        else pb = [pb[0] - dir[0] * luecke, pb[1] - dir[1] * luecke];
      }
      linien.push({ punkte: [pa, pb], art: "fassade" });
      merke(a[0], a[2]);
      merke(b[0], b[2]);
      const mx = (a[0] + b[0]) / 2 + f.n[0] * 0.9, mz = (a[2] + b[2]) / 2 + f.n[2] * 0.9;
      texte.push({ x: mx, z: mz, text: nr });
      merke(mx, mz);
    } else {
      const punkte = f.aussen.map((p) => {
        const q = zu3d(f, p);
        merke(q[0], q[2]);
        return [q[0], q[2]];
      });
      linien.push({ punkte, art: f.wofuer === "decke" ? "decke" : "dach" });
      const mx = punkte.reduce((s, p) => s + p[0], 0) / punkte.length;
      const mz = punkte.reduce((s, p) => s + p[1], 0) / punkte.length;
      texte.push({ x: mx, z: mz, text: nr, dach: true });
    }
  });

  // Ecken-Nummern außen an den Wandecken
  const kreise = [];
  for (const { nr, c } of wandEcken) {
    const p = eckPunkt(flaechen, c);
    const ni = flaechen[c.i].n, nj = flaechen[c.j].n;
    let rx = ni[0] + nj[0], rz = ni[2] + nj[2];
    const rl = Math.hypot(rx, rz) || 1;
    // Außenecke: nach außen; Innenecke: Normalen zeigen von der Ecke weg ins Freie, auch gut
    const weite = luecke * 3.2;
    const kx = p[0] + (rx / rl) * weite, kz = p[1] + (rz / rl) * weite;
    kreise.push({ x: kx, z: kz, text: nr });
    merke(kx, kz);
  }

  const rand = 1.5;
  const grundBreite = x1 - x0 + 2 * rand, hoehe = z1 - z0 + 2 * rand;
  const schrift = Math.max(grundBreite, hoehe) / 40;
  // Links neben dem Grundriss ein freier Streifen für den Nordpfeil,
  // damit er nicht auf einer Ecken-Nummer (E1 …) sitzt
  const links = schrift * 5;
  const breite = grundBreite + links;
  const svg = svgElement("svg", {
    viewBox: `${x0 - rand - links} ${z0 - rand} ${breite} ${hoehe}`,
    width: "100%",
    style: "max-height: 11cm",
    role: "img",
    "aria-label": "Grundriss mit Teilenummern",
  });
  // Fassaden dick, Dachflächen gestrichelt, Untersichten (seit 19.11.) gepunktet
  for (const l of linien) {
    const flaechig = l.art === "dach" || l.art === "decke";
    svg.append(
      svgElement(flaechig ? "polygon" : "polyline", {
        points: l.punkte.map((p) => p.join(",")).join(" "),
        fill: "none",
        stroke: flaechig ? "#888" : "#000",
        "stroke-width": flaechig ? 1 : 2.5,
        "stroke-dasharray": l.art === "dach" ? "4 3" : l.art === "decke" ? "1 2" : "none",
        "vector-effect": "non-scaling-stroke",
      })
    );
  }
  for (const t of texte) {
    const text = svgElement("text", {
      x: t.x,
      y: t.z,
      "font-size": schrift,
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      fill: t.dach ? "#555" : "#000",
    });
    text.textContent = t.text;
    svg.append(text);
  }
  for (const k of kreise) {
    svg.append(svgElement("circle", { cx: k.x, cy: k.z, r: schrift * 0.95, fill: "#fff", stroke: "#000", "stroke-width": 1, "vector-effect": "non-scaling-stroke" }));
    const text = svgElement("text", {
      x: k.x,
      y: k.z,
      "font-size": schrift * 0.8,
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      fill: "#000",
    });
    text.textContent = k.text;
    svg.append(text);
  }
  // Nordpfeil oben links, im freien Streifen links neben dem Grundriss
  const px = x0 - rand - links + schrift * 1.5, pz = z0 - rand + schrift * 3.5;
  svg.append(
    svgElement("polygon", {
      points: `${px},${pz - schrift * 2} ${px - schrift * 0.6},${pz} ${px + schrift * 0.6},${pz}`,
      fill: "#000",
    })
  );
  const n = svgElement("text", { x: px, y: pz + schrift * 1.2, "font-size": schrift, "text-anchor": "middle" });
  n.textContent = "N";
  svg.append(n);
  return svg;
}

// ---------------------------------------------------------
// Detailskizze einer Außenecke (90°), Blick von oben.
// Oben läuft die Fassade durch, links ist sie gekürzt.
// Die Pappdicken sind zum besseren Erkennen stark vergrößert.
// ---------------------------------------------------------
function eckDetail(eineSchicht, e) {
  const F = 9; // Vergrößerung der Pappdicke in der Skizze
  const ta = (eineSchicht ? e.dickeInnen : e.dickeAussen) * F;
  const ti = e.dickeInnen * F;
  const L = 150; // Länge der gezeichneten Wandstücke
  const ox = 30, oy = 22; // Lage der Außenecke in der Skizze
  const svg = svgElement("svg", {
    viewBox: "0 0 430 205",
    width: "100%",
    style: "max-width: 13cm; max-height: 6.5cm",
    role: "img",
    "aria-label": "Skizze einer Außenecke von oben",
  });
  const rechteck = (x, y, b, h, grau, text) => {
    svg.append(svgElement("rect", { x, y, width: b, height: h, fill: grau, stroke: "#000", "stroke-width": 0.8 }));
    if (text) {
      const t = svgElement("text", { x: x + b / 2, y: y + h / 2, "font-size": 8, "text-anchor": "middle", "dominant-baseline": "middle" });
      t.textContent = text;
      svg.append(t);
    }
  };
  const schrift = (x, y, text, anker = "start", groesse = 9) => {
    const t = svgElement("text", { x, y, "font-size": groesse, "text-anchor": anker });
    t.textContent = text;
    svg.append(t);
  };
  const aussenGrau = "#bdbdbd", innenGrau = "#ececec";
  if (eineSchicht) {
    rechteck(ox, oy, L, ta, aussenGrau);                       // durchlaufend
    rechteck(ox, oy + ta, ta, L - ta, aussenGrau);             // gekürzt
  } else {
    rechteck(ox, oy, L, ta, aussenGrau);                       // A durchlaufend
    rechteck(ox + ta, oy + ta, L - ta, ti, innenGrau);         // I durchlaufend
    rechteck(ox, oy + ta, ta, L - ta, aussenGrau);             // A gekürzt
    rechteck(ox + ta, oy + ta + ti, ti, L - ta - ti, innenGrau); // I gekürzt
  }
  // Beschriftung
  schrift(ox + L + 8, oy + ta / 2 + 3, eineSchicht ? "läuft durch (z. B. A-001)" : "läuft durch: A-001 außen, I-001 innen");
  schrift(ox + L + 8, oy + ta / 2 + 15, eineSchicht ? "" : "(I-001 ist um die Außenpappe kürzer)", "start", 8);
  const t = svgElement("text", { x: ox - 10, y: oy + L - 10, "font-size": 9, transform: `rotate(-90 ${ox - 10} ${oy + L - 10})` });
  t.textContent = eineSchicht ? "gekürzt (z. B. A-002)" : "gekürzt: A-002 außen, I-002 innen";
  svg.append(t);
  schrift(ox + ta + (eineSchicht ? 0 : ti) + 14, oy + 80, "innen (Gebäude)", "start", 9);
  schrift(ox - 4, oy - 8, "Außenecke", "start", 9);
  // Legende
  if (!eineSchicht) {
    rechteck(250, 150, 14, 9, aussenGrau);
    schrift(270, 158, "Außenschicht (A)", "start", 8);
    rechteck(250, 166, 14, 9, innenGrau);
    schrift(270, 174, "Innenschicht (I)", "start", 8);
  }
  schrift(250, 192, "Skizze, Pappdicken stark vergrößert", "start", 7);
  return svg;
}

// ---------------------------------------------------------
// Das ganze Blatt bauen
// daten: { einstellungen, gebaeude: [{ nummer, name, flaechen, ecken }], teile, platten, mehrere }
//   mehrere = mehr als ein Gebäude (dann steht die Gebäude-Nummer vor den Teilenummern)
// ---------------------------------------------------------
export function uebersichtBauen(daten) {
  const { einstellungen: e, gebaeude, teile, platten, mehrere } = daten;
  const blatt = element("div", "blatt");
  const alleEcken = gebaeude.flatMap((b) => b.ecken);
  // Wandaufbau: zwei Schichten (Standard) oder eine Schicht
  const aufbau = e.wandaufbau || "zwei";
  const eineSchicht = aufbau !== "zwei";
  const mm = (z) => String(z).replace(".", ",") + " mm";

  // Kopf
  blatt.append(element("h1", "", "Erstelle deine Laserdatei · Übersichtsblatt"));
  const dateien = mehrere ? gebaeude.map((b) => `Gebäude ${b.nummer}: ${b.name}`).join(" · ") : gebaeude[0].name;
  blatt.append(
    element(
      "p",
      "klein",
      `${dateien} · Maßstab 1:${e.massstab} · ` +
        (eineSchicht
          ? `Wände eine Schicht (${aufbau === "eine-geritzt" ? "Fenster und Türen geritzt" : "ohne Fenster und Türen"}), Pappe ${mm(e.dickeInnen)} · Dach ${mm(e.dickeInnen)} · `
          : `Pappe innen ${mm(e.dickeInnen)}, außen ${mm(e.dickeAussen)} · Dach ${mm(e.dickeInnen)} · `) +
        `${platten.length} ${platten.length === 1 ? "Platte" : "Platten"} ${e.platteBreite} × ${e.platteHoehe} mm · ` +
        new Date().toLocaleDateString("de-DE")
    )
  );

  // Legende: was bedeuten die Nummern?
  blatt.append(element("h2", "", "Legende"));
  const legende = element("ul");
  if (eineSchicht) {
    legende.append(
      element(
        "li",
        "",
        aufbau === "eine-geritzt"
          ? "A-001, A-002 … = Wand einer Fassade, eine Schicht. Fenster und Türen sind blau angeritzt, nicht ausgeschnitten."
          : "A-001, A-002 … = Wand einer Fassade, eine Schicht, ohne Fenster und Türen."
      ),
      element("li", "", "D-001, D-002 … = Dachfläche."),
      element("li", "", "Im Grundriss steht die Zahl an der Fassade (001 = A-001)."),
      element("li", "", "Die Nummern sind blau neben das Teil auf die Restpappe geritzt, nicht auf das Teil selbst.")
    );
  } else {
    legende.append(
      element("li", "", "A-001, A-002 … = Außenschicht einer Fassade, mit Fenstern und Türen. Wird außen auf die Innenschicht geklebt."),
      element("li", "", "I-001, I-002 … = Innenschicht derselben Fassade, geschlossen. Die Innenschichten bilden den tragenden Kasten."),
      element("li", "", "D-001, D-002 … = Dachfläche."),
      element("li", "", "Gleiche Zahl bei A und I = gleiche Fassade: A-001 kommt auf I-001. Im Grundriss steht diese Zahl an der Fassade."),
      element("li", "", "Die Nummern sind blau neben das Teil auf die Restpappe geritzt, nicht auf das Teil selbst.")
    );
  }
  const mitUntersicht = teile.some((t) => t.wofuer === "decke");
  if (mitUntersicht) {
    legende.append(
      element(
        "li",
        "",
        "U-001, U-002 … = Untersicht: eine Decke, die man von unten sieht (z. B. über einem Rücksprung im Erdgeschoss). " +
          "Im Grundriss gepunktet."
      )
    );
  }
  if (mehrere) {
    legende.append(
      element(
        "li",
        "",
        "Mehrere Gebäude: Vorne steht die Gebäude-Nummer. 2-A-001 = Gebäude 2, " +
          (eineSchicht ? "Wand der Fassade 001." : "Außenschicht der Fassade 001.")
      )
    );
  }
  blatt.append(legende);

  // Grundriss je Gebäude: an den Fassaden die Zahl (z. B. 001), an den Dachflächen die D-Nummer
  blatt.append(element("h2", "", mehrere ? "Grundrisse" : "Grundriss"));
  for (const b of gebaeude) {
    const nummerVon = new Map();
    for (const t of teile) {
      if (t.gebaeude !== b.nummer || nummerVon.has(t.flaecheIndex)) continue;
      nummerVon.set(t.flaecheIndex, t.wofuer === "fassade" ? t.nummer : t.name);
    }
    if (mehrere) blatt.append(element("h3", "gebaeude-titel", `Gebäude ${b.nummer} · ${b.name}`));
    if (nummerVon.size) blatt.append(grundriss(b.flaechen, nummerVon, b.ecken));
    else blatt.append(element("p", "klein", "Keine Außenflächen gefunden."));
  }
  blatt.append(
    element(
      "p",
      "klein",
      (eineSchicht
        ? "Fassaden als dicke Linien mit ihrer Zahl (das A-Teil mit derselben Zahl), Dachflächen gestrichelt mit D-Nummer. Blick von oben, Norden oben."
        : "Fassaden als dicke Linien mit ihrer Zahl (dazu gehören A- und I-Teil mit derselben Zahl), Dachflächen gestrichelt mit D-Nummer. Blick von oben, Norden oben.") +
        " Kreise E1, E2 … = Ecken. An jeder Ecke geht die durchlaufende Fassade bis in die Ecke, die gekürzte hört kurz davor auf." +
        (mehrere ? " Jedes Gebäude ist für sich gezeichnet, nicht in seiner Lage zu den anderen." : "")
    )
  );

  // Ecken: welche Platte läuft durch, welche stößt dagegen
  blatt.append(element("h2", "", "Ecken – so stoßen die Platten aneinander"));
  blatt.append(
    element(
      "p",
      "",
      "An jeder Ecke läuft eine Fassade durch, die andere ist gekürzt und stößt mit ihrer Stirnseite gegen die durchlaufende. " +
        "An Außenecken reicht die durchlaufende Platte bis zur Außenkante des Modells, an Innenecken reicht sie in den Winkel hinein. " +
        "Nur so stimmen die Außenmaße – die App hat die Längen der Teile genau so berechnet. Klebst du eine Ecke andersherum, ist das Modell dort zu lang oder zu kurz."
    )
  );
  blatt.append(eckDetail(eineSchicht, e));
  for (const b of gebaeude) {
    const liste = eckenListe(b.flaechen, b.ecken);
    if (!liste.length) continue;
    const eigene = teile.filter((t) => t.gebaeude === b.nummer);
    // Teilenamen einer Fläche, z. B. „A-001 + I-001“ oder „D-002“
    const namenVon = (index) =>
      eigene
        .filter((t) => t.flaecheIndex === index)
        .sort((x, y) => (x.schicht === "A" ? -1 : 1) - (y.schicht === "A" ? -1 : 1))
        .map((t) => t.name)
        .join(" + ") || "–";
    const richtung = (index) => himmelsrichtung(b.flaechen[index].n).wort;
    if (mehrere) blatt.append(element("h3", "gebaeude-titel", `Gebäude ${b.nummer} · ${b.name}`));
    const tabelle = element("table");
    const kopf = element("tr");
    for (const s of ["Ecke", "Art, Winkel", "läuft durch", "gekürzt, stößt dagegen"]) kopf.append(element("th", "", s));
    tabelle.append(kopf);
    for (const { nr, c, wand } of liste) {
      const winkel = Math.round((c.phi * 180) / Math.PI);
      const art = wand
        ? (c.konvex ? "Außenecke" : "Innenecke") + `, ${winkel}°`
        : (c.konvex ? "First / Grat" : "Kehle") + `, ${winkel}°`;
      const kurz = c.durch === c.i ? c.j : c.i;
      const zeile = element("tr");
      zeile.append(
        element("td", "teilnummer", nr),
        element("td", "", art + (c.gemischt ? " (Achtung: gemischte Ecke)" : "")),
        element("td", "teilnummer", `${namenVon(c.durch)} (${wand ? "Fassade " : "Dach "}${richtung(c.durch)})`),
        element("td", "teilnummer", `${namenVon(kurz)} (${wand ? "Fassade " : "Dach "}${richtung(kurz)})`)
      );
      tabelle.append(zeile);
    }
    blatt.append(tabelle);
  }
  blatt.append(
    element(
      "p",
      "klein",
      eineSchicht
        ? "Bei einer Schicht: Die gekürzte Wand stößt mit ihrer Stirnseite innen gegen die durchlaufende Wand."
        : "Bei zwei Schichten gilt die Rolle für beide Schichten derselben Fassade: Läuft A-001 durch, läuft auch I-001 durch (innen um die Außenpappe kürzer). Die gekürzte Fassade ist außen um die Außenpappe und innen um beide Pappen kürzer."
    )
  );

  // Teileliste
  const platteVon = new Map();
  // Platte mit Pappdicke, z. B. „2 (1 mm)“ – Teile verschiedener Dicke liegen auf verschiedenen Platten
  platten.forEach((p, i) =>
    p.teile.forEach((t) => platteVon.set(t.name, `${i + 1} (${String(p.dicke ?? t.teil?.dicke ?? "").replace(".", ",")} mm)`))
  );
  blatt.append(element("h2", "", "Teileliste"));
  const tabelle = element("table");
  const kopf = element("tr");
  for (const s of ["Nummer", "Teil", "Größe (B × H)", "Platte"]) kopf.append(element("th", "", s));
  tabelle.append(kopf);
  for (const t of teile) {
    const xs = t.aussen.map((p) => p[0]), ys = t.aussen.map((p) => p[1]);
    const b = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
    const zeile = element("tr");
    zeile.append(
      element("td", "teilnummer", t.name),
      element(
        "td",
        "",
        t.beschreibung +
          (t.loecher.length
            ? ` (${t.loecher.length} Öffnungen)`
            : t.ritzlinien && t.ritzlinien.length
              ? ` (${t.ritzlinien.length} Öffnungen geritzt)`
              : "")
      ),
      element("td", "", `${b.toFixed(1).replace(".", ",")} × ${h.toFixed(1).replace(".", ",")} mm`),
      element("td", "", platteVon.has(t.name) ? String(platteVon.get(t.name)) : "passt nicht")
    );
    tabelle.append(zeile);
  }
  blatt.append(tabelle);

  // Reihenfolge beim Kleben (bei mehreren Gebäuden je Gebäude)
  blatt.append(element("h2", "", "Reihenfolge beim Kleben"));
  blatt.append(
    element("p", "", "Jedes Teil gleich nach dem Herauslösen auf der Rückseite mit Bleistift beschriften – die geritzte Nummer steht nur auf der Restpappe.")
  );
  for (const b of gebaeude) {
    const eigene = teile.filter((t) => t.gebaeude === b.nummer);
    if (!eigene.length) continue;
    const namen = (filter) => eigene.filter(filter).map((t) => t.name).join(", ") || "–";
    const beispielA = eigene.find((t) => t.schicht === "A");
    const beispiel = beispielA ? `, also ${beispielA.name} auf ${beispielA.name.replace(/A-(\d+)$/, "I-$1")}` : "";
    if (mehrere) blatt.append(element("h3", "gebaeude-titel", `Gebäude ${b.nummer} · ${b.name}`));
    const schritte = element("ol");
    const dachSchritt = element("li", "", `Dach auflegen: ${namen((t) => t.wofuer === "dach")}. Zuerst die gekürzten Dachflächen, dann die durchlaufenden – sie überlappen am First.`);
    // Untersichten (seit 19.11.): vor dem Dach, solange man noch gut hinkommt
    const untersichtSchritt = eigene.some((t) => t.wofuer === "decke")
      ? [
          element(
            "li",
            "",
            `Untersichten von unten einkleben: ${namen((t) => t.wofuer === "decke")}. ` +
              "Sie liegen zwischen den Wänden des Rücksprungs, bündig mit deren Oberkante, und stoßen vorne von hinten gegen die Fassade."
          ),
        ]
      : [];
    if (eineSchicht) {
      schritte.append(
        element("li", "", `Wände zu einem Kasten kleben: ${namen((t) => t.schicht === "A")}. An jeder Ecke läuft eine Wand durch, die andere stößt dagegen.`),
        ...untersichtSchritt,
        dachSchritt
      );
    } else {
      schritte.append(
        element("li", "", `Innenschichten zu einem Kasten kleben: ${namen((t) => t.schicht === "I")}. Die Innenschichten sind geschlossen und tragen das Modell.`),
        element("li", "", `Außenschichten (mit Fenstern und Türen) auf die passenden Innenschichten kleben: ${namen((t) => t.schicht === "A")}. Gleiche Zahl = gleiche Fassade${beispiel}.`),
        ...untersichtSchritt,
        dachSchritt
      );
    }
    blatt.append(schritte);
  }

  // Hinweise
  blatt.append(element("h2", "", "Hinweise"));
  const hinweise = element("ul");
  hinweise.append(
    element("li", "", "An den Ecken läuft immer eine Fassade durch, die andere ist um die Pappdicke(n) kürzer. Die App hat das schon eingerechnet – die Außenmaße stimmen.")
  );
  if (aufbau === "eine-geritzt") {
    hinweise.append(element("li", "", "Fenster und Türen sind nur angeritzt (blau). Die Wand bleibt geschlossen – Türen bis zum Boden auch."));
  }
  if (teile.some((t) => t.name.startsWith("M-"))) {
    hinweise.append(element("li", "", "Menschen (M-01 …): Die Lasche unter den Füßen umknicken und aufkleben oder in einen schmalen Schlitz in der Grundplatte stecken."));
  }
  if (teile.some((t) => t.name.startsWith("B-"))) {
    hinweise.append(element("li", "", "Bäume (B-01A + B-01B …): Teil A (Schlitz von oben) und Teil B (Schlitz von unten) mit derselben Zahl über Kreuz ineinanderstecken. Der Schlitz ist so breit wie die Pappe; bei Bedarf einen Tropfen Kleber."));
  }
  if (alleEcken.some((c) => Math.abs(Math.cos(c.phi)) > 0.02)) {
    hinweise.append(element("li", "", "Schräge Ecken, Grate und Kehlen (nicht 90°): Der Laser schneidet senkrecht, darum bleibt dort eine kleine Keilfuge. Mit etwas Kleber oder Spachtel füllen."));
  }
  if (alleEcken.some((c) => c.gemischt)) {
    hinweise.append(element("li", "", "Das Gebäude hat eine ungerade Zahl von Ecken: An einer Ecke laufen zwei Platten in derselben Rolle zusammen. Dort beim Kleben kurz anhalten und prüfen."));
  }
  hinweise.append(
    element("li", "", "Wand–Dach-Anschluss: Die Wände sind so hoch wie im Modell, das Dach liegt oben auf. Ist die Dachpappe dünner als das echte Dach, sitzt das Dach im Modell minimal tiefer.")
  );
  blatt.append(hinweise);

  return blatt;
}

// Für die Teileliste: Himmelsrichtung als Wort (wird auch anderswo gebraucht)
export { himmelsrichtung };
