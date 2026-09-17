import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { ResponseDB_CRUD, ResponseGet } from '../interfaces/global.interfaces';
import { ActionAuthorizationComponent } from '../pages/security/users/mdl/action-authorization/action-authorization.component';
import { QuestionCancelSalePaymentsComponent } from '../pages/sales/mdl/question-cancel-sale-payments/question-cancel-sale-payments.component';
import { MotivoCancelacionComponent } from '../pages/sales/mdl/motivo-cancelacion/motivo-cancelacion.component';
import { SalesService } from './sales.service';

// Ícono de cancelar de un taller (analisis/022): un solo botón que decide.
// Sin datos (solo encabezado) se elimina definitivamente con
// tall_DeleteVacio; con datos se cancela con ventas_CancelarTaller,
// motivo y autorización. Lo comparten taller-list y sale-list para que el
// flujo no se duplique.
@Injectable({
  providedIn: 'root'
})
export class TallerCancelacionService {

  constructor(
    private salesServ: SalesService
    , private servicesGServ: ServicesGService
    , private authServ: AuthService
  ) { }

  // Permisos con los que se muestra el ícono en un taller.
  fn_puedeEliminarOCancelar(): boolean {
    return this.authServ.hasPermissionAction('tall_DeleteVacio')
        || this.authServ.hasPermissionAction('ventas_CancelarTaller');
  }

  // Emite `true` cuando algo cambió (hay que refrescar el listado) y se
  // completa; `fnBusy` prende/apaga el spinner del componente.
  fn_eliminarOCancelar( data: any, fnBusy: ( b: boolean ) => void ): Observable<boolean> {

    const oResult = new Subject<boolean>();
    const fin = ( bCambio: boolean ) => { fnBusy( false ); oResult.next( bCambio ); oResult.complete(); };

    fnBusy( true );

    this.salesServ.CGetTallerDatosCancelacion( data.idSale )
    .subscribe({
      next: ( resp: ResponseGet ) => {

        fnBusy( false );

        if( resp.status !== 0 ){
          this.servicesGServ.showAlertIA( resp );
          return fin( false );
        }

        const oDatos: any = resp.data;

        if( !oDatos.bTieneDatos ){
          this._fn_eliminar( data, fnBusy, fin );
        }else{
          this._fn_cancelar( data, oDatos, fnBusy, fin );
        }

      },
      error: ( ex ) => {
        this.servicesGServ.showSnakbar( ex.error?.message || 'No se pudo consultar el taller.' );
        fin( false );
      }
    });

    return oResult.asObservable();
  }

  private _fn_eliminar( data: any, fnBusy: ( b: boolean ) => void, fin: ( b: boolean ) => void ): void {

    if( !this.authServ.hasPermissionAction('tall_DeleteVacio') ){
      this.servicesGServ.showAlert('W', 'Sin permiso'
        , 'El taller #' + data.idSale + ' no tiene nada capturado, así que se elimina en lugar de cancelarse. Eliminarlo requiere el permiso "Eliminar taller sin datos".');
      return fin( false );
    }

    this.servicesGServ.showDialog('¿Estás seguro?'
    , 'El taller #' + data.idSale + ' no tiene nada capturado. Se eliminará definitivamente.'
    , '¿Desea continuar?'
    , 'Eliminar', 'No' )
    .afterClosed().subscribe({
      next: ( resp ) => {

        if( !resp ){
          return fin( false );
        }

        fnBusy( true );

        this.salesServ.CDeleteTallerVacio( data.idSale )
        .subscribe({
          next: ( resp: ResponseDB_CRUD ) => {
            this.servicesGServ.showAlertIA( resp );
            fin( true );
          },
          error: ( ex ) => {
            this.servicesGServ.showSnakbar( ex.error?.message || 'No se pudo eliminar el taller.' );
            fin( false );
          }
        });

      }
    });
  }

  private _fn_cancelar( data: any, oDatos: any, fnBusy: ( b: boolean ) => void, fin: ( b: boolean ) => void ): void {

    if( !this.authServ.hasPermissionAction('ventas_CancelarTaller') ){
      this.servicesGServ.showAlert('W', 'Sin permiso'
        , 'El taller #' + data.idSale + ' tiene información capturada y solo se puede cancelar. Cancelarlo requiere el permiso de cancelar talleres.');
      return fin( false );
    }

    const paramsMDL: any = {
      titulo: 'Cancelar taller #' + data.idSale,
      mensaje: 'Este taller tiene información capturada, así que no se elimina: se cancelará y quedará en el historial. El metal regresa al inventario y se reversan las comisiones.',
      aDatos: oDatos.aDatos || [],
      sBotonConfirmar: 'Cancelar taller'
    };

    this.servicesGServ.showModalWithParams( MotivoCancelacionComponent, paramsMDL, '560px')
    .afterClosed().subscribe({
      next: ( motivo: string ) => {

        if( !motivo ){
          return fin( false );
        }

        if( data.pagosYaEnCorte > 0 ){

          this.servicesGServ.showModalWithParams( QuestionCancelSalePaymentsComponent, { pagosYaEnCorte: data.pagosYaEnCorte }, '600px')
          .afterClosed().subscribe({
            next: ( sOption ) => {
              if( !sOption ){
                return fin( false );
              }
              this._fn_autorizarYCancelar( data, sOption, motivo, fnBusy, fin );
            }
          });

        }else{
          this._fn_autorizarYCancelar( data, '', motivo, fnBusy, fin );
        }

      }
    });
  }

  private _fn_autorizarYCancelar( data: any, sOption: string, motivo: string, fnBusy: ( b: boolean ) => void, fin: ( b: boolean ) => void ): void {

    this.servicesGServ.showModalWithParams( ActionAuthorizationComponent, { actionName: 'ventas_CancelarTaller', bShowAlert: false }, '400px')
    .afterClosed().subscribe({
      next: ( auth_idUser ) => {

        if( !auth_idUser ){
          return fin( false );
        }

        fnBusy( true );

        this.salesServ.CCancelarTaller( data.idSale, sOption, auth_idUser, motivo )
        .subscribe({
          next: ( resp: ResponseDB_CRUD ) => {
            this.servicesGServ.showAlertIA( resp );
            fin( true );
          },
          error: ( ex ) => {
            this.servicesGServ.showSnakbar( ex.error?.message || 'No se pudo cancelar el taller.' );
            fin( false );
          }
        });

      }
    });
  }

}
