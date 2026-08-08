import { Injectable } from '@angular/core';
import * as faceapi from '@vladmandic/face-api';

// Reconocimiento facial local (analisis/004-reconocimiento-facial.md):
// todo el procesamiento (deteccion, extraccion del descriptor,
// comparacion) ocurre aqui, en el navegador, con los modelos servidos
// desde assets/ — nunca se manda el rostro a un servicio externo.

const MODEL_URL = 'assets/models/face';

// Distancia euclidiana maxima entre dos descriptores para considerarlos
// la misma persona. Centralizado aqui — ninguna pantalla debe inventar
// su propio umbral. Ajustar si hay falsos positivos/negativos.
const MATCH_THRESHOLD = 0.5;

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

  async startCamera(videoEl: HTMLVideoElement, deviceId?: string): Promise<{ ok: boolean; stream?: MediaStream; error?: string }> {

    try {
      const videoConstraints: MediaTrackConstraints = deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 480 }, height: { ideal: 360 } }
        : { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 360 } };

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

  // Deteccion liviana (solo la caja, sin landmarks ni descriptor) para
  // el sondeo continuo que dibuja la plantilla-guia y dispara la
  // captura automática. Mucho más barata que captureDescriptor().
  async detectFaceBox(videoEl: HTMLVideoElement): Promise<{ x: number; y: number; width: number; height: number; videoWidth: number; videoHeight: number } | null> {

    if (!videoEl.videoWidth) {
      return null;
    }

    const detection = await faceapi.detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions());

    if (!detection) {
      return null;
    }

    return {
      x: detection.box.x,
      y: detection.box.y,
      width: detection.box.width,
      height: detection.box.height,
      videoWidth: videoEl.videoWidth,
      videoHeight: videoEl.videoHeight
    };
  }

  // Detecta un rostro en el frame actual del video y regresa su
  // descriptor (128 numeros) + una miniatura en base64 del recorte.
  async captureDescriptor(videoEl: HTMLVideoElement): Promise<{ ok: boolean; descriptor?: number[]; imgThumb?: string; error?: string }> {

    await this.loadModels();

    const detection = await faceapi
      .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return { ok: false, error: 'No se detectó ningún rostro. Acércate más a la cámara.' };
    }

    const imgThumb = this.fn_captureThumb(videoEl);

    return {
      ok: true,
      descriptor: Array.from(detection.descriptor),
      imgThumb
    };
  }

  // Compara un descriptor recien capturado contra una referencia (modo
  // verificacion 1:1). Regresa si coincide y que tan similar es (0-1).
  compare(descriptorA: number[], descriptorB: number[]): { match: boolean; similitud: number } {

    const distancia = faceapi.euclideanDistance(descriptorA, descriptorB);
    const similitud = Math.max(0, 1 - distancia);

    return {
      match: distancia <= MATCH_THRESHOLD,
      similitud: Math.round(similitud * 10000) / 10000
    };
  }

  // Busca TODAS las referencias que coinciden dentro del umbral (modo
  // identificacion 1:N), no solo la más parecida — si hay más de una
  // persona plausible, quien invoque esto debe mostrar la lista y dejar
  // que el operador elija, en vez de confiar a ciegas en "la más cercana".
  // `referencias` trae idPersona/tipoPersona/descriptor. Ordenado de
  // mayor a menor similitud.
  identify(descriptor: number[], referencias: any[]): { candidatos: Array<{ referencia: any; similitud: number }> } {

    const candidatos: Array<{ referencia: any; similitud: number }> = [];

    for (const ref of referencias) {
      const oDescriptorRef: number[] = typeof ref.descriptor === 'string' ? JSON.parse(ref.descriptor) : ref.descriptor;
      const distancia = faceapi.euclideanDistance(descriptor, oDescriptorRef);

      if (distancia <= MATCH_THRESHOLD) {
        const similitud = Math.max(0, 1 - distancia);
        candidatos.push({ referencia: ref, similitud: Math.round(similitud * 10000) / 10000 });
      }
    }

    candidatos.sort((a, b) => b.similitud - a.similitud);

    return { candidatos };
  }

  private fn_captureThumb(videoEl: HTMLVideoElement): string {
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

}
