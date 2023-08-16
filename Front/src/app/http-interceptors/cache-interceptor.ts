import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AuthService } from '../auth/services/auth.service';

@Injectable()
export class CacheInterceptor implements HttpInterceptor {

    private bSend: number = environment.bSend;
    private idSucursal: number = environment.idSucursal;

    constructor(
        private authServ: AuthService
    ){}
    
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const httpRequest = req.clone({
      headers: new HttpHeaders({
        'idUserLogON': this.authServ.getIdUserSession(),
        'idSucursal': this.idSucursal
      })
    });

    return next.handle(httpRequest);
  }
}