// =========================================================
// ZUSATZ 3D: kleiner 3D-Betrachter (ohne Bibliothek)
//
// Zeichnet die Dreiecke des Modells auf eine Zeichenfläche (Canvas),
// so wie man eine Axonometrie zeichnet: drehen, kippen, zoomen.
//   - Ziehen mit Maus oder Finger: drehen und kippen
//   - Mausrad oder zwei Finger: zoomen
//   - Doppelklick: Ansicht zurücksetzen
//   - Tastatur (wenn die Fläche ausgewählt ist): Pfeiltasten drehen, + / − zoomen
// Gezeichnet wird von hinten nach vorne („Maler-Verfahren“), jede Fläche
// hell oder dunkel je nachdem, wie sie zum Licht steht.
// Maße in mm, z zeigt nach oben.
// =========================================================

const START_DREHUNG = -0.65; // Blick von Südwesten
const START_NEIGUNG = 0.55;  // etwa 30° von oben

export class Betrachter {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.teile = [];            // [{ dreiecke: Float32Array, farbe: [r, g, b] }]
    this.bett = null;           // Druckbett { b, t } in mm, als Umriss am Boden
    this.mitte = [0, 0, 0];
    this.groesse = 1;
    this.zuruecksetzen(false);
    this.zeiger = new Map();    // gedrückte Finger/Maus (für Zoomen mit zwei Fingern)
    this.wartet = false;

    canvas.tabIndex = 0;
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      this.zeiger.set(e.pointerId, [e.clientX, e.clientY]);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!this.zeiger.has(e.pointerId)) return;
      const [x0, y0] = this.zeiger.get(e.pointerId);
      if (this.zeiger.size === 1) {
        this.drehung += (e.clientX - x0) * 0.01;
        this.neigung = Math.max(-0.2, Math.min(1.5, this.neigung + (e.clientY - y0) * 0.01));
      } else if (this.zeiger.size === 2) {
        // Zwei Finger: Abstand vorher/nachher → zoomen
        const [a, b] = [...this.zeiger.values()];
        const vorher = Math.hypot(a[0] - b[0], a[1] - b[1]);
        this.zeiger.set(e.pointerId, [e.clientX, e.clientY]);
        const [c, d] = [...this.zeiger.values()];
        const nachher = Math.hypot(c[0] - d[0], c[1] - d[1]);
        if (vorher > 0) this.zoomen(nachher / vorher);
        return;
      }
      this.zeiger.set(e.pointerId, [e.clientX, e.clientY]);
      this.zeichnen();
    });
    const loslassen = (e) => this.zeiger.delete(e.pointerId);
    canvas.addEventListener("pointerup", loslassen);
    canvas.addEventListener("pointercancel", loslassen);
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.zoomen(Math.exp(-e.deltaY * 0.0015));
    }, { passive: false });
    canvas.addEventListener("dblclick", () => this.zuruecksetzen());
    canvas.addEventListener("keydown", (e) => {
      const schritte = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] };
      if (schritte[e.key]) {
        e.preventDefault();
        this.drehung += schritte[e.key][0];
        this.neigung = Math.max(-0.2, Math.min(1.5, this.neigung + schritte[e.key][1]));
        this.zeichnen();
      } else if (e.key === "+" || e.key === "=") this.zoomen(1.15);
      else if (e.key === "-") this.zoomen(1 / 1.15);
    });
    // Neu zeichnen, wenn sich die Größe der Fläche ändert (Fenster, Handy drehen)
    new ResizeObserver(() => this.zeichnen()).observe(canvas);
  }

  // Neues Modell zeigen
  setzen(teile, bett) {
    this.teile = teile;
    this.bett = bett;
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (const t of teile) {
      const d = t.dreiecke;
      for (let i = 0; i < d.length; i += 3) {
        x0 = Math.min(x0, d[i]); x1 = Math.max(x1, d[i]);
        y0 = Math.min(y0, d[i + 1]); y1 = Math.max(y1, d[i + 1]);
        z0 = Math.min(z0, d[i + 2]); z1 = Math.max(z1, d[i + 2]);
      }
    }
    if (!Number.isFinite(x0)) { x0 = y0 = z0 = 0; x1 = y1 = z1 = 1; }
    this.mitte = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    this.groesse = Math.max(x1 - x0, y1 - y0, z1 - z0, 1);
    this.zuruecksetzen();
  }

  zuruecksetzen(neuZeichnen = true) {
    this.drehung = START_DREHUNG;
    this.neigung = START_NEIGUNG;
    this.zoom = 1;
    if (neuZeichnen) this.zeichnen();
  }

  zoomen(faktor) {
    this.zoom = Math.max(0.2, Math.min(10, this.zoom * faktor));
    this.zeichnen();
  }

  // Zeichnen beim nächsten Bild (nicht öfter als nötig)
  zeichnen() {
    if (this.wartet) return;
    this.wartet = true;
    requestAnimationFrame(() => {
      this.wartet = false;
      this.jetztZeichnen();
    });
  }

  jetztZeichnen() {
    const { canvas, ctx } = this;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!this.teile.length) return;

    const cd = Math.cos(this.drehung), sd = Math.sin(this.drehung);
    const cn = Math.cos(this.neigung), sn = Math.sin(this.neigung);
    const massstab = (this.zoom * Math.min(w, h) * 0.75) / this.groesse;
    const [mx, my, mz] = this.mitte;
    // Punkt → Bildschirm: um die Hochachse drehen, dann kippen
    const projizieren = (x, y, z) => {
      x -= mx; y -= my; z -= mz;
      const x1 = x * cd - y * sd;
      const y1 = x * sd + y * cd;
      const tiefe = y1 * cn - z * sn;   // größer = weiter weg
      const hoch = y1 * sn + z * cn;
      return [w / 2 + x1 * massstab, h / 2 - hoch * massstab, tiefe];
    };

    // Druckbett als gestrichelter Umriss am Boden (z = 0)
    if (this.bett) {
      const bx = this.bett.b / 2, by = this.bett.t / 2;
      const ecken = [[-bx, -by], [bx, -by], [bx, by], [-bx, by]].map(([x, y]) => projizieren(x + mx, y + my, 0));
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue("--linie") || "#999";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ecken.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    // Licht von vorne links oben (in Blickrichtung gesehen)
    const licht = [-0.45, -0.55, 0.7];
    const ll = Math.hypot(...licht);
    const L = licht.map((v) => v / ll);

    const flaechen = [];
    for (const teil of this.teile) {
      const d = teil.dreiecke;
      const [r, g, b] = teil.farbe;
      for (let i = 0; i + 8 < d.length; i += 9) {
        const a = projizieren(d[i], d[i + 1], d[i + 2]);
        const p = projizieren(d[i + 3], d[i + 4], d[i + 5]);
        const c = projizieren(d[i + 6], d[i + 7], d[i + 8]);
        // Richtung der Fläche im Bild: Rückseiten weglassen
        const flaecheImBild = (p[0] - a[0]) * (c[1] - a[1]) - (p[1] - a[1]) * (c[0] - a[0]);
        if (flaecheImBild >= 0) continue;
        // Normale im Raum für die Helligkeit
        const ux = d[i + 3] - d[i], uy = d[i + 4] - d[i + 1], uz = d[i + 5] - d[i + 2];
        const vx = d[i + 6] - d[i], vy = d[i + 7] - d[i + 1], vz = d[i + 8] - d[i + 2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl; ny /= nl; nz /= nl;
        // Normale in Blickrichtung drehen wie die Punkte
        const n1x = nx * cd - ny * sd;
        const n1y = nx * sd + ny * cd;
        const nt = n1y * cn - nz * sn;
        const nh = n1y * sn + nz * cn;
        const hell = 0.38 + 0.62 * Math.max(0, n1x * L[0] + nt * L[1] + nh * L[2]);
        flaechen.push({
          a, p, c,
          tiefe: (a[2] + p[2] + c[2]) / 3,
          farbe: `rgb(${Math.round(r * hell)},${Math.round(g * hell)},${Math.round(b * hell)})`,
        });
      }
    }
    flaechen.sort((x, y) => y.tiefe - x.tiefe); // hinten zuerst
    ctx.lineWidth = 0.6;
    ctx.lineJoin = "round";
    for (const f of flaechen) {
      ctx.beginPath();
      ctx.moveTo(f.a[0], f.a[1]);
      ctx.lineTo(f.p[0], f.p[1]);
      ctx.lineTo(f.c[0], f.c[1]);
      ctx.closePath();
      ctx.fillStyle = f.farbe;
      ctx.strokeStyle = f.farbe; // gleiche Farbe als Rand, damit keine Haarrisse zwischen Dreiecken bleiben
      ctx.fill();
      ctx.stroke();
    }
  }
}
