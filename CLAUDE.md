# CLAUDE.md – IFC → Laserdatei (Plattenmodell)

Diese Datei liest Claude zu Beginn jeder Sitzung. Hier stehen Ziel, Regeln und Gestaltung.
Der genaue Fahrplan mit Must / Should / Could und Tagesetappen steht in [PLAN.md](PLAN.md).

---

## Ziel

Eine **Webseite**, die aus einer **.ifc-Datei** eines Gebäudes fertige **Laserdateien (DXF)** für ein **Pappmodell** macht. Seit 18.11. auch für **mehrere Gebäude** auf einmal (je IFC-Datei ein Gebäude):

- Das **Dach** und **jede Fassadenseite** werden zu je einer flachen Platte, so gezeichnet, wie man sie von außen sieht.
- Jede Wand hat **zwei Schichten**: eine **Innenschicht** (geschlossen, tragend) und eine **Außenschicht** mit ausgeschnittenen Fenstern und Türen, die aufgeklebt wird. Das Dach hat **eine Schicht**.
- Seit 18.11. ist der **Wandaufbau wählbar** (Einstellung `wandaufbau` in `js/einstellungen.js`, umgesetzt in `teileBauen` in `js/schichten.js`): `zwei` (Standard, wie oben), `eine-geritzt` (eine geschlossene Schicht, Fenster und Türen blau auf `RITZEN` angeritzt; Türen bis zum Boden als offener Linienzug ohne Unterkante) oder `eine-ohne` (eine geschlossene Schicht ohne Öffnungen). Bei einer Schicht gilt nur `dickeInnen` („Pappdicke Wand und Dach“), Nummern bleiben `A-001`.
- An den **Ecken** überlappen die Wände: Eine Wand läuft durch, die andere wird um die Pappdicke(n) gekürzt. Das gilt auch für **schräge Winkel** und den **First**, beides ist Must.
- Pappdicke innen und außen getrennt wählbar: **1 mm, 1,5 mm oder 2 mm**. Die Laserplatte ist **1000 × 600 mm**.
- Die Teile werden auf Laserplatten verteilt. **Neben** jedes Teil wird seine Nummer geritzt (`A-001` = Außenschicht, `I-001` = Innenschicht derselben Fassade, `D-001` = Dachfläche), **nie auf das Teil**.
- Dazu gibt es ein **Übersichtsblatt zum Ausdrucken**: Legende der Nummern, Grundriss, welches Teil wohin gehört, Reihenfolge beim Kleben. Die Website erinnert daran, es zu speichern oder zu drucken.
- Verbindung: **Kleben ist Pflicht**, ein Stecksystem (Zinken an den Innenschicht-Ecken) ist ein Extra.

Ausdrücklich **nicht** in dieser Woche: runde Wände, Innenwände, Geschossdecken, Bodenplatte, Gelände, ein **Lageplan** (mehrere Gebäude in ihrer echten Lage zueinander). Mehrere Gebäude gehen seit 18.11., aber jedes für sich.

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
   - **Auch kein Internet ohne ausdrückliches Ja**, auch nicht zum Nachlesen (Paket-Seiten wie npm oder jsdelivr, Webseiten, Suche). Fehlt eine Bibliothek, beschreibst du, welche Datei gebraucht wird, und die Nutzerin legt sie selbst in `lib/` (so geschehen am 17.11. mit web-ifc).
   - Ein Ja gilt für genau die Schritte und Zugriffe, die du vorher aufgezählt hast. Brauchst du unterwegs etwas anderes, halte an und frag.
   - **Downloads macht nie Claude**, weder aus dem Internet noch über einen Download-Knopf in der App (DXF, STL, Vorlagen …). Das übernehmen Svenja oder Alison. Claude prüft erzeugte Dateien nur im Browser-Speicher und sagt dann, welchen Knopf sie drücken sollen (seit 18.11.).
   - Die Sitzung soll im **manuellen Modus** laufen, nicht im Auto-Modus. Steht sie auf „Auto“, weise darauf hin.
2. **Nichts committen oder auf GitHub hochladen (pushen) ohne ausdrückliches Ja.** Vorher in einfachen Worten erklären, was hochgeladen wird.
3. **Eigene IFC-Dateien nur nach Rückfrage ins Repository aufnehmen.** Sie können privat oder sehr groß sein. Testdateien liegen in `beispiele/`.
4. **Die IFC-Datei verlässt nie den Rechner.** Alles wird im Browser gerechnet: kein Server, kein Hochladen, keine Analyse-Dienste.
5. **Reihenfolge: zuerst Must, dann Should, dann Could** (siehe PLAN.md). Neue Ideen kommen in PLAN.md unter „Ideen-Parkplatz“ und werden nicht sofort gebaut.
6. **Kleine Schritte.** Ein Schritt muss danach sichtbar funktionieren, bevor der nächste beginnt.
7. **Freeze am Donnerstag, 19.11.2026, um 12:00.** Danach keine neuen Funktionen mehr, nur Fehlerbehebung. Am Freitag (Präsentation) wird am Code nichts mehr geändert, außer bei einem echten Notfall und nach Rückfrage.
8. **Ehrlich sein:** Wenn etwas nicht oder nur ungefähr funktioniert (z. B. schräge Ecken), sag das klar und trag es in PLAN.md ein.
9. **Bibliotheken nur mit fester Versionsnummer** einbinden, nie „latest“.
10. **Erlaubt von außen sind nur Google Fonts und Tailwind** (Entscheidung vom 17.11.), jeweils mit fester Version. Alle anderen Bibliotheken liegen im Projekt unter `lib/` (zurzeit nur web-ifc). Keine anderen Dienste, keine Analyse-Dienste, und die IFC-Datei wird nie irgendwohin geschickt (Regel 4). Hinweis: Beim Laden von Google Fonts sieht Google die IP-Adresse der Besucher. Für das Kursprojekt ist das bewusst in Ordnung.
11. **Zwei Branches (seit 18.11.), immer den richtigen nennen.**
    - `main` = **Basisversion**. Sie wird am Freitag präsentiert, GitHub Pages zeigt immer `main`.
    - `zusatz-3d` = **Zusatzversion** (3D-Druck-Dateien im STL-Format). Klappt sie bis zum Freeze nicht, kommt sie **nicht** nach `main`. Was alles dazugehört, steht in PLAN.md unter „Basis- und Zusatzversion“.
    - **Vor jedem Arbeitsschritt** schreibst du zuerst, in welchen Branch die Änderung gehört („Ziel-Branch: main“), und fragst, auf welchem Branch GitHub Desktop gerade steht. Stimmt es nicht, erst umschalten lassen, dann arbeiten.
    - **Am Ende jeder Antwort, in der Dateien geändert wurden**, steht in großen Buchstaben mit Ausrufezeichen, wohin hochgeladen wird, z. B. **HOCHLADEN IN: MAIN !** oder **HOCHLADEN IN: ZUSATZ-3D !**
    - Änderungen an der Basis gehören immer zuerst nach `main`. Danach `main` in `zusatz-3d` übernehmen (GitHub Desktop: auf `zusatz-3d` umschalten → **Branch → Merge into current branch… → main**), damit die Zusatzversion die Basis-Änderungen auch hat.
    - Die Anweisung **„Entferne alles aus der Zusatzversion und ändere die App zur Basisversion“** heißt: `zusatz-3d` nicht nach `main` übernehmen; `main` bleibt, wie es ist.

---

## Gestaltung

### Grundsatz

Ruhig, aufgeräumt, viel Weißraum.

**Startseite** (erscheint bei jedem Öffnen und Neuladen, liegt über der Arbeitsseite): großes Logo, „IFC → LASER“, ein Satz zur App, Platz für ein Beispielbild und der Knopf **„Erstelle deine Laserdatei“**. Ein Klick irgendwo auf die Startseite (außer auf Sonne/Mond) blendet sie **sanft aus** (Fade 1,6 s mit leichter Unschärfe und Vergrößerung; bei „weniger Bewegung“ im System ohne Fade). Das Beispielbild erscheint automatisch, sobald die Datei `Bilder/beispiel.jpg` existiert.

**Arbeitsseite**: kleines Logo und Titel **„Erstelle deine Laserdatei“** in der Kopfzeile (seit 18.11., vorher „IFC → Laser“; die Startseite und der Browser-Tab heißen weiter „IFC → Laser“), darunter drei klar nummerierte Bereiche. Ab 1024 px Breite **zweigeteilt**: links (etwa ⅔) oben Bereich 1, unten Bereich 3; rechts (etwa ⅓) Bereich 2, der beim Scrollen stehen bleibt. Schmaler: untereinander 1 → 2 → 3.

1. **Datei ablegen**: Ablagefläche mit gestrichelter Linie für **eine oder mehrere IFC-Dateien** (je Datei ein Gebäude, auch mehrere auf einmal, höchstens 12). Sind Dateien da, wird die Fläche klein („Weitere IFC-Dateien hierher ziehen“), und darunter steht je Gebäude eine **Datei-Karte** (seit 18.11.): Datei-Symbol, bei mehreren „Gebäude 1 · …“, Name, Größe und Status, **✕ zum Entfernen** (nur dieses Gebäude), „Andere Datei wählen“ zum Austauschen; eine Datei auf eine Karte ziehen tauscht ebenfalls aus. Unpassende Dateien werden mit Hinweis in der Ablagefläche abgelehnt. In jeder Karte zum Aufklappen die **Bauteil-Liste** („Das steckt in der Datei“) mit Hinweisen und der Auswahl für nicht klassifizierte Morphs
2. **Einstellungen**: Maßstab (Zahlenfeld, Start 1:100), Dicke innen und Dicke außen (je eine Auswahl 1 / 1,5 / 2 mm, Start innen 2 mm, außen 1 mm), Plattengröße (Start 1000 × 600 mm), **Linienfarben** (Schneiden, Ritzen, Rahmen, Gravieren; voreingestellt nach den Werkstatt-Regeln). Ganz oben **Vorlagen** (seit 18.11.): eigene Einstellungen unter einem Namen speichern, wählen, überschreiben, löschen und als .json-Datei mitnehmen, nur im eigenen Browser. Die feste Vorlage **„Jade HS Standard“** setzt nur Plattengröße 1000 × 600 mm und Laserfarben zurück, Maßstab und Pappdicken bleiben (ersetzt den früheren Knopf „Auf Hochschul-Werte zurücksetzen“). Die Seite **merkt sich alle Einstellungen** im Browser (`localStorage`), nichts geht an einen Server. Darunter **„Menschen und Bäume“** (seit 18.11.): Anzahl Menschen (0–50) und Bäume (0–30), Baumhöhe (6/10/15 m), eigene Pappdicke (1/1,5/2 mm); Formen in `js/staffage.js`. Am Ende der Knopf **„Laserplatten erstellen“**; auf breiten Bildschirmen bleibt er unten in der Spalte immer sichtbar.
3. **Vorschau & Download**: Warnungen, **Modell-Vorschau „So wird dein Modell (3D)“** (seit 18.11.: die fertigen Pappteile in 3D zusammengesetzt, drehbar; `js/modell3d.js` + `js/betrachter.js`), Platten-Vorschau mit einem DXF-Knopf je Platte, „Alle DXF herunterladen“, „Übersichtsblatt drucken“. Ändert sich danach eine Einstellung, rechnet die App sofort neu.

Hell oder dunkel richtet sich **automatisch nach der Systemeinstellung** (`prefers-color-scheme`). Seit 18.11. gibt es zusätzlich einen **Knopf Sonne/Mond** (auf der Startseite oben rechts, auf der Arbeitsseite rechts in der Kopfzeile), der umschaltet und sich die Wahl im Browser merkt (`js/farbmodus.js`, Merkmal `data-theme` am `<html>`, Farben in `css/style.css`). Die Seite muss auch auf schmalen Bildschirmen funktionieren.

### Logo

- Datei: `Bilder/logo.svg` (Ordner mit **großem B** – auf GitHub Pages zählt die Schreibweise). Die Datei ist eine DIN-A4-Seite (2481 × 3508) mit eingebettetem Bild, keine echte Vektorgrafik. Die Website schneidet sie mit `viewBox="290 358 1899 2562"` auf das Logo zu (Stand: Logo vom 17.11., 15:37); die Datei selbst bleibt unverändert. **Wird das Logo neu exportiert, ändert sich meist seine Lage auf der Seite** – dann den Zuschnitt in `index.html` (2×) und das Seitenverhältnis in `css/style.css` (2×) anpassen. Die Lage steht in der SVG-Datei in der Zeile `<use … x=… y=… width=… height=…>`.
- Hintergrund durchsichtig, „HB“ ist aus der Hausform ausgespart. Darum passt das Logo ohne Änderung in hell und dunkel.

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
| Akzent (Buttons, Zahlen, aktiv) | `#CD6148` **Logo-Orange** (seit 18.11., aus `Bilder/logo.svg` gemessen; vorher `#FF6347` Tomato) | `#FF8C69` Salmon |
| Akzent Hover | `#D7765F` helleres Logo-Orange | `#FFA07A` Light Coral |
| Vorschau: Platte | `#FFF8F3` wie Seitenhintergrund, dünne Kante `#FFCC99` Sandy | `#1C1411` wie Seitenhintergrund, dünne Kante `#4A3129` |
| Vorschau: Linien | die eingestellten **Laserfarben** (siehe unten) | dieselben |

- Farben werden als CSS-Variablen auf `:root` festgelegt und für dunkel unter `@media (prefers-color-scheme: dark)` neu gesetzt.
- **Buttontext auf dem Akzent ist dunkel, nicht weiß:** hell `#1C110D` auf Logo-Orange, dunkel `#2B1A14` auf Salmon. Weiß wäre zu kontrastarm.

### Eigene Gestaltungsentscheidung (Kursaufgabe Tag 2)

**Die Vorschau zeigt jede Platte wie die echte Laserplatte:** eine Fläche in der Hintergrundfarbe der Seite (hell oder dunkel, geändert am 17.11., vorher Graupappe) mit einer dünnen Kante in der Linienfarbe, darauf der gelbe Rahmen und alle Linien in genau den Laserfarben, die auch in der DXF stehen (Rot schneiden, Blau ritzen, Gelb Rahmen, Schwarz gravieren). **Was man sieht, ist genau das, was der Laser macht.** Die App spricht damit die Sprache der Werkstatt, statt eigene Bildschirmfarben zu erfinden. Ändert jemand eine Linienfarbe in den Einstellungen, ändert sich die Vorschau sofort mit. Die Palette Tomato bis Papaya gilt sonst nur für die Bedienoberfläche drumherum. Hinweis: Im hellen Modus ist der gelbe Rahmen auf dem hellen Grund nur schwach zu sehen, darum zeigt die dünne Kante den Umriss der Platte.

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
- Lokal testen mit einem kleinen Server, weil WASM nicht über `file://` lädt. Die Vorschau in der Claude-App startet über `.claude/launch.json` im **äußeren** Ordner: `python3 -m http.server 8000 --directory Umgebungsanalyse-mit-Modellbau-Laserdatei`. Nach Code-Änderungen die Seite neu laden; der Browser hält alte Dateien manchmal im Zwischenspeicher.
- Bibliotheken (immer mit fester Version):
  - **Tailwind** für das Layout, über das CDN mit fester Version **3.4.16** (`https://cdn.tailwindcss.com/3.4.16`, kein Build-Schritt). Eigene Farben als Tailwind-Theme aus den CSS-Variablen oben.
  - **Google Fonts** nur für die Ersatzschrift „Didact Gothic“
  - **web-ifc 0.0.78**: liest IFC im Browser (WASM). Liegt im Projekt unter `lib/web-ifc/` (von der Nutzerin als npm-Paket heruntergeladen), wird also nicht aus dem Internet geladen. Läuft im einfachen Modus mit einem Prozessorkern (`Init(undefined, true)`). **Achtung:** `StreamMeshes` hat in 0.0.78 einen Fehler (falsche Anzahl Argumente), darum `StreamAllMeshes` und selbst filtern. Lizenz MPL-2.0, `LICENSE.md` muss im Ordner bleiben.
  - **three.js**: nicht eingebunden und nicht nötig. Die 3D-Vorschau nutzt **WebGL** direkt (im Browser eingebaut) über `js/betrachter.js` (von Svenja aus `zusatz-3d`, auf `main` unverändert übernommen – nur dort ändern und dann in beide Branches bringen, damit die Datei gleich bleibt).
  - Polygon-Vereinigung: **ohne Bibliothek**, selbst geschrieben in `js/abwickeln.js` (gegenläufige Kanten heben sich auf, übrig bleiben Umriss und Löcher).
  - **DXF wird selbst geschrieben** (ASCII, wenige Elementtypen), ohne Bibliothek

### Ordnerstruktur

```
index.html
css/style.css       – Farben, Bauteile, Druck-Layout des Übersichtsblatts
js/main.js          – Bedienung der Seite, Ablauf
js/einstellungen.js – Einstellungen und Laserfarben, Speichern im Browser
js/ifc-lesen.js     – IFC laden (web-ifc), Bauteil-Liste, Dreiecke der Gebäudehülle
js/abwickeln.js     – Außenflächen finden (Strahltest), flach legen, Löcher
js/schichten.js     – Ecken finden, Innen-/Außenschicht, Eckenausgleich, Nummern
js/verteilen.js     – Teile auf Platten verteilen, Nummern daneben
js/linienschrift.js – Nummern als Linien (zum Ritzen)
js/dxf.js           – DXF schreiben
js/wand3d.js        – drehbare 3D-Skizze einer Hausecke zum Wandaufbau (ohne Bibliothek)
js/modell3d.js      – Modell-Vorschau: fertige Pappteile wieder in 3D zusammensetzen
js/staffage.js      – Menschen (M-01 …) und Steckbäume (B-01A + B-01B …) als Laserteile, selbst gezeichnet
js/betrachter.js    – WebGL-Betrachter (von Zusatz 3D übernommen, unverändert)
js/farbmodus.js     – Knopf hell/dunkel (Sonne/Mond)
js/uebersicht.js    – Übersichtsblatt zum Drucken
js/druck3d.js       – ZUSATZ 3D (nur Branch zusatz-3d): 3D-Druck-Seite, Dateien, Einstellungen, Modell, STL-Knöpfe
js/betrachter.js    – ZUSATZ 3D: kleiner 3D-Betrachter ohne Bibliothek (Canvas)
js/stl.js           – ZUSATZ 3D: STL schreiben (binär)
lib/web-ifc/        – IFC-Bibliothek 0.0.78 (wird mit hochgeladen, siehe .gitignore „!lib/“)
Bilder/             – logo.svg, später beispiel.jpg (Beispielbild für die Startseite)
beispiele/          – Test-IFC-Dateien (werden NICHT hochgeladen, siehe .gitignore)
```

Datei- und Ordnernamen ohne Umlaute. Kommentare im Code auf Deutsch und einfach.

### Rechenweg (Plattenmodell)

**So ist es umgesetzt (Stand 17.11. abends)**, kurz vorweg, Einzelheiten in den Punkten darunter:

- **Geometrie:** web-ifc liefert Dreiecke in Meter, **y zeigt nach oben** (Norden = −z, Osten = +x). `COORDINATE_TO_ORIGIN` holt das Gebäude an den Nullpunkt. Archicad zerlegt mehrschichtige Wände in `IfcBuildingElementPart`; die Geometrie kommt dann aus diesen Teilen (über `IfcRelAggregates`).
- **Welche Bauteile:** Wände mit `IsExternal` = wahr oder ohne Angabe (Innenwände mit „falsch“ fallen weg), Dächer samt Dachflächen, nicht klassifizierte Bauteile (`IfcBuildingElementProxy`) je nach Auswahl: „Wand und Dach (ganzer Gebäudekörper)“, „Wand“, „Dach“, „Ignorieren“. Gibt es sonst keine Wände und kein Dach, ist „ganzer Gebäudekörper“ voreingestellt.
- **Flächen:** senkrechte Dreiecke (|ny| ≤ 0,25) → Fassade, nach oben zeigende (ny > 0,25) → Dach. Gruppiert nach Ebene (fast gleiche Richtung und gleicher Abstand oder direkt angrenzend, weil Morphs oft leicht verdreht sind). Außen ist eine Gruppe, wenn mehr als die Hälfte ihrer Fläche beim Strahltest ins Freie sieht. Flächen unter 0,02 m² fallen weg.
- **Ecken der Fassaden:** über den Grundriss (Schnittpunkt der Fassadenlinien, höchstens 30 cm vom Ende entfernt); beide Fassaden werden genau auf den Schnittpunkt gesetzt. **Ecken am Dach** (First, Grat, Kehle): gemeinsame Kanten, 3 cm Toleranz.
- **Kürzung:** x = (e + d · cos φ) / sin φ, mit φ = Innenwinkel des Gebäudes, d = Tiefe der Plattenvorderseite, e = Tiefe der Nachbarfläche, bis zu der die Platte reicht. Außenecke: die durchlaufende Platte hat das kleine e, Innenecke umgekehrt. Durchlaufend/gekürzt abwechselnd ab der größten Fläche.
- **Aufräumen der Umrisse:** Flächen kleiner als 0,2 m² oder schmaler als 5 cm fallen weg (z. B. Ränder von Fensterlaibungen). Kleine Stufen unter 30 cm im Fassadenumriss werden geglättet (z. B. vom Dach eingeschnittene Giebelecken). Bei der Innenschicht werden Aussparungen am unteren Rand (Türen bis zum Boden) geschlossen.
- **Dachplatten** haben die **Pappdicke innen**. **Wand–Dach-Anschluss** ist vereinfacht: Wände so hoch wie in der IFC, das Dach liegt auf (bei 1:100 etwa 1 mm Abweichung, steht in PLAN.md).

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
9. **Verteilen**: Standard-Platte 1000 × 600 mm (einstellbar). Die Teile kommen als Rechteck-Hüllen in Reihen auf die Platte („Regal-Verfahren“), groß zuerst. Abstand zwischen den Teilen mindestens 3 mm **plus Platz für die Nummer**, **mindestens 10 mm Abstand zum gelben Rahmen** (Werkstatt-Regel, im Code zentral als `RAND_ABSTAND` in `js/dxf.js`). Teile, die größer als die Platte sind, lösen eine Warnung aus und werden nicht stumm verkleinert.
10. **Pappdicken und Platten** (seit 18.11.): Teile verschiedener Pappdicke kommen nie auf dieselbe Platte (`verteilen` in `js/verteilen.js` gruppiert nach `dicke`). Jede Platte hat `dicke`; sie steht in der Überschrift, im DXF-Namen und in der Teileliste. Dach = Pappdicke innen, Menschen und Bäume = eigene Pappdicke.
11. **Nummern**: Schema `Schicht-Zahl` (geändert am 17.11., vorher `N-001-A`): `A-001` = Außenschicht, `I-001` = Innenschicht derselben Fassade, `D-001` = Dachfläche. Gleiche Zahl bei A und I = gleiche Fassade. **Bei mehreren Gebäuden** steht die Gebäude-Nummer davor: `2-A-001` = Gebäude 2 (Reihenfolge der Karten; beim Entfernen rücken die Nummern nach). Alle Teile aller Gebäude teilen sich die Platten; das Übersichtsblatt hat je Gebäude einen Grundriss und eine Klebe-Reihenfolge. Die Himmelsrichtung steht nur noch in der Teileliste des Übersichtsblatts. Fassaden werden im Uhrzeigersinn ab Norden durchnummeriert, die Dachflächen getrennt ab `D-001`. Norden ist zurzeit der Projekt-Norden der IFC („TrueNorth“ noch nicht gelesen, Should 4). Die Zahl ist die Reihenfolge beim Kleben. Die Nummer steht **neben** dem Teil auf der Restpappe, nie innerhalb der Kontur, und wird **geritzt** (Ebene `RITZEN`, blau). Das Schema ist an einer Stelle im Code zentral änderbar (`teileBauen` in `js/schichten.js`). In der Linienschrift bekommt das `I` Querstriche oben und unten, damit man es nicht mit einer `1` verwechselt.

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
- **Gelber Rahmen in Plattengröße (1000 × 600 mm) muss immer drin sein**, als geschlossene Linie auf der Ebene `RAHMEN`. Alle Teile mindestens **10 mm** vom Rahmen entfernt (geändert am 17.11., vorher 5 mm), sonst werden sie evtl. nicht vollständig ausgeschnitten.
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
  - Vorhanden in `beispiele/`: „Test 01 - wand und dach .ifc“ (6 Außenwände in Schichten, Walmdach über L-Grundriss), „Test 02 - Morph .ifc“ (ein nicht klassifizierter Morph als ganzes Gebäude) und „Test 03 - wand, satteldach türen und fenster.ifc“ (Satteldach mit Giebelwänden, 6 Fenster, 1 Tür bis zum Boden). Alle IFC4, Reference View, aus Archicad.
  - Noch nötig: eine Datei mit einem **als Wand/Dach klassifizierten Morph**.
- Die DXF lässt sich im Browser prüfen, ohne sie herunterzuladen: `platteAlsDxf()` aufrufen und Ebenen, Farben, Randabstand und „NaN“ kontrollieren.

### Export aus Archicad (Hinweise für die Nutzerin)

- Außenwände müssen als **„Außen“** markiert sein (Wand-Einstellungen → Position). Sonst fehlt `IsExternal` in der IFC.
- **Morphs** vor dem Export als **Wand** oder **Dach** klassifizieren (Klassifizierung und Eigenschaften), bei Wand-Morphs zusätzlich `IsExternal` setzen.
- Diese Hinweise kommen auch kurz in die App, neben die Ablagefläche.
