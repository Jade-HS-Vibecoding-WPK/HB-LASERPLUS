// =========================================================
// IFC lesen – welche Bauteile stecken in der Datei?
//
// Die Bibliothek web-ifc (Version 0.0.78) liegt im Projekt unter
// lib/web-ifc. Sie liest die IFC-Datei direkt im Browser, wie ein
// Übersetzer für die IFC-Sprache. Die Datei verlässt den Rechner nicht,
// und es wird nichts aus dem Internet geladen.
//
// Ergebnis ist eine „Bauteil-Liste“:
//   - Format (IFC2X3 / IFC4) und Längeneinheit
//   - Wände: außen, innen, ohne Angabe (Eigenschaft IsExternal)
//   - Dach: IfcRoof und seine Dachflächen (IfcSlab mit ROOF)
//   - Fenster, Türen, Decken (seit 19.11. mit Geometrie: Untersichten, art „decke“)
//   - Bauteile ohne Klassifizierung (IfcBuildingElementProxy, z. B. Morphs;
//     Morphs werden erkannt und automatisch als Wand und Dach genommen)
//   - „freie Form“: Geometrie als Netz gespeichert, wie bei einem Morph
// Die Geometrie selbst (Fassaden abwickeln) kommt im nächsten Schritt.
// =========================================================

import * as WebIFC from "../lib/web-ifc/web-ifc-api.js";

// Diese Darstellungsarten sind „freie Formen“ (Netz statt Wandaufbau).
// Morphs aus Archicad kommen meist so an.
const FREIE_FORMEN = ["Brep", "AdvancedBrep", "Tessellation", "SurfaceModel", "AdvancedSurface"];

let api = null; // die gestartete Bibliothek, wird nur einmal gestartet

// Fehler mit einer Art, damit die Seite die passende Meldung zeigt
function fehler(art, ursache) {
  const f = new Error(art);
  f.art = art;
  f.cause = ursache;
  return f;
}

async function bibliothekStarten() {
  if (api) return api;
  try {
    const neu = new WebIFC.IfcAPI();
    // Das Rechenmodul (web-ifc.wasm) liegt im selben Ordner wie die Bibliothek
    neu.SetWasmPath(new URL("../lib/web-ifc/", import.meta.url).href, true);
    await neu.Init(undefined, true); // true = einfacher Modus mit einem Prozessorkern
    api = neu;
    return api;
  } catch (ursache) {
    throw fehler("bibliothek", ursache);
  }
}

// ---------------------------------------------------------
// Kleine Helfer zum Lesen der IFC-Zeilen
// ---------------------------------------------------------

// web-ifc liefert Werte als { type, value } – wir brauchen nur den Wert
function wert(feld) {
  if (feld === null || feld === undefined) return null;
  if (typeof feld === "object" && "value" in feld) return feld.value;
  return feld;
}

// Auswahlwerte wie .ROOF. oder .LENGTHUNIT. ohne Punkte, in Großbuchstaben
function auswahl(feld) {
  const w = wert(feld);
  return w === null ? "" : String(w).replace(/\./g, "").toUpperCase();
}

// Ja/Nein-Werte: true, "T", ".T.", "TRUE" → true; unbekannt → null
function jaNein(feld) {
  const w = wert(feld);
  if (w === true || w === false) return w;
  const t = auswahl(w);
  if (t === "T" || t === "TRUE") return true;
  if (t === "F" || t === "FALSE") return false;
  return null;
}

// Einzelner Verweis oder Liste → immer eine Liste
function alsListe(feld) {
  if (!feld) return [];
  return Array.isArray(feld) ? feld : [feld];
}

// Alle Nummern („IDs“) einer IFC-Art, z. B. alle Wände
function idsVon(modell, art) {
  if (typeof art !== "number") return [];
  try {
    const liste = api.GetLineIDsWithType(modell, art);
    const ids = [];
    for (let i = 0; i < liste.size(); i++) ids.push(liste.get(i));
    return ids;
  } catch {
    return []; // Art gibt es in diesem IFC-Format nicht
  }
}

// Eine Zeile der IFC-Datei lesen (oder null, wenn es sie nicht gibt)
function zeile(modell, id) {
  if (!id) return null;
  try {
    return api.GetLine(modell, id, false);
  } catch {
    return null;
  }
}

// „1 Wand“ / „2 Wände“
function anzahlText(n, eins, viele) {
  return n + " " + (n === 1 ? eins : viele);
}

// ---------------------------------------------------------
// Längeneinheit der Datei (Meter, Millimeter …)
// ---------------------------------------------------------
function laengenEinheit(modell) {
  for (const projektId of idsVon(modell, WebIFC.IFCPROJECT)) {
    const projekt = zeile(modell, projektId);
    const zuweisung = projekt && zeile(modell, wert(projekt.UnitsInContext));
    if (!zuweisung) continue;
    for (const verweis of alsListe(zuweisung.Units)) {
      const einheit = zeile(modell, wert(verweis));
      if (!einheit || auswahl(einheit.UnitType) !== "LENGTHUNIT") continue;
      const vorsatz = auswahl(einheit.Prefix);
      const name = auswahl(einheit.Name);
      if (name === "METRE") {
        if (!vorsatz) return "Meter";
        if (vorsatz === "MILLI") return "Millimeter";
        if (vorsatz === "CENTI") return "Zentimeter";
        if (vorsatz === "DECI") return "Dezimeter";
      }
      return (vorsatz + " " + name).trim() || "unbekannt";
    }
  }
  return "unbekannt";
}

// ---------------------------------------------------------
// Eigenschaften sammeln, je Bauteil:
//   - IsExternal (aus Pset_WallCommon, Pset_SlabCommon …)
//   - ob irgendwo „Morph“ als Bauteilart steht
// Eigenschaften können am Bauteil selbst oder an seinem Typ hängen.
// ---------------------------------------------------------
function eigenschaftenSammeln(modell) {
  const aussen = new Map(); // Bauteil-ID → true / false
  const morph = new Set();  // Bauteil-IDs, die als Morph bezeichnet sind

  function satzAnwenden(satzId, bauteilIds, vonTyp) {
    const satz = zeile(modell, satzId);
    if (!satz || satz.type !== WebIFC.IFCPROPERTYSET) return;
    for (const verweis of alsListe(satz.HasProperties)) {
      const eig = zeile(modell, wert(verweis));
      if (!eig || eig.type !== WebIFC.IFCPROPERTYSINGLEVALUE) continue;
      if (String(wert(eig.Name) || "") === "IsExternal") {
        const ja = jaNein(eig.NominalValue);
        if (ja === null) continue;
        for (const id of bauteilIds) {
          // Angabe am Bauteil selbst geht vor Angabe am Typ
          if (vonTyp && aussen.has(id)) continue;
          aussen.set(id, ja);
        }
      } else if (/^morph$/i.test(String(wert(eig.NominalValue) ?? "").trim())) {
        for (const id of bauteilIds) morph.add(id);
      }
    }
  }

  // 1. Eigenschaften direkt am Bauteil
  for (const relId of idsVon(modell, WebIFC.IFCRELDEFINESBYPROPERTIES)) {
    const rel = zeile(modell, relId);
    if (!rel) continue;
    const bauteile = alsListe(rel.RelatedObjects).map(wert);
    for (const satz of alsListe(rel.RelatingPropertyDefinition)) satzAnwenden(wert(satz), bauteile, false);
  }
  // 2. Eigenschaften am Bauteil-Typ (z. B. IfcWallType), gelten für alle Bauteile dieses Typs
  for (const relId of idsVon(modell, WebIFC.IFCRELDEFINESBYTYPE)) {
    const rel = zeile(modell, relId);
    const typ = rel && zeile(modell, wert(rel.RelatingType));
    if (!typ) continue;
    const bauteile = alsListe(rel.RelatedObjects).map(wert);
    for (const satz of alsListe(typ.HasPropertySets)) satzAnwenden(wert(satz), bauteile, true);
  }
  return { aussen, morph };
}

// ---------------------------------------------------------
// Freie Form? (Morph oder Geometrie als Netz gespeichert)
// ---------------------------------------------------------
function istFreieForm(modell, id, eig) {
  if (eig.morph.has(id)) return true;
  const bauteil = zeile(modell, id);
  if (!bauteil) return false;
  if (/morph/i.test(String(wert(bauteil.ObjectType) || ""))) return true;
  // Wie ist die Form gespeichert? z. B. „SweptSolid“ (normale Wand) oder „Brep“ (Netz)
  const form = zeile(modell, wert(bauteil.Representation));
  if (!form) return false;
  for (const verweis of alsListe(form.Representations)) {
    const darstellung = zeile(modell, wert(verweis));
    if (darstellung && wert(darstellung.RepresentationIdentifier) === "Body") {
      return FREIE_FORMEN.includes(String(wert(darstellung.RepresentationType) || ""));
    }
  }
  return false;
}

// ---------------------------------------------------------
// Hauptaufgabe: Datei öffnen, Bauteile zählen, Datei schließen
// datei = die abgelegte Datei (File)
// ---------------------------------------------------------
export async function ifcLesen(datei) {
  const ifc = await bibliothekStarten();
  const daten = new Uint8Array(await datei.arrayBuffer());

  let modell;
  try {
    // COORDINATE_TO_ORIGIN: Gebäude an den Nullpunkt holen (Archicad exportiert oft
    // mit Vermessungs-Koordinaten, die sehr große Zahlen haben)
    modell = ifc.OpenModel(daten, { COORDINATE_TO_ORIGIN: true });
  } catch (ursache) {
    throw fehler("oeffnen", ursache);
  }
  if (modell < 0) throw fehler("oeffnen");

  try {
    return auswerten(modell);
  } finally {
    ifc.CloseModel(modell); // Speicher wieder freigeben
  }
}

function auswerten(modell) {
  const eig = eigenschaftenSammeln(modell);
  const frei = (id) => istFreieForm(modell, id, eig);
  const einheit = laengenEinheit(modell);

  // --- Wände ---
  const wandIds = new Set([
    ...idsVon(modell, WebIFC.IFCWALL),
    ...idsVon(modell, WebIFC.IFCWALLSTANDARDCASE),
    ...idsVon(modell, WebIFC.IFCWALLELEMENTEDCASE),
  ]);
  const waende = { aussen: 0, innen: 0, ohneAngabe: 0, aussenFrei: 0 };
  for (const id of wandIds) {
    const angabe = eig.aussen.get(id);
    if (angabe === true) {
      waende.aussen++;
      if (frei(id)) waende.aussenFrei++;
    } else if (angabe === false) {
      waende.innen++;
    } else {
      waende.ohneAngabe++;
    }
  }

  // --- Dach ---
  // Welche Teile gehören zu welchem Ganzen? (z. B. Dach → Dachflächen)
  const teileVon = new Map();
  for (const relId of idsVon(modell, WebIFC.IFCRELAGGREGATES)) {
    const rel = zeile(modell, relId);
    if (!rel) continue;
    const ganzes = wert(rel.RelatingObject);
    const liste = teileVon.get(ganzes) || [];
    liste.push(...alsListe(rel.RelatedObjects).map(wert));
    teileVon.set(ganzes, liste);
  }
  const dachIds = idsVon(modell, WebIFC.IFCROOF);
  // Alles, was zum Dach gehört (für die Geometrie): das Dach selbst und seine Teile.
  // Archicad zerlegt Dächer oft in Schichten (IfcBuildingElementPart) – die
  // gehören zum Dach, sind aber keine eigenen Dachflächen.
  const dachflaechen = new Set();
  for (const id of dachIds) {
    dachflaechen.add(id);
    for (const teil of teileVon.get(id) || []) dachflaechen.add(teil);
  }
  // Platten (IfcSlab): mit ROOF gehören sie zum Dach, sonst sind es Decken/Böden
  const plattenArten = [WebIFC.IFCSLAB, WebIFC.IFCSLABSTANDARDCASE, WebIFC.IFCSLABELEMENTEDCASE];
  let decken = 0, einzelneDachplatten = 0;
  const deckenIds = []; // Decken/Böden: ihre von unten sichtbaren Flächen werden Untersichten (U)
  const plattenIds = new Set(plattenArten.flatMap((art) => idsVon(modell, art)));
  for (const id of plattenIds) {
    if (dachflaechen.has(id)) continue;
    const platte = zeile(modell, id);
    if (platte && auswahl(platte.PredefinedType) === "ROOF") {
      dachflaechen.add(id);
      einzelneDachplatten++;
    } else {
      decken++;
      deckenIds.push(id);
    }
  }
  // Wie viele Dachplatten (IfcSlab) stecken in den Dächern? Schichten zählen nicht.
  let dachplatten = 0;
  for (const id of dachIds) {
    for (const teil of teileVon.get(id) || []) {
      let art = null;
      try {
        art = api.GetLineType(modell, teil);
      } catch {
        art = null;
      }
      if (plattenArten.includes(art)) dachplatten++;
    }
  }

  // --- Fenster, Türen, Vorhangfassaden ---
  const anzahl = (...arten) => new Set(arten.flatMap((art) => idsVon(modell, art))).size;
  const fenster = anzahl(WebIFC.IFCWINDOW, WebIFC.IFCWINDOWSTANDARDCASE);
  const tueren = anzahl(WebIFC.IFCDOOR, WebIFC.IFCDOORSTANDARDCASE);
  const vorhangfassaden = anzahl(WebIFC.IFCCURTAINWALL);

  // --- Bauteile ohne Klassifizierung (z. B. nicht klassifizierte Morphs) ---
  // morph = sieht nach einem Archicad-Morph aus (Name „Modellkörper …“ / „Morph …“
  // oder als Morph bezeichnet). Morphs nimmt die App automatisch als Wand und Dach,
  // andere unbekannte Bauteile (z. B. Möbel-Objekte) bleiben auf „Ignorieren“.
  const ohneKlasse = idsVon(modell, WebIFC.IFCBUILDINGELEMENTPROXY).map((id) => {
    const b = zeile(modell, id);
    const name = String(wert(b && b.Name) || "ohne Namen");
    const morph =
      eig.morph.has(id) ||
      /morph/i.test(String(wert(b && b.ObjectType) || "")) ||
      /^\s*(modellk(ö|oe)rper|morph)/i.test(name);
    return { id, name, morph };
  });

  // --- Geometrie der Gebäudehülle (Dreiecke) ---
  // Archicad teilt Wände oft in ihre Schichten (IfcBuildingElementPart).
  // Die Geometrie steckt dann in den Teilen, darum alle Teile mitnehmen.
  const mitTeilen = (id) => {
    const alle = [id];
    for (let i = 0; i < alle.length; i++) {
      for (const t of teileVon.get(alle[i]) || []) if (!alle.includes(t)) alle.push(t);
    }
    return alle;
  };
  const artVon = new Map(); // Geometrie-ID → { art, bauteil }
  for (const id of wandIds) {
    if (eig.aussen.get(id) === false) continue; // Innenwände brauchen wir nicht
    for (const g of mitTeilen(id)) artVon.set(g, { art: "wand", bauteil: id });
  }
  for (const id of dachflaechen) {
    for (const g of mitTeilen(id)) if (!artVon.has(g)) artVon.set(g, { art: "dach", bauteil: id });
  }
  for (const p of ohneKlasse) {
    for (const g of mitTeilen(p.id)) if (!artVon.has(g)) artVon.set(g, { art: "proxy", bauteil: p.id });
  }
  // Decken/Böden (seit 19.11.): Sie verdecken beim „Blick nach außen“ (z. B. die
  // Decke über einem Rücksprung), und ihre von unten sichtbare Fläche wird eine
  // Untersicht. Ihre senkrechten Kanten gehören zur Fassade, wenn sie außen liegen.
  for (const id of deckenIds) {
    for (const g of mitTeilen(id)) if (!artVon.has(g)) artVon.set(g, { art: "decke", bauteil: id });
  }
  // Fenster und Türen (seit 19.11.): werden nicht gelasert, sie helfen nur beim
  // Erkennen von Rücksprüngen (wer nur durch ein Fenster hinaussieht, ist innen)
  const oeffnungIds = new Set(
    [WebIFC.IFCWINDOW, WebIFC.IFCWINDOWSTANDARDCASE, WebIFC.IFCDOOR, WebIFC.IFCDOORSTANDARDCASE].flatMap((art) => idsVon(modell, art))
  );
  for (const id of oeffnungIds) {
    for (const g of mitTeilen(id)) if (!artVon.has(g)) artVon.set(g, { art: "oeffnung", bauteil: id });
  }
  const huelle = dreieckeHolen(modell, artVon);

  // --- Hinweise: was ist zu tun? ---
  const hinweise = [];
  // Nur nicht klassifizierte Bauteile (z. B. ein Morph als ganzes Gebäude)?
  const nurOhneKlasse = wandIds.size === 0 && dachflaechen.size === 0 && ohneKlasse.length > 0;
  if (nurOhneKlasse) {
    hinweise.push(
      "Die Datei enthält keine klassifizierten Wände oder Dächer, nur nicht klassifizierte Bauteile (z. B. einen Morph). " +
      "Die App nimmt sie als ganzen Gebäudekörper: senkrechte Flächen werden Fassaden, schräge Flächen Dach. Unten kannst du das ändern."
    );
  } else if (wandIds.size === 0) {
    hinweise.push("In der Datei sind keine Wände. Prüfe, ob beim Export aus Archicad die Wände mitgenommen werden.");
  } else if (waende.aussen === 0 && waende.ohneAngabe === 0) {
    hinweise.push("Keine Wand ist als „Außen“ markiert. Stelle in Archicad bei den Außenwänden die Position „Außen“ ein und exportiere neu.");
  }
  if (waende.ohneAngabe > 0) {
    hinweise.push(
      anzahlText(waende.ohneAngabe, "Wand hat", "Wände haben") +
      " keine Angabe „Außen“ oder „Innen“. Markiere die Außenwände in Archicad als „Außen“ und exportiere neu."
    );
  }
  if (waende.aussen > 1 && waende.aussenFrei === waende.aussen) {
    hinweise.push(
      "Alle Außenwände sind als freie Form gespeichert. Das passiert, wenn im Archicad-Export „BREP“ eingestellt ist. " +
      "Für die Fassaden ist das in Ordnung, nur Morphs lassen sich dann nicht von normalen Wänden unterscheiden."
    );
  }
  if (dachflaechen.size === 0 && !nurOhneKlasse) {
    hinweise.push("Kein Dach gefunden. Prüfe, ob das Dach bzw. der Dach-Morph in Archicad als Dach klassifiziert ist.");
  }
  if (ohneKlasse.length > 0 && !nurOhneKlasse) {
    const morphs = ohneKlasse.filter((p) => p.morph).length;
    hinweise.push(
      anzahlText(ohneKlasse.length, "Bauteil ist", "Bauteile sind") +
      " nicht klassifiziert" +
      (morphs
        ? `, davon ${anzahlText(morphs, "Morph", "Morphs")}. Morphs nimmt die App als Wand und Dach (ganzer Gebäudekörper).`
        : ", z. B. Morphs.") +
      " Lege unten fest, was sie sind, oder klassifiziere sie in Archicad als Wand bzw. Dach."
    );
  }
  if (vorhangfassaden > 0) {
    hinweise.push("Die Datei enthält Vorhangfassaden. Die werden diese Woche noch nicht abgewickelt.");
  }
  if (einheit === "unbekannt") {
    hinweise.push("Die Längeneinheit ließ sich nicht lesen. Die Maße könnten später falsch sein.");
  }

  return {
    schema: api.GetModelSchema(modell),
    einheit,
    waende,
    vorhangfassaden,
    daecher: dachIds.length + einzelneDachplatten, // einzelne Dachplatten ohne IfcRoof zählen als je ein Dach
    dachplatten,
    decken,
    fenster,
    tueren,
    ohneKlasse,
    hinweise,
    huelle,
  };
}

// ---------------------------------------------------------
// Dreiecke der gewünschten Bauteile holen, in Meter, y nach oben.
// Ergebnis: je Bauteil { art, bauteil, dreiecke: 9 Zahlen je Dreieck }
// Die Punkte jedes Dreiecks sind so sortiert, dass seine Richtung
// (Normale) nach außen zeigt.
// ---------------------------------------------------------
function dreieckeHolen(modell, artVon) {
  if (artVon.size === 0) return [];
  const sammel = new Map();
  // Hinweis: StreamMeshes hat in web-ifc 0.0.78 einen Fehler, darum alle
  // Bauteile durchgehen und nur die gewünschten behalten
  api.StreamAllMeshes(modell, (mesh) => {
    const info = artVon.get(mesh.expressID);
    if (!info) return;
    if (!sammel.has(info.bauteil)) sammel.set(info.bauteil, { art: info.art, bauteil: info.bauteil, zahlen: [] });
    const ziel = sammel.get(info.bauteil).zahlen;
    for (let i = 0; i < mesh.geometries.size(); i++) {
      const stueck = mesh.geometries.get(i);
      const geo = api.GetGeometry(modell, stueck.geometryExpressID);
      const v = api.GetVertexArray(geo.GetVertexData(), geo.GetVertexDataSize());
      const ix = api.GetIndexArray(geo.GetIndexData(), geo.GetIndexDataSize());
      const T = stueck.flatTransformation; // Lage des Stücks im Gebäude
      const punkt = (k) => {
        const o = ix[k] * 6; // je Punkt 6 Zahlen: x, y, z und Richtung nx, ny, nz
        const x = v[o], y = v[o + 1], z = v[o + 2];
        const nx = v[o + 3], ny = v[o + 4], nz = v[o + 5];
        return {
          p: [T[0] * x + T[4] * y + T[8] * z + T[12], T[1] * x + T[5] * y + T[9] * z + T[13], T[2] * x + T[6] * y + T[10] * z + T[14]],
          n: [T[0] * nx + T[4] * ny + T[8] * nz, T[1] * nx + T[5] * ny + T[9] * nz, T[2] * nx + T[6] * ny + T[10] * nz],
        };
      };
      for (let k = 0; k + 2 < ix.length; k += 3) {
        const a = punkt(k), b = punkt(k + 1), c = punkt(k + 2);
        // Drehsinn prüfen: Richtung aus den Punkten mit der gelieferten Richtung vergleichen
        const e1 = [b.p[0] - a.p[0], b.p[1] - a.p[1], b.p[2] - a.p[2]];
        const e2 = [c.p[0] - a.p[0], c.p[1] - a.p[1], c.p[2] - a.p[2]];
        const w = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
        const ns = [a.n[0] + b.n[0] + c.n[0], a.n[1] + b.n[1] + c.n[1], a.n[2] + b.n[2] + c.n[2]];
        const umdrehen = w[0] * ns[0] + w[1] * ns[1] + w[2] * ns[2] < 0;
        ziel.push(...a.p, ...(umdrehen ? c.p : b.p), ...(umdrehen ? b.p : c.p));
      }
      geo.delete();
    }
  });
  return [...sammel.values()].map((s) => ({ art: s.art, bauteil: s.bauteil, dreiecke: Float64Array.from(s.zahlen) }));
}
