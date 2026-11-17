# PLAN – Von der IFC-Datei zum Pappmodell

> Stand: Dienstag, 17.11.2026 · WPK Vibecoding (Werkstatt-Regeln, Archicad-Import, Gestaltungsentscheidung ergänzt)
> Das ist unser gemeinsamer Fahrplan für die Kurswoche. Wenn sich etwas ändert, ändern wir es hier.

---

## Die Idee in einem Satz

Du ziehst die **.ifc-Datei** deines Gebäudes in eine Webseite und bekommst **fertige Laserdateien für ein Pappmodell**: jede Fassade als eigene Platte, Fenster und Türen ausgeschnitten, alle Teile nummeriert, dazu eine Klebeanleitung.

---

## So funktioniert die App, in einfachen Worten

1. **Datei ablegen:** Du ziehst die IFC-Datei ins Browserfenster. Die Datei wird nirgends hochgeladen und bleibt auf deinem Rechner.
2. **Einstellen:** Maßstab, Pappdicke innen, Pappdicke außen, Größe der Laserplatte und die Linienfarben für den Laser. Die Seite merkt sich deine Einstellungen.
3. **Die App rechnet:**
   - Sie findet die Außenwände und das Dach.
   - Sie legt jede Fassadenseite flach hin, so wie man sie von außen sieht.
   - Sie macht pro Wand zwei Pappen: eine **Innenschicht** ohne Löcher und eine **Außenschicht** mit ausgeschnittenen Fenstern und Türen.
   - Sie kürzt die Wände an den Ecken so, dass sie überlappend zusammenpassen.
   - Sie verteilt alle Teile auf Laserplatten.
   - Sie schreibt die Nummer jedes Teils **daneben** auf die Restpappe.
4. **Prüfen und herunterladen:** Du siehst eine Vorschau der Platten. Danach lädst du die DXF-Dateien herunter (eine pro Platte) und druckst das Übersichtsblatt aus.
5. **Lasern und kleben:** Zuerst die Innenschichten zu einem Kasten kleben, dann die Fassaden darauf, zum Schluss das Dach.

So sieht eine Ecke von oben aus:

```
████████████████████   ← Außenschicht Wand A (läuft an der Ecke durch)
██▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   ← Innenschicht Wand A
██▓▓
██▓▓   ← Wand B: Außenschicht █ und Innenschicht ▓,
██▓▓      jeweils um die Pappdicken kürzer
```

Das Außenmaß des Modells bleibt genau richtig. Die App rechnet die Kürzungen selbst aus.

---

## Entscheidungen aus dem Interview

| Thema | Entscheidung |
|---|---|
| Modell | Ein einzelnes Gebäude, detailliert |
| Zerlegung | Plattenmodell: das Dach und jede Außenwand (Fassadenseite) als eigene Pappe |
| Wandaufbau | 2 Schichten: Innenschicht geschlossen und tragend, Außenschicht mit ausgeschnittenen Fenstern und Türen, aufgeklebt |
| Dach | 1 Schicht |
| Weitere Teile | Keine, also keine Bodenplatte, keine Geschossdecken und keine Innenwände |
| Formen | Gerade Wände, schräge Winkel und Steildach. Runde Wände kommen erst später |
| Ecken | Überlappend: Eine Wand läuft durch, die andere ist um die Pappdicke kürzer. Das gilt für rechte **und** schräge Winkel. Am First überlappt eine Dachplatte die andere |
| Verbindung | Kleben ist Pflicht, ein Stecksystem kommt als Extra dazu |
| Maßstab | Frei einstellbar (Vorschlag zum Start: 1:100) |
| Material | Dicke innen und außen getrennt wählbar: **1 mm, 1,5 mm oder 2 mm** (Vorschlag zum Start: innen 2 mm, außen 1 mm) |
| Laserplatte | **1000 × 600 mm** |
| Dateiformat | **DXF reicht** (die Werkstatt nimmt DXF oder DWG). DWG nur als Anleitung zum Umwandeln |
| Laser-Regeln | Von der Werkstatt (17.11.): RGB-Farben Rot = schneiden, Blau = ritzen, Gelb = Rahmen, Schwarz = gravieren. Linienstärke 0,00 mm. **Gelber Rahmen 1000 × 600 mm immer in der Datei**, alle Teile **mind. 5 mm** vom Rahmen. Sonst verfällt der Lasertermin |
| Linienfarben | In der App **einstellbar**, voreingestellt mit den Werten der Hochschule |
| Nummern | Zum Beispiel „N-001-A“ (außen) und „N-001-I“ (innen), **geritzt (blau)** **neben** dem Teil auf der Restpappe, nie auf dem Teil |
| Import | IFC aus **Archicad**. Wände, Dächer und **Morphs**, die als Wand oder Dach klassifiziert sind |
| Lage in der Datei | Jedes Teil liegt so, wie man es von außen sieht (Außenseite nach oben) |
| Anleitung | Nummern und ein Übersichtsblatt: Grundriss, welches Teil wohin gehört, Reihenfolge beim Kleben |
| App | Webseite im Browser, veröffentlicht unter einem Link |
| Aussehen | Hell oder dunkel automatisch nach Systemeinstellung, Farbpalette von Tomate bis Papaya, Schrift Century Gothic (Ersatz: „Didact Gothic“ von Google Fonts), Layout mit **Tailwind** |
| Eigene Gestaltungsentscheidung | Die Vorschau zeigt jede Platte **wie die echte Laserplatte**: Graupappe-Fläche, gelber Rahmen, Linien in den echten Laserfarben. Was man sieht, macht der Laser |

---

## Must / Should / Could

- **Must:** Muss bis Donnerstag 12 Uhr laufen. Ohne diese Punkte funktioniert die Idee nicht.
- **Should:** Sollte dabei sein. Kommt direkt nach den Must-Punkten.
- **Could:** Schön, wenn Zeit bleibt. Wird nur gebaut, wenn alles andere läuft.

### Must

1. **Webseite**, die im Browser läuft. Die IFC-Datei kommt per Ziehen und Ablegen hinein und bleibt auf dem Rechner.
2. **Außenwände und Dach** werden in der IFC-Datei erkannt, auch **Morphs aus Archicad**, die als Wand oder Dach klassifiziert sind.
3. **Jede Fassadenseite** wird als eine flache Platte ausgegeben, so wie man sie von außen sieht. Das gilt für gerade und schräge Wände, Flachdächer und Steildächer.
4. **Zwei Schichten pro Wand:** Die Innenschicht ist geschlossen, in die Außenschicht sind Fenster und Türen geschnitten. Das Dach hat eine Schicht.
5. **Einstellungen:** Maßstab (frei), Dicke innen und Dicke außen (jeweils zur Auswahl: 1 mm, 1,5 mm oder 2 mm), Plattengröße (Start: 1000 × 600 mm), **Linienfarben** (voreingestellt mit den Hochschul-Werten, zurücksetzbar). Die Seite **merkt sich alle Einstellungen** für das nächste Mal.
6. **Ecken** werden überlappend ausgeglichen, bei rechten **und** bei schrägen Winkeln.
7. **Steildach-Anschlüsse:** Am First überlappt eine Dachplatte die andere, und die Giebelwände sind oben passend abgeschrägt.
8. **Verteilen:** Alle Teile werden mit Abstand auf Laserplatten gelegt, **mindestens 5 mm vom Rahmen entfernt**. Ist ein Teil zu groß für die Platte, gibt es eine Warnung.
9. **Nummern** wie N-001-A (außen) und N-001-I (innen) werden neben jedes Teil **geritzt** (blau), nicht auf das Teil.
10. **DXF-Download** in Millimetern, eine Datei pro Platte, nach den **Werkstatt-Regeln**: RGB-Farben, Linienstärke 0,00 mm, **gelber Rahmen in Plattengröße**, Schneiden, Ritzen und Rahmen auf getrennten Ebenen.
11. **Übersichtsblatt zum Ausdrucken:** Grundriss mit den Nummern, Hinweis, welches Teil wohin gehört, und die Reihenfolge beim Kleben.
12. **Vorschau** der Laserplatten in der App, bevor man herunterlädt, **wie die echte Laserplatte** (eigene Gestaltungsentscheidung).
13. **Aussehen:** Farbpalette, Century Gothic mit Google-Fonts-Ersatz, Tailwind, hell und dunkel nach Systemeinstellung.
14. **Veröffentlicht** unter einem Link, am Donnerstag bis 12 Uhr.

### Should

1. **3D-Vorschau** des Gebäudes in der App, damit man sieht, ob die Datei richtig gelesen wurde.
2. **Warnungen** bei zu dünnen Pappstegen zwischen Fenstern (die brechen leicht) und bei sehr kleinen Teilen.
3. **DWG:** Eine kurze Anleitung, wie man die DXF mit einem kostenlosen Umwandler (ODA File Converter) in eine DWG verwandelt.
4. **Himmelsrichtung:** Die Buchstaben (N, O, S, W) werden aus der echten Nordrichtung in der IFC-Datei berechnet.
5. **Nicht klassifizierte Morphs:** Die App zeigt sie an, und du sagst per Klick: „Das ist eine Wand“, „Das ist ein Dach“ oder „ignorieren“.
6. **Archicad-Hinweise** in der App neben der Ablagefläche (Außenwände als „Außen“ markieren, Morphs klassifizieren).

### Could

1. **Stecksystem:** Zinken (kleine Zacken wie bei einer Holzkiste) an den Ecken der Innenschicht. Die Fassade verdeckt sie später.
2. **DWG direkt** aus der App, ganz ohne Umwandler.
3. **Alle Platten auf einmal** als ZIP-Datei herunterladen.
4. **Weniger Verschnitt:** Die Teile werden noch dichter auf die Platte gelegt.
5. **Schnittbreite ausgleichen:** Der Laser brennt etwa 0,1–0,2 mm weg. Die App kann das einrechnen.
6. **Linie auf Linie:** Teile teilen sich eine Schnittkante (laut Werkstatt erlaubt). Das spart Pappe und Laserzeit. Die gemeinsame Kante steht nur einmal in der Datei.

### Nicht diese Woche (bewusst später)

- Runde Wände (dein „2. Schritt“)
- Innenwände, Geschossdecken, Bodenplatte
- Umgebungsmodell mit mehreren Gebäuden, Gelände

---

## Etappen pro Kurstag

### Montag, 16.11.: Plan ✅

- Interview geführt, PLAN.md und CLAUDE.md angelegt
- **Deine Aufgabe:**
  - Eine Test-IFC-Datei exportieren (zum Beispiel aus Archicad, Revit oder Vectorworks) und in den Projektordner legen
  - In der Laserwerkstatt die offenen Punkte unten klären
- **Fertig, wenn:** Der Plan steht und die offenen Fragen sind notiert.

### Dienstag, 17.11.: Grundgerüst und Aussehen

- Werkstatt-Regeln, Archicad-Import und Gestaltungsentscheidung in PLAN.md und CLAUDE.md eintragen ✅
- Die Webseite anlegen: eine Seite mit drei Bereichen (1 Datei ablegen, 2 Einstellungen, 3 Vorschau und Download)
- Das Aussehen umsetzen mit Tailwind: Farben, Schrift (Century Gothic, Ersatz von Google Fonts), hell und dunkel
- Die Felder für die Einstellungen bauen (Maßstab, Dicken, Plattengröße, Linienfarben) und im Browser speichern
- Die Vorschau als echte Laserplatte zeichnen (Graupappe, gelber Rahmen, Laserfarben)
- Eine Vorschau in der Claude-App einrichten, damit du jede Änderung sofort siehst
- Den DXF-Download mit einem **selbst ausgedachten Testhaus** ausprobieren, noch ohne IFC: ein Haus mit Satteldach und einer schrägen Ecke. So prüfen wir den Eckenausgleich und den First, bevor echte Daten kommen.
- Die Test-DXF hält die Werkstatt-Regeln ein: gelber Rahmen, 5 mm Randabstand, RGB-Farben, Linienstärke 0,00 mm
- Die Nummern als Linienschrift umsetzen, damit jeder Laser sie ritzen kann
- Die README an die neue Idee anpassen
- **Deine Aufgabe:** Das Aussehen prüfen und sagen, was dir gefällt und was nicht. Die Test-DXF in AutoCAD, Rhino oder der Lasersoftware öffnen.
- **Fertig, wenn:** Die Seite sieht in hell und dunkel so aus wie geplant, und die Test-DXF lässt sich herunterladen und sauber öffnen.

### Mittwoch, 18.11.: Echte Daten

- Die IFC-Datei einlesen, Außenwände und Dach finden
- Die Fassaden flach legen, Fenster und Türen als Löcher erkennen
- Innen- und Außenschicht erzeugen, die Ecken ausgleichen (auch bei schrägen Winkeln), den Anschluss am First bauen
- Die Teile auf Platten verteilen, die Nummern daneben setzen
- Das Übersichtsblatt bauen
- Mit deiner IFC und einer frei verfügbaren Beispieldatei testen (zum Beispiel dem „FZK-Haus“ des KIT, einem kleinen Haus mit Satteldach)
- Am Abend gibt es ein Zwischenfazit: Laufen alle Must-Punkte? Dann geht es an die Should-Punkte.
- **Deine Aufgabe:** Ein paar Maße in der Vorschau nachmessen und mit deinem Plan vergleichen. Wenn die Werkstatt offen hat: eine kleine Platte probelasern.
- **Fertig, wenn:** Aus deiner IFC-Datei entsteht eine DXF, deren Teile maßlich stimmen.

### Donnerstag, 19.11.: Veröffentlichen (Freeze um 12:00)

- **Bis 12:00:** Fehler beheben, die letzten Should-Punkte, Texte in der App
- **12:00 Freeze:** Ab jetzt gibt es keine neuen Funktionen mehr, nur noch Fehlerbehebung. Neue Ideen kommen auf den Ideen-Parkplatz.
- Veröffentlichen über GitHub Pages: Die App bekommt einen Link, den jede und jeder öffnen kann.
- Den Link auf einem anderen Rechner testen
- **Deine Aufgabe:** Ein echtes Modell oder zumindest eine Fassade lasern und kleben, damit du am Freitag etwas zeigen kannst. Fotos machen.
- **Fertig, wenn:** Der Link funktioniert öffentlich, und es gibt ein gelasertes Pappteil.

### Freitag, 20.11.: Präsentieren

- Ablauf der Präsentation:
  1. Die Idee
  2. Live-Vorführung: IFC hinein, DXF heraus
  3. Das gelaserte Modell zeigen
  4. Was als Nächstes kommt (runde Wände, Stecksystem …)
- **Notfallplan:** Bildschirmfotos oder ein kurzes Video der Vorführung und eine schon heruntergeladene DXF bereithalten, falls das Internet streikt
- Am Code wird nichts mehr geändert.

---

## Offene Punkte, bitte klären

- [x] **Laserfläche:** 1000 × 600 mm
- [x] **Werkstatt-Farben:** Rot (255) = schneiden, Blau (255) = ritzen, Gelb (255) = Rahmen, Schwarz = gravieren, Linienstärke 0,00 mm. Die Nummern werden geritzt.
- [x] **Werkstatt-Format:** DXF reicht. Gelber Rahmen 1000 × 600 mm immer drin, 5 mm Abstand zum Rahmen.
- [ ] **Test-IFC aus Archicad:** am besten mit mindestens einer Wand **und** einem Morph (als Wand oder Dach klassifiziert), in den Projektordner legen. Vorher prüfen, ob die Außenwände als „Außen“ markiert sind.
- [ ] **Morphs testen:** Ob klassifizierte Morphs wirklich sauber ankommen, zeigt erst die Test-IFC. Das Ergebnis tragen wir hier ein.
- [x] **Nummernschema:** Der Buchstabe ist die Himmelsrichtung der Fassade (N, O, S, W, Dach = D), die Zahl ist die Reihenfolge beim Kleben, die Endung zeigt die Schicht (-A = außen, -I = innen). Beispiel: N-001-A und N-001-I.
- [ ] **Tipp fürs Übersichtsblatt:** Weil die Nummer nur auf der Restpappe steht, sollte man jedes Teil direkt nach dem Herausnehmen auf der Rückseite mit Bleistift beschriften.
- [ ] **GitHub Pages:** Wer darf im Repository „Jade-HS-Vibecoding-WPK“ die Veröffentlichung einschalten? Eventuell die Kursleitung fragen.
- [ ] **README:** Dort stehen noch „Umgebungsmodelle“. Wir passen das am Dienstag an.

---

## Ideen-Parkplatz

Hier landen Ideen, die während der Woche auftauchen. Sie werden nicht sofort gebaut, sondern erst, wenn Zeit ist.

- …

---

## Kleines Wörterbuch

| Wort | Bedeutung |
|---|---|
| **IFC** | Offenes Austauschformat für Gebäudemodelle (BIM). Archicad, Revit und Vectorworks können es exportieren. |
| **DXF** | Offenes Zeichnungsformat. AutoCAD, Rhino und Lasersoftware öffnen es. |
| **DWG** | Das Zeichnungsformat von AutoCAD. Es ist geschlossen und darum schwer selbst zu erzeugen. |
| **Morph** | Frei geformter Körper in Archicad. Ohne Klassifizierung wird er in der IFC zum „Proxy“, also zu einem Platzhalter-Bauteil ohne feste Art. |
| **RGB** | Farbangabe aus Rot, Grün und Blau, jeweils 0 bis 255. „Rot 255“ heißt reines Rot (255, 0, 0). |
| **Tailwind** | Ein Baukasten für das Layout von Webseiten, wie ein Raster- und Stilvorlagen-Katalog. |
| **Google Fonts** | Freie Schriften von Google, die die Webseite aus dem Internet lädt. |
| **Ebene / Layer** | Wie Folien in CAD: Schnittlinien liegen auf einer Ebene, Gravuren auf einer anderen. |
| **Abwickeln** | Eine Fläche aus dem 3D-Modell flach hinlegen, so wie man eine Fassade als Ansicht zeichnet. |
| **Verteilen** | Teile möglichst platzsparend auf die Laserplatte legen. Das Fachwort dafür ist „Nesting“. |
| **GitHub** | Online-Speicher für Projekte. Über **GitHub Pages** wird daraus eine Webseite mit Link. |
| **Freeze** | „Einfrieren“: Ab diesem Zeitpunkt gibt es keine neuen Funktionen mehr, nur noch Reparaturen. |
| **Must / Should / Could** | Muss, sollte, könnte. Die Reihenfolge, in der gebaut wird. |
