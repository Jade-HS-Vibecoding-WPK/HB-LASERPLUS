// =========================================================
// DXF schreiben – nach den Regeln der Laserwerkstatt
//
// Eine DXF ist eine Textdatei: Zeile für Zeile steht abwechselnd
// eine Kennzahl („Gruppencode“, z. B. 8 = Ebene) und ein Wert.
// Wir schreiben sie selbst, ohne Bibliothek.
//
// Werkstatt-Regeln (siehe CLAUDE.md):
//   - Einheit mm, Maßstab schon eingerechnet, nur Modellbereich
//   - nur LWPOLYLINE (geschlossene Linienzüge), keine Texte, keine Blöcke
//   - Ebenen SCHNITT / RITZEN / RAHMEN / GRAVUR
//   - Farbe als RGB (Code 420) plus AutoCAD-Farbnummer (Code 62) als Rückfall
//   - Linienstärke 0,00 mm (Code 370 = 0)
//   - gelber Rahmen in Plattengröße immer dabei, Teile mind. 10 mm davon entfernt
//   - eine Datei pro Platte
//
// Aufbau, den diese Datei erwartet („Platte“), alle Maße in mm,
// Ursprung unten links, y zeigt nach oben (wie in CAD):
//   {
//     breite: 1000, hoehe: 600,
//     linien: [ { ebene: "SCHNITT", punkte: [[x, y], ...], geschlossen: true }, ... ]
//   }
// Der Rahmen wird automatisch ergänzt.
// =========================================================

// Mindestabstand aller Teile zum gelben Rahmen in mm (Werkstatt-Regel).
// An dieser einen Stelle änderbar.
export const RAND_ABSTAND = 10;

// Welche Linien liegen näher als RAND_ABSTAND am Rahmen?
// Ergebnis: Liste dieser Linien (leer = alles in Ordnung)
export function zuNahAmRahmen(platte) {
  return platte.linien.filter((linie) =>
    linie.punkte.some(([x, y]) =>
      x < RAND_ABSTAND || y < RAND_ABSTAND ||
      x > platte.breite - RAND_ABSTAND || y > platte.hoehe - RAND_ABSTAND
    )
  );
}

// Die vier Ebenen und welche Farbe aus den Einstellungen dazugehört
export const EBENEN = {
  SCHNITT: "schneiden",
  RITZEN: "ritzen",
  RAHMEN: "rahmen",
  GRAVUR: "gravieren",
};

// ---------------------------------------------------------
// Farben umrechnen
// ---------------------------------------------------------

// "#ff0000" → [255, 0, 0]
function hexZuRgb(hex) {
  const zahl = parseInt(hex.replace("#", ""), 16);
  return [(zahl >> 16) & 255, (zahl >> 8) & 255, zahl & 255];
}

// RGB als eine Zahl für Code 420 (Rot·65536 + Grün·256 + Blau)
function rgbZahl([r, g, b]) {
  return r * 65536 + g * 256 + b;
}

// Nächstliegende AutoCAD-Grundfarbe als Rückfall für ältere Programme
// (1 Rot, 2 Gelb, 3 Grün, 4 Cyan, 5 Blau, 6 Magenta, 7 Weiß/Schwarz)
function naechsteAutocadFarbe([r, g, b]) {
  const grundfarben = [
    [1, [255, 0, 0]], [2, [255, 255, 0]], [3, [0, 255, 0]], [4, [0, 255, 255]],
    [5, [0, 0, 255]], [6, [255, 0, 255]], [7, [0, 0, 0]], [7, [255, 255, 255]],
  ];
  let beste = 7;
  let besterAbstand = Infinity;
  for (const [nummer, [gr, gg, gb]] of grundfarben) {
    const abstand = (r - gr) ** 2 + (g - gg) ** 2 + (b - gb) ** 2;
    if (abstand < besterAbstand) {
      besterAbstand = abstand;
      beste = nummer;
    }
  }
  return beste;
}

// ---------------------------------------------------------
// Hilfen zum Schreiben
// ---------------------------------------------------------

// Zahl ohne unnötige Nachkommastellen (0,001 mm genau)
function zahl(wert) {
  return String(Math.round(wert * 1000) / 1000);
}

// Jedes Element in einer DXF braucht eine eigene Kennung („Handle“, hexadezimal)
function kennungsZaehler() {
  let naechste = 0x20;
  return () => (naechste++).toString(16).toUpperCase();
}

// ---------------------------------------------------------
// Doppelte Linien vermeiden (Werkstatt-Regel „Overkill“)
// Gleicher Linienzug auf gleicher Ebene → nur einmal schreiben
// ---------------------------------------------------------
function ohneDoppelte(linien) {
  const gesehen = new Set();
  return linien.filter((linie) => {
    const schluessel = linie.ebene + ":" + linie.punkte.map(([x, y]) => zahl(x) + "," + zahl(y)).join(";");
    if (gesehen.has(schluessel)) return false;
    gesehen.add(schluessel);
    return true;
  });
}

// ---------------------------------------------------------
// Rahmen in Plattengröße (immer dabei)
// ---------------------------------------------------------
export function rahmenLinie(breite, hoehe) {
  return {
    ebene: "RAHMEN",
    punkte: [[0, 0], [breite, 0], [breite, hoehe], [0, hoehe]],
    geschlossen: true,
  };
}

// ---------------------------------------------------------
// Die eigentliche DXF-Datei bauen
// platte = siehe oben, farben = Einstellungen (z. B. { schneiden: "#ff0000", ... })
// Ergebnis: Text der DXF-Datei
// ---------------------------------------------------------
export function platteAlsDxf(platte, farben) {
  const neueKennung = kennungsZaehler();
  const z = []; // Zeilen der Datei
  const paar = (code, wert) => z.push(String(code), String(wert));

  // Feste Kennungen für die Grundgerüst-Teile
  const k = {
    tabVport: neueKennung(), vport: neueKennung(),
    tabLtype: neueKennung(), ltByBlock: neueKennung(), ltByLayer: neueKennung(), ltCont: neueKennung(),
    tabLayer: neueKennung(),
    tabStyle: neueKennung(), style: neueKennung(),
    tabView: neueKennung(), tabUcs: neueKennung(),
    tabAppid: neueKennung(), appid: neueKennung(),
    tabDimstyle: neueKennung(), dimstyle: neueKennung(),
    tabBlockRec: neueKennung(), brModel: neueKennung(), brPaper: neueKennung(),
    blkModel: neueKennung(), endModel: neueKennung(), blkPaper: neueKennung(), endPaper: neueKennung(),
    dictRoot: neueKennung(), dictGroup: neueKennung(), dictPlot: neueKennung(), plotNormal: neueKennung(),
  };
  const ebenenKennung = {};
  for (const name of ["0", ...Object.keys(EBENEN)]) ebenenKennung[name] = neueKennung();

  // Linien: Rahmen dazu, doppelte raus
  const linien = ohneDoppelte([...platte.linien, rahmenLinie(platte.breite, platte.hoehe)]);
  const linienKennung = linien.map(() => neueKennung());
  const naechsteFreie = neueKennung(); // für $HANDSEED

  // Farbe je Ebene
  const ebenenFarbe = {};
  for (const [ebene, einstellung] of Object.entries(EBENEN)) {
    const rgb = hexZuRgb(farben[einstellung]);
    ebenenFarbe[ebene] = { rgb: rgbZahl(rgb), aci: naechsteAutocadFarbe(rgb) };
  }

  // ---------- Kopf (HEADER) ----------
  paar(0, "SECTION"); paar(2, "HEADER");
  paar(9, "$ACADVER"); paar(1, "AC1018");          // AutoCAD-2004-Format: kann RGB-Farben
  paar(9, "$HANDSEED"); paar(5, naechsteFreie);
  paar(9, "$INSUNITS"); paar(70, 4);               // 4 = Millimeter
  paar(9, "$MEASUREMENT"); paar(70, 1);            // metrisch
  paar(9, "$EXTMIN"); paar(10, 0); paar(20, 0); paar(30, 0);
  paar(9, "$EXTMAX"); paar(10, zahl(platte.breite)); paar(20, zahl(platte.hoehe)); paar(30, 0);
  paar(0, "ENDSEC");

  paar(0, "SECTION"); paar(2, "CLASSES"); paar(0, "ENDSEC");

  // ---------- Tabellen (TABLES) ----------
  paar(0, "SECTION"); paar(2, "TABLES");

  const tabelleAnfang = (name, kennung, anzahl) => {
    paar(0, "TABLE"); paar(2, name); paar(5, kennung); paar(330, 0);
    paar(100, "AcDbSymbolTable"); paar(70, anzahl);
  };
  const eintragAnfang = (art, kennung, tabelle, unterklasse) => {
    paar(0, art); paar(5, kennung); paar(330, tabelle);
    paar(100, "AcDbSymbolTableRecord"); paar(100, unterklasse);
  };

  // Ansicht beim Öffnen: ganze Platte
  tabelleAnfang("VPORT", k.tabVport, 1);
  eintragAnfang("VPORT", k.vport, k.tabVport, "AcDbViewportTableRecord");
  paar(2, "*Active"); paar(70, 0);
  paar(10, 0); paar(20, 0); paar(11, 1); paar(21, 1);
  paar(12, zahl(platte.breite / 2)); paar(22, zahl(platte.hoehe / 2));
  paar(13, 0); paar(23, 0); paar(14, 10); paar(24, 10); paar(15, 10); paar(25, 10);
  paar(16, 0); paar(26, 0); paar(36, 1); paar(17, 0); paar(27, 0); paar(37, 0);
  paar(40, zahl(platte.hoehe * 1.1)); paar(41, zahl(platte.breite / platte.hoehe)); paar(42, 50);
  paar(43, 0); paar(44, 0); paar(50, 0); paar(51, 0);
  paar(71, 0); paar(72, 100); paar(73, 1); paar(74, 3); paar(75, 0); paar(76, 0); paar(77, 0); paar(78, 0);
  paar(0, "ENDTAB");

  // Linientypen: nur durchgezogen
  tabelleAnfang("LTYPE", k.tabLtype, 3);
  for (const [kennung, name] of [[k.ltByBlock, "ByBlock"], [k.ltByLayer, "ByLayer"], [k.ltCont, "Continuous"]]) {
    eintragAnfang("LTYPE", kennung, k.tabLtype, "AcDbLinetypeTableRecord");
    paar(2, name); paar(70, 0); paar(3, name === "Continuous" ? "Solid line" : "");
    paar(72, 65); paar(73, 0); paar(40, 0);
  }
  paar(0, "ENDTAB");

  // Ebenen mit Farbe und Linienstärke 0
  tabelleAnfang("LAYER", k.tabLayer, 1 + Object.keys(EBENEN).length);
  for (const name of ["0", ...Object.keys(EBENEN)]) {
    const farbe = ebenenFarbe[name] || { rgb: 0, aci: 7 };
    eintragAnfang("LAYER", ebenenKennung[name], k.tabLayer, "AcDbLayerTableRecord");
    paar(2, name); paar(70, 0);
    paar(62, farbe.aci);
    if (name !== "0") paar(420, farbe.rgb);
    paar(6, "Continuous");
    paar(370, 0);            // Linienstärke 0,00 mm
    paar(390, k.plotNormal); // Plotstil „Normal“
  }
  paar(0, "ENDTAB");

  // Textstil (Pflichteintrag, wird nicht benutzt)
  tabelleAnfang("STYLE", k.tabStyle, 1);
  eintragAnfang("STYLE", k.style, k.tabStyle, "AcDbTextStyleTableRecord");
  paar(2, "Standard"); paar(70, 0); paar(40, 0); paar(41, 1); paar(50, 0); paar(71, 0);
  paar(42, 2.5); paar(3, "txt"); paar(4, "");
  paar(0, "ENDTAB");

  tabelleAnfang("VIEW", k.tabView, 0); paar(0, "ENDTAB");
  tabelleAnfang("UCS", k.tabUcs, 0); paar(0, "ENDTAB");

  tabelleAnfang("APPID", k.tabAppid, 1);
  eintragAnfang("APPID", k.appid, k.tabAppid, "AcDbRegAppTableRecord");
  paar(2, "ACAD"); paar(70, 0);
  paar(0, "ENDTAB");

  // Bemaßungsstil (Pflichteintrag, wird nicht benutzt)
  paar(0, "TABLE"); paar(2, "DIMSTYLE"); paar(5, k.tabDimstyle); paar(330, 0);
  paar(100, "AcDbSymbolTable"); paar(70, 1); paar(100, "AcDbDimStyleTable"); paar(71, 0);
  paar(0, "DIMSTYLE"); paar(105, k.dimstyle); paar(330, k.tabDimstyle);
  paar(100, "AcDbSymbolTableRecord"); paar(100, "AcDbDimStyleTableRecord");
  paar(2, "Standard"); paar(70, 0);
  paar(0, "ENDTAB");

  tabelleAnfang("BLOCK_RECORD", k.tabBlockRec, 2);
  for (const [kennung, name] of [[k.brModel, "*Model_Space"], [k.brPaper, "*Paper_Space"]]) {
    eintragAnfang("BLOCK_RECORD", kennung, k.tabBlockRec, "AcDbBlockTableRecord");
    paar(2, name);
  }
  paar(0, "ENDTAB");

  paar(0, "ENDSEC");

  // ---------- Blöcke: nur die zwei Pflicht-Bereiche, keine eigenen Blöcke ----------
  paar(0, "SECTION"); paar(2, "BLOCKS");
  for (const [blk, end, rec, name, papier] of [
    [k.blkModel, k.endModel, k.brModel, "*Model_Space", false],
    [k.blkPaper, k.endPaper, k.brPaper, "*Paper_Space", true],
  ]) {
    paar(0, "BLOCK"); paar(5, blk); paar(330, rec); paar(100, "AcDbEntity");
    if (papier) paar(67, 1);
    paar(8, "0"); paar(100, "AcDbBlockBegin"); paar(2, name); paar(70, 0);
    paar(10, 0); paar(20, 0); paar(30, 0); paar(3, name); paar(1, "");
    paar(0, "ENDBLK"); paar(5, end); paar(330, rec); paar(100, "AcDbEntity");
    if (papier) paar(67, 1);
    paar(8, "0"); paar(100, "AcDbBlockEnd");
  }
  paar(0, "ENDSEC");

  // ---------- Zeichnung (ENTITIES): nur geschlossene Linienzüge ----------
  paar(0, "SECTION"); paar(2, "ENTITIES");
  linien.forEach((linie, i) => {
    const farbe = ebenenFarbe[linie.ebene];
    paar(0, "LWPOLYLINE"); paar(5, linienKennung[i]); paar(330, k.brModel);
    paar(100, "AcDbEntity"); paar(8, linie.ebene);
    paar(62, farbe.aci); paar(420, farbe.rgb); // Farbe auch direkt an der Linie
    paar(370, 0);                              // Linienstärke 0,00 mm
    paar(100, "AcDbPolyline"); paar(90, linie.punkte.length);
    paar(70, linie.geschlossen ? 1 : 0); paar(43, 0);
    for (const [x, y] of linie.punkte) {
      paar(10, zahl(x)); paar(20, zahl(y));
    }
  });
  paar(0, "ENDSEC");

  // ---------- Verwaltung (OBJECTS): Pflicht-Verzeichnisse ----------
  paar(0, "SECTION"); paar(2, "OBJECTS");
  paar(0, "DICTIONARY"); paar(5, k.dictRoot); paar(330, 0); paar(100, "AcDbDictionary"); paar(281, 1);
  paar(3, "ACAD_GROUP"); paar(350, k.dictGroup);
  paar(3, "ACAD_PLOTSTYLENAME"); paar(350, k.dictPlot);
  paar(0, "DICTIONARY"); paar(5, k.dictGroup); paar(330, k.dictRoot); paar(100, "AcDbDictionary"); paar(281, 1);
  paar(0, "ACDBDICTIONARYWDFLT"); paar(5, k.dictPlot); paar(330, k.dictRoot); paar(100, "AcDbDictionary"); paar(281, 1);
  paar(3, "Normal"); paar(350, k.plotNormal);
  paar(100, "AcDbDictionaryWithDefault"); paar(340, k.plotNormal);
  paar(0, "ACDBPLACEHOLDER"); paar(5, k.plotNormal); paar(330, k.dictPlot);
  paar(0, "ENDSEC");

  paar(0, "EOF");
  return z.join("\r\n") + "\r\n";
}

// ---------------------------------------------------------
// ZIP-Datei mit mehreren DXF (seit 19.11.)
// Viele Browser nehmen nur den ersten von mehreren Downloads an. Darum
// kommen bei „Alle DXF herunterladen“ alle Platten in EINE ZIP-Datei –
// darin für jede Platte eine eigene DXF. Ohne Bibliothek: die Dateien
// werden unkomprimiert hineingelegt („stored“), das kann jedes Programm öffnen.
// dateien: [{ name: "…_Platte-01-von-02_Pappe-1-5mm.dxf", text: "…" }]
// Ergebnis: Blob (die ZIP-Datei)
// ---------------------------------------------------------
const CRC_TABELLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

// Prüfsumme, die jede ZIP-Datei je Inhalt braucht
function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABELLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function zipErstellen(dateien) {
  const kodierer = new TextEncoder();
  const jetzt = new Date();
  const zeit = (jetzt.getHours() << 11) | (jetzt.getMinutes() << 5) | (jetzt.getSeconds() >> 1);
  const datum = ((jetzt.getFullYear() - 1980) << 9) | ((jetzt.getMonth() + 1) << 5) | jetzt.getDate();
  const stuecke = [], verzeichnis = [];
  let versatz = 0;
  for (const d of dateien) {
    const name = kodierer.encode(d.name);
    const daten = kodierer.encode(d.text);
    const pruef = crc32(daten);
    // Kopf vor jeder Datei
    const kopf = new DataView(new ArrayBuffer(30));
    kopf.setUint32(0, 0x04034b50, true);
    kopf.setUint16(4, 20, true);
    kopf.setUint16(6, 0x0800, true); // Dateinamen in UTF-8 (Umlaute)
    kopf.setUint16(8, 0, true);      // 0 = nicht komprimiert
    kopf.setUint16(10, zeit, true);
    kopf.setUint16(12, datum, true);
    kopf.setUint32(14, pruef, true);
    kopf.setUint32(18, daten.length, true);
    kopf.setUint32(22, daten.length, true);
    kopf.setUint16(26, name.length, true);
    kopf.setUint16(28, 0, true);
    stuecke.push(new Uint8Array(kopf.buffer), name, daten);
    // Eintrag im Inhaltsverzeichnis am Ende
    const eintrag = new DataView(new ArrayBuffer(46));
    eintrag.setUint32(0, 0x02014b50, true);
    eintrag.setUint16(4, 20, true);
    eintrag.setUint16(6, 20, true);
    eintrag.setUint16(8, 0x0800, true);
    eintrag.setUint16(10, 0, true);
    eintrag.setUint16(12, zeit, true);
    eintrag.setUint16(14, datum, true);
    eintrag.setUint32(16, pruef, true);
    eintrag.setUint32(20, daten.length, true);
    eintrag.setUint32(24, daten.length, true);
    eintrag.setUint16(28, name.length, true);
    eintrag.setUint32(42, versatz, true); // wo die Datei in der ZIP beginnt
    verzeichnis.push(new Uint8Array(eintrag.buffer), name);
    versatz += 30 + name.length + daten.length;
  }
  const groesseVerzeichnis = verzeichnis.reduce((s, t) => s + t.length, 0);
  const ende = new DataView(new ArrayBuffer(22));
  ende.setUint32(0, 0x06054b50, true);
  ende.setUint16(8, dateien.length, true);
  ende.setUint16(10, dateien.length, true);
  ende.setUint32(12, groesseVerzeichnis, true);
  ende.setUint32(16, versatz, true);
  return new Blob([...stuecke, ...verzeichnis, new Uint8Array(ende.buffer)], { type: "application/zip" });
}

// Beliebige Datei (Blob) im Browser herunterladen (bleibt auf dem Rechner)
export function blobHerunterladen(blob, dateiname) {
  const adresse = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = adresse;
  link.download = dateiname;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(adresse), 1000);
}

// ---------------------------------------------------------
// Datei im Browser herunterladen (bleibt auf dem Rechner)
// ---------------------------------------------------------
export function dxfHerunterladen(text, dateiname) {
  const blob = new Blob([text], { type: "application/dxf" });
  const adresse = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = adresse;
  link.download = dateiname;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(adresse), 1000);
}
