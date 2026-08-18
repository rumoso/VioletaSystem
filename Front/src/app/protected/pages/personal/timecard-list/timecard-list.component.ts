import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { EmpleadosService } from 'src/app/protected/services/empleados.service';
import { TimecardService } from 'src/app/protected/services/timecard.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { PageTitleService } from 'src/app/protected/services/page-title.service';
import { HorarioSucursalComponent } from '../mdl/horario-sucursal/horario-sucursal.component';
import { TimecardSemanaDetalleComponent } from '../mdl/timecard-semana-detalle/timecard-semana-detalle.component';
import {
  RangoSemana,
  ResumenSemanalItem,
  fn_semanaDeFecha,
  fn_rangoConsulta,
  fn_rangoCorto,
  fn_horasColumna,
  fn_horasColor,
  fn_chipsEstatus
} from './semana.util';

// Reporte de asistencia agrupado por semana (analisis/012): reemplaza
// el flujo anterior de "primero elige un empleado" — abre en la semana
// actual con todos los empleados, y el filtro de empleado queda como
// opcional. El detalle día por día vive en TimecardSemanaDetalleComponent.

@Component({
  selector: 'app-timecard-list',
  templateUrl: './timecard-list.component.html',
  styleUrls: ['../personal-catalogo-list/personal-catalogo-list.component.css', './timecard-list.component.css']
})
export class TimecardListComponent implements OnInit, OnDestroy {

  bShowSpinner: boolean = false;

  empleadoSearchControl: FormControl = new FormControl('');
  empleadosEncontrados: any[] = [];
  bBuscandoEmpleados: boolean = false;
  empleadoFiltro: any = null;

  bSoloNovedades: boolean = false;

  semanaSeleccionada: RangoSemana = fn_semanaDeFecha(new Date());
  bSemanaRecienIniciada: boolean = false;

  resumen: ResumenSemanalItem[] = [];

  constructor(
    private authServ: AuthService
    , private servicesGServ: ServicesGService
    , private timecardServ: TimecardService
    , private empleadosServ: EmpleadosService
    , private pageTitleServ: PageTitleService
    ) {

      this.empleadoSearchControl.valueChanges
        .pipe(debounceTime(500))
        .subscribe((valor: any) => {
          if (typeof valor === 'string' && valor.trim().length > 0) {
            this.fn_buscarEmpleados(valor);
          } else {
            this.empleadosEncontrados = [];
          }
        });

    }

  ngOnInit(): void {
    this.authServ.checkSession();
    this.pageTitleServ.set('schedule', 'Asistencia (TimeCard)', 'Horas trabajadas, retardos y faltas por empleado');
    this.fn_cargar();
  }

  ngOnDestroy(): void {
    this.pageTitleServ.clear();
  }

  get bPuedeCapturar(): boolean {
    return this.authServ.hasPermissionAction('timecard_CapturarManual');
  }

  get bPuedeAdministrarHorarios(): boolean {
    return this.authServ.hasPermissionAction('timecard_AdministrarHorarios');
  }

  get resumenFiltrado(): ResumenSemanalItem[] {
    if (!this.bSoloNovedades) {
      return this.resumen;
    }
    return this.resumen.filter(item => item.iFaltas > 0 || item.iRetardos > 0 || item.iIncompletas > 0 || item.bSinHorario);
  }

  get rangoSemanaDesc(): string {
    return fn_rangoCorto(this.semanaSeleccionada);
  }

  fn_abrirHorarioSucursal() {
    this.servicesGServ.showModalWithParams(HorarioSucursalComponent, {}, '480px');
  }

  fn_seleccionarSemana( semana: RangoSemana ) {
    this.semanaSeleccionada = semana;
    this.fn_cargar();
  }

  private fn_buscarEmpleados( search: string ) {

    this.bBuscandoEmpleados = true;
    this.empleadosServ.CGetList({ search, length: 0, pageSize: 10, pageIndex: 0, pageSizeOptions: [] })
      .subscribe({
        next: (resp: ResponseGet) => {
          this.empleadosEncontrados = resp.status === 0 ? (resp.data.rows || []) : [];
          this.bBuscandoEmpleados = false;
        },
        error: () => {
          this.empleadosEncontrados = [];
          this.bBuscandoEmpleados = false;
        }
      });
  }

  fn_elegirEmpleado( empleado: any ) {
    this.empleadoFiltro = empleado;
    this.empleadoSearchControl.setValue(empleado.nombre, { emitEvent: false });
    this.empleadosEncontrados = [];
    this.fn_cargar();
  }

  fn_limpiarEmpleado() {
    this.empleadoFiltro = null;
    this.empleadoSearchControl.setValue('', { emitEvent: false });
    this.fn_cargar();
  }

  fn_cargar() {

    const rango = fn_rangoConsulta(this.semanaSeleccionada);

    if (!rango) {
      // Semana futura (no seleccionable desde el timeline) o recién
      // iniciada (hoy es sábado, todavía no hay ningún día cerrado).
      this.bSemanaRecienIniciada = true;
      this.resumen = [];
      return;
    }

    this.bSemanaRecienIniciada = false;
    this.bShowSpinner = true;

    this.timecardServ.CGetAsistenciaSemanal(rango.startDate, rango.endDate, this.empleadoFiltro?.id || null)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.resumen = resp.status === 0 ? (resp.data || []) : [];
          this.bShowSpinner = false;
        },
        error: (ex: HttpErrorResponse) => {
          console.log(ex);
          this.servicesGServ.showSnakbar('Problemas con el servicio');
          this.bShowSpinner = false;
        }
      });

  }

  fn_horasColumna( item: ResumenSemanalItem ): string {
    return fn_horasColumna(item);
  }

  fn_horasColor( item: ResumenSemanalItem ): string {
    return fn_horasColor(item);
  }

  fn_chips( item: ResumenSemanalItem ) {
    return fn_chipsEstatus(item);
  }

  fn_pagoDesc( item: ResumenSemanalItem ): string {
    if (item.bPagada) {
      return `Pagada (nómina #${ item.idNomina })`;
    }
    if (item.bEnNominaBorrador) {
      return `En nómina #${ item.idNominaBorrador } (borrador)`;
    }
    return 'Pendiente';
  }

  fn_verDetalle( item: ResumenSemanalItem ) {
    this.fn_abrirDetalle(item, false);
  }

  fn_editarDetalle( item: ResumenSemanalItem ) {
    this.fn_abrirDetalle(item, true);
  }

  private fn_abrirDetalle( item: ResumenSemanalItem, bModoEdicion: boolean ) {

    this.servicesGServ.showModalWithParams(TimecardSemanaDetalleComponent, {
      resumenItem: item,
      semana: this.semanaSeleccionada,
      bModoEdicion
    }, '700px')
    .afterClosed().subscribe({
      next: (huboCambios: any) => {
        if (huboCambios) {
          this.fn_cargar();
        }
      }
    });

  }

}
