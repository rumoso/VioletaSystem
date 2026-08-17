import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { FaceReferenceService } from 'src/app/protected/services/face-reference.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { FaceVerificationComponent } from '../face-verification/face-verification.component';

// Administración del Face ID de una persona (usuario, cliente o
// empleado) — modal reutilizado desde los tres lugares que hoy lo
// necesitan, abierto siempre con un solo botón "Face ID". Consulta su
// propio estado al abrir (no depende de que el padre se lo pase).

@Component({
  selector: 'app-face-id-manager',
  templateUrl: './face-id-manager.component.html',
  styleUrls: ['./face-id-manager.component.css']
})
export class FaceIdManagerComponent implements OnInit {

  tipoPersona: string = '';
  idPersona: number = 0;
  nombrePersona: string = '';
  bSoloLectura: boolean = false;

  bTieneFaceId: boolean = false;
  bCargando: boolean = false;

  constructor(
    private dialogRef: MatDialogRef<FaceIdManagerComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any

    , private faceReferenceServ: FaceReferenceService
    , private servicesGServ: ServicesGService
    ) { }

  ngOnInit(): void {

    this.tipoPersona = this.ODataP.tipoPersona;
    this.idPersona = this.ODataP.idPersona;
    this.nombrePersona = this.ODataP.nombrePersona || '';
    this.bSoloLectura = !!this.ODataP.bSoloLectura;

    this.fn_cargarEstado();

  }

  private fn_cargarEstado() {

    if (!this.idPersona || !this.tipoPersona) {
      return;
    }

    this.bCargando = true;

    this.faceReferenceServ.CGetFaceReference( this.tipoPersona, this.idPersona )
    .subscribe({
      next: (resp: ResponseGet) => {
        this.bTieneFaceId = resp.status === 0 && !!resp.data;
        this.bCargando = false;
      },
      error: () => { this.bCargando = false; }
    });

  }

  fn_crearActualizar() {

    this.servicesGServ.showModalWithParams( FaceVerificationComponent, {
      modo: 'ENROLAR',
      tipoPersona: this.tipoPersona,
      idPersona: this.idPersona,
      nombrePersona: this.nombrePersona
    }, '480px')
    .afterClosed().subscribe({
      next: ( resp: any ) => {
        if ( resp?.ok ) {
          this.bTieneFaceId = true;
        }
      }
    });

  }

  fn_eliminar() {

    this.servicesGServ.showDialog('¿Estás seguro?'
      , 'Está a punto de eliminar el Face ID registrado. Ya no podrá usarse para identificar a esta persona (checador, login, autorizaciones).'
      , '¿Desea continuar?'
      , 'Si', 'No')
    .afterClosed().subscribe({
      next: ( resp: any ) => {
        if ( resp ) {

          this.bCargando = true;

          this.faceReferenceServ.CDeleteFaceReference( this.tipoPersona, this.idPersona )
          .subscribe({
            next: (resp2: any) => {
              this.servicesGServ.showSnakbar( resp2.message );
              this.bCargando = false;
              if ( resp2.status === 0 ) {
                this.bTieneFaceId = false;
              }
            },
            error: () => {
              this.servicesGServ.showSnakbar( "Problemas con el servicio" );
              this.bCargando = false;
            }
          });

        }
      }
    });

  }

  fn_close() {
    this.dialogRef.close();
  }

}
