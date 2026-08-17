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
import { ActionAuthorizationComponent } from '../../security/users/mdl/action-authorization/action-authorization.component';
import { TimecardMarcajeManualComponent } from '../mdl/timecard-marcaje-manual/timecard-marcaje-manual.component';
import { HorarioSucursalComponent } from '../mdl/horario-sucursal/horario-sucursal.component';

// Consulta de asistencia (analisis/011, T14): por empleado y rango de
// fechas, jornadas vs horario esperado y detalle de marcajes.

const ETIQUETAS_TIPO: { [key: string]: string } = {
  ENTRADA_JORNADA: 'Entrada',
  SALIDA_COMIDA: 'Salida a comer',
  ENTRADA_COMIDA: 'Entrada de comer',
  SALIDA_PERMISO: 'Salida por permiso',
  ENTRADA_PERMISO: 'Entrada de permiso',
  SALIDA_JORNADA: 'Salida'
};

@Component({
  selector: 'app-timecard-list',
  templateUrl: './timecard-list.component.html',
  styleUrls: ['../personal-catalogo-list/personal-catalogo-list.component.css', './timecard-list.component.css']
})
export class TimecardListComponent implements OnInit, OnDestroy {

  etiquetas = ETIQUETAS_TIPO;

  bShowSpinner: boolean = false;

  empleadoSearchControl: FormControl = new FormControl('');
  empleadosEncontrados: any[] = [];
  bBuscandoEmpleados: boolean = false;
  empleadoSeleccionado: any = null;

  startDate: string = '';
  endDate: string = '';

  resultado: { nombreEmpleado: string, dias: any[], totales: any, marcajes: any[] } | null = null;

  constructor(
    private authServ: AuthService
    , private servicesGServ: ServicesGService
    , private timecardServ: TimecardService
    , private empleadosServ: EmpleadosService
    , private pageTitleServ: PageTitleService
    ) {

      const hoy = new Date();
      const hace7 = new Date();
      hace7.setDate(hoy.getDate() - 7);

      this.endDate = hoy.toISOString().substring(0, 10);
      this.startDate = hace7.toISOString().substring(0, 10);

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

  fn_abrirHorarioSucursal() {
    this.servicesGServ.showModalWithParams(HorarioSucursalComponent, {}, '480px');
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
    this.empleadoSeleccionado = empleado;
    this.empleadoSearchControl.setValue(empleado.nombre, { emitEvent: false });
    this.empleadosEncontrados = [];
    this.fn_buscar();
  }

  fn_buscar() {

    if (!this.empleadoSeleccionado || !this.startDate || !this.endDate) {
      return;
    }

    this.bShowSpinner = true;

    this.timecardServ.CGetAsistenciaList(this.empleadoSeleccionado.id, this.startDate, this.endDate)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.resultado = resp.status === 0 ? resp.data : null;
          this.bShowSpinner = false;
        },
        error: (ex: HttpErrorResponse) => {
          console.log(ex);
          this.servicesGServ.showSnakbar('Problemas con el servicio');
          this.bShowSpinner = false;
        }
      });

  }

  fn_estatusDesc( dia: any ): string {
    if (dia.bSinMarcar) { return dia.bDescanso ? 'Descanso' : 'Sin marcar'; }
    if (dia.estatus === 'INCLUIDA_EN_NOMINA') { return `Pagada (nómina #${ dia.idNomina })`; }
    if (dia.estatus === 'CANCELADA') { return 'Cancelada'; }
    return 'Pendiente';
  }

  fn_capturarMarcaje() {

    if (!this.empleadoSeleccionado) {
      return;
    }

    this.fn_autorizarYAbrirModal({});

  }

  fn_corregirMarcaje( marcaje: any ) {

    this.fn_autorizarYAbrirModal({
      idMarcajeCorrige: marcaje.id,
      tipo: marcaje.tipo,
      fechaHora: marcaje.fechaHora
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
          idEmpleado: this.empleadoSeleccionado.id,
          nombreEmpleado: this.empleadoSeleccionado.nombre,
          auth_idUser,
          ...extra
        }, '440px')
        .afterClosed().subscribe({
          next: (huboCambios: any) => {
            if (huboCambios) {
              this.fn_buscar();
            }
          }
        });

      }
    });

  }

}
