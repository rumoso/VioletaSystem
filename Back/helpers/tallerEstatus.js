// Flujo de estatus del taller — fuente única
// (analisis/029-encargado-de-taller-y-bloqueo.md).
//
// El id del estatus NO dice el orden: "Encargado de taller" se agregó
// como 8 para no renumerar los folios y bitácoras que ya apuntan a 4-7.
// El orden real vive aquí y en `taller_status_cat.orden`.

const ESTATUS = {
    COTIZACION: 1,
    PEDIDO: 2,
    ASIGNADO: 3,
    ENCARGADO: 8,
    MOSTRADOR: 4,
    ENTREGADO: 5,
    DEVOLUCION: 6,
    CANCELADO: 7
};

const ORDEN = {
    [ESTATUS.COTIZACION]: 1,
    [ESTATUS.PEDIDO]: 2,
    [ESTATUS.ASIGNADO]: 3,
    [ESTATUS.ENCARGADO]: 4,
    [ESTATUS.MOSTRADOR]: 5,
    [ESTATUS.ENTREGADO]: 6,
    [ESTATUS.DEVOLUCION]: 7,
    [ESTATUS.CANCELADO]: 8
};

// Transiciones que acepta `updateTallerStatus`. La cancelación (7) no
// está aquí: va por `cancelarTaller`, con su propia autorización y sus
// reversas. El paso ENCARGADO -> MOSTRADOR tampoco: lo hace
// `aceptarTallerComoEncargado`, que valida quién acepta.
const _TRANSICIONES = {
    [ESTATUS.COTIZACION]: [ ESTATUS.PEDIDO ],
    [ESTATUS.PEDIDO]: [ ESTATUS.ASIGNADO ],
    [ESTATUS.ASIGNADO]: [ ESTATUS.ENCARGADO ],
    [ESTATUS.ENCARGADO]: [ ESTATUS.ASIGNADO ],                   // rechazo del encargado
    [ESTATUS.MOSTRADOR]: [ ESTATUS.ENTREGADO ],
    [ESTATUS.ENTREGADO]: [ ESTATUS.DEVOLUCION ],
    [ESTATUS.DEVOLUCION]: [],
    [ESTATUS.CANCELADO]: []
};

// Permiso que exige cada destino. El de mostrador lo revisa el endpoint
// de aceptación, no este mapa.
const PERMISO_POR_ESTATUS = {
    [ESTATUS.ASIGNADO]: 'tall_AssignOrder',
    [ESTATUS.ENCARGADO]: 'tall_PasarAEncargado',
    [ESTATUS.MOSTRADOR]: 'tall_FinalizeOrder',
    [ESTATUS.ENTREGADO]: 'tall_DeliverOrder',
    [ESTATUS.DEVOLUCION]: 'tall_DevolutionClient'
};

// Las ÓRDENES RÁPIDAS no pasan por técnico, encargado ni mostrador: nacen
// como Pedido (con folio de rápida) y de ahí se entregan de un golpe. Por
// eso el salto Pedido -> Entregado solo vale para ellas.
const fn_transicionValida = (actual, destino, bRapida = false) => {
    const a = Number(actual), d = Number(destino);

    if ( bRapida && a === ESTATUS.PEDIDO && d === ESTATUS.ENTREGADO ) {
        return true;
    }

    return ( _TRANSICIONES[a] || [] ).includes(d);
};

// Bloqueado = de Finalizado/Mostrador en adelante. Se deduce del estatus
// a propósito: una bandera aparte se desincroniza.
const fn_estaBloqueado = (idTallerStatus) => {
    const s = Number(idTallerStatus);
    return s === ESTATUS.MOSTRADOR || s === ESTATUS.ENTREGADO
        || s === ESTATUS.DEVOLUCION || s === ESTATUS.CANCELADO;
};

// Mientras el folio está con el encargado solo lo edita él (o quien
// traiga la autorización especial).
const fn_esEditablePorEncargado = (idTallerStatus) => Number(idTallerStatus) === ESTATUS.ENCARGADO;

// Un folio entregado ya no regresa: solo devolución o cancelación.
const fn_puedeRegresarEstatus = (idTallerStatus) => Number(idTallerStatus) === ESTATUS.MOSTRADOR;

// Hasta dónde se puede regresar un folio bloqueado: Pedido de taller.
// Nunca a Cotización, porque el folio real ya está generado.
const fn_destinoRegresoValido = (idTallerStatusDestino) => {
    const d = Number(idTallerStatusDestino);
    return d === ESTATUS.PEDIDO || d === ESTATUS.ASIGNADO || d === ESTATUS.ENCARGADO;
};

module.exports = {
    ESTATUS
    , ORDEN
    , PERMISO_POR_ESTATUS
    , fn_transicionValida
    , fn_estaBloqueado
    , fn_esEditablePorEncargado
    , fn_puedeRegresarEstatus
    , fn_destinoRegresoValido
};
