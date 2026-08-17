import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { TimecardService } from 'src/app/protected/services/timecard.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { FaceVerificationComponent } from '../../security/mdl/face-verification/face-verification.component';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';

// TimeCard: checador a pantalla completa (analisis/011). Un solo
// componente para las dos puertas de entrada — se abre igual desde el
// login (sin sesión) que desde el ícono del header (con sesión).

const ETIQUETAS_TIPO: { [key: string]: string } = {
  ENTRADA_JORNADA: 'Entrada',
  SALIDA_COMIDA: 'Salida a comer',
  ENTRADA_COMIDA: 'Entrada de comer',
  SALIDA_PERMISO: 'Salida por permiso',
  ENTRADA_PERMISO: 'Entrada de permiso',
  SALIDA_JORNADA: 'Salida'
};

const ICONOS_TIPO: { [key: string]: string } = {
  ENTRADA_JORNADA: 'login',
  SALIDA_COMIDA: 'restaurant',
  ENTRADA_COMIDA: 'restaurant',
  SALIDA_PERMISO: 'exit_to_app',
  ENTRADA_PERMISO: 'meeting_room',
  SALIDA_JORNADA: 'logout'
};

const SEGUNDOS_AUTO = 3;
const SEGUNDOS_REGRESO_CONFIRMACION = 5;

@Component({
  selector: 'app-timecard-checador',
  templateUrl: './timecard-checador.component.html',
  styleUrls: ['./timecard-checador.component.css']
})
export class TimecardChecadorComponent implements OnInit, OnDestroy {

  etiquetas = ETIQUETAS_TIPO;
  iconos = ICONOS_TIPO;

  estado: 'INICIAL' | 'NO_EMPLEADO' | 'OPCIONES' | 'CONFIRMADO' | 'CERRADA' = 'INICIAL';
  bShowSpinner: boolean = false;
  mensaje: string = '';

  nombre: string = '';
  idUser: number = 0;
  tiposValidos: string[] = [];

  tipoConfirmado: string = '';
  horaConfirmada: string = '';
  bDuplicado: boolean = false;

  // Auto-disparo cuando solo hay una opción posible en OPCIONES
  bAutoDisparando: boolean = false;
  progresoAuto: number = 0;
  private autoTimer: any = null;
  private autoInterval: any = null;

  private regresoTimer: any = null;

  constructor(
    private dialogRef: MatDialogRef<TimecardChecadorComponent>
    , private timecardServ: TimecardService
    , private servicesGServ: ServicesGService
    ) { }

  ngOnInit(): void {
    this.fn_escanear();
  }

  ngOnDestroy(): void {
    this.fn_detenerAuto();
    this.fn_detenerRegreso();
  }

  fn_close() {
    this.fn_detenerAuto();
    this.fn_detenerRegreso();
    this.dialogRef.close();
  }

  fn_escanear() {

    this.estado = 'INICIAL';
    this.mensaje = '';

    this.servicesGServ.showModalWithParams( FaceVerificationComponent, {
      modo: 'IDENTIFICAR',
      tipoPersona: 'USUARIO',
      referencia: 'TimeCard',
      ocultarAutorizacionManual: true // sin sesión, o si la hay tampoco aplica el respaldo por código aquí
    }, '480px')
    .afterClosed().subscribe({
      next: (resp: any) => {

        if (!resp?.ok || resp.autorizacionManual) {
          // Canceló o no identificó a nadie: se queda en la pantalla
          // inicial para reintentar, no cierra el checador.
          return;
        }

        this.idUser = resp.idPersona;
        this.nombre = resp.nombre;
        this.fn_cargarEstado();

      }
    });

  }

  private fn_cargarEstado() {

    this.bShowSpinner = true;

    this.timecardServ.CGetEstado(this.idUser)
      .subscribe({
        next: (resp: ResponseGet) => {

          this.bShowSpinner = false;

          if (!resp.data?.bEsEmpleado) {
            this.estado = 'NO_EMPLEADO';
            this.mensaje = resp.message;
            return;
          }

          this.nombre = resp.data.nombre;
          this.tiposValidos = resp.data.tiposValidos || [];

          if (this.tiposValidos.length === 0) {
            this.estado = 'CERRADA';
            return;
          }

          this.estado = 'OPCIONES';

          if (this.tiposValidos.length === 1) {
            this.fn_iniciarAuto(this.tiposValidos[0]);
          }

        },
        error: () => {
          this.bShowSpinner = false;
          this.servicesGServ.showSnakbar('Problemas con el servicio');
        }
      });

  }

  private fn_iniciarAuto(tipo: string) {

    this.bAutoDisparando = true;
    this.progresoAuto = 0;

    const pasoMs = 100;
    const pasos = (SEGUNDOS_AUTO * 1000) / pasoMs;
    let pasoActual = 0;

    this.autoInterval = setInterval(() => {
      pasoActual++;
      this.progresoAuto = Math.min(100, (pasoActual / pasos) * 100);
    }, pasoMs);

    this.autoTimer = setTimeout(() => {
      this.fn_detenerAuto();
      this.fn_marcar(tipo);
    }, SEGUNDOS_AUTO * 1000);

  }

  fn_cancelarAuto() {
    this.fn_detenerAuto();
  }

  private fn_detenerAuto() {
    if (this.autoTimer) { clearTimeout(this.autoTimer); this.autoTimer = null; }
    if (this.autoInterval) { clearInterval(this.autoInterval); this.autoInterval = null; }
    this.bAutoDisparando = false;
    this.progresoAuto = 0;
  }

  fn_marcar(tipo: string) {

    this.fn_detenerAuto();
    this.bShowSpinner = true;

    this.timecardServ.CInsertMarcaje(this.idUser, tipo)
      .subscribe({
        next: (resp: ResponseGet) => {

          this.bShowSpinner = false;

          if (resp.status !== 0) {
            this.servicesGServ.showSnakbar(resp.message);
            // Puede haber quedado desincronizado (otro equipo marcó
            // primero) — se vuelve a consultar el estado real.
            this.fn_cargarEstado();
            return;
          }

          this.tipoConfirmado = tipo;
          this.bDuplicado = !!resp.data?.bDuplicado;
          this.horaConfirmada = resp.data?.fechaHora ? resp.data.fechaHora.substring(11, 16) : '';
          this.estado = 'CONFIRMADO';

          this.fn_iniciarRegreso();

        },
        error: () => {
          this.bShowSpinner = false;
          this.servicesGServ.showSnakbar('Problemas con el servicio');
        }
      });

  }

  private fn_iniciarRegreso() {
    this.fn_detenerRegreso();
    this.regresoTimer = setTimeout(() => this.fn_otroEmpleado(), SEGUNDOS_REGRESO_CONFIRMACION * 1000);
  }

  private fn_detenerRegreso() {
    if (this.regresoTimer) { clearTimeout(this.regresoTimer); this.regresoTimer = null; }
  }

  fn_otroEmpleado() {
    this.fn_detenerRegreso();
    this.idUser = 0;
    this.nombre = '';
    this.tiposValidos = [];
    this.fn_escanear();
  }

}
