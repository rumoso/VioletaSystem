import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { NominaConceptosService } from 'src/app/protected/services/nomina-conceptos.service';
import { NominaService } from 'src/app/protected/services/nomina.service';
import { PrinterPDFService } from 'src/app/protected/services/printer-pdf.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { ActionAuthorizationComponent } from '../../../security/users/mdl/action-authorization/action-authorization.component';

// Recibo de un empleado dentro de una nómina (analisis/007), en
// formato de estado de cuenta contable: columna de percepciones y
// columna de deducciones, con sus totales abajo. Misma mecánica de
// captura rápida que el listado base de conceptos: combo → foco al
// monto con texto seleccionado → Enter agrega/guarda. Editable solo
// si la nómina sigue en BORRADOR y, además, con autorización especial
// por código/rostro (permiso nomina_EditarConceptos) — se pide una vez
// al empezar a editar, válida mientras el modal siga abierto.
//
// Trae también Pagar/Cancelar/Eliminar de la nómina completa (mismas
// acciones que nomina-detalle) porque, cuando una corrida tiene un
// solo empleado, nomina-list abre este recibo directo sin pasar por
// el detalle — así no se pierde acceso a esas acciones.

@Component({
  selector: 'app-nomina-recibo',
  templateUrl: './nomina-recibo.component.html',
  styleUrls: ['../empleado/empleado.component.css', '../../personal-catalogo-list/personal-catalogo-list.component.css', './nomina-recibo.component.css']
})
export class NominaReciboComponent implements OnInit {

  idNominaRecibo: number = 0;

  bShowSpinner: boolean = false;
  recibo: any = null;
  detalle: any[] = [];
  conceptosDisponibles: any[] = [];

  banner: { tipo: 'ok' | 'error'; mensaje: string } | null = null;

  nuevoConceptoControl: FormControl = new FormControl(null);
  nuevoMontoControl: FormControl = new FormControl('');
  conceptoEditando: any = null;

  // Autorización especial para editar (código/rostro), pedida una sola
  // vez y válida mientras este modal siga abierto.
  bAutorizado: boolean = false;
  authIdUser: number = 0;

  // Fecha en que se está viendo/generando este recibo (para el
  // encabezado y para el Excel exportado).
  fechaGeneracion: Date = new Date();

  @ViewChild('montoInput') montoInputRef!: ElementRef<HTMLInputElement>;

  constructor(
    private dialogRef: MatDialogRef<NominaReciboComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any

    , private authServ: AuthService
    , private servicesGServ: ServicesGService
    , private nominaServ: NominaService
    , private nominaConceptosServ: NominaConceptosService
    , private printerServ: PrinterPDFService
    ) {
      this.dialogRef.disableClose = true;
    }

  ngOnInit(): void {
    this.idNominaRecibo = this.ODataP.idNominaRecibo;
    this.fn_cargar();
  }

  fn_hasPermission( name: string ): boolean {
    return this.authServ.hasPermissionAction(name);
  }

  get bSoloLectura(): boolean {
    return !this.recibo || this.recibo.estatusNomina !== 'BORRADOR';
  }

  // Mismo criterio de bucketing que el Back (_fn_calcularTotales en
  // nominaController.js): "Comisiones" es la única línea que puede
  // caer en deducciones aunque esté tipada PERCEPCION, según su signo.
  get percepciones(): any[] {
    return this.detalle.filter(d => d.bEsComisiones ? Number(d.monto) >= 0 : d.tipo === 'PERCEPCION');
  }

  get deducciones(): any[] {
    return this.detalle.filter(d => d.bEsComisiones ? Number(d.monto) < 0 : d.tipo === 'DEDUCCION');
  }

  get conceptosParaCombo(): any[] {
    const yaEnRecibo = new Set(this.detalle.filter(d => !this.conceptoEditando || d.id !== this.conceptoEditando.id).map(d => d.conceptoDesc));
    let lista = this.conceptosDisponibles.filter(c => !yaEnRecibo.has(c.name));
    if (this.conceptoEditando) {
      lista = [{ id: this.conceptoEditando.idNominaConcepto, name: this.conceptoEditando.conceptoDesc, tipo: this.conceptoEditando.tipo }, ...lista];
    }
    return lista;
  }

  private fn_cargar() {

    this.bShowSpinner = true;
    this.nominaServ.CGetRecibo(this.idNominaRecibo)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.bShowSpinner = false;
          if (resp.status === 0) {
            this.recibo = resp.data.recibo;
            this.detalle = resp.data.detalle;
          }
        },
        error: () => { this.bShowSpinner = false; }
      });

    this.nominaConceptosServ.CCbxGetConceptosActivos(0)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.conceptosDisponibles = resp.status === 0 ? (resp.data || []) : [];
        },
        error: () => { this.conceptosDisponibles = []; }
      });
  }

  // Pide el código/rostro de alguien con nomina_EditarConceptos; si lo
  // obtiene, desbloquea agregar/editar/quitar para el resto de esta
  // sesión del modal.
  fn_solicitarAutorizacion() {

    this.servicesGServ.showModalWithParams(ActionAuthorizationComponent, {
      actionName: 'nomina_EditarConceptos'
      , bShowAlert: false
    }, '400px')
    .afterClosed().subscribe({
      next: (auth_idUser: any) => {
        if (auth_idUser) {
          this.bAutorizado = true;
          this.authIdUser = auth_idUser;
        }
      }
    });
  }

  fn_focusMonto() {
    setTimeout(() => {
      const input = this.montoInputRef?.nativeElement;
      if (input) { input.focus(); input.select(); }
    }, 0);
  }

  fn_editarConcepto( item: any ) {
    this.banner = null;
    this.conceptoEditando = item;
    this.nuevoConceptoControl.setValue(this.conceptosParaCombo.find(c => c.name === item.conceptoDesc) || null);
    this.nuevoMontoControl.setValue(item.monto);
    this.fn_focusMonto();
  }

  fn_cancelarEdicion() {
    this.conceptoEditando = null;
    this.nuevoConceptoControl.setValue(null);
    this.nuevoMontoControl.setValue('');
  }

  fn_guardarConcepto() {

    this.banner = null;

    const concepto = this.nuevoConceptoControl.value;
    const monto = Number(this.nuevoMontoControl.value);

    if (!concepto) {
      this.banner = { tipo: 'error', mensaje: 'Selecciona el concepto.' };
      return;
    }
    if (this.conceptoEditando?.bEsComisiones ? monto === 0 : !(monto > 0)) {
      this.banner = { tipo: 'error', mensaje: 'Captura un monto válido.' };
      return;
    }

    this.nominaServ.CInsertUpdateReciboDetalle({
      id: this.conceptoEditando ? this.conceptoEditando.id : 0,
      idNominaRecibo: this.idNominaRecibo,
      idNominaConcepto: concepto.id,
      conceptoDesc: concepto.name,
      tipo: concepto.tipo,
      monto,
      auth_idUser: this.authIdUser
    }).subscribe({
      next: (resp: any) => {
        if (resp.status === 0) {
          this.fn_cancelarEdicion();
          this.fn_cargar();
        } else {
          this.banner = { tipo: 'error', mensaje: resp.message };
        }
      },
      error: () => { this.banner = { tipo: 'error', mensaje: 'Problemas con el servicio.' }; }
    });
  }

  fn_quitarConcepto( item: any ) {

    this.servicesGServ.showDialog('¿Estás seguro?'
      , `Está a punto de quitar "${ item.conceptoDesc }" del recibo`
      , '¿Desea continuar?'
      , 'Si', 'No')
    .afterClosed().subscribe({
      next: (resp) => {
        if (resp) {
          this.nominaServ.CDeleteReciboDetalle(item.id, this.authIdUser)
            .subscribe({
              next: (resp2: any) => {
                this.servicesGServ.showSnakbar(resp2.message);
                if (resp2.status === 0) {
                  this.fn_cargar();
                }
              },
              error: () => { this.servicesGServ.showSnakbar('Problemas con el servicio'); }
            });
        }
      }
    });
  }

  fn_exportarPDF() {
    this.printerServ.generarPDFReciboNomina(this.recibo, this.percepciones, this.deducciones);
  }

  // ---- Pagar / cancelar / eliminar la nómina completa (mismas
  // acciones y permisos que nomina-detalle) ----

  fn_pagar() {

    this.servicesGServ.showDialog('¿Confirmar pago?'
      , `Está a punto de pagar esta nómina por un total de ${ this.recibo.neto } (neto). Después de pagar no se puede editar.`
      , '¿Desea continuar?'
      , 'Si', 'No')
    .afterClosed().subscribe({
      next: (resp) => {
        if (resp) {
          this.bShowSpinner = true;
          this.nominaServ.CPagar(this.recibo.idNomina)
            .subscribe({
              next: (resp2: any) => {
                this.servicesGServ.showSnakbar(resp2.message);
                this.bShowSpinner = false;
                if (resp2.status === 0) {
                  this.fn_cargar();
                }
              },
              error: (ex: HttpErrorResponse) => {
                console.log(ex)
                this.servicesGServ.showSnakbar('Problemas con el servicio');
                this.bShowSpinner = false;
              }
            });
        }
      }
    });
  }

  fn_cancelar() {

    const motivo = window.prompt('Motivo para cancelar esta nómina pagada:');

    if (motivo === null) {
      return;
    }
    if (!motivo.trim()) {
      this.servicesGServ.showSnakbar('El motivo es obligatorio.');
      return;
    }

    this.bShowSpinner = true;
    this.nominaServ.CCancelar(this.recibo.idNomina, motivo.trim())
      .subscribe({
        next: (resp2: any) => {
          this.servicesGServ.showSnakbar(resp2.message);
          this.bShowSpinner = false;
          if (resp2.status === 0) {
            this.fn_cargar();
          }
        },
        error: (ex: HttpErrorResponse) => {
          console.log(ex)
          this.servicesGServ.showSnakbar('Problemas con el servicio');
          this.bShowSpinner = false;
        }
      });
  }

  fn_eliminar() {

    this.servicesGServ.showDialog('¿Estás seguro?'
      , `Está a punto de ELIMINAR POR COMPLETO esta nómina. Esta acción no se puede deshacer.`
      , '¿Desea continuar?'
      , 'Si', 'No')
    .afterClosed().subscribe({
      next: (resp) => {
        if (resp) {
          this.bShowSpinner = true;
          this.nominaServ.CDelete(this.recibo.idNomina)
            .subscribe({
              next: (resp2: any) => {
                this.servicesGServ.showSnakbar(resp2.message);
                this.bShowSpinner = false;
                if (resp2.status === 0) {
                  this.dialogRef.close(true);
                }
              },
              error: (ex: HttpErrorResponse) => {
                console.log(ex)
                this.servicesGServ.showSnakbar('Problemas con el servicio');
                this.bShowSpinner = false;
              }
            });
        }
      }
    });
  }

  fn_close() {
    this.dialogRef.close(true);
  }

}
