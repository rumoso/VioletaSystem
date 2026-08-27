import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, debounceTime } from 'rxjs';
import { ResponseGet } from 'src/app/protected/interfaces/global.interfaces';
import { SalesService } from 'src/app/protected/services/sales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

// Levantar una garantía sobre un taller ya ENTREGADO
// (analisis/016-garantias-taller.md).
//
// Se abre de dos formas y el resultado es el mismo:
//  - desde la consulta de taller, con el buscador para elegir el folio;
//  - desde el detalle de un folio entregado, que llega preseleccionado
//    (ODataP.oTallerOrigen) y entonces el buscador ni se muestra.
//
// El cliente y el vendedor se muestran pero NO se capturan: los hereda
// el Back del taller de origen, para que no se puedan alterar aquí.
@Component({
  selector: 'app-garantia',
  templateUrl: './garantia.component.html',
  styleUrls: ['./garantia.component.css']
})
export class GarantiaComponent {

  bShowSpinner: boolean = false;
  bGuardando: boolean = false;

  // Taller de origen elegido (o el que llegó preseleccionado).
  oTallerOrigen: any = null;

  // Buscador
  sBusqueda: string = '';
  aTalleres: any[] = [];
  iEncontrados: number = 0;
  bBuscado: boolean = false;

  descripcion: string = '';

  private timeBusqueda: Subject<string> = new Subject<string>();

  constructor(
    private dialogRef: MatDialogRef<GarantiaComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any
    , private salesServ: SalesService
    , private servicesGServ: ServicesGService
  ) { }

  ngOnInit(): void {

    // Si viene preseleccionado desde el detalle de un folio, no se
    // muestra el buscador — ya se sabe sobre cuál se va a levantar.
    if( this.ODataP?.oTallerOrigen ){
      this.oTallerOrigen = this.ODataP.oTallerOrigen;
    }else{
      this.fn_buscar();
    }

    this.timeBusqueda
      .pipe( debounceTime(400) )
      .subscribe(() => this.fn_buscar());

  }

  get bPuedeGuardar(): boolean {
    return !!this.oTallerOrigen
        && this.descripcion.trim().length > 0
        && !this.bGuardando;
  }

  ev_fn_busqueda_keyup(): void {
    this.timeBusqueda.next( this.sBusqueda );
  }

  fn_buscar(): void {

    this.bShowSpinner = true;

    this.salesServ.CGetTalleresParaGarantia( this.sBusqueda, 0, 15 )
    .subscribe({
      next: ( resp: ResponseGet ) => {
        this.bShowSpinner = false;
        this.bBuscado = true;
        if( resp.status === 0 ){
          this.aTalleres = resp.data.rows || [];
          this.iEncontrados = resp.data.count || 0;
        }else{
          this.aTalleres = [];
          this.iEncontrados = 0;
        }
      },
      error: () => {
        this.bShowSpinner = false;
        this.bBuscado = true;
        this.servicesGServ.showSnakbar('Problemas con el servicio');
      }
    });

  }

  fn_seleccionar( oTaller: any ): void {
    this.oTallerOrigen = oTaller;
  }

  fn_cambiarTaller(): void {
    // Solo se permite cambiar si el modal se abrió desde el buscador.
    // Si llegó preseleccionado, el folio es el que es.
    if( this.ODataP?.oTallerOrigen ){
      return;
    }
    this.oTallerOrigen = null;
  }

  fn_guardar(): void {

    if( !this.bPuedeGuardar ){
      return;
    }

    this.bGuardando = true;

    this.salesServ.CInsertGarantiaByTaller( this.oTallerOrigen.idTaller, this.descripcion.trim() )
    .subscribe({
      next: ( resp: ResponseGet ) => {

        this.bGuardando = false;

        if( resp.status === 0 ){
          this.servicesGServ.showSnakbar( resp.message );
          // Se devuelve el folio nuevo para que quien abrió el modal
          // pueda llevar al usuario directo a la garantía recién creada.
          this.dialogRef.close( resp.data );
        }else{
          // status 1 son las reglas de negocio (no entregado, ya es
          // garantía, folio duplicado...): el mensaje del Back ya
          // explica cuál, así que se muestra tal cual.
          this.servicesGServ.showAlert('W', 'No se pudo crear la garantía', resp.message, false);
        }

      },
      error: () => {
        this.bGuardando = false;
        this.servicesGServ.showSnakbar('Problemas con el servicio');
      }
    });

  }

  fn_cerrar(): void {
    this.dialogRef.close();
  }

}
