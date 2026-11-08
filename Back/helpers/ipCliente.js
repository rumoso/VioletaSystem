// IP del equipo que hace la petición (analisis/039).
//
// `req.ip` ya toma en cuenta `trust proxy` (models/server.js): sin proxy es
// la IP de la PC; con un proxy https en el propio servidor, la que el
// proxy manda en X-Forwarded-For. Aquí solo se normaliza:
//   ::ffff:192.168.1.5 → 192.168.1.5     ::1 → 127.0.0.1
const fn_ipCliente = (req) => {

    let ip = (req && (req.ip || (req.socket && req.socket.remoteAddress))) || '';

    ip = String(ip).trim();

    if (ip.startsWith('::ffff:')) {
        ip = ip.substring(7);
    }

    if (ip === '::1') {
        ip = '127.0.0.1';
    }

    return ip.substring(0, 45);
};

module.exports = { fn_ipCliente };
