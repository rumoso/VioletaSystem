import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TimecardService } from 'src/app/protected/services/timecard.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

// Captura/corrección manual de un marcaje (analisis/011, T7/T14). Se abre
// SIEMPRE después de que ActionAuthorizationComponent ya autorizó la
// acción (auth_idUser viene en ODataP, ya resuelto).

const TIPOS_MARCAJE = [
  { value: 'ENTRADA_JORNADA', label: 'Entrada' },
  { value: 'SALIDA_COMIDA', label: 'Salida a comer' },
  { value: 'ENTRADA_COMIDA', label: 'Entrada de comer' },
  { value: 'SALIDA_PERMISO', label: 'Salida por permiso' },
  { value: 'ENTRADA_PERMISO', label: 'Entrada de permiso' },
  { value: 'SALIDA_JORNADA', label: 'Salida' }
];

@Component({
  selector: 'app-timecard-marcaje-manual',
  templateUrl: './timecard-marcaje-manual.component.html',
  styleUrls: ['../personal-catalogo/personal-catalogo.component.css', './timecard-marcaje-manual.component.css']
})
export class TimecardMarcajeManualComponent implements OnInit {

  tiposMarcaje = TIPOS_MARCAJE;

  bShowSpinner: boolean = false;
  banner: { tipo: string, mensaje: string } | null = null;

  nombreEmpleado: string = '';
  idEmpleado: number = 0;
  auth_idUser: number = 0;
  idMarcajeCorrige: number | null = null;

  myForm: any = {
    tipo: 'ENTRADA_JORNADA',
    fecha: '',
    hora: '',
    motivo: ''
  };

  constructor(
    private dialogRef: MatDialogRef<TimecardMarcajeManualComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any

    , private servicesGServ: ServicesGService
    , private timecardServ: TimecardService
    ) { }

  ngOnInit(): void {

    this.nombreEmpleado = this.ODataP.nombreEmpleado;
    this.idEmpleado = this.ODataP.idEmpleado;
    this.auth_idUser = this.ODataP.auth_idUser;
    this.idMarcajeCorrige = this.ODataP.idMarcajeCorrige || null;

    if (this.ODataP.tipo) {
      this.myForm.tipo = this.ODataP.tipo;
    }

    // Corrigiendo: se prellena con la fecha/hora original, para que el
    // usuario solo ajuste lo que estuvo mal. El Back manda las DATETIME
    // ya en UTC-igual-a-hora-de-pared (ver timecardController) — por
    // eso se leen con los getters UTC, no con la hora local del navegador.
    if (this.ODataP.fechaHora) {
      const fechaHoraBase = new Date(this.ODataP.fechaHora);
      this.myForm.fecha = fechaHoraBase.toISOString().substring(0, 10);
      this.myForm.hora = fechaHoraBase.toISOString().substring(11, 16);
    } else {
      const ahora = new Date();
      this.myForm.fecha = `${ ahora.getFullYear() }-${ String(ahora.getMonth() + 1).padStart(2, '0') }-${ String(ahora.getDate()).padStart(2, '0') }`;
      this.myForm.hora = `${ String(ahora.getHours()).padStart(2, '0') }:${ String(ahora.getMinutes()).padStart(2, '0') }`;
    }

  }

  get bEsCorreccion(): boolean {
    return !!this.idMarcajeCorrige;
  }

  fn_close() {
    this.dialogRef.close();
  }

  fn_guardar() {

    if (!this.myForm.fecha || !this.myForm.hora || !this.myForm.motivo?.trim()) {
      this.banner = { tipo: 'error', mensaje: 'Fecha, hora y motivo son obligatorios.' };
      return;
    }

    this.bShowSpinner = true;
    this.banner = null;

    const data: any = {
      idEmpleado: this.idEmpleado,
      tipo: this.myForm.tipo,
      fechaHora: `${ this.myForm.fecha } ${ this.myForm.hora }:00`,
      motivo: this.myForm.motivo,
      auth_idUser: this.auth_idUser,
      idMarcajeCorrige: this.idMarcajeCorrige
    };

    this.timecardServ.CInsertMarcajeManual(data)
      .subscribe({
        next: (resp: any) => {

          this.bShowSpinner = false;

          if (resp.status === 0) {
            this.dialogRef.close(true);
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
