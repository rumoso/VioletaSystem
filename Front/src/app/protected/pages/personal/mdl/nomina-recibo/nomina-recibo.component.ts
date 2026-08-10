import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { NominaConceptosService } from 'src/app/protected/services/nomina-conceptos.service';
import { NominaService } from 'src/app/protected/services/nomina.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

// Recibo de un empleado dentro de una nómina (analisis/007). Misma
// mecánica de captura rápida que el listado base de conceptos: combo
// → foco al monto con texto seleccionado → Enter agrega/guarda.
// Solo editable si la nómina sigue en BORRADOR.

@Component({
  selector: 'app-nomina-recibo',
  templateUrl: './nomina-recibo.component.html',
  styleUrls: ['../empleado/empleado.component.css', './nomina-recibo.component.css']
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

  @ViewChild('montoInput') montoInputRef!: ElementRef<HTMLInputElement>;

  constructor(
    private dialogRef: MatDialogRef<NominaReciboComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any

    , private servicesGServ: ServicesGService
    , private nominaServ: NominaService
    , private nominaConceptosServ: NominaConceptosService
    ) {
      this.dialogRef.disableClose = true;
    }

  ngOnInit(): void {
    this.idNominaRecibo = this.ODataP.idNominaRecibo;
    this.fn_cargar();
  }

  get bSoloLectura(): boolean {
    return !this.recibo || this.recibo.estatusNomina !== 'BORRADOR';
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
      monto
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
          this.nominaServ.CDeleteReciboDetalle(item.id)
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

  fn_close() {
    this.dialogRef.close(true);
  }

}
