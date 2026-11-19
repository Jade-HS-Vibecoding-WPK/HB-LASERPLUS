# Plakat „HB LASER“ – Texte zum Einsetzen in die Vorlage (A0)

Feld für Feld in der Reihenfolge der Vorlage. Text in [eckigen Klammern] ist ein Hinweis für euch, nicht fürs Plakat.
Alles ist ein Entwurf: kürzen, umformulieren, eigene Worte nehmen.

---

## Kopf

**Titel:** HB LASER

**Untertitel:**
Ein Tool, das **Laserdateien** für **Studierende** macht, weil der Weg vom BIM-Modell zum Pappmodell nicht Stunden an CAD-Nacharbeit kosten sollte.

**Von** Svenja Behrends und Alison Hausfeld

---

## Hauptbild

[Bildschirmfoto: Bereich 3 der App mit „So wird dein Modell (3D)“ und einer Laserplatte darunter – mit einer echten IFC. Machen wir zusammen, wenn Svenja mit main fertig ist.]

Bildunterschrift (optional):
Aus einer IFC-Datei werden fertige Laserplatten – und die App zeigt vorher, wie das geklebte Modell aussieht.

---

## Freie Fläche für Darstellungen (oben rechts)

**Vom Modell zur Laserplatte**

IFC aus Archicad
→ Außenwände und Dach finden
→ jede Fassade flach legen (Ansicht von außen)
→ Außen- und Innenschicht, Ecken ausgleichen
→ Teile auf Platten verteilen, Nummern daneben ritzen
→ DXF je Platte + Übersichtsblatt

[Als kleines Ablaufdiagramm mit Pfeilen zeichnen, oder ein Bildschirmfoto vom Wandaufbau-Bild (Ansicht, Schnitt, 3D-Ecke).]

---

## Freie Fläche (unten rechts)

**So stoßen die Ecken aneinander**

Eine Wand läuft durch, die andere ist um die Pappdicke(n) gekürzt – so stimmt das Außenmaß.
Bei 1 mm außen und 2 mm innen: Außenschicht 100 mm, Innenschicht 98 mm, gekürzte Wand außen 78 mm, innen 74 mm (Beispielhaus 10 × 8 m, 1:100).

[Dazu ein Bildschirmfoto der Ecken-Detailskizze aus dem Übersichtsblatt.]

---

## Welchen Teil machen wir und was übernimmt die KI?
*Was passiert dabei mit uns als Planenden?*

[Diese Antwort solltet ihr selbst schreiben – das ist eure Haltung. Stichpunkte zum Weiterdenken:]

- **Wir** bringen die Idee, das Werkstatt-Wissen (Pappdicken, Laserregeln, wie man klebt), die Gestaltung und die Entscheidungen mit – und wir testen mit echten Modellen.
- **Die KI** programmiert, rechnet (Abwicklung, Eckenausgleich) und sucht Fehler.
- **Mit uns als Planenden:** Wir arbeiten weniger als Zeichnerinnen und mehr wie Bauherrin und Bauleitung: beschreiben, prüfen, entscheiden. Wir müssen sehr genau wissen, *was* wir wollen – und merken, wo die KI etwas nicht weiß (z. B. dass eine Laserplatte nur eine Pappdicke hat).

---

## 01 Das Problem

Wer hat das Problem? Architekturstudierende, die Modelle lasern.
Was nervt? Aus dem 3D-Modell jede Fassade einzeln abzuzeichnen, Ecken und Pappdicken auszurechnen und alles nach den Werkstatt-Regeln aufzubereiten.
Bisher macht man das so: Ansichten exportieren, in CAD nachzeichnen, von Hand auf Platten verteilen.

## 02 Unsere Lösung

Unser Tool macht aus einer IFC-Datei fertige DXF-Laserplatten, indem es Außenwände und Dach findet, flach legt und auf Platten verteilt.
Das bringt Studierenden: Zeit und weniger Fehler beim Lasertermin.
Das Besondere: Eckenausgleich je Pappdicke, nummerierte Teile mit Klebeanleitung – und die Datei verlässt nie den Rechner.

## 03 So geht's

1. IFC aus Archicad ablegen
2. Maßstab, Pappdicken und Wandaufbau wählen
3. DXF je Platte + Übersichtsblatt herunterladen

Läuft als Web-App im Browser

## 04 Unser MVP

[Abhaken, was bei euch läuft – Stand vor dem Freeze prüfen.]

Must: IFC einlesen, Fassaden und Dach flach legen, zwei Schichten, Eckenausgleich, DXF nach Werkstatt-Regeln, Übersichtsblatt, veröffentlicht
Should: 3D-Vorschau, Auswahl für Morphs, Warnung bei dünnen Stegen, echte Nordrichtung
Could: Stecksystem, weniger Verschnitt, alle Platten als ZIP
Dazugekommen: Wandaufbau wählbar, eigene Vorlagen, Menschen und Bäume, mehrere Gebäude

## 05 Daten & APIs

Wir holen Daten von eurer eigenen IFC-Datei – gelesen direkt im Browser, ohne Server.
Damit zeigen wir die Laserplatten und das fertige Modell in 3D.
Lizenz: web-ifc (MPL-2.0), Tailwind (MIT), Schrift Didact Gothic (SIL OFL)
API-Key? nein

## 06 Gestaltung

Unsere bewusste Entscheidung: Die Vorschau zeigt jede Platte wie die echte Laserplatte – in genau den Laserfarben der Werkstatt (Rot schneiden, Blau ritzen, Gelb Rahmen). Was man sieht, macht der Laser.
Farben aus unserem Logo (Orange bis Papaya), Schrift Century Gothic.
Stil-Prompt: „ruhig, aufgeräumt, viel Weißraum“

## 07 Hindernisse

[Eins auswählen – alle sind diese Woche wirklich passiert.]

Die KI hing fest bei einem Fehler in der IFC-Bibliothek (eine Funktion bekam falsche Angaben).
Rausgekommen sind wir durch eine andere Funktion der Bibliothek und eigenes Filtern.

– oder –

Teile mit verschiedener Pappdicke landeten auf derselben Laserplatte. Uns ist das beim Prüfen aufgefallen – danach bekommt jede Pappdicke ihre eigenen Platten.

– oder –

Merge-Konflikte zwischen unseren Branches (Basis, 3D-Druck, VR).
Rausgekommen sind wir, indem wir beide Fassungen behalten und sauber zusammengeführt haben.

## 08 Bester Prompt

[Das müsst ihr entscheiden. Ein Vorschlag:]

„Wenn wir bei der zwei Schicht Option unterschiedliche Plattenstärken haben, müssen die Platten ja unterschiedlich sortiert werden … auf eine Platte dürfen dann nur z. B. die Außenteile.“
Warum er gut war: konkretes Wissen aus der Werkstatt, das die KI nicht hatte – klein, klar und mit Beispiel.

---

## Ausprobieren

[Link zur App: GitHub-Pages-Link, sobald veröffentlicht – daraus auch den QR-Code machen]
Code: github.com/Jade-HS-Vibecoding-WPK/[Repo-Name – bitte auf GitHub nachsehen, er wurde umbenannt]

## Quellen & KI-Nutzung

Daten: eigene IFC-Modelle aus Archicad
Bilder: Logo und Bildschirmfotos von uns
KI: Claude (Claude Code, Modell Claude Opus 5.5) – Programmieren, Texte, Erklärungen – 16.–20.11.2026
