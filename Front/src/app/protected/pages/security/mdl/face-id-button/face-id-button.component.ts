import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { FaceReferenceService } from 'src/app/protected/services/face-reference.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { FaceVerificationComponent } from '../face-verification/face-verification.component';
import { FaceIdManagerComponent } from '../face-id-manager/face-id-manager.component';

// Botón único para administrar el Face ID de una persona, con el mismo
// comportamiento en todos lados donde se alimenta (usuario, cliente,
// empleado): si NO tiene, dice "Crear Face ID" y abre el enrolamiento
// directo; si YA tiene, dice "Actualizar Face ID" y abre el modal
// (Actualizar/Eliminar) para que decida qué hacer.

@Component({
  selector: 'app-face-id-button',
  templateUrl: './face-id-button.component.html',
  styleUrls: ['./face-id-button.component.css']
})
export class FaceIdButtonComponent implements OnInit, OnChanges {

  @Input() tipoPersona: string = '';
  @Input() idPersona: number = 0;
  @Input() nombrePersona: string = '';
  @Input() bSoloLectura: boolean = false;

  bTieneFaceId: boolean = false;
  bCargando: boolean = false;

  constructor(
    private faceReferenceServ: FaceReferenceService
    , private servicesGServ: ServicesGService
    ) { }

  ngOnInit(): void {
    this.fn_cargarEstado();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['idPersona'] || changes['tipoPersona']) && !changes['idPersona']?.firstChange) {
      this.fn_cargarEstado();
    }
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

  fn_click() {
    if (this.bTieneFaceId) {
      this.fn_abrirModal();
    } else {
      this.fn_crearDirecto();
    }
  }

  private fn_crearDirecto() {

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

  private fn_abrirModal() {

    this.servicesGServ.showModalWithParams( FaceIdManagerComponent, {
      tipoPersona: this.tipoPersona,
      idPersona: this.idPersona,
      nombrePersona: this.nombrePersona,
      bSoloLectura: this.bSoloLectura
    }, '420px')
    .afterClosed().subscribe({
      next: () => {
        // Pudo haberlo eliminado o reenrolado adentro — se vuelve a
        // consultar el estado real en vez de asumir nada.
        this.fn_cargarEstado();
      }
    });

  }

}
