// ══════════════════════════════════════════════════════════════
// COMPARACIÓN DE ROSTROS EN EL SERVIDOR
// (analisis/020-reconocimiento-facial-validado-en-servidor.md)
//
// El navegador solo captura y calcula el descriptor (128 números) de lo
// que ve la cámara. Si coincide o no, lo decide el servidor aquí: antes
// lo decidía el navegador y el servidor creía lo que le dijeran.
// ══════════════════════════════════════════════════════════════

// Distancia euclidiana máxima para considerar que dos descriptores son
// la misma persona. No cambió con el análisis 020: sigue siendo 0.5.
const FACE_MATCH_THRESHOLD = 0.5;

// Una captura real de cámara nunca da exactamente el mismo descriptor que
// la referencia guardada: aunque sea la misma persona, cambian la luz, el
// ángulo y la distancia. Distancia prácticamente cero significa que lo
// que llegó es la plantilla guardada reenviada, no una captura.
const DISTANCIA_MINIMA_CAPTURA = 0.02;

const LONGITUD_DESCRIPTOR = 128;

// Un descriptor válido: exactamente 128 números finitos.
const fn_descriptorValido = (descriptor) => {
    return Array.isArray(descriptor)
        && descriptor.length === LONGITUD_DESCRIPTOR
        && descriptor.every((n) => typeof n === 'number' && Number.isFinite(n));
};

// En la base el descriptor está guardado como texto JSON.
const fn_parsearDescriptor = (valor) => {
    try {
        const d = typeof valor === 'string' ? JSON.parse(valor) : valor;
        return fn_descriptorValido(d) ? d : null;
    } catch (e) {
        return null;
    }
};

const fn_distancia = (a, b) => {
    let suma = 0;
    for (let i = 0; i < a.length; i++) {
        const d = a[i] - b[i];
        suma += d * d;
    }
    return Math.sqrt(suma);
};

// Similitud que se muestra y se guarda (0 a 1, 4 decimales).
const fn_similitud = (distancia) => Math.round(Math.max(0, 1 - distancia) * 10000) / 10000;

// Compara una captura contra una referencia.
//   { bPlantilla } la captura es la referencia reenviada: se rechaza.
//   { bCoincide }  dentro del umbral.
const fn_comparar = (captura, referencia) => {

    const distancia = fn_distancia(captura, referencia);

    return {
        distancia,
        similitud: fn_similitud(distancia),
        bPlantilla: distancia < DISTANCIA_MINIMA_CAPTURA,
        bCoincide: distancia <= FACE_MATCH_THRESHOLD
    };

};

module.exports = {
    FACE_MATCH_THRESHOLD,
    DISTANCIA_MINIMA_CAPTURA,
    fn_descriptorValido,
    fn_parsearDescriptor,
    fn_comparar
};
