import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { EmpleadosService } from 'src/app/protected/services/empleados.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

// Baja laboral / reactivación de empleado (analisis/006).
// BAJA: muestra ANTES de confirmar todo lo que se desactivará en
// cascada (usuario del sistema, vendedor, técnico) y captura la fecha
// de baja. REACTIVAR: captura la nueva fecha de ingreso y aclara que
// el usuario/catálogos NO se reactivan solos.

@Component({
  selector: 'app-empleado-baja',
  templateUrl: './empleado-baja.component.html',
  styleUrls: ['./empleado-baja.component.css']
})
export class EmpleadoBajaComponent implements OnInit {

  id: number = 0;
  nombre: string = '';
  modo: 'BAJA' | 'REACTIVAR' = 'BAJA';

  impacto: string[] = [];
  bCargandoImpacto: boolean = false;
  bEjecutando: boolean = false;
  mensajeError: string = '';

  fechaControl: FormControl = new FormControl('', [Validators.required]);

  constructor(
    private dialogRef: MatDialogRef<EmpleadoBajaComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any

    , private servicesGServ: ServicesGService
    , private empleadosServ: EmpleadosService
    ) { }

  ngOnInit(): void {

    this.id = this.ODataP.id;
    this.nombre = this.ODataP.nombre;
    this.modo = this.ODataP.modo || 'BAJA';

    // Fecha por default: hoy
    const hoy = new Date();
    const sHoy = `${ hoy.getFullYear() }-${ String(hoy.getMonth() + 1).padStart(2, '0') }-${ String(hoy.getDate()).padStart(2, '0') }`;
    this.fechaControl.setValue(sHoy);

    if (this.modo === 'BAJA') {
      this.bCargandoImpacto = true;
      this.empleadosServ.CGetBajaImpacto(this.id)
        .subscribe({
          next: (resp: ResponseGet) => {
            this.impacto = resp.status === 0 ? (resp.data || []) : [];
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

    if (this.fechaControl.invalid) {
      this.fechaControl.markAsTouched();
      return;
    }

    this.bEjecutando = true;

    const peticion = this.modo === 'BAJA'
      ? this.empleadosServ.CBaja(this.id, this.fechaControl.value)
      : this.empleadosServ.CReactivar(this.id, this.fechaControl.value);

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
