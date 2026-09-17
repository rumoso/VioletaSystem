import { Injectable } from '@angular/core';
import * as faceapi from '@vladmandic/face-api';

// Reconocimiento facial (analisis/004 y analisis/020): aquí, en el
// navegador, se detecta el rostro y se extrae su descriptor con los
// modelos servidos desde assets/ — la imagen nunca sale a un servicio
// externo.
//
// La COMPARACIÓN ya no ocurre aquí: se hace en el servidor
// (FaceReferenceService.CIdentificarRostro / CVerificarRostro), que es el
// único que conoce los descriptores guardados y el que decide si
// coincide. Antes se comparaba en el navegador y el servidor creía el
// resultado.

const MODEL_URL = 'assets/models/face';

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
