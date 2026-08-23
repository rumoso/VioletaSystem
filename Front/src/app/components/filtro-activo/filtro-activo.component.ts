import { Component, EventEmitter, Input, Output } from '@angular/core';

// Aviso de "filtro activo" (analisis/015-clics-con-filtro-panel.md).
//
// Se llega a un listado desde un clic del panel del director ya
// filtrado — sin este aviso, la pantalla se ve idéntica a cuando no
// trae ningún filtro y el usuario cree que la tienda solo tiene, por
// ejemplo, 32 notas en total. El aviso dice en palabras qué filtro
// trae puesto y deja quitarlo con una "×" para ver el listado completo.
@Component({
  selector: 'app-filtro-activo',
  templateUrl: './filtro-activo.component.html',
  styleUrls: ['./filtro-activo.component.css']
})
export class FiltroActivoComponent {

  // Cada entrada es una descripción ya redactada en palabras del
  // usuario ("Solo notas con saldo", "Apartados", "Más de 90 días") —
  // el componente no sabe nada de nombres de campos ni de SPs, cada
  // pantalla arma su propia lista de etiquetas según lo que trae en el
  // query param.
  @Input() IEtiquetas: string[] = [];

  @Output() OQuitar = new EventEmitter<void>();

  get bVisible(): boolean {
    return ( this.IEtiquetas || [] ).length > 0;
  }

  fn_quitar(): void {
    this.OQuitar.emit();
  }

}
