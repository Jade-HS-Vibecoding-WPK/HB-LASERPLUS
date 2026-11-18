// =========================================================
// Staffage: Menschen und Bäume als Laserteile (seit 18.11.)
//
// Die Formen sind selbst gezeichnet (einfache Silhouetten) – sie
// gehören euch, es gibt keine Lizenzfragen und nichts wird aus dem
// Internet geladen.
//
//   Mensch (M-01 …): stehende Figur, 1,75 m groß, unten eine Fußlasche
//                    zum Einkleben oder Einstecken.
//   Baum (B-01 …):   Steckbaum aus zwei gleichen Teilen (a und b).
//                    Teil a ist von oben, Teil b von unten bis zur Mitte
//                    geschlitzt; über Kreuz zusammengesteckt steht er allein.
//                    Schlitzbreite = Pappdicke.
//
// Maße der Formen in Meter (echte Größe), ausgegeben in mm im Modellmaßstab.
// Die Teile werden wie alle anderen rot geschnitten und mit der Nummer
// daneben geritzt.
// =========================================================

const MENSCH_HOEHE = 1.75; // m

// Mensch, Blick von vorne, Ursprung unten Mitte (Meter).
// Gegen den Uhrzeigersinn: Fußlasche unten, rechte Seite hoch, Kopf, linke Seite runter.
function menschUmriss() {
  const rechts = [
    [0.25, -0.3], [0.25, 0], [0.15, 0], [0.14, 0.92], [0.22, 0.92], [0.23, 1.38], [0.16, 1.47], [0.06, 1.49], [0.05, 1.55],
  ];
  // Kopf: Kreis um (0 | 1.655) mit Radius 0,11 – von rechts unten über oben nach links unten
  const kopf = [];
  const r = 0.11, cy = 1.655;
  const start = -Math.PI / 2 + Math.asin(0.05 / r);
  const ende = (3 * Math.PI) / 2 - Math.asin(0.05 / r);
  for (let i = 0; i <= 14; i++) {
    const w = start + ((ende - start) * i) / 14;
    kopf.push([r * Math.cos(w), cy + r * Math.sin(w)]);
  }
  const links = rechts.slice().reverse().map(([x, y]) => [-x, y]);
  const punkte = [...rechts, ...kopf, ...links]; // endet links unten an der Fußlasche
  // Maßstab: die Figur ist 1,75 m vom Fuß (y = 0) bis zum Scheitel
  const oben = cy + r;
  const f = MENSCH_HOEHE / oben;
  return punkte.map(([x, y]) => [x * f, y * f]);
}

// Steckbaum (in mm, schon im Maßstab), Ursprung unten Mitte.
// hoehe: Gesamthöhe in mm, schlitz: Schlitzbreite in mm, art: "oben" | "unten"
function baumUmriss(hoehe, schlitz, art) {
  const H = hoehe;
  const c = 0.66 * H, r = 0.34 * H; // Krone: Kreis
  const w = Math.max(0.08 * H, schlitz + 2); // Stamm, immer breiter als der Schlitz
  const s = schlitz / 2;
  const mitte = H / 2;
  const kreis = (a) => [r * Math.cos(a), c + r * Math.sin(a)];
  // Winkel, an denen Stamm (x = ±w/2) und Schlitz (x = ±s) den Kreis treffen
  const aStamm = -Math.PI / 2 + Math.asin(Math.min(1, w / 2 / r));
  const aSchlitz = Math.acos(Math.min(1, s / r));
  const bogen = (von, bis, n) => {
    const p = [];
    for (let i = 0; i <= n; i++) p.push(kreis(von + ((bis - von) * i) / n));
    return p;
  };
  const yStamm = c - Math.sqrt(Math.max(0, r * r - (w / 2) * (w / 2)));
  const punkte = [];
  // unten: Stamm (bei Teil b mit Schlitz von unten bis zur Mitte)
  if (art === "unten") {
    punkte.push([-w / 2, 0], [-s, 0], [-s, mitte], [s, mitte], [s, 0], [w / 2, 0]);
  } else {
    punkte.push([-w / 2, 0], [w / 2, 0]);
  }
  punkte.push([w / 2, yStamm]);
  // Krone rechts hoch bis oben (bei Teil a mit Schlitz von oben bis zur Mitte)
  if (art === "oben") {
    punkte.push(...bogen(aStamm, aSchlitz, 16));
    punkte.push([s, mitte], [-s, mitte]);
    punkte.push(...bogen(Math.PI - aSchlitz, Math.PI - aStamm, 16));
  } else {
    punkte.push(...bogen(aStamm, Math.PI - aStamm, 32));
  }
  punkte.push([-w / 2, yStamm]);
  return punkte;
}

// ---------------------------------------------------------
// Teile bauen. e = Einstellungen (massstab, menschen, baeume, baumHoehe,
// dickeAussen/dickeInnen, wandaufbau). Ergebnis im selben Aufbau wie
// die Teile aus schichten.js, damit verteilen.js sie mitnehmen kann.
// ---------------------------------------------------------
export function staffageTeile(e) {
  const k = 1000 / e.massstab; // mm im Modell je Meter
  // Pappe: frei wählbar (Einstellung „Pappdicke“ bei Menschen und Bäumen), Start 1 mm.
  // Ist sie anders als bei den Wänden, legt verteilen.js sie auf eigene Platten.
  const dicke = [1, 1.5, 2].includes(e.staffageDicke) ? e.staffageDicke : 1;
  const zwei = (z) => String(z).padStart(2, "0");
  const teile = [];

  const mensch = menschUmriss().map(([x, y]) => [x * k, y * k]);
  for (let i = 1; i <= (e.menschen || 0); i++) {
    teile.push({
      name: `M-${zwei(i)}`,
      wofuer: "staffage",
      schicht: "",
      beschreibung: `Mensch, ${String(MENSCH_HOEHE).replace(".", ",")} m (Fußlasche unten zum Einkleben)`,
      dicke,
      aussen: mensch,
      loecher: [],
      ritzlinien: [],
      gebaeude: 0,
    });
  }

  const hoehe = (e.baumHoehe || 10) * k;
  for (let i = 1; i <= (e.baeume || 0); i++) {
    // Nummern: B-01A und B-01B gehören zum selben Baum (A = Schlitz oben, B = Schlitz unten)
    for (const [buchstabe, art, text] of [["A", "oben", "Schlitz von oben"], ["B", "unten", "Schlitz von unten"]]) {
      teile.push({
        name: `B-${zwei(i)}${buchstabe}`,
        wofuer: "staffage",
        schicht: "",
        beschreibung: `Baum ${String(e.baumHoehe || 10).replace(".", ",")} m, Teil ${buchstabe} (${text})`,
        dicke,
        aussen: baumUmriss(hoehe, dicke, art),
        loecher: [],
        ritzlinien: [],
        gebaeude: 0,
      });
    }
  }
  return teile;
}
