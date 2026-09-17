// Reglas de contraseña segura. Las mismas que valida el Back
// (Back/helpers/pwdSegura.js): si cambian aquí, cambiarlas allá.

export interface ReglaPwd {
  texto: string;
  ok: boolean;
}

const REGLAS_PWD: { texto: string; fn: (p: string) => boolean }[] = [
  { texto: 'Al menos 8 caracteres', fn: (p) => p.length >= 8 },
  { texto: 'Al menos una letra mayúscula', fn: (p) => /[A-Z]/.test(p) },
  { texto: 'Al menos una letra minúscula', fn: (p) => /[a-z]/.test(p) },
  { texto: 'Al menos un número', fn: (p) => /[0-9]/.test(p) },
  { texto: 'Al menos un carácter especial (-_.,$@^!%*?&#)', fn: (p) => /[-_.,$@^!%*?&#]/.test(p) },
  { texto: 'Sin espacios', fn: (p) => !/\s/.test(p) }
];

export const fn_evaluarPwd = ( pwd: string | null | undefined ): ReglaPwd[] => {
  const p = String(pwd || '');
  return REGLAS_PWD.map((r) => ({ texto: r.texto, ok: r.fn(p) }));
};

export const fn_pwdSegura = ( pwd: string | null | undefined ): boolean =>
  fn_evaluarPwd(pwd).every((r) => r.ok);
