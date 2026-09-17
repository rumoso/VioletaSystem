import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { SucursalesService } from 'src/app/protected/services/sucursales.service';
import { TimecardService } from 'src/app/protected/services/timecard.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

// Horario esperado por sucursal (analisis/011, T15): un renglón por día
// de la semana. Un día sin checar "trabaja" es descanso — no se guarda
// renglón para él.

const DIAS = [
  { diaSemana: 1, nombre: 'Lunes' },
  { diaSemana: 2, nombre: 'Martes' },
  { diaSemana: 3, nombre: 'Miércoles' },
  { diaSemana: 4, nombre: 'Jueves' },
  { diaSemana: 5, nombre: 'Viernes' },
  { diaSemana: 6, nombre: 'Sábado' },
  { diaSemana: 7, nombre: 'Domingo' }
];

@Component({
  selector: 'app-horario-sucursal',
  templateUrl: './horario-sucursal.component.html',
  styleUrls: ['../../estilos/personal-modal.css', './horario-sucursal.component.css']
})
export class HorarioSucursalComponent implements OnInit {

  bShowSpinner: boolean = false;
  banner: { tipo: string, mensaje: string } | null = null;

  sucursales: any[] = [];
  idSucursalSeleccionada: number | null = null;

  // Un renglón por día, con bTrabaja para saber si captura horas o no
  dias: any[] = DIAS.map(d => ({ ...d, bTrabaja: false, horaEntrada: '09:00', horaSalida: '18:00' }));

  constructor(
    private dialogRef: MatDialogRef<HorarioSucursalComponent>
    , private authServ: AuthService
    , private servicesGServ: ServicesGService
    , private sucursalesServ: SucursalesService
    , private timecardServ: TimecardService
    ) { }

  ngOnInit(): void {

    this.sucursalesServ.CCbxGetSucursalesCombo('', this.authServ.getIdUserSession())
      .subscribe({
        next: (resp: ResponseGet) => {
          this.sucursales = resp.status === 0 ? (resp.data || []) : [];
          if (this.sucursales.length === 1) {
            this.idSucursalSeleccionada = this.sucursales[0].idSucursal;
            this.fn_cargarHorario();
          }
        },
        error: () => { this.sucursales = []; }
      });

  }

  fn_cambiarSucursal() {
    this.fn_cargarHorario();
  }

  private fn_cargarHorario() {

    if (!this.idSucursalSeleccionada) {
      return;
    }

    this.bShowSpinner = true;
    this.banner = null;

    this.timecardServ.CGetHorarioSucursal(this.idSucursalSeleccionada)
      .subscribe({
        next: (resp: ResponseGet) => {

          this.bShowSpinner = false;
          const filas = resp.status === 0 ? (resp.data || []) : [];
          const porDia: { [key: number]: any } = {};
          filas.forEach((f: any) => { porDia[f.diaSemana] = f; });

          this.dias = DIAS.map(d => {
            const fila = porDia[d.diaSemana];
            return {
              ...d,
              bTrabaja: !!fila,
              horaEntrada: fila ? fila.horaEntrada.substring(0, 5) : '09:00',
              horaSalida: fila ? fila.horaSalida.substring(0, 5) : '18:00'
            };
          });

        },
        error: () => {
          this.bShowSpinner = false;
          this.servicesGServ.showSnakbar('Problemas con el servicio');
        }
      });

  }

  fn_close() {
    this.dialogRef.close();
  }

  fn_guardar() {

    if (!this.idSucursalSeleccionada) {
      return;
    }

    const diasAGuardar = this.dias
      .filter(d => d.bTrabaja)
      .map(d => ({ diaSemana: d.diaSemana, horaEntrada: d.horaEntrada, horaSalida: d.horaSalida }));

    this.bShowSpinner = true;
    this.banner = null;

    this.timecardServ.CGuardarHorarioSucursal(this.idSucursalSeleccionada, diasAGuardar)
      .subscribe({
        next: (resp: any) => {

          this.bShowSpinner = false;

          if (resp.status === 0) {
            this.banner = { tipo: 'ok', mensaje: 'Horario guardado.' };
          } else {
            this.banner = { tipo: 'error', mensaje: resp.message };
          }

        },
        error: () => {
          this.bShowSpinner = false;
          this.servicesGServ.showSnakbar('Problemas con el servicio');
        }
      });

  }

}
