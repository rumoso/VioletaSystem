// Shim minimo: @vladmandic/face-api declara un overload de Node
// (Buffer) en sus tipos, pero solo usamos el bundle de navegador.
// El tsconfig del Front no incluye @types/node ("types": []), así que
// sin esto el build falla por un tipo que nunca se usa en runtime.
declare type Buffer = any;
