// ══════════════════════════════════════════════════════════════
// PRUEBA DE VIDA
// (analisis/037-prueba-de-vida-y-encuadre-adaptable.md)
//
// El navegador ya no manda una sola captura: manda la SECUENCIA de lo que
// vio la cámara durante unos segundos. Aquí se revisa que esa secuencia
// sea de una persona viva:
//   - giró la cabeza hacia cada lado del reto, en el orden pedido, sin
//     girar antes hacia el otro lado y regresando al frente entre giros,
//   - y es la misma cara en toda la secuencia.
//
// El giro se mide como el desplazamiento de la nariz respecto al centro
// de los ojos, en distancias-entre-ojos. Una foto no puede imitarlo: si
// se inclina, la nariz y los ojos se encogen parejo y la proporción no
// cambia. Un video grabado no sabe en qué orden se pedirán los lados.
//
// Sin parpadeo: en la primera prueba con cámara real (2026-11-08) los
// puntos del modelo apenas se movían al parpadear (el ojo "bajaba" a 92–
// 95%), lo mismo que el ruido de una foto.
//
// Funciones puras: no tocan la base de datos.
// ══════════════════════════════════════════════════════════════

const { fn_descriptorValido } = require('./faceMatch');

// Puntos de la cara que manda el navegador (de los 68 del modelo):
//   0–5   ojo 36–41, 6–11  ojo 42–47, 12  punta de la nariz (30).
// Solo se mandan estos para que la petición quepa en el límite de 100 KB
// de express.json().
const PUNTOS_POR_FRAME = 13;
const I_NARIZ = 12;

const MIN_FRAMES = 8;
const MAX_FRAMES = 200;
const MIN_FRAMES_CON_DESCRIPTOR = 3;
const MAX_FRAMES_CON_DESCRIPTOR = 15;

// Giro: la nariz se desplaza al menos esto (en distancias-entre-ojos)
// respecto a la postura de frente. "Al frente" otra vez: menos de esto.
const GIRO_HORIZONTAL = 0.12;
const CENTRO_HORIZONTAL = 0.06;

// La postura "de frente" se toma de los primeros instantes: el navegador
// no marca el primer giro hasta pasado este tiempo.
const MS_POSTURA_INICIAL = 800;
const MIN_FRAMES_POSTURA_INICIAL = 5;

// Misma cara en toda la secuencia: distancia máxima entre descriptores.
// Con 0.45 una cara real que se mueve fallaba; dos personas distintas
// suelen quedar arriba de 0.6.
const DISTANCIA_MAXIMA_MISMA_CARA = 0.55;

const _fn_dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

const _fn_mediana = (arr) => {
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const _fn_puntoValido = (p) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === 'number' && Number.isFinite(n));

const _fn_centro = (o) => [o.reduce((s, p) => s + p[0], 0) / o.length, o.reduce((s, p) => s + p[1], 0) / o.length];

// Medida de un frame: posición horizontal de la nariz respecto al centro
// de los ojos.
const fn_medirFrame = (landmarks) => {

    const cA = _fn_centro(landmarks.slice(0, 6));
    const cB = _fn_centro(landmarks.slice(6, 12));
    const ipd = _fn_dist(cA, cB);

    return {
        ipd,
        dx: (landmarks[I_NARIZ][0] - (cA[0] + cB[0]) / 2) / ipd
    };
};

// Forma de la secuencia. Regresa { ok, error } o { ok, frames, descriptores }.
const fn_validarSecuencia = (frames) => {

    const fnError = (error) => ({ ok: false, error });

    if (!Array.isArray(frames) || frames.length < MIN_FRAMES || frames.length > MAX_FRAMES) {
        return fnError('La captura no tiene suficientes cuadros.');
    }

    const oFrames = [];
    const descriptores = [];
    let tAnterior = -1;

    for (const f of frames) {

        if (!f || typeof f.t !== 'number' || !Number.isFinite(f.t) || f.t <= tAnterior) {
            return fnError('La captura no es válida.');
        }

        if (!Array.isArray(f.landmarks) || f.landmarks.length !== PUNTOS_POR_FRAME || !f.landmarks.every(_fn_puntoValido)) {
            return fnError('La captura no es válida.');
        }

        if (f.descriptor !== undefined && f.descriptor !== null) {
            if (!fn_descriptorValido(f.descriptor)) {
                return fnError('La captura no es válida.');
            }
            descriptores.push(f.descriptor);
        }

        const m = fn_medirFrame(f.landmarks);

        if (!Number.isFinite(m.dx) || m.ipd <= 0) {
            return fnError('La captura no es válida.');
        }

        oFrames.push({ t: f.t, ...m });
        tAnterior = f.t;
    }

    if (descriptores.length < MIN_FRAMES_CON_DESCRIPTOR || descriptores.length > MAX_FRAMES_CON_DESCRIPTOR) {
        return fnError('La captura no es válida.');
    }

    return { ok: true, frames: oFrames, descriptores };
};

// Dirección del giro respecto a la postura de frente, o null si no llega
// al umbral. Las coordenadas son las del video SIN espejo: cuando la
// persona voltea a su izquierda (que en pantalla, en espejo, también es
// la izquierda) la nariz se mueve a la derecha de la imagen.
const fn_direccionGiro = (ddx) => {
    if (ddx >= GIRO_HORIZONTAL) {
        return 'IZQ';
    }
    if (ddx <= -GIRO_HORIZONTAL) {
        return 'DER';
    }
    return null;
};

const fn_estaAlCentro = (ddx) => Math.abs(ddx) < CENTRO_HORIZONTAL;

// Postura de frente: los cuadros de los primeros 800 ms o, si fueron
// pocos (la primera detección del navegador puede tardar), los primeros 5.
const _fn_posturaInicial = (frames) => {
    const t0 = frames[0].t;
    let inicial = frames.filter((f) => f.t - t0 <= MS_POSTURA_INICIAL);
    if (inicial.length < MIN_FRAMES_POSTURA_INICIAL) {
        inicial = frames.slice(0, MIN_FRAMES_POSTURA_INICIAL);
    }
    return inicial.length < MIN_FRAMES_POSTURA_INICIAL
        ? null
        : { n: inicial.length, dx: _fn_mediana(inicial.map((f) => f.dx)) };
};

// ¿Giró hacia cada lado en orden? Un giro hacia el otro lado mientras se
// espera uno se rechaza: así un video que voltea a todos lados no pasa.
const fn_siguioGiros = (frames, giros) => {

    const postura = _fn_posturaInicial(frames);

    if (!postura) {
        return { ok: false, motivo: 'no hubo postura de frente al inicio' };
    }

    let k = 0;
    let bEsperaCentro = false;

    for (const f of frames.slice(postura.n)) {

        const ddx = f.dx - postura.dx;

        if (bEsperaCentro) {
            bEsperaCentro = !fn_estaAlCentro(ddx);
            continue;
        }

        const dir = fn_direccionGiro(ddx);

        if (!dir) {
            continue;
        }

        if (dir !== giros[k]) {
            return { ok: false, motivo: `giró hacia ${ dir } cuando se esperaba ${ giros[k] }` };
        }

        k++;

        if (k === giros.length) {
            return { ok: true };
        }

        bEsperaCentro = true;
    }

    return { ok: false, motivo: `no completó el giro ${ k + 1 } de ${ giros.length } (${ giros[k] })` };
};

const _fn_distDescriptor = (a, b) => {
    let s = 0;
    for (let i = 0; i < a.length; i++) {
        const d = a[i] - b[i];
        s += d * d;
    }
    return Math.sqrt(s);
};

// Mayor distancia entre dos descriptores de la secuencia.
const fn_distanciaMaximaEntreCuadros = (descriptores) => {
    let max = 0;
    for (let i = 0; i < descriptores.length; i++) {
        for (let j = i + 1; j < descriptores.length; j++) {
            max = Math.max(max, _fn_distDescriptor(descriptores[i], descriptores[j]));
        }
    }
    return max;
};

const fn_mismaCara = (descriptores) => fn_distanciaMaximaEntreCuadros(descriptores) <= DISTANCIA_MAXIMA_MISMA_CARA;

// Datos de la secuencia para el motivo en la bitácora: con ellos se
// ajustan los umbrales con capturas reales.
const _fn_diagnostico = (oSecuencia) => {
    const f = oSecuencia.frames;
    const seg = (f[f.length - 1].t - f[0].t) / 1000;
    const postura = _fn_posturaInicial(f);
    const giro = postura
        ? `giro máx izq ${ Math.max(...f.map((x) => x.dx - postura.dx)).toFixed(2) } / der ${ (-Math.min(...f.map((x) => x.dx - postura.dx))).toFixed(2) }, `
        : '';
    return `${ giro }caras a ${ fn_distanciaMaximaEntreCuadros(oSecuencia.descriptores).toFixed(2) }, `
        + `${ f.length } cuadros en ${ seg.toFixed(1) } s`;
};

// Promedio de los descriptores de la secuencia: es el que se compara
// contra la referencia (o el que se guarda al enrolar).
const fn_descriptorPromedio = (descriptores) => {
    const prom = new Array(descriptores[0].length).fill(0);
    for (const d of descriptores) {
        for (let i = 0; i < d.length; i++) {
            prom[i] += d[i] / descriptores.length;
        }
    }
    return prom;
};

// oSecuencia: resultado ok de fn_validarSecuencia. pasos: los giros del
// reto. Regresa { ok } o { ok: false, motivo }.
const fn_validarVida = (oSecuencia, pasos) => {

    const fnFalla = (sMotivo) => ({ ok: false, motivo: `${ sMotivo } (${ _fn_diagnostico(oSecuencia) })` });

    if (!fn_mismaCara(oSecuencia.descriptores)) {
        return fnFalla('la cara cambió durante la captura');
    }

    const oGiros = fn_siguioGiros(oSecuencia.frames, pasos);

    if (!oGiros.ok) {
        return fnFalla(oGiros.motivo);
    }

    return { ok: true };
};

module.exports = {
    PUNTOS_POR_FRAME,
    MS_POSTURA_INICIAL,
    fn_medirFrame,
    fn_validarSecuencia,
    fn_siguioGiros,
    fn_mismaCara,
    fn_descriptorPromedio,
    fn_validarVida
};
