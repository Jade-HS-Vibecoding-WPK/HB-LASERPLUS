// =========================================================
// Staffage: Menschen und Bäume als Laserteile (seit 18.11.)
//
// Die Formen sind selbst gezeichnet (einfache Silhouetten) – sie
// gehören euch, es gibt keine Lizenzfragen und nichts wird aus dem
// Internet geladen.
//
//   Mensch (M-01 …): seit 19.11. Alisons eigene Figuren (js/staffage-figuren.js):
//                    „Figur 1“ und „Figur 2“, je in fein (1:20–1:50) und
//                    einfach (1:100–1:200), in echter Größe, ohne Fußlasche.
//                    Die frühere einfache Figur (menschUmriss) bleibt nur als Rückfall.
//   Baum (B-01 …):   Steckbaum aus zwei gleichen Teilen (A und B).
//                    Teil A ist von oben, Teil B von unten bis zur Mitte
//                    geschlitzt; über Kreuz zusammengesteckt steht er allein.
//                    Schlitzbreite = Pappdicke.
//                    Zwei Formen (Einstellung „Baumform“, seit 19.11.):
//                    „detailliert“ = Svenjas Baum aus staffage-dxf/Baum.dxf
//                    (js/staffage-baum.js), „einfach“ = runde Krone (baumUmriss).
//
// Maße der Formen in Meter (echte Größe), ausgegeben in mm im Modellmaßstab.
// Die Teile werden wie alle anderen rot geschnitten und mit der Nummer
// daneben geritzt.
// =========================================================

import { FIGUREN, figurenStufe } from "./staffage-figuren.js";
import { BAUM_HOEHE, BAUM_KRONE, BAUM_STAMM } from "./staffage-baum.js";

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
// Detaillierter Baum (Svenjas Zeichnung, js/staffage-baum.js)
// ---------------------------------------------------------

// So viel Pappe bleibt mindestens links und rechts neben dem Schlitz
// im Stamm stehen (mm), wie beim einfachen Baum.
const STEG = 1;

// Schlitz in einen Umriss schneiden (Umriss gegen den Uhrzeigersinn,
// Schlitz mittig bei x = −s … +s).
// vonOben = true:  vom oberen Rand hinunter bis yMitte (Teil A)
// vonOben = false: vom unteren Rand hinauf bis yMitte (Teil B)
// Ergebnis: neuer Umriss, oder null, wenn der Schlitz nicht sauber passt.
function schlitzSchneiden(punkte, s, yMitte, vonOben) {
  const n = punkte.length;
  // Wo trifft die senkrechte Linie x den Rand? Gesucht ist der oberste
  // (von oben) bzw. unterste (von unten) Treffer.
  const treffer = (x) => {
    let best = null;
    for (let i = 0; i < n; i++) {
      const [ax, ay] = punkte[i], [bx, by] = punkte[(i + 1) % n];
      if (ax === bx || (ax - x) * (bx - x) > 0) continue;
      const y = ay + ((x - ax) / (bx - ax)) * (by - ay);
      if (!best || (vonOben ? y > best.y : y < best.y)) best = { i, y };
    }
    return best;
  };
  // Gegen den Uhrzeigersinn läuft der obere Rand von rechts nach links,
  // der untere von links nach rechts – das gibt die Reihenfolge der Treffer.
  const xa = vonOben ? s : -s;
  const xb = vonOben ? -s : s;
  const a = treffer(xa), b = treffer(xb);
  if (!a || !b) return null;
  if (vonOben ? a.y <= yMitte || b.y <= yMitte : a.y >= yMitte || b.y >= yMitte) return null;
  // Alles zwischen den beiden Treffern fällt weg, dafür kommt der Schlitz hinein
  const neu = [[xb, b.y]];
  for (let j = (b.i + 1) % n, schritte = 0; schritte <= n; j = (j + 1) % n, schritte++) {
    neu.push(punkte[j]);
    if (j === a.i) break;
  }
  neu.push([xa, a.y], [xa, yMitte], [xb, yMitte]);
  return neu;
}

// Doppelte Punkte direkt hintereinander entfernen
function ohneDoppelte(punkte) {
  const gleich = (p, q) => Math.abs(p[0] - q[0]) < 1e-6 && Math.abs(p[1] - q[1]) < 1e-6;
  const neu = punkte.filter((p, i) => i === 0 || !gleich(p, punkte[i - 1]));
  while (neu.length > 2 && gleich(neu[0], neu[neu.length - 1])) neu.pop();
  return neu;
}

// Prüft, ob sich der Umriss irgendwo selbst kreuzt oder berührt
// (dann wäre er für den Laser unbrauchbar).
function kreuztSich(punkte) {
  const n = punkte.length;
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const auf = (p, q, r) =>
    Math.min(p[0], q[0]) <= r[0] && r[0] <= Math.max(p[0], q[0]) &&
    Math.min(p[1], q[1]) <= r[1] && r[1] <= Math.max(p[1], q[1]);
  for (let i = 0; i < n; i++) {
    const a = punkte[i], b = punkte[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue; // Nachbarkanten teilen sich einen Punkt
      const c = punkte[j], d = punkte[(j + 1) % n];
      const d1 = o(a, b, c), d2 = o(a, b, d), d3 = o(c, d, a), d4 = o(c, d, b);
      if (d1 * d2 < 0 && d3 * d4 < 0) return true;
      if ((d1 === 0 && auf(a, b, c)) || (d2 === 0 && auf(a, b, d)) ||
          (d3 === 0 && auf(c, d, a)) || (d4 === 0 && auf(c, d, b))) return true;
    }
  }
  return false;
}

// Beide Teile (A und B) des detaillierten Baums in mm im Modell.
// hoehe: Gesamthöhe im Modell (mm), schlitz: Schlitzbreite = Pappdicke (mm).
// Ergebnis: { oben, unten, breiter } oder null, wenn der Baum im
// Maßstab zu klein ist (dann nimmt staffageTeile den einfachen Baum).
function detailBaum(hoehe, schlitz) {
  const f = hoehe / BAUM_HOEHE;
  // Der Stamm muss mindestens Schlitz + 2 Stege breit sein. Wo er
  // schmaler ist, wird er auf diese Breite gebracht (gerade Kante).
  const halbMin = schlitz / 2 + STEG;
  let breiter = false;
  const stamm = BAUM_STAMM.map(([x, y]) => {
    const xm = x * f;
    if (Math.abs(xm) >= halbMin) return [xm, y * f];
    breiter = true;
    return [Math.sign(x) * halbMin, y * f];
  });
  const umriss = ohneDoppelte([...BAUM_KRONE.map(([x, y]) => [x * f, y * f]), ...stamm]);
  if (kreuztSich(umriss)) return null;
  const mitte = hoehe / 2;
  const oben = schlitzSchneiden(umriss, schlitz / 2, mitte, true);
  const unten = schlitzSchneiden(umriss, schlitz / 2, mitte, false);
  if (!oben || !unten) return null;
  const a = ohneDoppelte(oben), b = ohneDoppelte(unten);
  if (kreuztSich(a) || kreuztSich(b)) return null;
  return { oben: a, unten: b, breiter };
}

// ---------------------------------------------------------
// Teile bauen. e = Einstellungen (massstab, figur1/figur2, baeume6/10/15, baumForm,
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

  // Eigene Figuren: Detailstufe nach Maßstab (oder selbst gewählt),
  // Figur 1 / Figur 2 / abwechselnd. Die Umrisse sind in mm in echter Größe,
  // darum geteilt durch den Maßstab.
  const stufe = e.figurenDetail === "fein" || e.figurenDetail === "einfach" ? e.figurenDetail : figurenStufe(e.massstab);
  const satz = FIGUREN[stufe];
  const umrissVon = (nr) => (satz && satz[`figur${nr}`] ? satz[`figur${nr}`].map(([x, y]) => [x / e.massstab, y / e.massstab]) : null);
  const ersatz = menschUmriss().map(([x, y]) => [x * k, y * k]); // nur falls etwas fehlt
  const figuren = { 1: umrissVon(1) || ersatz, 2: umrissVon(2) || ersatz };
  const stufeText = stufe === "fein" ? "fein" : "einfach";
  // Anzahl je Figur selbst gewählt: erst alle Figur 1, dann alle Figur 2
  const anzahl1 = e.figur1 || 0, anzahl2 = e.figur2 || 0;
  for (let i = 1; i <= anzahl1 + anzahl2; i++) {
    const nr = i <= anzahl1 ? 1 : 2;
    teile.push({
      name: `M-${zwei(i)}`,
      wofuer: "staffage",
      schicht: "",
      beschreibung: `Mensch, Figur ${nr} (${stufeText})`,
      ohneNummer: true, // Wunsch 19.11.: keine geritzte Nummer unter den Menschen
      dicke,
      aussen: figuren[nr],
      loecher: [],
      ritzlinien: [],
      gebaeude: 0,
    });
  }

  // Bäume: Anzahl je Höhe (seit 19.11. mehrere Höhen gleichzeitig),
  // durchnummeriert erst alle 6-m-, dann 10-m-, dann 15-m-Bäume.
  // Baumform: detailliert (Svenjas Baum) oder einfach (runde Krone).
  // Ist der detaillierte Baum im Maßstab zu klein für den Schlitz,
  // kommt automatisch der einfache – das steht dann in der Teileliste.
  let nr = 0;
  for (const meter of [6, 10, 15]) {
    const anzahl = e[`baeume${meter}`] || 0;
    if (anzahl <= 0) continue;
    const hoehe = meter * k;
    const detail = e.baumForm !== "einfach" ? detailBaum(hoehe, dicke) : null;
    let formText = "einfach";
    if (detail) formText = detail.breiter ? "detailliert, Stamm verbreitert" : "detailliert";
    else if (e.baumForm !== "einfach") formText = "einfach, zu klein für detailliert";
    const umrissVonBaum = (art) =>
      detail ? (art === "oben" ? detail.oben : detail.unten).map(([x, y]) => [x, y]) : baumUmriss(hoehe, dicke, art);
    for (let i = 1; i <= anzahl; i++) {
      nr++;
      // Nummern: B-01A und B-01B gehören zum selben Baum (A = Schlitz oben, B = Schlitz unten)
      for (const [buchstabe, art, text] of [["A", "oben", "Schlitz von oben"], ["B", "unten", "Schlitz von unten"]]) {
        teile.push({
          name: `B-${zwei(nr)}${buchstabe}`,
          wofuer: "staffage",
          schicht: "",
          beschreibung: `Baum ${meter} m (${formText}), Teil ${buchstabe} (${text})`,
          ohneNummer: true, // Wunsch 19.11.: keine geritzte Nummer unter den Bäumen
          dicke,
          aussen: umrissVonBaum(art),
          loecher: [],
          ritzlinien: [],
          gebaeude: 0,
        });
      }
    }
  }
  return teile;
}
