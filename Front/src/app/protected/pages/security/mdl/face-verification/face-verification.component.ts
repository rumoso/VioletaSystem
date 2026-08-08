import { Component, ElementRef, Inject, OnDestroy, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { FaceReferenceService } from 'src/app/protected/services/face-reference.service';
import { FaceRecognitionService } from 'src/app/protected/services/face-recognition.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { ActionAuthorizationComponent } from '../../users/mdl/action-authorization/action-authorization.component';

// Componente universal de reconocimiento facial (analisis/004).
// Modos:
//  - ENROLAR: guarda el rostro de referencia de tipoPersona/idPersona.
//  - VERIFICAR (1:1): compara contra la referencia de tipoPersona/idPersona.
//  - IDENTIFICAR (1:N): busca coincidencia contra todos los enrolados.
// Solo regresa el resultado — el flujo de negocio que lo invoque decide
// qué hacer con él (bloquear, continuar, etc.).

@Component({
  selector: 'app-face-verification',
  templateUrl: './face-verification.component.html',
  styleUrls: ['./face-verification.component.css']
})
export class FaceVerificationComponent implements OnDestroy {

  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;

  modo: string = 'VERIFICAR'; // ENROLAR | VERIFICAR | IDENTIFICAR
  tipoPersona: string = '';
  idPersona: number = 0;
  nombrePersona: string = '';
  referencia: string = '';

  bLoadingModels: boolean = true;
  bCameraReady: boolean = false;
  bCapturing: boolean = false;
  bSinReferencia: boolean = false;
  bShowSpinner: boolean = false;

  mensaje: string = '';
  bMostrarAutorizacionManual: boolean = false;

  private stream: MediaStream | null = null;
  private referenciaEsperada: any = null;
  private referenciasTodas: any[] = [];

  constructor(
    private dialogRef: MatDialogRef<FaceVerificationComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any

    , private servicesGServ: ServicesGService
    , private faceRecognitionServ: FaceRecognitionService
    , private faceReferenceServ: FaceReferenceService
    ) { }

  async ngOnInit() {

    this.modo = this.ODataP.modo || 'VERIFICAR';
    this.tipoPersona = this.ODataP.tipoPersona || '';
    this.idPersona = this.ODataP.idPersona || 0;
    this.nombrePersona = this.ODataP.nombrePersona || '';
    this.referencia = this.ODataP.referencia || '';

    if (this.modo === 'VERIFICAR') {

      this.faceReferenceServ.CGetFaceReference(this.tipoPersona, this.idPersona)
        .subscribe({
          next: (resp: ResponseGet) => {
            if (resp.status === 0 && resp.data) {
              this.referenciaEsperada = resp.data;
              this.fn_initCamera();
            } else {
              this.bSinReferencia = true;
              this.bLoadingModels = false;
              this.bMostrarAutorizacionManual = true;
            }
          },
          error: () => {
            this.bSinReferencia = true;
            this.bLoadingModels = false;
            this.bMostrarAutorizacionManual = true;
          }
        });

    } else if (this.modo === 'IDENTIFICAR') {

      this.faceReferenceServ.CGetFaceReferences('')
        .subscribe({
          next: (resp: ResponseGet) => {
            this.referenciasTodas = resp.status === 0 ? (resp.data || []) : [];
            this.fn_initCamera();
          },
          error: () => {
            this.referenciasTodas = [];
            this.fn_initCamera();
          }
        });

    } else {
      // ENROLAR
      this.fn_initCamera();
    }

  }

  private async fn_initCamera() {

    this.bLoadingModels = true;

    await this.faceRecognitionServ.loadModels();

    setTimeout(async () => {

      const oCam = await this.faceRecognitionServ.startCamera(this.videoRef.nativeElement);

      this.bLoadingModels = false;

      if (oCam.ok) {
        this.stream = oCam.stream || null;
        this.bCameraReady = true;
      } else {
        this.mensaje = oCam.error || 'No se pudo acceder a la cámara.';
        this.bMostrarAutorizacionManual = true;
        await this.fn_logResultado('NO_DISPONIBLE', null, 0);
      }

    }, 0);

  }

  ngOnDestroy(): void {
    this.faceRecognitionServ.stopCamera(this.stream);
  }

  fn_close(resultado: any = null) {
    this.faceRecognitionServ.stopCamera(this.stream);
    this.dialogRef.close(resultado);
  }

  async fn_capturar() {

    if (this.bCapturing) {
      return;
    }

    this.bCapturing = true;
    this.mensaje = '';

    const oCaptura = await this.faceRecognitionServ.captureDescriptor(this.videoRef.nativeElement);

    if (!oCaptura.ok) {
      this.mensaje = oCaptura.error || 'No se pudo capturar el rostro.';
      this.bCapturing = false;
      return;
    }

    if (this.modo === 'ENROLAR') {
      this.fn_guardarReferencia(oCaptura.descriptor!, oCaptura.imgThumb!);
      return;
    }

    if (this.modo === 'VERIFICAR') {

      const oResultado = this.faceRecognitionServ.compare(oCaptura.descriptor!, this.referenciaEsperada.descriptor ? JSON.parse(this.referenciaEsperada.descriptor) : []);

      if (oResultado.match) {
        await this.fn_logResultado('EXITO', this.tipoPersona, this.idPersona, oResultado.similitud);
        this.bCapturing = false;
        this.fn_close({ ok: true, similitud: oResultado.similitud });
      } else {
        this.mensaje = `No coincide con ${ this.nombrePersona || 'la persona esperada' } (similitud ${ (oResultado.similitud * 100).toFixed(0) }%).`;
        await this.fn_logResultado('FALLO', null, 0, oResultado.similitud);
        this.bMostrarAutorizacionManual = true;
        this.bCapturing = false;
      }

    } else if (this.modo === 'IDENTIFICAR') {

      const oResultado = this.faceRecognitionServ.identify(oCaptura.descriptor!, this.referenciasTodas);

      if (oResultado.match) {
        await this.fn_logResultado('EXITO', oResultado.referencia.tipoPersona, oResultado.referencia.idPersona, oResultado.similitud);
        this.bCapturing = false;
        this.fn_close({
          ok: true,
          tipoPersona: oResultado.referencia.tipoPersona,
          idPersona: oResultado.referencia.idPersona,
          nombre: oResultado.referencia.nombrePersona,
          similitud: oResultado.similitud
        });
      } else {
        this.mensaje = 'No se encontró coincidencia con nadie enrolado.';
        await this.fn_logResultado('FALLO', null, 0, oResultado.similitud);
        this.bMostrarAutorizacionManual = true;
        this.bCapturing = false;
      }

    }

  }

  private fn_guardarReferencia(descriptor: number[], imgThumb: string) {

    this.bShowSpinner = true;

    this.faceReferenceServ.CSaveFaceReference({
      tipoPersona: this.tipoPersona,
      idPersona: this.idPersona,
      descriptor,
      imgThumb
    }).subscribe({
      next: (resp: any) => {
        this.servicesGServ.showAlertIA(resp, false);
        this.bShowSpinner = false;
        this.bCapturing = false;
        if (resp.status === 0) {
          this.fn_close({ ok: true });
        }
      },
      error: () => {
        this.servicesGServ.showSnakbar('Error al guardar el rostro de referencia');
        this.bShowSpinner = false;
        this.bCapturing = false;
      }
    });

  }

  fn_autorizacionManual() {

    var paramsMDL: any = {
      actionName: 'gral_FacialAutorizarManual'
      , bShowAlert: false
    };

    this.servicesGServ.showModalWithParams(ActionAuthorizationComponent, paramsMDL, '400px')
      .afterClosed().subscribe({
        next: async (resp: any) => {
          if (resp) {
            await this.fn_logResultado('AUTORIZACION_MANUAL', this.tipoPersona, this.idPersona, null);
            this.fn_close({ ok: true, autorizacionManual: true });
          }
        }
      });

  }

  private fn_logResultado(resultado: string, tipoPersonaIdentificada: string | null, idPersonaIdentificada: number, similitud: number | null = null): Promise<void> {

    return new Promise((resolve) => {

      const oLog: any = {
        modo: this.modo === 'ENROLAR' ? 'VERIFICAR' : this.modo,
        resultado,
        similitud,
        referencia: this.referencia
      };

      if (this.modo === 'VERIFICAR') {
        oLog.tipoPersonaEsperada = this.tipoPersona;
        oLog.idPersonaEsperada = this.idPersona;
      }

      if (tipoPersonaIdentificada && idPersonaIdentificada) {
        oLog.tipoPersonaIdentificada = tipoPersonaIdentificada;
        oLog.idPersonaIdentificada = idPersonaIdentificada;
      }

      this.faceReferenceServ.CLogFaceVerification(oLog).subscribe({
        next: () => resolve(),
        error: () => resolve()
      });

    });

  }

}
