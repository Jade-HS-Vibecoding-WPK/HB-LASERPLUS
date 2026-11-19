# HB-LASERPLUS

Eine Webseite, die aus der **IFC-Datei eines Gebäudes** fertige **Laserdateien (DXF)** für ein **Pappmodell** macht – auch für **mehrere Gebäude** auf einmal (je Datei ein Gebäude).

- Jede Fassade wird eine flache Platte, so wie man sie von außen sieht, das Dach ebenso.
- Jede Wand bekommt **zwei Schichten**: eine geschlossene Innenschicht und eine Außenschicht mit ausgeschnittenen Fenstern und Türen.
- An den Ecken überlappen die Platten. Die App kürzt sie um die Pappdicken, damit die Außenmaße stimmen, auch bei schrägen Ecken und am First.
- Die Teile werden auf Laserplatten (Standard 1000 × 600 mm) verteilt. Neben jedes Teil wird seine Nummer geritzt: `A-001` = Außenschicht, `I-001` = Innenschicht derselben Fassade, `D-001` = Dachfläche. Bei mehreren Gebäuden steht die Gebäude-Nummer davor, z. B. `2-A-001`.
- Dazu gibt es ein **Übersichtsblatt** zum Ausdrucken: Legende der Nummern, Grundriss mit Nummern, Teileliste und Reihenfolge beim Kleben. **Speichere oder drucke es** – nur darauf steht, wie geklebt wird.

Entstanden im WPK Vibecoding an der Jade Hochschule, 2026.

## So benutzt du die App

1. Auf der Startseite **„Erstelle deine Laserdatei“** klicken.
2. **Eine oder mehrere IFC-Dateien ablegen** (links oben, z. B. aus Archicad). Jede Datei bekommt eine Karte: Dort steht, was in ihr steckt, und mit ✕ nimmst du sie wieder heraus.
3. **Einstellungen** prüfen (rechts): Maßstab, Pappdicke innen und außen (1 / 1,5 / 2 mm), Plattengröße, Linienfarben.
4. **„Laserplatten erstellen“** klicken (unter den Einstellungen). Die Platten erscheinen links unten in der Vorschau.
5. **DXF herunterladen** (eine Datei pro Platte) und das **Übersichtsblatt drucken oder als PDF speichern**.

**Deine IFC-Datei bleibt auf deinem Rechner.** Alles wird im Browser gerechnet, nichts wird hochgeladen.

### Tipps für den Export aus Archicad

- Außenwände als **„Außen“** markieren (Wand-Einstellungen → Position).
- **Morphs** als **Wand** oder **Dach** klassifizieren. Nicht klassifizierte Morphs kannst du auch in der App festlegen.

## Laser-Regeln (Werkstatt der Hochschule)

DXF in mm mit eingerechnetem Maßstab, nur Linienzüge, Ebenen mit RGB-Farben: Rot = schneiden, Blau = ritzen (Nummern), Gelb = Rahmen in Plattengröße, Schwarz = gravieren. Linienstärke 0,00 mm, alle Teile mindestens 10 mm vom Rahmen entfernt. Die Farben sind in der App einstellbar.

## Lokal starten

Die Seite braucht einen kleinen Server, weil der IFC-Leser (WebAssembly) nicht direkt aus einer Datei startet:

```bash
python3 -m http.server 8000
```

im Projektordner ausführen, dann `http://localhost:8000` im Browser öffnen.

## Technik

- Statische Webseite ohne Build-Schritt: HTML, CSS, JavaScript-Module.
- [web-ifc](https://github.com/ThatOpen/engine_web-ifc) 0.0.78 liest die IFC im Browser. Liegt im Projekt unter `lib/web-ifc/` (Lizenz MPL-2.0, siehe `lib/web-ifc/LICENSE.md`).
- Tailwind 3.4.16 (CDN) für das Layout, Schrift „Didact Gothic“ von Google Fonts als Ersatz für Century Gothic. Beim Laden der Schrift sieht Google die IP-Adresse.
- Abwickeln, Eckenausgleich, Verteilen, Linienschrift und DXF sind selbst geschrieben (Ordner `js/`).

Mehr Details: [CLAUDE.md](CLAUDE.md) (Regeln und Technik) und [PLAN.md](PLAN.md) (Fahrplan und aktueller Stand).
