// =========================================================
// Übersichtsblatt zum Ausdrucken
//
// Inhalt:
//   - Grundriss mit den Nummern der Fassaden und Dachflächen, Nordpfeil
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
// Grundriss: Fassaden als Linien, Dachflächen gestrichelt, Nummern
// Blick von oben, Norden oben (Norden = −z, Osten = +x)
// ---------------------------------------------------------
function grundriss(flaechen, nummerVon) {
  const linien = [];
  const texte = [];
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  const merke = (x, z) => {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    z0 = Math.min(z0, z); z1 = Math.max(z1, z);
  };

  flaechen.forEach((f, i) => {
    const nr = nummerVon.get(i);
    if (!nr) return;
    if (f.wofuer === "fassade") {
      const us = f.aussen.map((p) => p[0]);
      const a = zu3d(f, [Math.min(...us), 0]), b = zu3d(f, [Math.max(...us), 0]);
      linien.push({ punkte: [[a[0], a[2]], [b[0], b[2]]], art: "fassade" });
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
      linien.push({ punkte, art: "dach" });
      const mx = punkte.reduce((s, p) => s + p[0], 0) / punkte.length;
      const mz = punkte.reduce((s, p) => s + p[1], 0) / punkte.length;
      texte.push({ x: mx, z: mz, text: nr, dach: true });
    }
  });

  const rand = 1.5;
  const breite = x1 - x0 + 2 * rand, hoehe = z1 - z0 + 2 * rand;
  const svg = svgElement("svg", {
    viewBox: `${x0 - rand} ${z0 - rand} ${breite} ${hoehe}`,
    width: "100%",
    style: "max-height: 11cm",
    role: "img",
    "aria-label": "Grundriss mit Teilenummern",
  });
  const schrift = Math.max(breite, hoehe) / 40;
  for (const l of linien) {
    svg.append(
      svgElement(l.art === "dach" ? "polygon" : "polyline", {
        points: l.punkte.map((p) => p.join(",")).join(" "),
        fill: "none",
        stroke: l.art === "dach" ? "#888" : "#000",
        "stroke-width": l.art === "dach" ? 1 : 2.5,
        "stroke-dasharray": l.art === "dach" ? "4 3" : "none",
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
  // Nordpfeil oben links
  const px = x0 - rand + schrift * 1.5, pz = z0 - rand + schrift * 3.5;
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
    if (nummerVon.size) blatt.append(grundriss(b.flaechen, nummerVon));
    else blatt.append(element("p", "klein", "Keine Außenflächen gefunden."));
  }
  blatt.append(
    element(
      "p",
      "klein",
      (eineSchicht
        ? "Fassaden als dicke Linien mit ihrer Zahl (das A-Teil mit derselben Zahl), Dachflächen gestrichelt mit D-Nummer. Blick von oben, Norden oben."
        : "Fassaden als dicke Linien mit ihrer Zahl (dazu gehören A- und I-Teil mit derselben Zahl), Dachflächen gestrichelt mit D-Nummer. Blick von oben, Norden oben.") +
        (mehrere ? " Jedes Gebäude ist für sich gezeichnet, nicht in seiner Lage zu den anderen." : "")
    )
  );

  // Teileliste
  const platteVon = new Map();
  platten.forEach((p, i) => p.teile.forEach((t) => platteVon.set(t.name, i + 1)));
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
    if (eineSchicht) {
      schritte.append(
        element("li", "", `Wände zu einem Kasten kleben: ${namen((t) => t.schicht === "A")}. An jeder Ecke läuft eine Wand durch, die andere stößt dagegen.`),
        dachSchritt
      );
    } else {
      schritte.append(
        element("li", "", `Innenschichten zu einem Kasten kleben: ${namen((t) => t.schicht === "I")}. Die Innenschichten sind geschlossen und tragen das Modell.`),
        element("li", "", `Außenschichten (mit Fenstern und Türen) auf die passenden Innenschichten kleben: ${namen((t) => t.schicht === "A")}. Gleiche Zahl = gleiche Fassade${beispiel}.`),
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
