import { Component, ElementRef, HostListener, Inject, OnDestroy, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
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
  bOcultarAutorizacionManual: boolean = false;

  // Resultado encontrado (VERIFICAR o IDENTIFICAR) esperando que el
  // operador confirme "sí es esta persona" antes de cerrar el modal.
  resultadoPendiente: { nombre: string; similitud: number; tipoPersona?: string; idPersona?: number } | null = null;
  bAceptando: boolean = false;

  // IDENTIFICAR con más de una persona plausible: hay que elegir cuál
  // es antes de pasar a la confirmación de arriba. Se guarda la
  // referencia cruda (con descriptor) para poder re-verificar contra
  // ella una vez elegida.
  candidatosPendientes: Array<{ referencia: any; similitud: number }> | null = null;

  camaras: MediaDeviceInfo[] = [];
  deviceIdActivo: string | null = null;
  bCambiandoCamara: boolean = false;

  // Plantilla-guía: estado del óvalo mientras se sondea la posición del
  // rostro para disparar la captura sola, sin que el usuario dé clic.
  guiaEstado: 'buscando' | 'reacomoda' | 'alineado' = 'buscando';

  private stream: MediaStream | null = null;
  private referenciaEsperada: any = null;
  private referenciasTodas: any[] = [];
  private idUserLogON: number = 0;
  private deviceIdPreferido: string | null = null;

  // Descriptor (128 números) de la última captura exitosa — se manda en
  // el resultado por si quien invoca este modal necesita re-verificarlo
  // del lado del servidor (ej. login facial).
  private ultimoDescriptor: number[] | null = null;

  // Cuando IDENTIFICAR encontró varias personas plausibles y el
  // operador ya eligió una: la siguiente captura se compara SOLO contra
  // esa persona (1:1), excluyendo a las demás — no se confía en la
  // similitud ya calculada del primer intento ambiguo, se pide una
  // foto nueva para confirmar de verdad.
  private candidatoParaReverificar: any = null;

  private deteccionTimer: any = null;
  private ticksAlineado: number = 0;

  // Cuántos sondeos alineados seguidos (~250ms c/u) antes de disparar la
  // captura sola — evita que un parpadeo dispare de más.
  private readonly TICKS_PARA_CAPTURAR = 5;
  private readonly INTERVALO_SONDEO_MS = 250;

  constructor(
    private dialogRef: MatDialogRef<FaceVerificationComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any

    , private servicesGServ: ServicesGService
    , private faceRecognitionServ: FaceRecognitionService
    , private faceReferenceServ: FaceReferenceService
    , private authServ: AuthService
    ) { }

  async ngOnInit() {

    this.modo = this.ODataP.modo || 'VERIFICAR';
    this.tipoPersona = this.ODataP.tipoPersona || '';
    this.idPersona = this.ODataP.idPersona || 0;
    this.nombrePersona = this.ODataP.nombrePersona || '';
    this.referencia = this.ODataP.referencia || '';
    // Cuando este modal se invoca DESDE otro flujo de autorización (ej.
    // ActionAuthorizationComponent), su propio fallback manual no aplica
    // — quien lo invoque ya tiene su propia vía alterna (el código).
    this.bOcultarAutorizacionManual = !!this.ODataP.ocultarAutorizacionManual;

    this.idUserLogON = await this.authServ.getIdUserSession();

    this.faceReferenceServ.CGetCameraPreference(this.idUserLogON)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.deviceIdPreferido = (resp.status === 0 && resp.data) ? resp.data.deviceId : null;
        },
        error: () => { this.deviceIdPreferido = null; }
      });

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
              this.bMostrarAutorizacionManual = !this.bOcultarAutorizacionManual;
            }
          },
          error: () => {
            this.bSinReferencia = true;
            this.bLoadingModels = false;
            this.bMostrarAutorizacionManual = !this.bOcultarAutorizacionManual;
          }
        });

    } else if (this.modo === 'IDENTIFICAR') {

      this.faceReferenceServ.CGetFaceReferences(this.tipoPersona)
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

      // Primero se abre la cámara por default: el navegador solo entrega
      // los nombres (labels) de las cámaras después de conceder permiso.
      const oCam = await this.faceRecognitionServ.startCamera(this.videoRef.nativeElement);

      this.bLoadingModels = false;

      if (oCam.ok) {
        this.stream = oCam.stream || null;
        this.bCameraReady = true;
        this.deviceIdActivo = this.faceRecognitionServ.getActiveDeviceId(this.stream);

        this.camaras = await this.faceRecognitionServ.listCameras();

        // Si hay una cámara preferida guardada y sigue disponible en esta
        // máquina, y no es la que ya quedó activa, se cambia a ella sola.
        if (this.deviceIdPreferido
          && this.deviceIdPreferido !== this.deviceIdActivo
          && this.camaras.some(c => c.deviceId === this.deviceIdPreferido)) {
          await this.fn_seleccionarCamara(this.deviceIdPreferido, false);
        }

        this.fn_iniciarSondeoGuia();

      } else {
        this.mensaje = oCam.error || 'No se pudo acceder a la cámara.';
        this.bMostrarAutorizacionManual = !this.bOcultarAutorizacionManual;
        await this.fn_logResultado('NO_DISPONIBLE', null, 0);
      }

    }, 0);

  }

  async fn_seleccionarCamara(deviceId: string, bGuardarPreferencia: boolean = true) {

    if (this.bCambiandoCamara || deviceId === this.deviceIdActivo) {
      return;
    }

    this.bCambiandoCamara = true;

    this.faceRecognitionServ.stopCamera(this.stream);

    const oCam = await this.faceRecognitionServ.startCamera(this.videoRef.nativeElement, deviceId);

    if (oCam.ok) {
      this.stream = oCam.stream || null;
      this.deviceIdActivo = deviceId;

      if (bGuardarPreferencia) {
        const oCamara = this.camaras.find(c => c.deviceId === deviceId);
        this.faceReferenceServ.CSaveCameraPreference({
          idUser: this.idUserLogON,
          deviceId,
          label: oCamara?.label || null
        }).subscribe({ next: () => {}, error: () => {} });
      }
    } else {
      this.servicesGServ.showSnakbar(oCam.error || 'No se pudo cambiar de cámara');
    }

    this.bCambiandoCamara = false;

  }

  fn_camaraLabel(cam: MediaDeviceInfo, index: number): string {
    return cam.label || `Cámara ${ index + 1 }`;
  }

  // Sondeo continuo (liviano, solo la caja del rostro) que dibuja la
  // guía y dispara la captura sola cuando el rostro queda alineado y
  // estable — el usuario no necesita dar clic en "Capturar".
  private fn_iniciarSondeoGuia() {

    if (this.deteccionTimer) {
      return;
    }

    this.deteccionTimer = setInterval(async () => {

      // Pausado mientras se procesa una captura, se confirma un
      // resultado, o la cámara todavía no está lista.
      if (!this.bCameraReady || this.bCapturing || this.resultadoPendiente || this.candidatosPendientes || this.bCambiandoCamara) {
        return;
      }

      const box = await this.faceRecognitionServ.detectFaceBox(this.videoRef.nativeElement);

      if (!box) {
        this.guiaEstado = 'buscando';
        this.ticksAlineado = 0;
        return;
      }

      const centroX = (box.x + box.width / 2) / box.videoWidth;
      const centroY = (box.y + box.height / 2) / box.videoHeight;
      const anchoRelativo = box.width / box.videoWidth;

      // anchoRelativo mínimo alto a propósito: obliga a acercarse a la
      // cámara para llenar la plantilla, no solo a centrarse.
      const bAlineado = Math.abs(centroX - 0.5) <= 0.15
        && Math.abs(centroY - 0.45) <= 0.17
        && anchoRelativo >= 0.48
        && anchoRelativo <= 0.85;

      if (bAlineado) {

        this.guiaEstado = 'alineado';
        this.ticksAlineado++;

        if (this.ticksAlineado >= this.TICKS_PARA_CAPTURAR) {
          this.ticksAlineado = 0;
          this.fn_capturar();
        }

      } else {
        this.guiaEstado = 'reacomoda';
        this.ticksAlineado = 0;
      }

    }, this.INTERVALO_SONDEO_MS);

  }

  private fn_detenerSondeoGuia() {
    if (this.deteccionTimer) {
      clearInterval(this.deteccionTimer);
      this.deteccionTimer = null;
    }
  }

  ngOnDestroy(): void {
    this.fn_detenerSondeoGuia();
    this.faceRecognitionServ.stopCamera(this.stream);
  }

  fn_close(resultado: any = null) {
    this.fn_detenerSondeoGuia();
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

    this.ultimoDescriptor = oCaptura.descriptor!;

    if (this.modo === 'ENROLAR') {
      this.fn_guardarReferencia(oCaptura.descriptor!, oCaptura.imgThumb!);
      return;
    }

    // Re-verificación tras elegir de una lista de candidatos ambiguos:
    // se compara la foto NUEVA solo contra la persona elegida, el resto
    // queda excluido — así no puede "volver a salir" otra persona.
    if (this.candidatoParaReverificar) {

      const candidato = this.candidatoParaReverificar;
      const refDescriptor: number[] = typeof candidato.descriptor === 'string' ? JSON.parse(candidato.descriptor) : candidato.descriptor;
      const oResultado = this.faceRecognitionServ.compare(oCaptura.descriptor!, refDescriptor);

      if (oResultado.match) {
        this.resultadoPendiente = {
          nombre: candidato.nombrePersona,
          similitud: oResultado.similitud,
          tipoPersona: candidato.tipoPersona,
          idPersona: candidato.idPersona
        };
        this.candidatoParaReverificar = null;
        this.bCapturing = false;
      } else {
        this.mensaje = `No se pudo confirmar a ${ candidato.nombrePersona } en la segunda verificación (similitud ${ (oResultado.similitud * 100).toFixed(0) }%). Intenta de nuevo o usa la autorización manual.`;
        this.candidatoParaReverificar = null;
        await this.fn_logResultado('FALLO', null, 0, oResultado.similitud);
        this.bMostrarAutorizacionManual = !this.bOcultarAutorizacionManual;
        this.bCapturing = false;
      }

      return;
    }

    if (this.modo === 'VERIFICAR') {

      const oResultado = this.faceRecognitionServ.compare(oCaptura.descriptor!, this.referenciaEsperada.descriptor ? JSON.parse(this.referenciaEsperada.descriptor) : []);

      if (oResultado.match) {
        // No se cierra todavía: se muestra a quién identificó y se
        // espera que el operador lo acepte.
        this.resultadoPendiente = {
          nombre: this.nombrePersona || this.referenciaEsperada?.nombrePersona || 'la persona esperada',
          similitud: oResultado.similitud,
          tipoPersona: this.tipoPersona,
          idPersona: this.idPersona
        };
        this.bCapturing = false;
      } else {
        this.mensaje = `No coincide con ${ this.nombrePersona || 'la persona esperada' } (similitud ${ (oResultado.similitud * 100).toFixed(0) }%).`;
        await this.fn_logResultado('FALLO', null, 0, oResultado.similitud);
        this.bMostrarAutorizacionManual = !this.bOcultarAutorizacionManual;
        this.bCapturing = false;
      }

    } else if (this.modo === 'IDENTIFICAR') {

      const oResultado = this.faceRecognitionServ.identify(oCaptura.descriptor!, this.referenciasTodas);

      if (oResultado.candidatos.length === 1) {

        const c = oResultado.candidatos[0];
        this.resultadoPendiente = {
          nombre: c.referencia.nombrePersona,
          similitud: c.similitud,
          tipoPersona: c.referencia.tipoPersona,
          idPersona: c.referencia.idPersona
        };
        this.bCapturing = false;

      } else if (oResultado.candidatos.length > 1) {

        // Más de una persona plausible: no se elige sola, se le
        // pregunta al operador cuál de ellas es.
        this.candidatosPendientes = oResultado.candidatos;
        this.bCapturing = false;

      } else {
        this.mensaje = 'No se encontró coincidencia con nadie enrolado.';
        await this.fn_logResultado('FALLO', null, 0, 0);
        this.bMostrarAutorizacionManual = !this.bOcultarAutorizacionManual;
        this.bCapturing = false;
      }

    }

  }

  // El operador elige de la lista de candidatos plausibles: NO se toma
  // por buena la similitud ya calculada — se pide una foto nueva y se
  // vuelve a verificar 1:1 solo contra esta persona, excluyendo al resto,
  // para evitar que la ambigüedad original se cuele como aceptación.
  fn_elegirCandidato(candidato: { referencia: any; similitud: number }) {
    this.candidatosPendientes = null;
    this.candidatoParaReverificar = candidato.referencia;
    this.mensaje = `Verifica de nuevo para confirmar a ${ candidato.referencia.nombrePersona }`;
  }

  async fn_cancelarCandidatos() {

    const oCandidatos = this.candidatosPendientes;
    this.candidatosPendientes = null;
    this.mensaje = 'Ninguno de los candidatos era correcto. Puedes intentar de nuevo.';

    const mejorSimilitud = oCandidatos && oCandidatos.length > 0 ? oCandidatos[0].similitud : 0;
    await this.fn_logResultado('FALLO', null, 0, mejorSimilitud);
    this.bMostrarAutorizacionManual = !this.bOcultarAutorizacionManual;

  }

  // Con el resultado ya mostrado ("Identificamos a: NOMBRE"), Enter
  // equivale a darle clic a "Sí, aceptar" — no hay ningún input que
  // enfocar en esa pantalla, por eso se escucha a nivel documento.
  @HostListener('document:keydown.enter', ['$event'])
  event_fn_EnterAceptar(event: KeyboardEvent) {
    if (this.resultadoPendiente) {
      event.preventDefault();
      this.fn_aceptarIdentificacion();
    }
  }

  async fn_aceptarIdentificacion() {

    if (!this.resultadoPendiente || this.bAceptando) {
      return;
    }

    this.bAceptando = true;

    const r = this.resultadoPendiente;
    await this.fn_logResultado('EXITO', r.tipoPersona || null, r.idPersona || 0, r.similitud);

    this.fn_close({
      ok: true,
      tipoPersona: r.tipoPersona,
      idPersona: r.idPersona,
      nombre: r.nombre,
      similitud: r.similitud,
      descriptor: this.ultimoDescriptor
    });

  }

  async fn_rechazarIdentificacion() {

    if (!this.resultadoPendiente) {
      return;
    }

    const r = this.resultadoPendiente;
    this.resultadoPendiente = null;
    this.mensaje = `Se descartó la identificación de ${ r.nombre }. Puedes intentar de nuevo.`;

    await this.fn_logResultado('FALLO', null, 0, r.similitud);
    this.bMostrarAutorizacionManual = !this.bOcultarAutorizacionManual;

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
        this.servicesGServ.showSnakbar('Error al guardar el Face ID');
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
