import { Injectable } from '@angular/core';

// Título y descripción de la pantalla actual, mostrados en el header
// (topbar) en vez de repetirlos dentro de cada pantalla — ahorra ese
// espacio. Cada pantalla llama `set()` en su `ngOnInit` y `clear()` en
// su `ngOnDestroy` para no dejar el título "pegado" al navegar a una
// pantalla que no lo usa (ej. el dashboard).
//
// Sin manejo de secciones por ahora (a diferencia de La Rebanada): la
// flecha de "volver" del header siempre regresa al dashboard.

@Injectable({
  providedIn: 'root'
})
export class PageTitleService {

  icon: string = '';
  title: string = '';
  desc: string = '';

  set( icon: string, title: string, desc: string = '' ) {
    this.icon = icon;
    this.title = title;
    this.desc = desc;
  }

  clear() {
    this.icon = '';
    this.title = '';
    this.desc = '';
  }

}
