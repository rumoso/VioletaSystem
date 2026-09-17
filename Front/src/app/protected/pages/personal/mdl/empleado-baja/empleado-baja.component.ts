import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { EmpleadosService } from 'src/app/protected/services/empleados.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

// Baja laboral / reactivación de una persona (analisis/018).
// BAJA: una sola acción — muestra ANTES de confirmar qué deja de tener
// (sesión, combos, asistencia/nómina) y el metal que tenga a su cargo;
// si es empleado captura la fecha de baja.
// REACTIVAR: vuelve con sus puestos, permisos y datos; si es empleado
// captura la nueva fecha de ingreso.

@Component({
  selector: 'app-empleado-baja',
  templateUrl: './empleado-baja.component.html',
  styleUrls: ['./empleado-baja.component.css']
})
export class EmpleadoBajaComponent implements OnInit {

  idUser: number = 0;
  nombre: string = '';
  modo: 'BAJA' | 'REACTIVAR' = 'BAJA';

  // ¿Tiene datos de empleado? Solo entonces se pide fecha.
  bEsEmpleado: boolean = false;

  impacto: string[] = [];
  metalACargo: any[] = [];
  bCargandoImpacto: boolean = false;
  bEjecutando: boolean = false;
  mensajeError: string = '';

  fechaControl: FormControl = new FormControl('');

  constructor(
    private dialogRef: MatDialogRef<EmpleadoBajaComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any

    , private servicesGServ: ServicesGService
    , private empleadosServ: EmpleadosService
    ) { }

  ngOnInit(): void {

    this.idUser = this.ODataP.idUser;
    this.nombre = this.ODataP.nombre;
    this.modo = this.ODataP.modo || 'BAJA';
    this.bEsEmpleado = !!this.ODataP.bEsEmpleado;

    // Fecha por default: hoy
    const hoy = new Date();
    const sHoy = `${ hoy.getFullYear() }-${ String(hoy.getMonth() + 1).padStart(2, '0') }-${ String(hoy.getDate()).padStart(2, '0') }`;
    this.fechaControl.setValue(sHoy);

    if (this.modo === 'BAJA') {
      this.bCargandoImpacto = true;
      this.empleadosServ.CGetBajaImpacto(this.idUser)
        .subscribe({
          next: (resp: any) => {
            if (resp.status === 0 && resp.data) {
              this.impacto = resp.data.impacto || [];
              this.metalACargo = resp.data.metalACargo || [];
              this.bEsEmpleado = !!resp.data.bEsEmpleado;
            }
            this.bCargandoImpacto = false;
          },
          error: () => {
            this.impacto = [];
            this.bCargandoImpacto = false;
          }
        });
    }

  }

  fn_confirmar() {

    this.mensajeError = '';

    if (this.bEsEmpleado && !this.fechaControl.value) {
      this.mensajeError = this.modo === 'BAJA'
        ? 'La fecha de baja es obligatoria.'
        : 'La nueva fecha de ingreso es obligatoria.';
      return;
    }

    this.bEjecutando = true;

    const fecha = this.bEsEmpleado ? this.fechaControl.value : null;

    const peticion = this.modo === 'BAJA'
      ? this.empleadosServ.CBaja(this.idUser, fecha)
      : this.empleadosServ.CReactivar(this.idUser, fecha);

    peticion.subscribe({
      next: (resp: any) => {
        this.bEjecutando = false;
        if (resp.status === 0) {
          this.servicesGServ.showSnakbar(resp.message);
          this.dialogRef.close(true);
        } else {
          this.mensajeError = resp.message;
        }
      },
      error: (ex: HttpErrorResponse) => {
        console.log(ex)
        this.bEjecutando = false;
        this.mensajeError = 'Problemas con el servicio.';
      }
    });
  }

  fn_close() {
    this.dialogRef.close(false);
  }

}
