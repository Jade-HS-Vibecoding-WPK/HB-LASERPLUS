# CLAUDE.md – IFC → Laserdatei (Plattenmodell)

Diese Datei liest Claude zu Beginn jeder Sitzung. Hier stehen Ziel, Regeln und Gestaltung.
Der genaue Fahrplan mit Must / Should / Could und Tagesetappen steht in [PLAN.md](PLAN.md).

---

## Ziel

Eine **Webseite**, die aus einer **.ifc-Datei** eines einzelnen Gebäudes fertige **Laserdateien (DXF)** für ein **Pappmodell** macht:

- Das **Dach** und **jede Fassadenseite** werden zu je einer flachen Platte, so gezeichnet, wie man sie von außen sieht.
- Jede Wand hat **zwei Schichten**: eine **Innenschicht** (geschlossen, tragend) und eine **Außenschicht** mit ausgeschnittenen Fenstern und Türen, die aufgeklebt wird. Das Dach hat **eine Schicht**.
- An den **Ecken** überlappen die Wände: Eine Wand läuft durch, die andere wird um die Pappdicke(n) gekürzt. Das gilt auch für **schräge Winkel** und den **First**, beides ist Must.
- Pappdicke innen und außen getrennt wählbar: **1 mm, 1,5 mm oder 2 mm**. Die Laserplatte ist **1000 × 600 mm**.
- Die Teile werden auf Laserplatten verteilt. **Neben** jedes Teil wird seine Nummer geritzt (`N-001-A` = außen, `N-001-I` = innen), **nie auf das Teil**.
- Dazu gibt es ein **Übersichtsblatt zum Ausdrucken**: Grundriss, welches Teil wohin gehört, Reihenfolge beim Kleben.
- Verbindung: **Kleben ist Pflicht**, ein Stecksystem (Zinken an den Innenschicht-Ecken) ist ein Extra.

Ausdrücklich **nicht** in dieser Woche: runde Wände, Innenwände, Geschossdecken, Bodenplatte, Umgebung mit mehreren Gebäuden, Gelände.

---

## Mit wem du arbeitest

- Du arbeitest mit einer Person, die **Architektur studiert und nicht programmieren kann**.
- **Erkläre jeden Schritt einfach**, auf **Deutsch** und in der **Du-Form**. Erkläre jeden Fachbegriff beim ersten Auftreten in einem Halbsatz, am besten mit einem Vergleich aus Architektur oder Modellbau.
- Architektur-Fachwissen (Ansicht, Abwicklung, Maßstab, Graupappe, First, Giebel) setzt du voraus. Programmier-Wissen setzt du **nicht** voraus.
- Zeige nach jedem Schritt, **was sich sichtbar geändert hat**, am besten in der Vorschau im Browser. Code zeigst du nur, wenn danach gefragt wird.
- **Wer wo arbeitet:** Alison arbeitet an einem **Windows-Rechner** (Git ist dort installiert). Die Gebäudemodelle kommen aus **Archicad**.

---

## Regeln

1. **Immer vorher fragen und auf ein Ja warten.** Sag dabei, worauf du zugreifst: welcher Ordner, welche Datei, welche Webseite, welcher Befehl. Das gilt auch fürs Lesen. Ein Ja gilt nur für den genannten Schritt.
   - **Ankündigen ist nicht fragen.** „Ich schaue kurz in …“ zu sagen und sofort loszulegen ist nicht erlaubt. Stell die Frage und warte auf die Antwort.
   - **Nie ungefragt außerhalb dieses Projektordners zugreifen**, auch nicht kurz nachsehen (Programme-Ordner, Benutzerordner, Systemeinstellungen). Wenn du etwas wissen musst, frag direkt, z. B. „Hast du GitHub Desktop?“.
   - Die Sitzung soll im **manuellen Modus** laufen, nicht im Auto-Modus. Steht sie auf „Auto“, weise darauf hin.
2. **Nichts committen oder auf GitHub hochladen (pushen) ohne ausdrückliches Ja.** Vorher in einfachen Worten erklären, was hochgeladen wird.
3. **Eigene IFC-Dateien nur nach Rückfrage ins Repository aufnehmen.** Sie können privat oder sehr groß sein. Testdateien liegen in `beispiele/`.
4. **Die IFC-Datei verlässt nie den Rechner.** Alles wird im Browser gerechnet: kein Server, kein Hochladen, keine Analyse-Dienste.
5. **Reihenfolge: zuerst Must, dann Should, dann Could** (siehe PLAN.md). Neue Ideen kommen in PLAN.md unter „Ideen-Parkplatz“ und werden nicht sofort gebaut.
6. **Kleine Schritte.** Ein Schritt muss danach sichtbar funktionieren, bevor der nächste beginnt.
7. **Freeze am Donnerstag, 19.11.2026, um 12:00.** Danach keine neuen Funktionen mehr, nur Fehlerbehebung. Am Freitag (Präsentation) wird am Code nichts mehr geändert, außer bei einem echten Notfall und nach Rückfrage.
8. **Ehrlich sein:** Wenn etwas nicht oder nur ungefähr funktioniert (z. B. schräge Ecken), sag das klar und trag es in PLAN.md ein.
9. **Bibliotheken nur mit fester Versionsnummer** einbinden, nie „latest“.
10. **Erlaubt von außen sind nur Google Fonts und Tailwind** (Entscheidung vom 17.11.), dazu die Bibliotheken unter „Technik“, jeweils mit fester Version. Keine anderen Dienste, keine Analyse-Dienste, und die IFC-Datei wird nie irgendwohin geschickt (Regel 4). Hinweis: Beim Laden von Google Fonts sieht Google die IP-Adresse der Besucher. Für das Kursprojekt ist das bewusst in Ordnung.

---

## Gestaltung

### Grundsatz

Ruhig, aufgeräumt, viel Weißraum. Es gibt **eine Seite** mit drei klar nummerierten Bereichen:

1. **Datei ablegen**: große Ablagefläche mit gestrichelter Linie
2. **Einstellungen**: Maßstab (Zahlenfeld, Start 1:100), Dicke innen und Dicke außen (je eine Auswahl 1 / 1,5 / 2 mm, Start innen 2 mm, außen 1 mm), Plattengröße (Start 1000 × 600 mm), **Linienfarben** (Schneiden, Ritzen, Rahmen, Gravieren; voreingestellt nach den Werkstatt-Regeln, Knopf „Auf Hochschul-Werte zurücksetzen“). Die Seite **merkt sich alle Einstellungen** im Browser (`localStorage`), nichts geht an einen Server.
3. **Vorschau & Download**: Platten-Vorschau, DXF-Buttons, „Übersichtsblatt drucken“

Hell oder dunkel richtet sich **automatisch nach der Systemeinstellung** (`prefers-color-scheme`). Die Seite muss auch auf schmalen Bildschirmen funktionieren.

### Farbpalette (Vorlage: Bild `PHOTO-2026-11-16-14-01-50.jpg` im Hauptordner)

| Name | Hex |
|---|---|
| Tomato | `#FF6347` |
| Coral | `#F97A5D` |
| Salmon | `#FF8C69` |
| Light Coral | `#FFA07A` |
| Apricot | `#FFB380` |
| Sandy | `#FFCC99` |
| Peachy | `#FFDAB9` |
| Papaya Whip | `#FFEAD9` |

### Farb-Rollen

| Rolle | Hell | Dunkel |
|---|---|---|
| Seitenhintergrund | `#FFF8F3` (aufgehelltes Papaya Whip) | `#1C1411` (warmes Fast-Schwarz) |
| Flächen / Karten | `#FFEAD9` Papaya Whip | `#2A1E19` |
| Linien / Rahmen | `#FFCC99` Sandy | `#4A3129` |
| Text | `#2B1A14` | `#FFEAD9` Papaya Whip |
| Text leise | `#7A4A3A` | `#FFCC99` Sandy |
| Akzent (Buttons, aktiv) | `#FF6347` Tomato | `#FF8C69` Salmon |
| Akzent Hover | `#F97A5D` Coral | `#FFA07A` Light Coral |
| Vorschau: Platte | `#CFC6B8` Graupappe | `#CFC6B8` Graupappe (in beiden Modi gleich) |
| Vorschau: Linien | die eingestellten **Laserfarben** (siehe unten) | dieselben |

- Farben werden als CSS-Variablen auf `:root` festgelegt und für dunkel unter `@media (prefers-color-scheme: dark)` neu gesetzt.
- **Buttontext auf Tomato/Salmon ist dunkel (`#2B1A14`), nicht weiß.** Weiß auf Tomato ist zu kontrastarm.

### Eigene Gestaltungsentscheidung (Kursaufgabe Tag 2)

**Die Vorschau zeigt jede Platte wie die echte Laserplatte:** eine Fläche in Graupappe-Farbe, darauf der gelbe Rahmen und alle Linien in genau den Laserfarben, die auch in der DXF stehen (Rot schneiden, Blau ritzen, Gelb Rahmen, Schwarz gravieren). **Was man sieht, ist genau das, was der Laser macht.** Die App spricht damit die Sprache der Werkstatt, statt eigene Bildschirmfarben zu erfinden. Ändert jemand eine Linienfarbe in den Einstellungen, ändert sich die Vorschau sofort mit. Die Palette Tomato bis Papaya gilt nur für die Bedienoberfläche drumherum.

### Schrift

- **Century Gothic**, mit einer ähnlichen freien Schrift von **Google Fonts** als Ersatz: `font-family: "Century Gothic", CenturyGothic, "Didact Gothic", sans-serif;`
- Century Gothic ist lizenzpflichtig und **nicht** bei Google Fonts. Die Schriftdatei **nicht** ins Projekt kopieren. Wer sie installiert hat, sieht sie. Alle anderen sehen „Didact Gothic“ (von Google Fonts geladen).
- Überschriften: Großbuchstaben mit etwas Zeichenabstand, wie auf der Farbvorlage (z. B. `IFC → LASER`).

### Ton der Texte in der App

Deutsch, Du-Form, kurz und freundlich. Fehlermeldungen sagen, **was zu tun ist** („Diese Datei hat keine Außenwände markiert. Prüfe im Export, ob ‚IsExternal‘ gesetzt ist.“).

---

## Technik

### Aufbau

- **Statische Webseite ohne Build-Schritt**: HTML, CSS und JavaScript-Module. GitHub Pages kann sie direkt veröffentlichen.
- Lokal testen mit einem kleinen Server (z. B. `python3 -m http.server`), weil WASM nicht über `file://` lädt. Die Vorschau läuft über `.claude/launch.json`.
- Bibliotheken (mit fester Version, über CDN oder im Projekt abgelegt):
  - **Tailwind** für das Layout, über das CDN mit fester Version **3.4.16** (`https://cdn.tailwindcss.com/3.4.16`, kein Build-Schritt). Eigene Farben als Tailwind-Theme aus den CSS-Variablen oben.
  - **Google Fonts** nur für die Ersatzschrift „Didact Gothic“
  - **web-ifc**: liest IFC im Browser (WASM)
  - **three.js**: nur für die 3D-Vorschau (Should) und Raycasting
  - Polygon-Vereinigung (z. B. Clipper2 oder polygon-clipping): fügt die Flächen einer Fassadenseite zusammen
  - **DXF wird selbst geschrieben** (ASCII, wenige Elementtypen), ohne Bibliothek

### Geplante Ordnerstruktur

```
index.html
css/style.css
js/main.js          – Bedienung der Seite
js/einstellungen.js – Einstellungen und Laserfarben, Speichern im Browser
js/ifc-lesen.js     – IFC laden, Außenwände und Dach finden
js/abwickeln.js     – Fassadenflächen flach legen, Öffnungen finden
js/schichten.js     – Innen-/Außenschicht, Eckenausgleich
js/verteilen.js     – Teile auf Platten verteilen
js/linienschrift.js – Nummern als Linien (für die Gravur)
js/dxf.js           – DXF schreiben
js/uebersicht.js    – Übersichtsblatt
beispiele/          – Test-IFC-Dateien
```

Datei- und Ordnernamen ohne Umlaute. Kommentare im Code auf Deutsch und einfach.

### Rechenweg (Plattenmodell)

1. **Einheiten** aus der IFC prüfen (mm oder m). Intern rechnen wir in Meter (Original), ausgegeben wird in **mm im Modellmaßstab**.
2. **Außenwände** sind `IfcWall`/`IfcWallStandardCase` (bei Bedarf `IfcCurtainWall`) mit `Pset_WallCommon.IsExternal = true`. Fehlt die Angabe: Wände an der Gebäudehülle nehmen und darauf hinweisen. **Dach**: `IfcRoof` (zerlegt in `IfcSlab`) oder `IfcSlab` mit `PredefinedType = ROOF`.
   - **Morphs aus Archicad** (Must): Ein Morph, der in Archicad als Wand oder Dach **klassifiziert** ist, kommt als `IfcWall` bzw. `IfcRoof`/`IfcSlab` an und wird genauso behandelt. Seine Geometrie ist meist ein freies Dreiecksnetz. Das passt, weil wir ohnehin mit dem Netz rechnen. In den Morph modellierte Löcher werden zu Öffnungen.
   - **Nicht klassifizierte Morphs** (Should) kommen als `IfcBuildingElementProxy` an. Die App listet sie auf, und man legt per Klick fest: „Wand“, „Dach“ oder „ignorieren“.
   - Gebogene Morph-Flächen sind wie runde Wände **nicht** diese Woche dran: Hinweis anzeigen, nicht stumm falsch rechnen.
3. **Außenfläche finden**: Dreiecksnetz in ebene Flächen gruppieren (gleiche Normale und gleicher Abstand). Außen ist die Fläche, von der ein Strahl in Normalenrichtung kein anderes Bauteil trifft. Der Gebäudemittelpunkt genügt nicht, weil er bei L- oder U-Formen falsch liegen kann.
4. **Fassadenseiten bilden**: Außenflächen aller Wände **in derselben Ebene** zu einem Polygon vereinigen. Eine Fassadenseite ergibt eine Platte pro Schicht, unabhängig davon, wie die Wände in der IFC unterteilt sind.
5. **Abwickeln**: Für jede Ebene ein Koordinatensystem anlegen (u = waagerecht entlang der Fassade, v = nach oben bzw. in Falllinie beim Dach). Das Ergebnis ist eine **Ansicht von außen**, nicht gespiegelt.
6. **Öffnungen**: Prüfen, ob web-ifc die Öffnungen (`IfcOpeningElement`) bereits aus der Wandgeometrie abzieht. Dann sind es Löcher im Polygon. Falls nicht: Öffnungen projizieren und abziehen.
7. **Schichten**: Die Außenschicht ist das Fassadenpolygon mit Löchern. Die Innenschicht ist dasselbe Polygon ohne Löcher, mit eigenem Eckenausgleich. Das Dach ist ein Polygon pro Dachfläche, mit einer Schicht.
8. **Eckenausgleich bei 90°** (t_a = Dicke außen, t_i = Dicke innen, jeweils 1 / 1,5 / 2 mm; L = Außenmaß der Fassade):
   - Wand A läuft durch: Außenschicht A = L, Innenschicht A = L − t_a je Ecke
   - Wand B gekürzt: Außenschicht B = L − t_a je Ecke, Innenschicht B = L − (t_a + t_i) je Ecke
   - Durchlaufend und gekürzt wechseln sich rund ums Gebäude ab (beim Rechteck: zwei gegenüberliegende Seiten laufen durch). Bei ungerader Eckenzahl ist eine Platte gemischt.
   - **Schräge Winkel** (Must): Die Kürzung wird über parallel versetzte Linien im Grundriss berechnet, damit die Außenmaße genauso stimmen wie bei 90°. Der Laser schneidet senkrecht, darum bleibt an spitzen oder stumpfen Ecken eine kleine Keilfuge. Das Übersichtsblatt weist darauf hin.
   - **Dach** (Must): Das Dach liegt auf. Die Wände werden oben um die Dachdicke gekürzt, beim Steildach entlang der Dachneigung, und die Giebelwände sind oben passend abgeschrägt. Am First überlappt eine Dachplatte die andere. Die überlappende Platte wird so verlängert, dass die Firsthöhe stimmt.
9. **Verteilen**: Standard-Platte 1000 × 600 mm (einstellbar). Die Teile kommen als Rechteck-Hüllen in Reihen auf die Platte („Regal-Verfahren“), groß zuerst. Abstand zwischen den Teilen mindestens 3 mm **plus Platz für die Nummer**, **mindestens 5 mm Abstand zum gelben Rahmen** (Werkstatt-Regel). Teile, die größer als die Platte sind, lösen eine Warnung aus und werden nicht stumm verkleinert.
10. **Nummern**: Schema `Richtung-Zahl-Schicht`, z. B. `N-001-I` / `N-001-A`, Dach `D-001`. Die Zahl ist die Reihenfolge beim Kleben. Die Nummer steht **neben** dem Teil auf der Restpappe, nie innerhalb der Kontur, und wird **geritzt** (Ebene `RITZEN`, blau). Das Schema ist bestätigt (`-A` = außen, `-I` = innen) und trotzdem an einer Stelle im Code zentral änderbar. In der Linienschrift bekommt das `I` Querstriche oben und unten, damit man es nicht mit einer `1` verwechselt.

### Laser-Regeln für die DXF

Diese Regeln kommen von der **Laserwerkstatt der Hochschule** (Stand 17.11.2026). Hält sich eine Datei nicht daran, **verfällt der Lasertermin**, und Korrekturen gehören nicht zum Service.

- **Format: DXF** (die Werkstatt nimmt DXF oder DWG; DXF reicht). **Einheit mm**, Maßstab bereits eingerechnet. Direkt im Modellbereich, **kein Layout**. Nur `LINE` und `POLYLINE`/`LWPOLYLINE`: keine Splines, keine Textobjekte, keine Blöcke.
- **Ebenen und Farben**, als **RGB-Farbe** (True Color, DXF-Gruppencode 420) plus passende AutoCAD-Farbnummer als Rückfall:

  | Ebene | Wofür | Standardfarbe | AutoCAD-Nr. |
  |---|---|---|---|
  | `SCHNITT` | Durchschneiden: alle Konturen, Fenster, Türen | Rot `255,0,0` | 1 |
  | `RITZEN` | Anritzen: **die Teilenummern** (Linienschrift) | Blau `0,0,255` | 5 |
  | `RAHMEN` | gelber Rahmen und Orientierungslinien | Gelb `255,255,0` | 2 |
  | `GRAVUR` | Flächen und gefüllte Schriften (zurzeit nicht genutzt) | Schwarz `0,0,0` | 7 |

- Die Farben sind in der App **einstellbar**. Die Tabelle zeigt die Werte der Hochschule, die voreingestellt sind. Die DXF nimmt immer die eingestellten Farben.
- **Linienstärke 0,00 mm** für alle Linien (DXF-Gruppencode 370 = 0).
- **Gelber Rahmen in Plattengröße (1000 × 600 mm) muss immer drin sein**, als geschlossene Linie auf der Ebene `RAHMEN`. Alle Teile mindestens **5 mm** vom Rahmen entfernt, sonst werden sie evtl. nicht vollständig ausgeschnitten.
- **Alle Konturen geschlossen**, **keine doppelten Linien** (der Laser würde zweimal schneiden und die Pappe verbrennen; in AutoCAD wäre das der Befehl „Overkill“). Keine unnötigen Hilfsinformationen in der Datei (AutoCAD: „Bereinigen“).
- **Linie auf Linie** ist laut Werkstatt erlaubt (Teile teilen sich eine Schnittkante). Das ist ein Could. Die gemeinsame Kante darf dann nur **einmal** in der Datei stehen.
- Schriften: Weil die Nummern als **Linienschrift** gezeichnet werden, braucht die Werkstatt keine installierte Schriftart.
- **Reihenfolge**: zuerst Löcher (Fenster/Türen), dann die Außenkontur, damit sich das Teil nicht vorher löst.
- **Eine DXF-Datei pro Platte.**
- **Warnung** bei Stegen dünner als 2 × Pappdicke (Should).

### Testen

- Jede Änderung in der Vorschau im Browser anschauen, in hell **und** dunkel.
- DXF-Ausgaben in einem Viewer oder in AutoCAD/Rhino öffnen und **Maße nachmessen** (z. B. eine Wandlänge 10 m bei 1:100 → 100 mm).
- Testdateien: die eigene IFC aus **Archicad** (am besten mit mindestens einer Wand **und** einem Morph) und eine frei verfügbare Beispieldatei (z. B. das FZK-Haus des KIT, mit Satteldach).

### Export aus Archicad (Hinweise für die Nutzerin)

- Außenwände müssen als **„Außen“** markiert sein (Wand-Einstellungen → Position). Sonst fehlt `IsExternal` in der IFC.
- **Morphs** vor dem Export als **Wand** oder **Dach** klassifizieren (Klassifizierung und Eigenschaften), bei Wand-Morphs zusätzlich `IsExternal` setzen.
- Diese Hinweise kommen auch kurz in die App, neben die Ablagefläche.
