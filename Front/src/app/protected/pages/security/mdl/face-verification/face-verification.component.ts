import { Component, ElementRef, HostListener, Inject, OnDestroy, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { CapturaRostro, FaceReferenceService } from 'src/app/protected/services/face-reference.service';
import { DETECTOR_GRABACION, FaceDeteccion, FaceMedida, FaceRecognitionService } from 'src/app/protected/services/face-recognition.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { ActionAuthorizationComponent } from '../../users/mdl/action-authorization/action-authorization.component';

// Componente universal de reconocimiento facial (analisis/004, 020 y 037).
// Modos:
//  - ENROLAR: guarda el rostro de referencia de tipoPersona/idPersona.
//  - VERIFICAR (1:1): contra la referencia de tipoPersona/idPersona.
//  - IDENTIFICAR (1:N): busca entre todos los enrolados.
//
// Este componente CAPTURA; quien decide si coincide es el servidor
// (analisis/020). Cuando coincide, el servidor entrega un comprobante de
// un solo uso para el `proposito` con que se abrió el modal (LOGIN,
// TIMECARD o AUTORIZACION), y el resultado lo regresa como `ticket`.
// El flujo que lo invocó manda ese `ticket` a su endpoint: sin él, el
// servidor no da acceso, ni autoriza, ni registra marcajes.
//
// Prueba de vida (analisis/037): ya no se manda una sola foto. Cuando el
// rostro queda bien encuadrado se pide un reto al servidor (2 o 3 giros
// de cabeza, cada uno a la izquierda o a la derecha) y se graba una
// secuencia de unos segundos. La instrucción completa se muestra desde
// el inicio ("Mira a la izquierda y luego a la derecha"), cada giro se
// palomea al cumplirse, y un puntito en la orilla marca el giro actual.
// El servidor revisa la secuencia completa y decide.

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
  proposito: string = '';

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
  // `sugerirActualizarFaceId` (analisis/038): la similitud de esta persona
  // viene baja de forma sostenida; se le sugiere volver a registrar su
  // rostro. No bloquea nada.
  resultadoPendiente: { nombre: string; similitud: number; tipoPersona?: string; idPersona?: number; ticket?: string; sugerirActualizarFaceId?: boolean } | null = null;
  bAceptando: boolean = false;

  // IDENTIFICAR con más de una persona plausible: hay que elegir cuál
  // es antes de pasar a la confirmación de arriba. El servidor no entrega
  // comprobante en este caso; al elegir se verifica 1:1 con una captura
  // nueva. (La "referencia" solo trae tipo, id y nombre: sin descriptor.)
  candidatosPendientes: Array<{ referencia: any; similitud: number }> | null = null;

  camaras: MediaDeviceInfo[] = [];
  deviceIdActivo: string | null = null;
  bCambiandoCamara: boolean = false;

  // ── Plantilla-guía adaptable (analisis/037) ──
  // El óvalo se dibuja del tamaño que debe verse la cara EN ESTA cámara
  // (según su resolución), no con un porcentaje fijo.
  guiaEstado: 'buscando' | 'reacomoda' | 'alineado' = 'buscando';
  guiaMensaje: string = 'Coloca tu rostro dentro del óvalo';
  distanciaCm: number | null = null;
  bCamaraBajaResolucion: boolean = false;
  ovaloAnchoPct: number = 45;
  ovaloAltoPct: number = 75;

  // ── Grabación de la secuencia con el reto (analisis/037) ──
  bGrabando: boolean = false;
  puntoActual: string | null = null; // IZQ | DER
  instruccionReto: string = '';
  girosUI: Array<{ lado: string; bHecho: boolean }> = [];

  private stream: MediaStream | null = null;
  private referenciaEsperada: any = null;
  private idUserLogON: number = 0;
  private deviceIdPreferido: string | null = null;

  // Cuando IDENTIFICAR encontró varias personas plausibles y el
  // operador ya eligió una: la siguiente captura se compara SOLO contra
  // esa persona (1:1), excluyendo a las demás — no se confía en la
  // similitud ya calculada del primer intento ambiguo, se pide una
  // foto nueva para confirmar de verdad.
  private candidatoParaReverificar: any = null;

  private deteccionTimer: any = null;
  private bCicloActivo: boolean = false;
  private ticksAlineado: number = 0;
  private tPausaHasta: number = 0;

  // Estado de la grabación en curso.
  private oReto: { idReto: string; pasos: string[]; segundosVigencia: number } | null = null;
  private tRetoRecibido: number = 0;
  private t0Grabacion: number = 0;
  private tUltimoDescriptor: number = 0;
  private iDescriptores: number = 0;
  private frames: CapturaRostro['frames'] = [];
  private medidas: Array<FaceMedida & { t: number }> = [];
  private puntosReto: string[] = [];
  private iPunto: number = 0;
  private bEsperaCentro: boolean = false;
  private postura: { dx: number } | null = null;

  // Cuántos sondeos alineados seguidos antes de empezar a grabar.
  private readonly TICKS_PARA_CAPTURAR = 4;
  private readonly MS_SONDEO = 150;
  private readonly MS_PAUSA_TRAS_FALLO = 1500;

  // Encuadre (cm estimados con la medida promedio entre pupilas). Más
  // cerca que el plan original (40–60 cm): con la cara chica los ojos
  // tenían muy pocos pixeles y no se alcanzaba a ver el parpadeo.
  private readonly DIST_OBJETIVO_CM = 35;
  private readonly DIST_MIN_CM = 25;
  private readonly DIST_MAX_CM = 45;
  private readonly DIST_MIN_ABSOLUTA_CM = 18;
  // Menos de esto entre los ojos y el descriptor sale de mala calidad.
  private readonly IPD_MINIMO_PX = 45;
  // Relación entre la distancia entre ojos y el tamaño del óvalo.
  private readonly OVALO_ANCHO_X_IPD = 2.6;
  private readonly OVALO_ALTO_X_ANCHO = 1.3;

  // Grabación. Cuadros lo más seguido posible (un parpadeo dura ~150 ms y
  // la detección misma ya tarda) y descriptor cada ~700 ms, porque es lo
  // caro y mientras se calcula no se ven los ojos. Límites dentro de lo
  // que acepta el servidor (faceLiveness.js: 8–200 cuadros, 3–15
  // descriptores).
  private readonly MS_FRAME = 60;
  private readonly MS_DESCRIPTOR = 700;
  private readonly MAX_DESCRIPTORES = 8;
  private readonly MIN_DESCRIPTORES = 3;
  private readonly MIN_FRAMES = 8;
  private readonly MAX_FRAMES = 190;
  private readonly MS_MIN_GRABACION = 1200;
  private readonly MS_MAX_GRABACION = 13000;
  // La postura "de frente" se toma de los primeros 800 ms (igual que el
  // servidor); el primer puntito aparece después.
  private readonly MS_POSTURA_INICIAL = 800;
  private readonly MS_ANTES_DE_PUNTOS = 1000;

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
    this.proposito = this.ODataP.proposito || '';
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

      // Ya no se descargan las referencias: la búsqueda ocurre en el
      // servidor con cada captura.
      this.fn_initCamera();

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

        // Precalentar el detector al tamaño de la grabación: la primera
        // detección con un tamaño nuevo tarda (el navegador prepara el
        // modelo) y, si ocurre ya grabando, se pierden los primeros
        // cuadros de frente.
        try {
          await this.faceRecognitionServ.detectar(this.videoRef.nativeElement, true, DETECTOR_GRABACION);
        } catch (e) { }

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
    this.fn_cancelarGrabacion();

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

  // Ciclo continuo de detección. Mientras no se graba, guía el encuadre y
  // arranca la grabación sola cuando el rostro queda alineado y estable
  // (el usuario no necesita dar clic). Mientras se graba, junta los
  // cuadros de la secuencia y avanza el reto.
  private fn_iniciarSondeoGuia() {

    if (this.bCicloActivo) {
      return;
    }

    this.bCicloActivo = true;

    const fnTick = async () => {

      if (!this.bCicloActivo) {
        return;
      }

      let iEspera = this.MS_SONDEO;

      try {
        if (this.bGrabando) {
          // Período objetivo: si la detección ya tardó, el siguiente
          // cuadro va casi de inmediato.
          const tIni = performance.now();
          await this.fn_tickGrabacion();
          iEspera = Math.max(5, this.MS_FRAME - (performance.now() - tIni));
        } else if (this.fn_puedeSondear()) {
          await this.fn_tickEncuadre();
        }
      } catch (e) {
        // Un cuadro que falla no detiene el ciclo.
      }

      if (this.bCicloActivo) {
        this.deteccionTimer = setTimeout(fnTick, iEspera);
      }
    };

    fnTick();

  }

  private fn_detenerSondeoGuia() {
    this.bCicloActivo = false;
    if (this.deteccionTimer) {
      clearTimeout(this.deteccionTimer);
      this.deteccionTimer = null;
    }
  }

  // Pausado mientras se procesa una captura, se confirma un resultado,
  // se cambia de cámara, o justo después de un fallo (para que se lea el
  // mensaje).
  private fn_puedeSondear(): boolean {
    return this.bCameraReady && !this.bCapturing && !this.resultadoPendiente && !this.candidatosPendientes
      && !this.bCambiandoCamara && Date.now() >= this.tPausaHasta;
  }

  // ── Encuadre adaptable ──

  private async fn_tickEncuadre() {

    const video = this.videoRef.nativeElement;
    const det = await this.faceRecognitionServ.detectar(video, false);

    this.fn_calcularOvalo(video.videoWidth, video.videoHeight);

    if (!det) {
      this.guiaEstado = 'buscando';
      this.guiaMensaje = 'Coloca tu rostro dentro del óvalo';
      this.distanciaCm = null;
      this.ticksAlineado = 0;
      return;
    }

    const bAlineado = this.fn_evaluarEncuadre(det);

    if (bAlineado) {

      this.ticksAlineado++;

      if (this.ticksAlineado >= this.TICKS_PARA_CAPTURAR) {
        this.ticksAlineado = 0;
        await this.fn_iniciarGrabacion();
      }

    } else {
      this.ticksAlineado = 0;
    }

  }

  // Tamaño del óvalo para esta cámara: el que tendría una cara a la
  // distancia objetivo, pero nunca más chico del mínimo de calidad.
  private fn_calcularOvalo(videoWidth: number, videoHeight: number) {

    if (!videoWidth || !videoHeight) {
      return;
    }

    const ipdObjetivo = Math.max(this.IPD_MINIMO_PX, this.faceRecognitionServ.fn_ipdADistancia(this.DIST_OBJETIVO_CM, videoWidth));
    const anchoPx = ipdObjetivo * this.OVALO_ANCHO_X_IPD;
    const altoPx = anchoPx * this.OVALO_ALTO_X_ANCHO;

    this.ovaloAnchoPct = Math.round(Math.min(95, anchoPx / videoWidth * 100));
    this.ovaloAltoPct = Math.round(Math.min(95, altoPx / videoHeight * 100));

    // Si para tener el mínimo de pixeles hay que estar más cerca de lo
    // cómodo, la cámara tiene poca resolución.
    this.bCamaraBajaResolucion = this.faceRecognitionServ.fn_distanciaCm(this.IPD_MINIMO_PX, videoWidth) < this.DIST_MIN_CM;

  }

  private fn_evaluarEncuadre(det: FaceDeteccion): boolean {

    const vw = det.videoWidth;
    const vh = det.videoHeight;
    const box = det.box;

    const distanciaCm = this.faceRecognitionServ.fn_distanciaCm(det.ipdPx, vw);
    this.distanciaCm = Math.round(distanciaCm);

    // Hasta dónde se puede alejar sin perder calidad; con una cámara de
    // poca resolución el rango se recorre hacia más cerca.
    const distMaxCalidad = this.faceRecognitionServ.fn_distanciaCm(this.IPD_MINIMO_PX, vw);
    const rangoMax = Math.min(this.DIST_MAX_CM, distMaxCalidad);
    const rangoMin = this.bCamaraBajaResolucion ? this.DIST_MIN_ABSOLUTA_CM : this.DIST_MIN_CM;

    const margen = 0.02;
    const bCortada = box.x < vw * margen || box.y < vh * margen
      || box.x + box.width > vw * (1 - margen) || box.y + box.height > vh * (1 - margen);

    const centroX = (box.x + box.width / 2) / vw;
    const centroY = (box.y + box.height / 2) / vh;
    const bCentrado = Math.abs(centroX - 0.5) <= 0.15 && Math.abs(centroY - 0.45) <= 0.17;

    if (bCortada || distanciaCm < rangoMin) {
      this.guiaEstado = 'reacomoda';
      this.guiaMensaje = 'Aléjate un poco';
      return false;
    }

    if (distanciaCm > rangoMax || det.ipdPx < this.IPD_MINIMO_PX) {
      this.guiaEstado = 'reacomoda';
      this.guiaMensaje = 'Acércate un poco';
      return false;
    }

    if (!bCentrado) {
      this.guiaEstado = 'reacomoda';
      this.guiaMensaje = 'Centra tu rostro dentro del óvalo';
      return false;
    }

    this.guiaEstado = 'alineado';
    this.guiaMensaje = 'Perfecto, no te muevas';
    return true;

  }

  // ── Grabación con reto ──

  private async fn_iniciarGrabacion() {

    if (this.bGrabando || this.bCapturing) {
      return;
    }

    // Se marca antes de pedir el reto para no arrancar dos veces.
    this.bGrabando = true;

    const proposito = this.modo === 'ENROLAR' ? 'ENROLAR' : this.proposito;

    const oResp = await new Promise<ResponseGet | null>((resolve) => {
      this.faceReferenceServ.CPedirReto(proposito).subscribe({
        next: (resp: ResponseGet) => resolve(resp),
        error: () => resolve(null)
      });
    });

    if (!this.bGrabando) {
      return; // se canceló mientras llegaba el reto (cambio de cámara, cierre)
    }

    if (!oResp || oResp.status !== 0 || !oResp.data) {
      this.bGrabando = false;
      this.mensaje = oResp?.message || 'Problemas con el servicio. Intenta de nuevo.';
      this.tPausaHasta = Date.now() + this.MS_PAUSA_TRAS_FALLO;
      return;
    }

    this.oReto = oResp.data;
    this.tRetoRecibido = Date.now();
    this.t0Grabacion = performance.now();
    this.tUltimoDescriptor = 0;
    this.iDescriptores = 0;
    this.frames = [];
    this.medidas = [];
    this.puntosReto = this.oReto!.pasos;
    this.iPunto = 0;
    this.bEsperaCentro = false;
    this.postura = null;
    this.puntoActual = null;
    this.instruccionReto = this.fn_textoReto(this.puntosReto);
    this.girosUI = this.puntosReto.map(lado => ({ lado, bHecho: false }));

  }

  // "Mira a la izquierda y luego a la derecha", "Mira a la derecha, luego
  // otra vez a la derecha y luego a la izquierda".
  private fn_textoReto(giros: string[]): string {

    const partes = giros.map((lado, i) => {
      const sLado = lado === 'IZQ' ? 'a la izquierda' : 'a la derecha';
      return i > 0 && giros[i - 1] === lado ? `otra vez ${ sLado }` : sLado;
    });

    if (partes.length === 1) {
      return `Mira ${ partes[0] }`;
    }

    return `Mira ${ partes.slice(0, -1).join(', luego ') } y luego ${ partes[partes.length - 1] }`;

  }

  private fn_cancelarGrabacion() {
    this.bGrabando = false;
    this.puntoActual = null;
    this.instruccionReto = '';
    this.girosUI = [];
    this.oReto = null;
  }

  private async fn_tickGrabacion() {

    if (!this.oReto) {
      return;
    }

    // El reto caduca en el servidor: si ya casi vence, se pide otro y se
    // vuelve a empezar sin mostrar error.
    if (Date.now() - this.tRetoRecibido > (this.oReto.segundosVigencia - 2) * 1000) {
      this.fn_cancelarGrabacion();
      return;
    }

    const ahora = performance.now();
    const t = Math.round(ahora - this.t0Grabacion);

    const bConDescriptor = this.iDescriptores < this.MAX_DESCRIPTORES && ahora - this.tUltimoDescriptor >= this.MS_DESCRIPTOR;

    const det = await this.faceRecognitionServ.detectar(this.videoRef.nativeElement, bConDescriptor, DETECTOR_GRABACION);

    if (!this.bGrabando) {
      return;
    }

    let oMedida: FaceMedida | null = null;

    if (det) {

      const frame: CapturaRostro['frames'][number] = { t, landmarks: det.puntos };

      if (det.descriptor) {
        frame.descriptor = det.descriptor;
        this.iDescriptores++;
        this.tUltimoDescriptor = ahora;
      }

      this.frames.push(frame);

      oMedida = this.faceRecognitionServ.fn_medir(det.puntos);
      this.medidas.push({ t, ...oMedida });
    }

    this.fn_avanzarPuntos(t, oMedida);

    const bListo = this.iPunto >= this.puntosReto.length
      && this.iDescriptores >= this.MIN_DESCRIPTORES && t >= this.MS_MIN_GRABACION;

    const bSeAcabo = t >= this.MS_MAX_GRABACION || this.frames.length >= this.MAX_FRAMES;

    if (!bListo && !bSeAcabo) {
      return;
    }

    if (this.frames.length < this.MIN_FRAMES || this.iDescriptores < this.MIN_DESCRIPTORES) {
      this.fn_cancelarGrabacion();
      this.mensaje = 'No se pudo ver bien tu rostro. Intenta de nuevo.';
      this.tPausaHasta = Date.now() + this.MS_PAUSA_TRAS_FALLO;
      return;
    }

    // Se manda aunque localmente no se haya visto todo: quien decide es
    // el servidor.
    this.fn_enviarCaptura();

  }

  // Puntitos del reto, uno a la vez: se muestra el siguiente cuando la
  // cabeza ya volvió al centro.
  private fn_avanzarPuntos(t: number, oMedida: FaceMedida | null) {

    // El primer puntito aparece hasta que hubo cuadros de frente: se
    // cuenta desde el primer cuadro detectado, no desde que empezó la
    // grabación (la primera detección puede tardar).
    if (this.iPunto >= this.puntosReto.length || this.medidas.length < 5 || t - this.medidas[0].t < this.MS_ANTES_DE_PUNTOS) {
      this.puntoActual = null;
      return;
    }

    if (!this.postura) {
      // Igual que el servidor: los primeros 800 ms o, si fueron pocos
      // cuadros, los primeros 5.
      let inicial = this.medidas.filter(m => m.t <= this.medidas[0].t + this.MS_POSTURA_INICIAL);
      if (inicial.length < 5) {
        inicial = this.medidas.slice(0, 5);
      }
      this.postura = {
        dx: this.faceRecognitionServ.fn_mediana(inicial.map(m => m.dx))
      };
    }

    if (!oMedida) {
      return;
    }

    const ddx = oMedida.dx - this.postura.dx;

    if (this.bEsperaCentro) {
      this.bEsperaCentro = !this.faceRecognitionServ.fn_estaAlCentro(ddx);
      this.puntoActual = this.bEsperaCentro ? null : this.puntosReto[this.iPunto];
      return;
    }

    this.puntoActual = this.puntosReto[this.iPunto];

    if (this.faceRecognitionServ.fn_direccionGiro(ddx) === this.puntoActual) {
      this.girosUI[this.iPunto].bHecho = true;
      this.iPunto++;
      this.bEsperaCentro = true;
      this.puntoActual = null;
    }

  }

  ngOnDestroy(): void {
    this.fn_detenerSondeoGuia();
    this.fn_cancelarGrabacion();
    this.faceRecognitionServ.stopCamera(this.stream);
  }

  fn_close(resultado: any = null) {
    this.fn_detenerSondeoGuia();
    this.fn_cancelarGrabacion();
    this.faceRecognitionServ.stopCamera(this.stream);
    this.dialogRef.close(resultado);
  }

  // Botón "Capturar ahora": empieza la grabación aunque la guía no esté
  // en verde (ya no existe la captura de una sola foto).
  async fn_capturar() {

    if (this.bGrabando || !this.fn_puedeSondear()) {
      return;
    }

    this.ticksAlineado = 0;
    await this.fn_iniciarGrabacion();

  }

  private fn_enviarCaptura() {

    // La miniatura del final de la grabación viaja con la captura: el
    // servidor la guarda como evidencia solo si la prueba de vida falla o
    // si es un marcaje del checador (analisis/039).
    const captura: CapturaRostro = {
      idReto: this.oReto!.idReto,
      frames: this.frames,
      imgEvidencia: this.faceRecognitionServ.captureThumb(this.videoRef.nativeElement)
    };

    this.fn_cancelarGrabacion();
    this.bCapturing = true;
    this.mensaje = '';

    if (this.modo === 'ENROLAR') {
      this.fn_guardarReferencia(captura, captura.imgEvidencia || '');
      return;
    }

    // Re-verificación tras elegir de una lista de candidatos ambiguos:
    // la captura NUEVA se compara solo contra la persona elegida — así no
    // puede "volver a salir" otra persona.
    if (this.candidatoParaReverificar) {

      const candidato = this.candidatoParaReverificar;
      this.candidatoParaReverificar = null;

      this.fn_verificarEnServidor(candidato.tipoPersona, candidato.idPersona, captura, candidato.nombrePersona);
      return;
    }

    if (this.modo === 'VERIFICAR') {
      this.fn_verificarEnServidor(this.tipoPersona, this.idPersona, captura, this.nombrePersona);
      return;
    }

    if (this.modo === 'IDENTIFICAR') {
      this.fn_identificarEnServidor(captura);
    }

  }

  // Respuesta no exitosa del servidor: reto vencido, captura inválida o
  // prueba de vida fallida. Se vuelve a intentar solo, tras una pausa
  // para que se lea el mensaje.
  private fn_rechazoDelServidor(resp: ResponseGet, sMensajeDefault: string) {

    this.mensaje = resp.message || sMensajeDefault;
    this.tPausaHasta = Date.now() + this.MS_PAUSA_TRAS_FALLO;

    if (resp.data?.resultado !== 'RETO_INVALIDO') {
      this.bMostrarAutorizacionManual = !this.bOcultarAutorizacionManual;
    }

  }

  // 1:N en el servidor. Los FALLOS los registra el servidor.
  private fn_identificarEnServidor(captura: CapturaRostro) {

    this.faceReferenceServ.CIdentificarRostro(this.tipoPersona, captura, this.proposito, this.referencia)
      .subscribe({
        next: (resp: ResponseGet) => {

          this.bCapturing = false;

          if (resp.status !== 0) {
            this.fn_rechazoDelServidor(resp, 'No se pudo identificar el rostro.');
            return;
          }

          const d = resp.data || {};

          if (d.resultado === 'UNICO') {

            // No se cierra todavía: se muestra a quién identificó y se
            // espera que el operador lo acepte.
            this.resultadoPendiente = {
              nombre: d.persona.nombrePersona,
              similitud: d.persona.similitud,
              tipoPersona: d.persona.tipoPersona,
              idPersona: d.persona.idPersona,
              ticket: d.ticket,
              sugerirActualizarFaceId: !!d.persona.sugerirActualizarFaceId
            };

          } else if (d.resultado === 'VARIOS') {

            // Más de una persona plausible: no se elige sola, se le
            // pregunta al operador cuál de ellas es.
            this.candidatosPendientes = (d.candidatos || []).map((c: any) => ({ referencia: c, similitud: c.similitud }));

          } else {
            this.mensaje = 'No se encontró coincidencia con nadie enrolado.';
            this.bMostrarAutorizacionManual = !this.bOcultarAutorizacionManual;
            this.tPausaHasta = Date.now() + this.MS_PAUSA_TRAS_FALLO;
          }

        },
        error: () => {
          this.bCapturing = false;
          this.mensaje = 'Problemas con el servicio. Intenta de nuevo.';
          this.tPausaHasta = Date.now() + this.MS_PAUSA_TRAS_FALLO;
        }
      });

  }

  // 1:1 en el servidor. Los FALLOS los registra el servidor.
  private fn_verificarEnServidor(tipoPersona: string, idPersona: number, captura: CapturaRostro, nombrePersona: string) {

    this.faceReferenceServ.CVerificarRostro(tipoPersona, idPersona, captura, this.proposito, this.referencia)
      .subscribe({
        next: (resp: ResponseGet) => {

          this.bCapturing = false;

          if (resp.status !== 0) {
            this.fn_rechazoDelServidor(resp, 'No se pudo verificar el rostro.');
            return;
          }

          const d = resp.data || {};

          if (d.resultado === 'COINCIDE') {

            this.resultadoPendiente = {
              nombre: d.persona.nombrePersona || nombrePersona || 'la persona esperada',
              similitud: d.persona.similitud,
              tipoPersona: d.persona.tipoPersona,
              idPersona: d.persona.idPersona,
              ticket: d.ticket,
              sugerirActualizarFaceId: !!d.persona.sugerirActualizarFaceId
            };

          } else {
            this.mensaje = `No coincide con ${ nombrePersona || d.nombrePersona || 'la persona esperada' } (similitud ${ ((d.similitud || 0) * 100).toFixed(0) }%). Intenta de nuevo${ this.bOcultarAutorizacionManual ? '' : ' o usa la autorización manual' }.`;
            this.bMostrarAutorizacionManual = !this.bOcultarAutorizacionManual;
            this.tPausaHasta = Date.now() + this.MS_PAUSA_TRAS_FALLO;
          }

        },
        error: () => {
          this.bCapturing = false;
          this.mensaje = 'Problemas con el servicio. Intenta de nuevo.';
          this.tPausaHasta = Date.now() + this.MS_PAUSA_TRAS_FALLO;
        }
      });

  }

  // El operador elige de la lista de candidatos plausibles: NO se toma
  // por buena la similitud ya calculada — se pide una captura nueva y se
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

    // El ÉXITO lo registra el servidor cuando el flujo gasta el
    // comprobante (analisis/020): aquí solo se entrega.
    this.fn_close({
      ok: true,
      tipoPersona: r.tipoPersona,
      idPersona: r.idPersona,
      nombre: r.nombre,
      similitud: r.similitud,
      ticket: r.ticket
    });

  }

  async fn_rechazarIdentificacion() {

    if (!this.resultadoPendiente) {
      return;
    }

    const r = this.resultadoPendiente;
    this.resultadoPendiente = null;
    this.mensaje = `Se descartó la identificación de ${ r.nombre }. Puedes intentar de nuevo.`;
    this.tPausaHasta = Date.now() + this.MS_PAUSA_TRAS_FALLO;

    await this.fn_logResultado('FALLO', null, 0, r.similitud);
    this.bMostrarAutorizacionManual = !this.bOcultarAutorizacionManual;

  }

  private fn_guardarReferencia(captura: CapturaRostro, imgThumb: string) {

    this.bShowSpinner = true;

    this.faceReferenceServ.CSaveFaceReference({
      tipoPersona: this.tipoPersona,
      idPersona: this.idPersona,
      idReto: captura.idReto,
      frames: captura.frames,
      imgThumb
    }).subscribe({
      next: (resp: any) => {
        this.bShowSpinner = false;
        this.bCapturing = false;
        if (resp.status === 0) {
          this.servicesGServ.showAlertIA(resp, false);
          this.fn_close({ ok: true });
        } else {
          // Prueba de vida fallida o reto vencido: se avisa en el modal y
          // se vuelve a intentar solo.
          this.mensaje = resp.message || 'No se pudo registrar el rostro. Intenta de nuevo.';
          this.tPausaHasta = Date.now() + this.MS_PAUSA_TRAS_FALLO;
        }
      },
      error: (ex: any) => {
        // 401: el servidor exige sesión para registrar un rostro.
        this.servicesGServ.showSnakbar( ex?.status === 401
          ? ( ex.error?.message || 'Tu sesión venció. Vuelve a iniciar sesión.' )
          : 'Error al guardar el Face ID' );
        this.bShowSpinner = false;
        this.bCapturing = false;
        this.tPausaHasta = Date.now() + this.MS_PAUSA_TRAS_FALLO;
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
