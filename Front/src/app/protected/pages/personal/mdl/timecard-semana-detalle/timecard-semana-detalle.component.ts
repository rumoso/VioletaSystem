import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TimecardService } from 'src/app/protected/services/timecard.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { ActionAuthorizationComponent } from '../../../security/users/mdl/action-authorization/action-authorization.component';
import { TimecardMarcajeManualComponent } from '../timecard-marcaje-manual/timecard-marcaje-manual.component';
import {
  RangoSemana,
  ResumenSemanalItem,
  fn_toISODate,
  fn_diaLargoDesc,
  fn_rangoCorto,
  fn_horasColumna,
  fn_horasColor,
  fn_chipsEstatus
} from '../../timecard-list/semana.util';

// Detalle de una semana para un empleado (analisis/012): agrupado por
// día, con los marcajes ya emparejados en operaciones (Jornada laboral
// / Comida / Permiso especial) que devuelve getAsistenciaList (T5). El
// resumen del encabezado NO se recalcula aquí — viene tal cual del
// listado (resumenItem), para que listado y detalle nunca puedan
// mostrar números distintos de la misma semana.

const GRUPO_ROL_A_TIPO: { [key: string]: string } = {
  'JORNADA:inicio': 'ENTRADA_JORNADA',
  'JORNADA:fin': 'SALIDA_JORNADA',
  'COMIDA:inicio': 'SALIDA_COMIDA',
  'COMIDA:fin': 'ENTRADA_COMIDA',
  'PERMISO:inicio': 'SALIDA_PERMISO',
  'PERMISO:fin': 'ENTRADA_PERMISO'
};

const GRUPO_LABEL: { [key: string]: string } = {
  'JORNADA': 'Jornada laboral',
  'COMIDA': 'Comida',
  'PERMISO': 'Permiso especial'
};

@Component({
  selector: 'app-timecard-semana-detalle',
  templateUrl: './timecard-semana-detalle.component.html',
  styleUrls: ['../personal-catalogo/personal-catalogo.component.css', './timecard-semana-detalle.component.css']
})
export class TimecardSemanaDetalleComponent implements OnInit {

  resumenItem!: ResumenSemanalItem;
  semana!: RangoSemana;
  bModoEdicion: boolean = false;

  bShowSpinner: boolean = false;
  huboCambios: boolean = false;

  dias: any[] = [];
  hoyISO: string = fn_toISODate(new Date());

  constructor(
    private dialogRef: MatDialogRef<TimecardSemanaDetalleComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any

    , private servicesGServ: ServicesGService
    , private timecardServ: TimecardService
    ) { }

  ngOnInit(): void {

    this.resumenItem = this.ODataP.resumenItem;
    this.semana = this.ODataP.semana;
    this.bModoEdicion = !!this.ODataP.bModoEdicion && !this.resumenItem.bPagada;

    this.fn_cargar();

  }

  fn_close() {
    this.dialogRef.close(this.huboCambios);
  }

  get rangoSemanaDesc(): string {
    return fn_rangoCorto(this.semana);
  }

  get horasDesc(): string {
    return fn_horasColumna(this.resumenItem);
  }

  get horasColor(): string {
    return fn_horasColor(this.resumenItem);
  }

  get chips() {
    return fn_chipsEstatus(this.resumenItem);
  }

  get pagoDesc(): string {
    if (this.resumenItem.bPagada) {
      return `Pagada — nómina #${ this.resumenItem.idNomina }`;
    }
    if (this.resumenItem.bEnNominaBorrador) {
      return `Incluida en la nómina #${ this.resumenItem.idNominaBorrador } (borrador)`;
    }
    return 'Pendiente de pago';
  }

  fn_cargar() {

    this.bShowSpinner = true;

    this.timecardServ.CGetAsistenciaList(this.resumenItem.idEmpleado, this.semana.startDate, this.semana.endDate)
      .subscribe({
        next: (resp: any) => {
          this.dias = resp.status === 0 ? (resp.data.dias || []) : [];
          this.bShowSpinner = false;
        },
        error: (ex: HttpErrorResponse) => {
          console.log(ex);
          this.servicesGServ.showSnakbar('Problemas con el servicio');
          this.bShowSpinner = false;
        }
      });

  }

  fn_diaTitulo( dia: any ): string {
    return fn_diaLargoDesc(dia.fecha);
  }

  fn_diaEsFuturo( dia: any ): boolean {
    return dia.fecha > this.hoyISO;
  }

  fn_diaChip( dia: any ): { texto: string, clase: string } | null {
    if (this.fn_diaEsFuturo(dia)) {
      return null;
    }
    if (dia.bDescanso) {
      return { texto: 'Descanso', clase: 'descanso' };
    }
    if (dia.bIncompleta) {
      return { texto: 'Incompleto', clase: 'incompleto' };
    }
    if (dia.bFalta) {
      return { texto: 'Falta', clase: 'falta' };
    }
    if (dia.bRetardo) {
      return { texto: `Retardo ${ dia.minutosRetardo } min`, clase: 'retardo' };
    }
    return { texto: 'Completo', clase: 'completo' };
  }

  fn_operacionLabel( grupo: string ): string {
    return GRUPO_LABEL[grupo] || grupo;
  }

  fn_horaDesc( fechaHora: string | null ): string {
    if (!fechaHora) {
      return '—';
    }
    return new Date(fechaHora).toISOString().substring(11, 16);
  }

  fn_duracionDesc( minutos: number | null ): string {
    if (minutos === null || minutos === undefined) {
      return '—';
    }
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    if (horas === 0) {
      return `${ mins } min`;
    }
    return `${ horas } h ${ mins } min`;
  }

  // ── Captura / corrección manual (analisis/011, mismo camino) ──

  fn_capturarEnDia( dia: any ) {

    if (!this.bModoEdicion) {
      return;
    }

    this.fn_autorizarYAbrirModal({
      fechaHora: `${ dia.fecha } 09:00:00`
    });

  }

  fn_corregirLeg( op: any, rol: 'inicio' | 'fin' ) {

    if (!this.bModoEdicion) {
      return;
    }

    const idMarcaje = rol === 'inicio' ? op.idMarcajeInicio : op.idMarcajeFin;
    const fechaHora = rol === 'inicio' ? op.inicio : op.fin;

    if (!idMarcaje) {
      return;
    }

    this.fn_autorizarYAbrirModal({
      idMarcajeCorrige: idMarcaje,
      tipo: GRUPO_ROL_A_TIPO[`${ op.grupo }:${ rol }`],
      fechaHora
    });

  }

  private fn_autorizarYAbrirModal( extra: any ) {

    this.servicesGServ.showModalWithParams(ActionAuthorizationComponent, {
      actionName: 'timecard_CapturarManual'
      , bShowAlert: false
    }, '400px')
    .afterClosed().subscribe({
      next: (auth_idUser: any) => {

        if (!auth_idUser) {
          return;
        }

        this.servicesGServ.showModalWithParams(TimecardMarcajeManualComponent, {
          idEmpleado: this.resumenItem.idEmpleado,
          nombreEmpleado: this.resumenItem.nombre,
          auth_idUser,
          ...extra
        }, '440px')
        .afterClosed().subscribe({
          next: (huboCambios: any) => {
            if (huboCambios) {
              this.huboCambios = true;
              this.fn_cargar();
              this.fn_refrescarResumen();
            }
          }
        });

      }
    });

  }

  // Tras corregir un marcaje, el encabezado (horas/chips) de ESTE
  // modal también debe reflejarlo — si no, se queda mostrando el
  // resumen viejo con el que se abrió hasta que se cierre y se
  // reabra. El listado detrás se refresca aparte, al cerrar (huboCambios).
  private fn_refrescarResumen() {

    this.timecardServ.CGetAsistenciaSemanal(this.semana.startDate, this.semana.endDate, this.resumenItem.idEmpleado)
      .subscribe({
        next: (resp: any) => {
          if (resp.status === 0 && resp.data && resp.data.length > 0) {
            this.resumenItem = resp.data[0];
          }
        },
        error: () => { /* el encabezado se queda con el valor previo, no es bloqueante */ }
      });

  }

}
