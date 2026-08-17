import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { FaceReferenceService } from 'src/app/protected/services/face-reference.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { FaceVerificationComponent } from '../face-verification/face-verification.component';

// Administración del Face ID de una persona (usuario, cliente o
// empleado) — componente embebible, reutilizado en los tres modales que
// hoy lo necesitan. Consulta su propio estado (no depende de que el
// padre se lo pase) para no desincronizarse.

@Component({
  selector: 'app-face-id-manager',
  templateUrl: './face-id-manager.component.html',
  styleUrls: ['./face-id-manager.component.css']
})
export class FaceIdManagerComponent implements OnInit, OnChanges {

  @Input() tipoPersona: string = '';
  @Input() idPersona: number = 0;
  @Input() nombrePersona: string = '';
  @Input() bSoloLectura: boolean = false;

  // Avisa al padre cuando el estado cambia, por si necesita reflejarlo
  // en otro lado (ej. el icono de un listado que ya se pintó).
  @Output() cambio = new EventEmitter<boolean>();

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
          this.cambio.emit(true);
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
                this.cambio.emit(false);
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

}
