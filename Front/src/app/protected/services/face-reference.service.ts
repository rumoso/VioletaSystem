import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Pagination, ResponseDB_CRUD, ResponseGet } from '../interfaces/global.interfaces';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';

// Secuencia de una captura con su reto (analisis/037). `landmarks`: los 13
// puntos de FaceRecognitionService (ojos y nariz) en pixeles del video;
// `descriptor` solo en algunos cuadros.
export interface CapturaRostro {
  idReto: string;
  frames: Array<{ t: number; landmarks: number[][]; descriptor?: number[] }>;
  // Miniatura del final de la grabación (analisis/039): el servidor la
  // guarda como evidencia solo en SIN_VIDA y en marcajes del checador.
  imgEvidencia?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FaceReferenceService {

  private baseURL: string = environment.baseUrl;

  _api: string = 'api/faceRecognition';

  constructor(
    private http: HttpClient
    , private authServ: AuthService
  ) { }

  // Token de sesión para las rutas que lo exigen (analisis/020):
  // registrar, consultar y borrar un rostro de referencia. El servidor
  // toma de aquí quién hizo el cambio.
  private fn_headersSesion(): HttpHeaders {
    return new HttpHeaders({ 'x-token': localStorage.getItem('token') || '' });
  }

  CSaveFaceReference( data: any ): Observable<ResponseDB_CRUD> {

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/saveFaceReference`, data, { headers: this.fn_headersSesion() } );

  }

  // Solo dice si la persona tiene rostro registrado (y su miniatura): el
  // descriptor ya no sale del servidor.
  CGetFaceReference( tipoPersona: string, idPersona: number ): Observable<ResponseGet> {

    const data = { tipoPersona, idPersona };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getFaceReference`, data, { headers: this.fn_headersSesion() } );

  }

  CDeleteFaceReference( tipoPersona: string, idPersona: number ): Observable<ResponseDB_CRUD> {

    const data = { tipoPersona, idPersona };

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/deleteFaceReference`, data, { headers: this.fn_headersSesion() } );

  }

  // ── Comparación y prueba de vida en el servidor (analisis/020 y 037) ──
  // Antes de grabar se pide un reto (`proposito`: LOGIN | TIMECARD |
  // AUTORIZACION | ENROLAR). El navegador manda la secuencia de la
  // captura con ese reto; el servidor revisa que haya una persona viva,
  // decide si coincide y, si sí, entrega un comprobante de un solo uso.

  CPedirReto( proposito: string ): Observable<ResponseGet> {

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/pedirReto`, { proposito } );

  }

  CIdentificarRostro( tipoPersona: string, captura: CapturaRostro, proposito: string, referencia: string ): Observable<ResponseGet> {

    const data = { tipoPersona, ...captura, proposito, referencia, idUserLogON: this.authServ.getIdUserSession() };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/identificarRostro`, data );

  }

  CVerificarRostro( tipoPersona: string, idPersona: number, captura: CapturaRostro, proposito: string, referencia: string ): Observable<ResponseGet> {

    const data = { tipoPersona, idPersona, ...captura, proposito, referencia, idUserLogON: this.authServ.getIdUserSession() };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/verificarRostro`, data );

  }

  CLogFaceVerification( data: any ): Observable<ResponseDB_CRUD> {

    data.idUserLogON = this.authServ.getIdUserSession();

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/logFaceVerification`, data );

  }

  CGetCameraPreference( idUser: number ): Observable<ResponseGet> {

    const data = { idUser };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getCameraPreference`, data );

  }

  CSaveCameraPreference( data: any ): Observable<ResponseDB_CRUD> {

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/saveCameraPreference`, data );

  }

  CGetFaceVerificationLogTrack( pagination: Pagination, parametersForm: any ): Observable<ResponseGet> {

    const data = {
      modo: parametersForm.modo || '',
      resultado: parametersForm.resultado || '',
      startDate: parametersForm.startDate || '',
      endDate: parametersForm.endDate || '',
      persona: parametersForm.persona || '',
      start: pagination.pageIndex * pagination.pageSize,
      limiter: pagination.pageSize
    };

    // Exige sesión y el menú de la bitácora (analisis/039).
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getFaceVerificationLogTrack`, data, { headers: this.fn_headersSesion() } );

  }

  // Miniatura de evidencia de un renglón + foto del Face ID de la persona.
  CGetFaceEvidencia( idFaceVerificationLog: number ): Observable<ResponseGet> {

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getFaceEvidencia`, { idFaceVerificationLog }, { headers: this.fn_headersSesion() } );

  }

}
