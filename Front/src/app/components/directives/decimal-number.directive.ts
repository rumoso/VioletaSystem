import { Directive, ElementRef, HostListener } from '@angular/core';

/**
 * Permite capturar solo números con hasta 2 decimales.
 *
 * Ojo con dos detalles que antes rompían la captura:
 *
 *  - Se respeta el TEXTO SELECCIONADO: al teclear encima de una
 *    selección, lo escrito la reemplaza. Antes se pegaba la tecla al
 *    final del valor completo, así que sobre "91.35" seleccionado,
 *    teclear "5" se evaluaba como "91.355" (3 decimales) y se
 *    bloqueaba: el campo quedaba imposible de modificar.
 *
 *  - No se estorba a los atajos (Ctrl/Cmd + A, C, V, Z...).
 */
@Directive({
  selector: '[appDecimalNumber]'
})
export class DecimalNumberDirective {

  // Sin el flag /g: con .test() el flag global mantiene lastIndex entre
  // llamadas y hace que la validación falle de forma intermitente.
  private regex: RegExp = new RegExp(/^\d*\.?\d{0,2}$/);
  private specialKeys: Array<string> = ['Backspace', 'Tab', 'End', 'Home', 'ArrowLeft', 'ArrowRight', 'Delete', 'Enter', 'Escape'];

  constructor(private el: ElementRef) {
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {

    if (this.specialKeys.indexOf(event.key) !== -1) {
      return;
    }

    // Atajos del teclado: copiar, pegar, seleccionar todo, deshacer.
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    // Solo interesa validar la escritura de un carácter.
    if (event.key.length !== 1) {
      return;
    }

    if (!this.esValido(this.valorResultante(event.key))) {
      event.preventDefault();
    }

  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {

    const sPegado = event.clipboardData?.getData('text') ?? '';

    if (!this.esValido(this.valorResultante(sPegado))) {
      event.preventDefault();
    }

  }

  /** Cómo quedaría el valor si se escribe/pega `sTexto` ahora mismo. */
  private valorResultante(sTexto: string): string {

    const oInput = this.el.nativeElement as HTMLInputElement;
    const sActual: string = oInput.value ?? '';

    const iInicio = oInput.selectionStart ?? sActual.length;
    const iFin = oInput.selectionEnd ?? sActual.length;

    return sActual.slice(0, iInicio) + sTexto + sActual.slice(iFin);

  }

  private esValido(sValor: string): boolean {
    return sValor === '' || this.regex.test(sValor);
  }

}
