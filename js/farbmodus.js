// =========================================================
// Hell / Dunkel umschalten
//
// Ohne Klick richtet sich die Seite nach der Systemeinstellung.
// Ein Klick auf Sonne/Mond schaltet um und merkt sich die Wahl
// im Browser (wie die Einstellungen, nichts geht an einen Server).
// Gesetzt wird das Merkmal data-theme="light" oder "dark" am
// <html>-Element; die Farben dazu stehen in css/style.css.
// Damit es beim Laden nicht kurz falsch aufblitzt, setzt ein
// kleines Skript oben in index.html den Wert schon ganz früh.
// =========================================================

const SPEICHER_NAME = "ifc-laser-farbmodus";
const wurzel = document.documentElement;
const systemDunkel = window.matchMedia("(prefers-color-scheme: dark)");

// Ist die Seite gerade dunkel?
function istDunkel() {
  const gewaehlt = wurzel.dataset.theme;
  if (gewaehlt === "dark") return true;
  if (gewaehlt === "light") return false;
  return systemDunkel.matches;
}

// Beschriftung der Knöpfe passend setzen (für Vorlese-Programme und Tooltip)
function knoepfeBeschriften() {
  const text = istDunkel() ? "Hell einschalten" : "Dunkel einschalten";
  for (const knopf of document.querySelectorAll(".farbmodus-knopf")) {
    knopf.setAttribute("aria-label", text);
    knopf.title = text;
  }
}

function umschalten() {
  const neu = istDunkel() ? "light" : "dark";
  wurzel.dataset.theme = neu;
  try {
    localStorage.setItem(SPEICHER_NAME, neu);
  } catch {
    // Speichern nicht möglich – gilt dann nur bis zum Neuladen
  }
  knoepfeBeschriften();
}

export function farbmodusStarten() {
  for (const knopf of document.querySelectorAll(".farbmodus-knopf")) {
    knopf.addEventListener("click", umschalten);
  }
  // Ändert jemand die Systemeinstellung, während die Seite offen ist
  systemDunkel.addEventListener("change", knoepfeBeschriften);
  knoepfeBeschriften();
}
