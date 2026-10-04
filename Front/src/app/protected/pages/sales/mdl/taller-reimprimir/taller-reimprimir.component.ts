import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { PrintTicketService } from 'src/app/protected/services/print-ticket.service';

/**
 * Reimpresión de los tickets de un folio de taller (analisis/030).
 *
 * El folio se imprime para tres destinatarios con el MISMO contenido
 * (cliente, taller y un ticket por técnico); antes el botón de reimprimir
 * sacaba un solo papel sin decir para quién era. Aquí se elige qué
 * reimprimir: uno, varios o todos.
 *
 * Reimprimir no cambia nada del folio (no mueve estatus ni genera
 * movimientos), por eso funciona con el folio bloqueado, entregado o
 * cancelado.
 */
@Component({
  selector: 'app-taller-reimprimir',
  templateUrl: './taller-reimprimir.component.html',
  styleUrls: ['./taller-reimprimir.component.css']
})
export class TallerReimprimirComponent {

  //#region VARIABLES

  bShowSpinner: boolean = false;

  idTaller: number = 0;
  idSale: any = '';
  idPrinter: number = 0;

  bCliente: boolean = true;
  bTaller: boolean = true;

  // Un renglón por técnico DISTINTO del folio: si un técnico tiene varios
  // renglones de mano de obra sigue siendo UN ticket.
  aTecnicos: any[] = [];

  //#endregion

  constructor(
    private dialogRef: MatDialogRef<TallerReimprimirComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any
    , private servicesGServ: ServicesGService
    , private printTicketServ: PrintTicketService
  ) { }

  ngOnInit(): void {

    this.idTaller = Number(this.ODataP?.idTaller) || 0;
    this.idSale = this.ODataP?.idSale || '';
    this.idPrinter = Number(this.ODataP?.selectPrinter?.idPrinter) || 0;

    this.aTecnicos = this.fn_tecnicosDelFolio(this.ODataP?.manoObraList || []);

  }

  // Técnicos distintos por idUserTecnico. Se calcula aquí (y no se recibe
  // ya filtrado) para que el modal sirva desde cualquier llamador que
  // tenga la mano de obra del folio.
  private fn_tecnicosDelFolio(manoObraList: any[]): any[] {
    const aTecnicos: any[] = [];
    for (const mo of manoObraList) {
      const idTecnico = Number(mo.idUserTecnico) || 0;
      if (idTecnico <= 0) { continue; }
      if (!aTecnicos.some(t => t.idUserTecnico === idTecnico)) {
        aTecnicos.push({
          idUserTecnico: idTecnico,
          tecnicoDesc: mo.tecnicoDesc || 'Sin nombre',
          bSeleccionado: true
        });
      }
    }
    return aTecnicos;
  }

  //#region MÉTODOS DEL FRONT

  get iSeleccionados(): number {
    let iTotal = 0;
    if (this.bCliente) { iTotal++; }
    if (this.bTaller) { iTotal++; }
    iTotal += this.aTecnicos.filter(t => t.bSeleccionado).length;
    return iTotal;
  }

  fn_seleccionarTodos() {
    this.bCliente = true;
    this.bTaller = true;
    this.aTecnicos.forEach(t => t.bSeleccionado = true);
  }

  fn_seleccionarNinguno() {
    this.bCliente = false;
    this.bTaller = false;
    this.aTecnicos.forEach(t => t.bSeleccionado = false);
  }

  fn_CerrarMDL() {
    this.dialogRef.close();
  }

  //#endregion

  //#region IMPRESIÓN

  /**
   * Manda los tickets seleccionados uno por uno. Si uno falla se avisa
   * cuál y se siguen intentando los demás: que no se pueda imprimir el
   * del técnico no debe dejar al cliente sin su papel.
   */
  async fn_imprimir() {

    if (this.idPrinter <= 0) {
      this.servicesGServ.showSnakbar('No hay impresora seleccionada');
      return;
    }

    if (this.iSeleccionados === 0) {
      this.servicesGServ.showSnakbar('Selecciona al menos un ticket para reimprimir');
      return;
    }

    // Lista plana de lo que hay que imprimir, en el orden en que se ve en
    // pantalla: cliente, taller y después cada técnico.
    const aTickets: any[] = [];

    if (this.bCliente) {
      aTickets.push({ destinatario: 'CLIENTE', nombre: '', etiqueta: 'Cliente' });
    }

    if (this.bTaller) {
      aTickets.push({ destinatario: 'TALLER', nombre: '', etiqueta: 'Taller' });
    }

    for (const tecnico of this.aTecnicos) {
      if (tecnico.bSeleccionado) {
        aTickets.push({
          destinatario: 'TECNICO',
          nombre: tecnico.tecnicoDesc,
          etiqueta: 'Técnico ' + tecnico.tecnicoDesc
        });
      }
    }

    this.bShowSpinner = true;

    const aFallaron: string[] = [];

    for (const ticket of aTickets) {
      try {
        const bOK = await this.printTicketServ.printTicketTaller(
          'TallerHeader'
          , this.idTaller
          , this.idPrinter
          , 1
          , false
          , false
          , ticket.destinatario
          , ticket.nombre
        );

        if (!bOK) {
          aFallaron.push(ticket.etiqueta);
        }
      } catch (ex) {
        aFallaron.push(ticket.etiqueta);
      }
    }

    this.bShowSpinner = false;

    if (aFallaron.length === 0) {
      this.servicesGServ.showSnakbar(
        aTickets.length === 1
          ? 'Ticket enviado a la impresora'
          : aTickets.length + ' tickets enviados a la impresora'
      );
      this.fn_CerrarMDL();
    } else {
      // Se dice exactamente cuál no salió para que se pueda reintentar
      // solo ese; el modal se queda abierto a propósito.
      this.servicesGServ.showSnakbar('No se pudo imprimir: ' + aFallaron.join(', '));
    }

  }

  //#endregion

}
