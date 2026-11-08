import { Injectable } from '@angular/core';
import * as faceapi from '@vladmandic/face-api';

// Reconocimiento facial (analisis/004, 020 y 037): aquí, en el
// navegador, se detecta el rostro y se extraen sus puntos y su descriptor
// con los modelos servidos desde assets/ — la imagen nunca sale a un
// servicio externo.
//
// La COMPARACIÓN y la PRUEBA DE VIDA no se deciden aquí: el servidor
// recibe la secuencia completa de la captura y decide
// (Back/helpers/faceLiveness.js). Las medidas de este servicio solo
// sirven para guiar al usuario en pantalla.

const MODEL_URL = 'assets/models/face';

// Puntos que se mandan al servidor (de los 68): ojos (36–47) y punta de
// la nariz (30). Mismo orden que espera Back/helpers/faceLiveness.js.
const INDICES_PUNTOS = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 30];

// Medida promedio entre pupilas de un adulto, para estimar la distancia
// a la cámara. Junto con un campo de visión supuesto: la estimación es
// aproximada y solo orienta al usuario.
const IPD_PROMEDIO_CM = 6.3;
const FOV_HORIZONTAL_GRADOS = 65;

// Mismos umbrales que el servidor (faceLiveness.js), solo para avisar en
// pantalla cuándo ya se cumplió un giro.
const GIRO_HORIZONTAL = 0.12;
const CENTRO_HORIZONTAL = 0.06;

// Tamaño de entrada del detector. Al encuadrar la cara puede estar lejos
// (416, el default). Al grabar ya está cerca y llena buena parte del
// cuadro: con 224 la detección es mucho más rápida y salen más cuadros
// por segundo.
export const DETECTOR_ENCUADRE = 416;
export const DETECTOR_GRABACION = 224;

export interface FaceDeteccion {
  box: { x: number; y: number; width: number; height: number };
  videoWidth: number;
  videoHeight: number;
  // Puntos para el servidor, en pixeles del video, redondeados.
  puntos: number[][];
  // Distancia entre los centros de los ojos, en pixeles del video.
  ipdPx: number;
  descriptor?: number[];
}

export interface FaceMedida {
  // Posición horizontal de la nariz respecto al centro de los ojos, en
  // distancias-entre-ojos.
  dx: number;
}

@Injectable({
  providedIn: 'root'
})
export class FaceRecognitionService {

  private bModelsLoaded: boolean = false;
  private modelsLoadingPromise: Promise<void> | null = null;

  async loadModels(): Promise<void> {

    if (this.bModelsLoaded) {
      return;
    }

    if (!this.modelsLoadingPromise) {
      this.modelsLoadingPromise = Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]).then(() => {
        this.bModelsLoaded = true;
      });
    }

    return this.modelsLoadingPromise;
  }

  // 1280x720 como ideal (analisis/037): con 480x360 la cara tiene muy
  // pocos pixeles a una distancia cómoda. Si la cámara no llega, el
  // navegador entrega lo más cercano que tenga.
  async startCamera(videoEl: HTMLVideoElement, deviceId?: string): Promise<{ ok: boolean; stream?: MediaStream; error?: string }> {

    try {
      const videoConstraints: MediaTrackConstraints = deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false
      });

      videoEl.srcObject = stream;
      await videoEl.play();

      return { ok: true, stream };
    } catch (ex: any) {
      return { ok: false, error: ex?.message || 'No se pudo acceder a la cámara' };
    }
  }

  stopCamera(stream: MediaStream | null | undefined): void {
    stream?.getTracks().forEach(track => track.stop());
  }

  // Lista las cámaras (video inputs) disponibles en el navegador. Los
  // labels solo vienen poblados si ya se concedió permiso de cámara
  // (por eso se llama DESPUÉS de startCamera, nunca antes).
  async listCameras(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'videoinput');
  }

  // deviceId del track de video activo en el stream actual (para saber
  // cuál tag de cámara marcar como seleccionado).
  getActiveDeviceId(stream: MediaStream | null | undefined): string | null {
    const track = stream?.getVideoTracks()[0];
    return track?.getSettings().deviceId || null;
  }

  // Detecta el rostro con sus puntos y, si se pide, su descriptor (es lo
  // caro: se calcula solo en algunos cuadros de la secuencia).
  async detectar(videoEl: HTMLVideoElement, bConDescriptor: boolean, iTamDetector: number = DETECTOR_ENCUADRE): Promise<FaceDeteccion | null> {

    if (!videoEl.videoWidth) {
      return null;
    }

    const opciones = new faceapi.TinyFaceDetectorOptions({ inputSize: iTamDetector });

    const deteccion: any = bConDescriptor
      ? await faceapi.detectSingleFace(videoEl, opciones).withFaceLandmarks().withFaceDescriptor()
      : await faceapi.detectSingleFace(videoEl, opciones).withFaceLandmarks();

    if (!deteccion) {
      return null;
    }

    const todos = deteccion.landmarks.positions as Array<{ x: number; y: number }>;
    const puntos = INDICES_PUNTOS.map(i => [Math.round(todos[i].x * 10) / 10, Math.round(todos[i].y * 10) / 10]);

    const box = deteccion.detection.box;

    return {
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
      videoWidth: videoEl.videoWidth,
      videoHeight: videoEl.videoHeight,
      puntos,
      ipdPx: this.fn_ipd(puntos),
      // 4 decimales: no cambia la comparación y la petición cabe en el
      // límite del servidor.
      descriptor: bConDescriptor ? Array.from(deteccion.descriptor as Float32Array).map(n => Math.round(n * 10000) / 10000) : undefined
    };
  }

  // ── Distancia a la cámara ──

  // Distancia focal aproximada en pixeles para el ancho del video.
  fn_focalPx(videoWidth: number): number {
    return (videoWidth / 2) / Math.tan((FOV_HORIZONTAL_GRADOS / 2) * Math.PI / 180);
  }

  // Distancia estimada (cm) a la que está una cara con ese ipd.
  fn_distanciaCm(ipdPx: number, videoWidth: number): number {
    return this.fn_focalPx(videoWidth) * IPD_PROMEDIO_CM / ipdPx;
  }

  // ipd (px) que tendría una cara a esa distancia (cm).
  fn_ipdADistancia(distanciaCm: number, videoWidth: number): number {
    return this.fn_focalPx(videoWidth) * IPD_PROMEDIO_CM / distanciaCm;
  }

  // ── Medidas de la prueba de vida (para guiar; decide el servidor) ──

  fn_medir(puntos: number[][]): FaceMedida {

    const cA = this.fn_centro(puntos.slice(0, 6));
    const cB = this.fn_centro(puntos.slice(6, 12));

    return {
      dx: (puntos[12][0] - (cA[0] + cB[0]) / 2) / this.fn_dist(cA, cB)
    };
  }

  // Dirección del giro respecto a la postura de frente (coordenadas del
  // video sin espejo: voltear a la izquierda, que en pantalla también se
  // ve a la izquierda, mueve la nariz a la derecha de la imagen).
  fn_direccionGiro(ddx: number): string | null {
    if (ddx >= GIRO_HORIZONTAL) {
      return 'IZQ';
    }
    if (ddx <= -GIRO_HORIZONTAL) {
      return 'DER';
    }
    return null;
  }

  fn_estaAlCentro(ddx: number): boolean {
    return Math.abs(ddx) < CENTRO_HORIZONTAL;
  }

  fn_mediana(arr: number[]): number {
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  // Miniatura en base64 del centro del video (la del Face ID).
  captureThumb(videoEl: HTMLVideoElement): string {
    const canvas = document.createElement('canvas');
    const size = 160;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const side = Math.min(videoEl.videoWidth, videoEl.videoHeight);
      const sx = (videoEl.videoWidth - side) / 2;
      const sy = (videoEl.videoHeight - side) / 2;
      ctx.drawImage(videoEl, sx, sy, side, side, 0, 0, size, size);
    }
    return canvas.toDataURL('image/jpeg', 0.7);
  }

  private fn_dist(a: number[], b: number[]): number {
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
  }

  private fn_centro(o: number[][]): number[] {
    return [o.reduce((s, p) => s + p[0], 0) / o.length, o.reduce((s, p) => s + p[1], 0) / o.length];
  }

  private fn_ipd(puntos: number[][]): number {
    return this.fn_dist(this.fn_centro(puntos.slice(0, 6)), this.fn_centro(puntos.slice(6, 12)));
  }

}
