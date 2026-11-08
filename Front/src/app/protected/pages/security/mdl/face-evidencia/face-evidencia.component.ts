import { Component, Inject, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { FaceReferenceService } from 'src/app/protected/services/face-reference.service';

// Evidencia de un renglón de la Bitácora Facial (analisis/039): lo que vio
// la cámara junto a la foto del Face ID de la persona, para compararlas.
// La miniatura la toma el navegador: sirve para que alguien la revise, no
// es una prueba infalible.

@Component({
  selector: 'app-face-evidencia',
  templateUrl: './face-evidencia.component.html',
  styleUrls: ['./face-evidencia.component.css']
})
export class FaceEvidenciaComponent implements OnInit {

  bCargando: boolean = true;
  sError: string = '';
  evidencia: any = null;

  constructor(
    private dialogRef: MatDialogRef<FaceEvidenciaComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: { idFaceVerificationLog: number }
    , private faceReferenceServ: FaceReferenceService
  ) { }

  ngOnInit(): void {

    this.faceReferenceServ.CGetFaceEvidencia( this.ODataP.idFaceVerificationLog )
      .subscribe({
        next: ( resp: ResponseGet ) => {
          this.bCargando = false;
          if( resp.status === 0 ){
            this.evidencia = resp.data;
          }else{
            this.sError = resp.message;
          }
        },
        error: ( ex: HttpErrorResponse ) => {
          this.bCargando = false;
          this.sError = ex.status === 401
            ? ( ex.error?.message || 'Tu sesión venció. Vuelve a iniciar sesión.' )
            : 'Problemas con el servicio';
        }
      });

  }

  fn_cerrar(): void {
    this.dialogRef.close();
  }

}
