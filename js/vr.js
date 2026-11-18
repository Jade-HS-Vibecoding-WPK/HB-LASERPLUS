// =========================================================
// ZUSATZ VR: das fertige Pappmodell in der Meta Quest 3 auf dem Tisch
//
// Technik: WebXR (im Browser der Quest eingebaut, keine Bibliothek).
// „immersive-ar“ = Mixed Reality: Man sieht den echten Raum durch die
// Kameras der Brille, und das Modell steht darin.
//
// Ablauf in der Brille:
//   1. Knopf „Auf dem Tisch ansehen“ drücken → die Brille wechselt in MR.
//   2. Ein Ring zeigt, wo der Controller auf eine Fläche zielt (Tisch, Boden).
//      Das Modell hängt am Ring, bis man abdrückt.
//   3. Abzug (Trigger) = Modell dort abstellen. Nochmal = woanders hinstellen.
//   4. Greiftaste (Grip) = Modell um 30° drehen.
//   5. Meta-Taste bzw. Menü = zurück zur Seite.
// Das Modell erscheint in ECHTER Modellgröße: bei 1:100 ist ein 10 m langes
// Haus 10 cm lang – so groß wie das gelaserte Pappmodell.
//
// Voraussetzung: Die Seite läuft über eine sichere Adresse (https:// oder
// localhost). Ohne Brille kann man hier nur sehen, dass der Knopf erklärt,
// was fehlt – die Darstellung selbst lässt sich nur in der Quest testen.
// =========================================================

// ---------- kleine Matrix-Helfer (4 × 4, spaltenweise wie bei WebGL) ----------
function mal(a, b) {
  const r = new Float32Array(16);
  for (let s = 0; s < 4; s++) {
    for (let z = 0; z < 4; z++) {
      let summe = 0;
      for (let k = 0; k < 4; k++) summe += a[k * 4 + z] * b[s * 4 + k];
      r[s * 4 + z] = summe;
    }
  }
  return r;
}
const verschiebung = (x, y, z) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
const drehungY = (w) => {
  const c = Math.cos(w), s = Math.sin(w);
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
};
// Modell: mm, z nach oben → WebXR: Meter, y nach oben (Norden = nach vorne, −z)
const MM_ZU_XR = new Float32Array([0.001, 0, 0, 0, 0, 0, -0.001, 0, 0, 0.001, 0, 0, 0, 0, 0, 1]);

const ECKEN_SHADER = `
  attribute vec3 aPos;
  attribute vec3 aNor;
  attribute vec3 aFarbe;
  uniform mat4 uProj;
  uniform mat4 uAnsicht;
  uniform mat4 uModell;
  varying vec3 vNor;
  varying vec3 vFarbe;
  void main() {
    gl_Position = uProj * uAnsicht * uModell * vec4(aPos, 1.0);
    vNor = mat3(uModell) * aNor;
    vFarbe = aFarbe;
  }`;
const FARB_SHADER = `
  precision mediump float;
  uniform float uFlach;
  varying vec3 vNor;
  varying vec3 vFarbe;
  void main() {
    vec3 n = normalize(vNor);
    if (!gl_FrontFacing) n = -n;
    float hell = 0.45 + 0.55 * max(dot(n, normalize(vec3(-0.4, 0.8, 0.45))), 0.0);
    gl_FragColor = vec4(mix(vFarbe * hell, vFarbe, uFlach), 1.0);
  }`;

// ---------------------------------------------------------
// Knopf anschließen.
// knopf, hinweis: Elemente auf der Seite
// holeModell(): liefert die Teile der Modell-Vorschau
//   [{ dreiecke: Float32Array (mm, z oben), farbe: [r, g, b] }] oder null
// ---------------------------------------------------------
export async function vrKnopfAnschliessen(knopf, hinweis, holeModell) {
  const sagen = (text) => { hinweis.textContent = text; };
  let geht = false;
  try {
    geht = !!(navigator.xr && (await navigator.xr.isSessionSupported("immersive-ar")));
  } catch {
    geht = false;
  }
  if (!geht) {
    knopf.disabled = true;
    sagen(
      !window.isSecureContext
        ? "Für die Brille braucht die Seite eine sichere Adresse (https:// oder localhost über USB-Weiterleitung)."
        : "Öffne diese Seite im Browser der Meta Quest 3, dann kannst du das Modell auf deinen Tisch stellen."
    );
    return;
  }
  knopf.disabled = false;
  sagen("Setz die Brille auf und drück den Knopf. Abzug = abstellen, Greiftaste = drehen.");
  knopf.addEventListener("click", async () => {
    const teile = holeModell();
    if (!teile || !teile.length) {
      sagen("Erstelle zuerst die Laserplatten, dann gibt es ein Modell zum Ansehen.");
      return;
    }
    try {
      await sitzungStarten(teile, sagen);
    } catch (fehler) {
      console.error(fehler);
      sagen("Die Brille konnte nicht in Mixed Reality wechseln. Prüfe, ob der Browser Zugriff auf den Raum erlaubt, und versuch es nochmal.");
    }
  });
}

// ---------------------------------------------------------
// Eine MR-Sitzung: Modell vorbereiten, zeichnen, bedienen
// ---------------------------------------------------------
async function sitzungStarten(teile, sagen) {
  const sitzung = await navigator.xr.requestSession("immersive-ar", {
    optionalFeatures: ["local-floor", "hit-test"],
  });
  const leinwand = document.createElement("canvas");
  const gl = leinwand.getContext("webgl", { xrCompatible: true, alpha: true, antialias: true });
  sitzung.updateRenderState({ baseLayer: new XRWebGLLayer(sitzung, gl) });

  let raum;
  try {
    raum = await sitzung.requestReferenceSpace("local-floor");
  } catch {
    raum = await sitzung.requestReferenceSpace("local");
  }

  // ---------- Programm für die Grafikkarte ----------
  const shader = (art, text) => {
    const s = gl.createShader(art);
    gl.shaderSource(s, text);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, ECKEN_SHADER));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FARB_SHADER));
  gl.linkProgram(prog);
  const ort = {
    aPos: gl.getAttribLocation(prog, "aPos"),
    aNor: gl.getAttribLocation(prog, "aNor"),
    aFarbe: gl.getAttribLocation(prog, "aFarbe"),
    uProj: gl.getUniformLocation(prog, "uProj"),
    uAnsicht: gl.getUniformLocation(prog, "uAnsicht"),
    uModell: gl.getUniformLocation(prog, "uModell"),
    uFlach: gl.getUniformLocation(prog, "uFlach"),
  };

  // ---------- Modell in einen Puffer (Ort, Richtung, Farbe je Ecke) ----------
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  let anzahl = 0;
  for (const t of teile) {
    const d = t.dreiecke;
    anzahl += Math.floor(d.length / 9);
    for (let i = 0; i < d.length; i += 3) {
      x0 = Math.min(x0, d[i]); x1 = Math.max(x1, d[i]);
      y0 = Math.min(y0, d[i + 1]); y1 = Math.max(y1, d[i + 1]);
      z0 = Math.min(z0, d[i + 2]);
    }
  }
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
      for (let k = 0; k < 3; k++) {
        daten[o++] = d[i + k * 3]; daten[o++] = d[i + k * 3 + 1]; daten[o++] = d[i + k * 3 + 2];
        daten[o++] = nx / nl; daten[o++] = ny / nl; daten[o++] = nz / nl;
        daten[o++] = r; daten[o++] = g; daten[o++] = b;
      }
    }
  }
  const modellPuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, modellPuffer);
  gl.bufferData(gl.ARRAY_BUFFER, daten, gl.STATIC_DRAW);
  // Mitte unten des Modells auf den Nullpunkt (damit es auf dem Tisch steht)
  const mitteUnten = verschiebung(-(x0 + x1) / 2, -(y0 + y1) / 2, -z0);

  // ---------- Ring, der zeigt, wohin das Modell kommt ----------
  const ring = [];
  const ri = 0.04, ra = 0.05, n = 32;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, b2 = ((i + 1) / n) * Math.PI * 2;
    const p = (r, w) => [r * Math.cos(w), 0, r * Math.sin(w)];
    for (const q of [p(ri, a), p(ra, a), p(ra, b2), p(ri, a), p(ra, b2), p(ri, b2)]) ring.push(...q, 0, 1, 0, 1, 0.55, 0.42);
  }
  const ringPuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, ringPuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ring), gl.STATIC_DRAW);

  // ---------- Platzieren mit Hit-Test (Fläche unter dem Zielstrahl) ----------
  let trefferQuelle = null;
  const quelleHolen = async (space) => {
    if (!sitzung.requestHitTestSource) return;
    try {
      if (trefferQuelle) trefferQuelle.cancel();
      trefferQuelle = await sitzung.requestHitTestSource({ space });
    } catch {
      trefferQuelle = null;
    }
  };
  // Zuerst über den Blick, sobald ein Controller da ist über den Controller
  try {
    await quelleHolen(await sitzung.requestReferenceSpace("viewer"));
  } catch { /* ohne Hit-Test geht es auch */ }
  sitzung.addEventListener("inputsourceschange", () => {
    const quelle = [...sitzung.inputSources].find((s) => s.targetRayMode === "tracked-pointer" && s.handedness !== "left")
      || [...sitzung.inputSources].find((s) => s.targetRayMode === "tracked-pointer");
    if (quelle) quelleHolen(quelle.targetRaySpace);
  });

  let ziel = null;        // wo der Ring gerade ist (Matrix) oder null
  let abgestellt = null;  // Ort des abgestellten Modells (Matrix) oder null
  let drehung = 0;
  sitzung.addEventListener("select", () => {
    if (ziel) abgestellt = ziel;
  });
  sitzung.addEventListener("squeeze", () => {
    drehung += Math.PI / 6;
  });

  sagen("In der Brille: auf den Tisch zielen, Abzug = abstellen, Greiftaste = drehen.");
  sitzung.addEventListener("end", () => {
    sagen("Zurück aus der Brille. Du kannst jederzeit nochmal starten.");
    if (trefferQuelle) trefferQuelle.cancel();
  });

  const anschliessen = (puffer) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, puffer);
    const schritt = 9 * 4;
    gl.enableVertexAttribArray(ort.aPos);
    gl.vertexAttribPointer(ort.aPos, 3, gl.FLOAT, false, schritt, 0);
    gl.enableVertexAttribArray(ort.aNor);
    gl.vertexAttribPointer(ort.aNor, 3, gl.FLOAT, false, schritt, 12);
    gl.enableVertexAttribArray(ort.aFarbe);
    gl.vertexAttribPointer(ort.aFarbe, 3, gl.FLOAT, false, schritt, 24);
  };

  // ---------- Bild für Bild zeichnen ----------
  const bild = (zeit, rahmen) => {
    sitzung.requestAnimationFrame(bild);
    const pose = rahmen.getViewerPose(raum);
    if (!pose) return;

    // Wohin zeigt der Zielstrahl?
    ziel = null;
    if (trefferQuelle) {
      const treffer = rahmen.getHitTestResults(trefferQuelle);
      if (treffer.length) {
        const p = treffer[0].getPose(raum);
        if (p) {
          const m = p.transform.matrix;
          ziel = verschiebung(m[12], m[13], m[14]); // nur der Ort, Modell bleibt aufrecht
        }
      }
    }
    // Ohne Treffer: 70 cm vor dir, etwa auf Tischhöhe
    if (!ziel && !abgestellt) {
      const m = pose.transform.matrix;
      const vorne = [-m[8], 0, -m[10]];
      const l = Math.hypot(vorne[0], vorne[2]) || 1;
      ziel = verschiebung(m[12] + (vorne[0] / l) * 0.7, Math.max(0.3, m[13] - 0.5), m[14] + (vorne[2] / l) * 0.7);
    }
    const ort3d = abgestellt || ziel;

    const ebene = sitzung.renderState.baseLayer;
    gl.bindFramebuffer(gl.FRAMEBUFFER, ebene.framebuffer);
    gl.clearColor(0, 0, 0, 0); // durchsichtig: der echte Raum bleibt sichtbar
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(prog);

    for (const ansicht of pose.views) {
      const vp = ebene.getViewport(ansicht);
      gl.viewport(vp.x, vp.y, vp.width, vp.height);
      gl.uniformMatrix4fv(ort.uProj, false, ansicht.projectionMatrix);
      gl.uniformMatrix4fv(ort.uAnsicht, false, ansicht.transform.inverse.matrix);

      if (ort3d) {
        const modell = mal(ort3d, mal(drehungY(drehung), mal(MM_ZU_XR, mitteUnten)));
        gl.uniformMatrix4fv(ort.uModell, false, modell);
        gl.uniform1f(ort.uFlach, 0);
        anschliessen(modellPuffer);
        gl.drawArrays(gl.TRIANGLES, 0, anzahl * 3);
      }
      // Ring zeigen, solange man zielt (auch nach dem Abstellen, zum Umsetzen)
      if (ziel && trefferQuelle) {
        gl.uniformMatrix4fv(ort.uModell, false, ziel);
        gl.uniform1f(ort.uFlach, 1);
        anschliessen(ringPuffer);
        gl.drawArrays(gl.TRIANGLES, 0, ring.length / 9);
      }
    }
  };
  sitzung.requestAnimationFrame(bild);
}
