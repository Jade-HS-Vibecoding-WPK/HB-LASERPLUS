// =========================================================
// ZUSATZ 3D: kleiner 3D-Betrachter mit WebGL (ohne Bibliothek)
//
// WebGL ist die 3D-Grafik, die in jeden Browser eingebaut ist.
// Eine „Tiefen-Ebene“ prüft für jeden einzelnen Bildpunkt, was vorne
// liegt – so verschwinden Bauteile, die im Modell innen liegen (z. B.
// die Oberkanten der Wandschichten im Dach), auch auf dem Bildschirm.
// (Die erste Fassung hat die Flächen nur von hinten nach vorne
// sortiert; dabei gerieten kleine Flächen manchmal nach vorne.)
//
// Bedienung:
//   - Ziehen mit Maus oder Finger: drehen und kippen
//   - Mausrad oder zwei Finger: zoomen
//   - Doppelklick: Ansicht zurücksetzen
//   - Tastatur (wenn die Fläche ausgewählt ist): Pfeiltasten drehen, + / − zoomen
// Maße in mm, z zeigt nach oben. Ansicht ohne Fluchtpunkt (wie eine Axonometrie).
// =========================================================

const START_DREHUNG = -0.65; // Blick von Südwesten
const START_NEIGUNG = 0.55;  // etwa 30° von oben
const LICHT = (() => {       // von vorne links oben (in Blickrichtung gesehen)
  const l = [-0.45, 0.7, 0.55];
  const n = Math.hypot(...l);
  return l.map((v) => v / n);
})();

const ECKEN_SHADER = `
  attribute vec3 aPos;
  attribute vec3 aNor;
  attribute vec3 aFarbe;
  uniform mat4 uAnsicht;   // Punkt → Bildschirm
  uniform mat3 uDrehung;   // Richtung → Blickrichtung (für das Licht)
  varying vec3 vNor;
  varying vec3 vFarbe;
  void main() {
    gl_Position = uAnsicht * vec4(aPos, 1.0);
    vNor = uDrehung * aNor;
    vFarbe = aFarbe;
  }`;

const FARB_SHADER = `
  precision mediump float;
  uniform vec3 uLicht;
  uniform float uFlach;    // 1 = ohne Licht (für die Linien des Druckbetts)
  varying vec3 vNor;
  varying vec3 vFarbe;
  void main() {
    vec3 n = normalize(vNor);
    if (!gl_FrontFacing) n = -n;           // Innenseiten (z. B. in Fensterlaibungen) auch hell genug
    float hell = 0.38 + 0.62 * max(dot(n, uLicht), 0.0);
    gl_FragColor = vec4(mix(vFarbe * hell, vFarbe, uFlach), 1.0);
  }`;

// „#1C1411“ → [0.11, 0.08, 0.07]
function farbeAusCss(text, ersatz) {
  const t = (text || "").trim();
  const m = /^#([0-9a-f]{6})$/i.exec(t);
  if (!m) return ersatz;
  const z = parseInt(m[1], 16);
  return [((z >> 16) & 255) / 255, ((z >> 8) & 255) / 255, (z & 255) / 255];
}

export class Betrachter {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl", { antialias: true }) || canvas.getContext("experimental-webgl");
    this.flaechenAnzahl = 0;
    this.linienAnzahl = 0;
    this.mitte = [0, 0, 0];
    this.groesse = 1;
    this.zeiger = new Map();
    this.wartet = false;
    this.zuruecksetzen(false);

    if (!this.gl) {
      canvas.setAttribute("aria-label", "Dein Browser kann keine 3D-Grafik (WebGL) anzeigen. Die STL-Datei lässt sich trotzdem herunterladen.");
    } else {
      this.programmBauen();
    }

    // Bedienung mit Maus, Finger und Tastatur
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
        this.zeiger.set(e.pointerId, [e.clientX, e.clientY]);
        this.zeichnen();
      } else if (this.zeiger.size === 2) {
        // Zwei Finger: Abstand vorher/nachher → zoomen
        const [a, b] = [...this.zeiger.values()];
        const vorher = Math.hypot(a[0] - b[0], a[1] - b[1]);
        this.zeiger.set(e.pointerId, [e.clientX, e.clientY]);
        const [c, d] = [...this.zeiger.values()];
        const nachher = Math.hypot(c[0] - d[0], c[1] - d[1]);
        if (vorher > 0) this.zoomen(nachher / vorher);
      }
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
    // Neu zeichnen, wenn sich die Größe ändert oder hell/dunkel umgeschaltet wird
    new ResizeObserver(() => this.zeichnen()).observe(canvas);
    new MutationObserver(() => this.zeichnen()).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => this.zeichnen());
  }

  // Die beiden kleinen Programme für die Grafikkarte übersetzen
  programmBauen() {
    const gl = this.gl;
    const shader = (art, text) => {
      const s = gl.createShader(art);
      gl.shaderSource(s, text);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, shader(gl.VERTEX_SHADER, ECKEN_SHADER));
    gl.attachShader(p, shader(gl.FRAGMENT_SHADER, FARB_SHADER));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    this.programm = p;
    this.ort = {
      aPos: gl.getAttribLocation(p, "aPos"),
      aNor: gl.getAttribLocation(p, "aNor"),
      aFarbe: gl.getAttribLocation(p, "aFarbe"),
      uAnsicht: gl.getUniformLocation(p, "uAnsicht"),
      uDrehung: gl.getUniformLocation(p, "uDrehung"),
      uLicht: gl.getUniformLocation(p, "uLicht"),
      uFlach: gl.getUniformLocation(p, "uFlach"),
    };
    this.flaechenPuffer = gl.createBuffer();
    this.linienPuffer = gl.createBuffer();
  }

  // Neues Modell zeigen
  // teile: [{ dreiecke: Float32Array (9 Zahlen je Dreieck, mm), farbe: [r, g, b] 0–255 }]
  // bett:  { b, t } Druckbett in mm (Umriss am Boden) oder null
  setzen(teile, bett) {
    this.bett = bett;
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    let anzahl = 0;
    for (const t of teile) {
      const d = t.dreiecke;
      anzahl += Math.floor(d.length / 9);
      for (let i = 0; i < d.length; i += 3) {
        x0 = Math.min(x0, d[i]); x1 = Math.max(x1, d[i]);
        y0 = Math.min(y0, d[i + 1]); y1 = Math.max(y1, d[i + 1]);
        z0 = Math.min(z0, d[i + 2]); z1 = Math.max(z1, d[i + 2]);
      }
    }
    if (!Number.isFinite(x0)) { x0 = y0 = z0 = 0; x1 = y1 = z1 = 1; }
    this.mitte = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    this.groesse = Math.max(x1 - x0, y1 - y0, z1 - z0, 1);

    if (this.gl) {
      // Je Ecke: Ort (3), Richtung der Fläche (3), Farbe (3)
      const daten = new Float32Array(anzahl * 3 * 9);
      let o = 0;
      for (const t of teile) {
        const d = t.dreiecke;
        const [r, g, b] = t.farbe.map((v) => v / 255);
        for (let i = 0; i + 8 < d.length; i += 9) {
          const ux = d[i + 3] - d[i], uy = d[i + 4] - d[i + 1], uz = d[i + 5] - d[i + 2];
          const vx = d[i + 6] - d[i], vy = d[i + 7] - d[i + 1], vz = d[i + 8] - d[i + 2];
          let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
          const nl = Math.hypot(nx, ny, nz) || 1;
          nx /= nl; ny /= nl; nz /= nl;
          for (let k = 0; k < 3; k++) {
            daten[o++] = d[i + k * 3]; daten[o++] = d[i + k * 3 + 1]; daten[o++] = d[i + k * 3 + 2];
            daten[o++] = nx; daten[o++] = ny; daten[o++] = nz;
            daten[o++] = r; daten[o++] = g; daten[o++] = b;
          }
        }
      }
      const gl = this.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.flaechenPuffer);
      gl.bufferData(gl.ARRAY_BUFFER, daten, gl.STATIC_DRAW);
      this.flaechenAnzahl = anzahl * 3;
    }
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
    const { gl, canvas } = this;
    if (!gl) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Hintergrund und Linienfarbe aus den Farbtöpfen der Seite (hell/dunkel)
    const stil = getComputedStyle(canvas);
    const hinten = farbeAusCss(stil.getPropertyValue("--hintergrund"), [0.1, 0.08, 0.07]);
    const linie = farbeAusCss(stil.getPropertyValue("--linie"), [0.5, 0.45, 0.4]);
    gl.clearColor(hinten[0], hinten[1], hinten[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!this.flaechenAnzahl) return;

    // Ansicht: um die Hochachse drehen, dann kippen, dann auf den Bildschirm skalieren
    const cd = Math.cos(this.drehung), sd = Math.sin(this.drehung);
    const cn = Math.cos(this.neigung), sn = Math.sin(this.neigung);
    const pxJeMm = (this.zoom * Math.min(w, h) * 0.75) / this.groesse;
    const ax = pxJeMm / (w / 2), ay = pxJeMm / (h / 2), az = 1 / (this.groesse * 1.2);
    const zeileX = [cd * ax, -sd * ax, 0];
    const zeileY = [sn * sd * ay, sn * cd * ay, cn * ay];
    const zeileZ = [cn * sd * az, cn * cd * az, -sn * az];
    const [mx, my, mz] = this.mitte;
    const verschieben = (z) => -(z[0] * mx + z[1] * my + z[2] * mz);
    const ansicht = new Float32Array([
      zeileX[0], zeileY[0], zeileZ[0], 0,
      zeileX[1], zeileY[1], zeileZ[1], 0,
      zeileX[2], zeileY[2], zeileZ[2], 0,
      verschieben(zeileX), verschieben(zeileY), verschieben(zeileZ), 1,
    ]);
    // Richtungen in Blickrichtung: x nach rechts, y nach oben, z zum Betrachter
    const drehung = new Float32Array([
      cd, sn * sd, -cn * sd,
      -sd, sn * cd, -cn * cd,
      0, cn, sn,
    ]);

    gl.useProgram(this.programm);
    gl.uniformMatrix4fv(this.ort.uAnsicht, false, ansicht);
    gl.uniformMatrix3fv(this.ort.uDrehung, false, drehung);
    gl.uniform3fv(this.ort.uLicht, LICHT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);

    const anschliessen = (puffer) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, puffer);
      const schritt = 9 * 4;
      gl.enableVertexAttribArray(this.ort.aPos);
      gl.vertexAttribPointer(this.ort.aPos, 3, gl.FLOAT, false, schritt, 0);
      gl.enableVertexAttribArray(this.ort.aNor);
      gl.vertexAttribPointer(this.ort.aNor, 3, gl.FLOAT, false, schritt, 12);
      gl.enableVertexAttribArray(this.ort.aFarbe);
      gl.vertexAttribPointer(this.ort.aFarbe, 3, gl.FLOAT, false, schritt, 24);
    };

    // Druckbett als Umriss am Boden (z = 0), mittig unter dem Modell
    if (this.bett) {
      const bx = this.bett.b / 2, by = this.bett.t / 2;
      const ecken = [[-bx, -by], [bx, -by], [bx, by], [-bx, by]].map(([x, y]) => [x + mx, y + my, 0]);
      const linien = [];
      for (let i = 0; i < 4; i++) {
        for (const p of [ecken[i], ecken[(i + 1) % 4]]) linien.push(...p, 0, 0, 1, ...linie);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.linienPuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(linien), gl.DYNAMIC_DRAW);
      anschliessen(this.linienPuffer);
      gl.uniform1f(this.ort.uFlach, 1);
      gl.drawArrays(gl.LINES, 0, 8);
    }

    anschliessen(this.flaechenPuffer);
    gl.uniform1f(this.ort.uFlach, 0);
    gl.drawArrays(gl.TRIANGLES, 0, this.flaechenAnzahl);
  }
}
