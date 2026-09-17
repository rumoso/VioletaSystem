import { Component, Inject, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { SucursalesService } from 'src/app/protected/services/sucursales.service';
import { TimecardService } from 'src/app/protected/services/timecard.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

// Alta y edición de una sucursal (analisis/021-catalogo-sucursales.md).
//
// Dos partes:
//   - Datos generales (nombre, descripción, dirección): exigen
//     `sucursales_CrearModificar`.
//   - Horario semanal: el mismo que se captura en Asistencia y que heredan
//     los empleados sin horario propio. Exige `timecard_AdministrarHorarios`;
//     sin él se ve pero no se edita.
//
// Al dar de alta, primero se guardan los datos y, con el idSucursal que
// regresa el servidor, enseguida el horario.

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
  selector: 'app-sucursal',
  templateUrl: './sucursal.component.html',
  styleUrls: ['./sucursal.component.css']
})
export class SucursalComponent implements OnInit {

  bShowSpinner: boolean = false;
  bGuardando: boolean = false;
  sError: string = '';

  idSucursal: number = 0;

  form = {
    name: '',
    description: '',
    address: ''
  };

  // Para el encabezado al editar.
  info: { active: number; empleados: number; usuariosConAcceso: number } | null = null;

  dias: Array<{ diaSemana: number; nombre: string; bTrabaja: boolean; horaEntrada: string; horaSalida: string }> =
    DIAS.map((d) => ({ ...d, bTrabaja: false, horaEntrada: '09:00', horaSalida: '18:00' }));

  // Foto del horario al abrir, para guardar solo si cambió.
  private sHorarioOriginal: string = '';

  constructor(
    private dialogRef: MatDialogRef<SucursalComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any
    , private authServ: AuthService
    , private sucursalesServ: SucursalesService
    , private timecardServ: TimecardService
    , private servicesGServ: ServicesGService
  ) { }

  get bEsNueva(): boolean {
    return this.idSucursal === 0;
  }

  get bPuedeEditarDatos(): boolean {
    return this.authServ.hasPermissionAction('sucursales_CrearModificar');
  }

  get bPuedeEditarHorario(): boolean {
    return this.authServ.hasPermissionAction('timecard_AdministrarHorarios');
  }

  get bPuedeGuardar(): boolean {
    // Una sucursal nueva necesita los datos; una existente se puede guardar
    // con cualquiera de los dos permisos.
    return this.bEsNueva ? this.bPuedeEditarDatos : ( this.bPuedeEditarDatos || this.bPuedeEditarHorario );
  }

  ngOnInit(): void {

    this.idSucursal = Number(this.ODataP?.idSucursal) || 0;

    if (this.bEsNueva) {
      this.sHorarioOriginal = this.fn_horarioJSON();
      return;
    }

    this.bShowSpinner = true;

    forkJoin([
      this.sucursalesServ.CGetSucursalByID(this.idSucursal),
      this.timecardServ.CGetHorarioSucursal(this.idSucursal)
    ]).subscribe({
      next: ([respSuc, respHorario]: [ResponseGet, ResponseGet]) => {

        this.bShowSpinner = false;

        if (respSuc.status !== 0) {
          this.servicesGServ.showSnakbar(respSuc.message);
          this.dialogRef.close();
          return;
        }

        const s = respSuc.data;
        this.form = { name: s.name || '', description: s.description || '', address: s.address || '' };
        this.info = { active: s.active, empleados: s.empleados, usuariosConAcceso: s.usuariosConAcceso };

        const aHorario: any[] = respHorario.status === 0 ? (respHorario.data || []) : [];
        this.dias = DIAS.map((d) => {
          const h = aHorario.find((x) => Number(x.diaSemana) === d.diaSemana);
          return h
            ? { ...d, bTrabaja: true, horaEntrada: String(h.horaEntrada).substring(0, 5), horaSalida: String(h.horaSalida).substring(0, 5) }
            : { ...d, bTrabaja: false, horaEntrada: '09:00', horaSalida: '18:00' };
        });

        this.sHorarioOriginal = this.fn_horarioJSON();

      },
      error: (ex: HttpErrorResponse) => {
        this.bShowSpinner = false;
        this.servicesGServ.showSnakbar(ex.status === 401
          ? (ex.error?.message || 'Tu sesión venció. Vuelve a iniciar sesión.')
          : 'Problemas con el servicio');
        this.dialogRef.close();
      }
    });

  }

  // Solo los días que trabaja: un día sin renglón es descanso.
  private fn_diasAGuardar(): Array<{ diaSemana: number; horaEntrada: string; horaSalida: string }> {
    return this.dias
      .filter((d) => d.bTrabaja)
      .map((d) => ({ diaSemana: d.diaSemana, horaEntrada: d.horaEntrada, horaSalida: d.horaSalida }));
  }

  private fn_horarioJSON(): string {
    return JSON.stringify(this.fn_diasAGuardar());
  }

  // Copia las horas del lunes a los demás días que trabajan.
  fn_copiarLunes(): void {
    const lunes = this.dias[0];
    this.dias.forEach((d) => {
      if (d.bTrabaja && d.diaSemana !== 1) {
        d.horaEntrada = lunes.horaEntrada;
        d.horaSalida = lunes.horaSalida;
      }
    });
  }

  private fn_validar(): string {

    if (this.bPuedeEditarDatos && !this.form.name.trim()) {
      return 'El nombre de la sucursal es obligatorio.';
    }

    if (this.bPuedeEditarHorario) {
      for (const d of this.dias.filter((x) => x.bTrabaja)) {
        if (!d.horaEntrada || !d.horaSalida) {
          return `Captura la hora de entrada y de salida del ${ d.nombre.toLowerCase() }.`;
        }
        if (d.horaSalida <= d.horaEntrada) {
          return `El ${ d.nombre.toLowerCase() }, la hora de salida debe ser posterior a la de entrada.`;
        }
      }
    }

    return '';

  }

  fn_guardar(): void {

    if (this.bGuardando || !this.bPuedeGuardar) {
      return;
    }

    this.sError = this.fn_validar();
    if (this.sError) {
      return;
    }

    this.bGuardando = true;

    // Se toma antes de llamar al servidor: después del alta idSucursal ya
    // no es 0.
    const bEraNueva = this.bEsNueva;

    if (this.bPuedeEditarDatos) {

      this.sucursalesServ.CSaveSucursal({
        idSucursal: this.idSucursal,
        name: this.form.name,
        description: this.form.description,
        address: this.form.address
      }).subscribe({
        next: (resp: ResponseGet) => {

          if (resp.status !== 0) {
            this.bGuardando = false;
            this.sError = resp.message;
            return;
          }

          this.idSucursal = Number(resp.data.idSucursal);
          this.fn_guardarHorario(resp.message, bEraNueva);

        },
        error: (ex: HttpErrorResponse) => this.fn_errorServicio(ex)
      });

    } else {
      this.fn_guardarHorario('Horario guardado con éxito.', false);
    }

  }

  // Guarda el horario si hay permiso y cambió. En una sucursal nueva se
  // guarda si se marcó algún día.
  private fn_guardarHorario(sMensajeDatos: string, bEraNueva: boolean): void {

    const bCambio = this.fn_horarioJSON() !== this.sHorarioOriginal;

    if (!this.bPuedeEditarHorario || !bCambio) {
      this.bGuardando = false;
      this.servicesGServ.showSnakbar(sMensajeDatos);
      this.dialogRef.close({ bGuardado: true, idSucursal: this.idSucursal });
      return;
    }

    this.timecardServ.CGuardarHorarioSucursal(this.idSucursal, this.fn_diasAGuardar())
      .subscribe({
        next: (resp: any) => {

          this.bGuardando = false;

          if (resp.status !== 0) {
            // Los datos ya se guardaron: se dice qué falló y se deja el modal
            // abierto (ya con el idSucursal) para reintentar el horario.
            this.sHorarioOriginal = '';
            this.sError = `Los datos se guardaron, pero el horario no: ${ resp.message }`;
            return;
          }

          this.servicesGServ.showSnakbar(bEraNueva ? sMensajeDatos : 'Sucursal y horario guardados con éxito.');
          this.dialogRef.close({ bGuardado: true, idSucursal: this.idSucursal });

        },
        error: (ex: HttpErrorResponse) => this.fn_errorServicio(ex)
      });

  }

  private fn_errorServicio(ex: HttpErrorResponse): void {
    this.bGuardando = false;
    this.sError = ex.status === 401
      ? (ex.error?.message || 'Tu sesión venció. Vuelve a iniciar sesión.')
      : 'Problemas con el servicio. Intenta de nuevo.';
  }

  fn_cerrar(): void {
    this.dialogRef.close();
  }

}
