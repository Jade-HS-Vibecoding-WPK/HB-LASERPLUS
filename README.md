# IFC → Laser

Eine Webseite, die aus der **IFC-Datei eines einzelnen Gebäudes** fertige **Laserdateien (DXF)** für ein **Pappmodell** macht.

- Jede Fassade wird eine flache Platte, so wie man sie von außen sieht, das Dach ebenso.
- Jede Wand bekommt **zwei Schichten**: eine geschlossene Innenschicht und eine Außenschicht mit ausgeschnittenen Fenstern und Türen.
- An den Ecken überlappen die Platten. Die App kürzt sie um die Pappdicken, damit die Außenmaße stimmen, auch bei schrägen Ecken und am First.
- Die Teile werden auf Laserplatten (Standard 1000 × 600 mm) verteilt. Neben jedes Teil wird seine Nummer geritzt, z. B. `N-001-A` (Fassade Nord, außen).
- Dazu gibt es ein **Übersichtsblatt** zum Ausdrucken: Grundriss mit Nummern, Teileliste und Reihenfolge beim Kleben.

Entstanden im WPK Vibecoding an der Jade Hochschule, 2026.

## So benutzt du die App

1. **IFC-Datei ablegen** (z. B. aus Archicad). Die App zeigt, was in der Datei steckt.
2. **Einstellungen** prüfen: Maßstab, Pappdicke innen und außen (1 / 1,5 / 2 mm), Plattengröße, Linienfarben.
3. **„Laserplatten erstellen“** klicken. Die Platten erscheinen in der Vorschau.
4. **DXF herunterladen** (eine Datei pro Platte) und das **Übersichtsblatt drucken**.

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
