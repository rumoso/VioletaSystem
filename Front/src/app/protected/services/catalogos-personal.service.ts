import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { AuthService } from 'src/app/auth/services/auth.service';
import { environment } from 'src/environments/environment';

// Catálogos de personal (analisis/005): técnicos y vendedores comparten
// exactamente la misma API — el parámetro `catalogo` decide el path
// ('tecnicos' | 'vendedores'). También expone las preferencias
// genéricas por usuario/pantalla (vista tabla/cards).

@Injectable({
  providedIn: 'root'
})
export class CatalogosPersonalService {

  private baseURL: string = environment.baseUrl;

  constructor(
    private http: HttpClient
    , private authServ: AuthService
    ) { }

  CGetList( catalogo: string, pagination: Pagination, bSoloActivos: boolean = false ): Observable<ResponseGet> {
    const data = {
      search: pagination.search,
      pageSize: pagination.pageSize,
      pageIndex: pagination.pageIndex,
      bSoloActivos
    };
    const sMetodo = catalogo === 'tecnicos' ? 'getTecnicosList' : 'getVendedoresList';
    return this.http.post<ResponseGet>( `${ this.baseURL }/api/${ catalogo }/${ sMetodo }`, data );
  }

  CGetById( catalogo: string, id: number ): Observable<ResponseGet> {
    const sMetodo = catalogo === 'tecnicos' ? 'getTecnicoById' : 'getVendedorById';
    return this.http.post<ResponseGet>( `${ this.baseURL }/api/${ catalogo }/${ sMetodo }`, { id } );
  }

  CInsertUpdate( catalogo: string, data: any ): Observable<ResponseDB_CRUD> {
    data.idUserLogON = this.authServ.getIdUserSession();
    const sMetodo = catalogo === 'tecnicos' ? 'insertUpdateTecnico' : 'insertUpdateVendedor';
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/api/${ catalogo }/${ sMetodo }`, data );
  }

  CSetActive( catalogo: string, id: number, active: boolean ): Observable<ResponseDB_CRUD> {
    const sMetodo = catalogo === 'tecnicos' ? 'setActiveTecnico' : 'setActiveVendedor';
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/api/${ catalogo }/${ sMetodo }`, { id, active } );
  }

  CDelete( catalogo: string, id: number ): Observable<ResponseDB_CRUD> {
    const sMetodo = catalogo === 'tecnicos' ? 'deleteTecnico' : 'deleteVendedor';
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/api/${ catalogo }/${ sMetodo }`, { id } );
  }

  // ---- Preferencias por usuario/pantalla (endpoint en api/users) ----

  CGetUserPreferences( scope: string ): Observable<ResponseGet> {
    const data = {
      idUser: this.authServ.getIdUserSession(),
      scope
    };
    return this.http.post<ResponseGet>( `${ this.baseURL }/api/users/getUserPreferences`, data );
  }

  CSaveUserPreference( scope: string, prefKey: string, prefValue: string ): Observable<ResponseDB_CRUD> {
    const data = {
      idUser: this.authServ.getIdUserSession(),
      scope,
      prefKey,
      prefValue
    };
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/api/users/insertUpdateUserPreferences`, data );
  }

}
