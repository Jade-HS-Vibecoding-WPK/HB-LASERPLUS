// =========================================================
// ZUSATZ 3D: STL schreiben
//
// Eine STL-Datei ist eine Liste von Dreiecken – genau das, was der
// 3D-Drucker (bzw. der Slicer wie Cura, PrusaSlicer, Bambu Studio)
// braucht. Wir schreiben die „binäre“ Form, sie ist klein und wird
// von allen Programmen gelesen:
//   80 Zeichen Kopf, Anzahl der Dreiecke, dann je Dreieck:
//   Richtung (Normale), drei Eckpunkte, 2 Byte Rest.
// Maße in mm, z zeigt nach oben.
// =========================================================

// dreiecke: Float32Array oder Array, 9 Zahlen je Dreieck (x, y, z der drei Punkte)
// Ergebnis: ArrayBuffer mit der fertigen STL-Datei (nur im Browser-Speicher)
export function stlBinaer(dreiecke) {
  const anzahl = Math.floor(dreiecke.length / 9);
  const puffer = new ArrayBuffer(84 + anzahl * 50);
  const dv = new DataView(puffer);

  // Kopf: darf nicht mit „solid“ anfangen, sonst halten manche Programme es für Text-STL
  const kopf = "Erstellt mit IFC zu Laser, WPK Jade Hochschule";
  for (let i = 0; i < 80; i++) dv.setUint8(i, i < kopf.length ? kopf.charCodeAt(i) : 32);
  dv.setUint32(80, anzahl, true);

  let o = 84;
  for (let t = 0; t < anzahl; t++) {
    const i = t * 9;
    const ax = dreiecke[i], ay = dreiecke[i + 1], az = dreiecke[i + 2];
    const bx = dreiecke[i + 3], by = dreiecke[i + 4], bz = dreiecke[i + 5];
    const cx = dreiecke[i + 6], cy = dreiecke[i + 7], cz = dreiecke[i + 8];
    // Normale aus den Kanten (zeigt nach außen, weil die Punkte richtig herum sortiert sind)
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    for (const zahl of [nx, ny, nz, ax, ay, az, bx, by, bz, cx, cy, cz]) {
      dv.setFloat32(o, zahl, true);
      o += 4;
    }
    dv.setUint16(o, 0, true);
    o += 2;
  }
  return puffer;
}

// Für den Knopf „STL herunterladen“: Erst wenn jemand in der App darauf klickt,
// speichert der Browser die Datei auf dem eigenen Rechner (wie bei der DXF).
export function stlHerunterladen(puffer, dateiname) {
  const blob = new Blob([puffer], { type: "model/stl" });
  const adresse = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = adresse;
  link.download = dateiname;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(adresse), 1000);
}
