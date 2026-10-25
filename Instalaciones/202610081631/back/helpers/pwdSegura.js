// Reglas de contraseña segura. Las mismas que muestra el Front mientras se
// escribe (Front/src/app/protected/utils/pwd-segura.util.ts): si cambian
// aquí, cambiarlas allá.

const REGLAS_PWD = [
    { texto: 'Al menos 8 caracteres', fn: (p) => p.length >= 8 },
    { texto: 'Al menos una letra mayúscula', fn: (p) => /[A-Z]/.test(p) },
    { texto: 'Al menos una letra minúscula', fn: (p) => /[a-z]/.test(p) },
    { texto: 'Al menos un número', fn: (p) => /[0-9]/.test(p) },
    { texto: 'Al menos un carácter especial (-_.,$@^!%*?&#)', fn: (p) => /[-_.,$@^!%*?&#]/.test(p) },
    { texto: 'Sin espacios', fn: (p) => !/\s/.test(p) }
];

// Regresa la lista de reglas que NO cumple (vacía = segura).
const fn_reglasIncumplidas = (pwd) => {
    const p = String(pwd || '');
    return REGLAS_PWD.filter((r) => !r.fn(p)).map((r) => r.texto);
};

module.exports = {
    fn_reglasIncumplidas
};
