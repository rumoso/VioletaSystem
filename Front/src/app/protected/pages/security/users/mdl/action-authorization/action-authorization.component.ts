import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { ActionsService } from 'src/app/protected/services/actions.service';
import { AuthorizationActionService } from 'src/app/protected/services/authorization-action.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';
import { FaceVerificationComponent } from '../../../mdl/face-verification/face-verification.component';

@Component({
  selector: 'app-action-authorization',
  templateUrl: './action-authorization.component.html',
  styleUrls: ['./action-authorization.component.css']
})
export class ActionAuthorizationComponent {
//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE VARIABLES
//////////////////////////////////////////////////////////////////////////////////////////////////

private _appMain: string = environment.appMain;

@ViewChild('tbxAuthorizationCode') tbxAuthorizationCode!: ElementRef;

title: string = 'Autorizacipon';
bShowSpinner: boolean = false;

idUserLogON: number = 0;

randomId: string = Math.random().toString(36).substring(2);

actionForm: any = {

  actionName: '',
  authorizationCode: ''

};

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE VARIABLES
//////////////////////////////////////////////////////////////////////////////////////////////////

constructor(
  private dialogRef: MatDialogRef<ActionAuthorizationComponent>
  , @Inject(MAT_DIALOG_DATA) public ODataP: any

  , private servicesGServ: ServicesGService

  , private _adapter: DateAdapter<any>
  , @Inject(MAT_DATE_LOCALE) private _locale: string

  , private authServ: AuthService

  , private actionsServ: ActionsService
  , private authorizationServ: AuthorizationActionService

  ) { }

  async ngOnInit() {

    this.authServ.checkSession();
    this.idUserLogON = await this.authServ.getIdUserSession();

    this._locale = 'mx';
    this._adapter.setLocale(this._locale);

    this.actionForm.actionName = this.ODataP.actionName;

    setTimeout (() => {
      this.tbxAuthorizationCode.nativeElement.focus();
    }, 500);

  }

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

  bShow: boolean = false;

  fn_authorizarPorRostro() {

    if (this.bShow) {
      return;
    }

    this.servicesGServ.showModalWithParams(FaceVerificationComponent, {
      modo: 'IDENTIFICAR',
      tipoPersona: 'USUARIO',
      referencia: `Autorización: ${ this.actionForm.actionName }`,
      proposito: 'AUTORIZACION',
      ocultarAutorizacionManual: true
    }, '480px')
      .afterClosed().subscribe({
        next: (resp: any) => {

          if (!resp?.ok) {
            return; // canceló o no identificó a nadie: puede seguir con el código
          }

          this.bShow = true;
          this.bShowSpinner = true;

          // Quién autoriza lo toma el servidor del comprobante (analisis/020).
          this.authorizationServ.CAuthorizationActionByFace({
            ticket: resp.ticket,
            actionName: this.actionForm.actionName
          }).subscribe({
            next: (resp2: ResponseDB_CRUD) => {

              if (this.ODataP.bShowAlert) {
                this.servicesGServ.showAlertIA(resp2);
              }

              if (resp2.status == 0 && resp2.insertID > 0) {
                this.fn_CerrarMDL(resp2.insertID);
              } else {
                this.servicesGServ.showAlertIA(resp2);
              }

              this.bShowSpinner = false;
              this.bShow = false;

            },
            error: () => {
              this.servicesGServ.showSnakbar("Problemas con el servicio");
              this.bShowSpinner = false;
              this.bShow = false;
            }
          });

        }
      });

  }

  fn_authorizationAction() {

    if( this.actionForm?.authorizationCode?.trim()?.length > 0 && !this.bShow){
      this.bShow = true;

      this.servicesGServ.showDialog('¿Estás seguro?'
      , 'Está seguro de aprobar esta acción?'
      , '¿Desea continuar?'
      , 'Si', 'No')
        .afterClosed().subscribe({
        next: ( resp: any ) =>{

          if(resp){

            this.bShowSpinner = true;

            this.authorizationServ.CAuthorizationActionAPI( this.actionForm )
              .subscribe({
              next: (resp: ResponseDB_CRUD) => {

                if( this.ODataP.bShowAlert )
                  this.servicesGServ.showAlertIA( resp );

                if( resp.status == 0 && resp.insertID > 0 ){
                  this.fn_CerrarMDL( resp.insertID );
                }else{
                  this.servicesGServ.showAlertIA( resp );
                  this.actionForm.authorizationCode = '';
                }

                this.bShowSpinner = false;
                this.bShow = false;

              },
              error: (ex) => {

                this.servicesGServ.showSnakbar( "Problemas con el servicio" );
                this.bShowSpinner = false;

              }
            })

          }
          else{
            this.bShow = false;
          }
        }
      });

    }

  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE CONEXIONES AL BACK
  //////////////////////////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // SECCIÓN DE EVENTOS
  //////////////////////////////////////////////////////////////////////////////////////////////////

  event_fn_Enter( event: any ){

    if(event.keyCode == 13) { // PRESS ENTER

      // Enter sin haber escrito ningún código: atajo para autorizar por
      // rostro en vez de mandar el formulario vacío.
      if( !this.actionForm?.authorizationCode?.trim()?.length ){
        this.fn_authorizarPorRostro();
      }else{
        this.fn_authorizationAction();
      }

    }
  }

  fn_CerrarMDL( idUser: number ){
    this.dialogRef.close( idUser );
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE EVENTOS
  //////////////////////////////////////////////////////////////////////////////////////////////////

}
