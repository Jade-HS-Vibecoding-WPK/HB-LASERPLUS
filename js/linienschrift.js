// =========================================================
// Linienschrift – Nummern als einfache Striche
//
// Der Laser ritzt Linien. Darum zeichnen wir jede Ziffer und jeden
// Buchstaben selbst als ein paar Striche, wie mit einer Schablone.
// So braucht die Werkstatt keine Schriftart.
//
// Raster je Zeichen: 4 breit, 6 hoch (y nach oben).
// Besonderheiten zur Unterscheidung:
//   - „I“ hat Querstriche oben und unten, die „1“ nicht
//   - die „0“ hat einen Schrägstrich, das „O“ nicht
// =========================================================

const ZEICHEN = {
  "0": [[[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]], [[0.5, 0.5], [3.5, 5.5]]],
  "1": [[[1, 4.5], [2.5, 6], [2.5, 0]]],
  "2": [[[0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [0, 0], [4, 0]]],
  "3": [[[0, 6], [4, 6], [2, 3.5], [3, 3.5], [4, 2.5], [4, 1], [3, 0], [1, 0], [0, 1]]],
  "4": [[[3, 0], [3, 6], [0, 2], [4, 2]]],
  "5": [[[4, 6], [0, 6], [0, 3.5], [3, 3.5], [4, 2.5], [4, 1], [3, 0], [0, 0]]],
  "6": [[[4, 6], [1, 6], [0, 5], [0, 1], [1, 0], [3, 0], [4, 1], [4, 2.5], [3, 3.5], [0, 3.5]]],
  "7": [[[0, 6], [4, 6], [1.5, 0]]],
  "8": [[[1, 3], [0, 4], [0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [3, 3], [1, 3], [0, 2], [0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [3, 3]]],
  "9": [[[4, 2.5], [1, 2.5], [0, 3.5], [0, 5], [1, 6], [3, 6], [4, 5], [4, 1], [3, 0], [0, 0]]],
  N: [[[0, 0], [0, 6], [4, 0], [4, 6]]],
  O: [[[1.2, 0], [2.8, 0], [4, 1.5], [4, 4.5], [2.8, 6], [1.2, 6], [0, 4.5], [0, 1.5], [1.2, 0]]],
  S: [[[4, 5], [3, 6], [1, 6], [0, 5], [0, 4], [1, 3], [3, 3], [4, 2], [4, 1], [3, 0], [1, 0], [0, 1]]],
  W: [[[0, 6], [1, 0], [2, 4], [3, 0], [4, 6]]],
  D: [[[0, 0], [0, 6], [2.5, 6], [4, 4.5], [4, 1.5], [2.5, 0], [0, 0]]],
  A: [[[0, 0], [2, 6], [4, 0]], [[0.8, 2.4], [3.2, 2.4]]],
  I: [[[2, 0], [2, 6]], [[1, 0], [3, 0]], [[1, 6], [3, 6]]],
  "-": [[[0.8, 3], [3.2, 3]]],
  // für Menschen (M) und Bäume (B), seit 18.11.
  M: [[[0, 0], [0, 6], [2, 2.5], [4, 6], [4, 0]]],
  B: [[[0, 0], [0, 6], [2.8, 6], [3.8, 5], [3.8, 4], [2.8, 3], [0, 3]], [[2.8, 3], [4, 2], [4, 1], [3, 0], [0, 0]]],
  // seit 19.11.: U für Untersichten (U-001), P L T E und Komma für die
  // Plattenbeschriftung („PLATTE 2 - PAPPE 1,5 MM“)
  U: [[[0, 6], [0, 1], [1, 0], [3, 0], [4, 1], [4, 6]]],
  P: [[[0, 0], [0, 6], [3, 6], [4, 5], [4, 4], [3, 3], [0, 3]]],
  L: [[[0, 6], [0, 0], [4, 0]]],
  T: [[[0, 6], [4, 6]], [[2, 6], [2, 0]]],
  E: [[[4, 6], [0, 6], [0, 0], [4, 0]], [[0, 3], [3, 3]]],
  ",": [[[2.2, 0.8], [1.4, -0.8]]],
};

const BREITE = 4;   // Breite eines Zeichens im Raster
const LUECKE = 2;   // Abstand zwischen zwei Zeichen im Raster
const HOEHE = 6;    // Höhe eines Zeichens im Raster

// Text → Striche (offene Linienzüge) in mm, links unten bei (0, 0)
// hoehe = Schrifthöhe in mm
export function textLinien(text, hoehe) {
  const s = hoehe / HOEHE;
  const linien = [];
  let x = 0;
  for (const z of String(text).toUpperCase()) {
    const striche = ZEICHEN[z];
    if (striche) {
      for (const strich of striche) linien.push(strich.map(([px, py]) => [(x + px) * s, py * s]));
    }
    x += BREITE + LUECKE;
  }
  const breite = Math.max(0, (x - LUECKE) * s);
  return { linien, breite, hoehe };
}
