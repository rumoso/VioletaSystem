import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { PrintTicketService } from 'src/app/protected/services/print-ticket.service';
import { PrintersService } from 'src/app/protected/services/printers.service';
import { SalesService } from 'src/app/protected/services/sales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { ActionAuthorizationComponent } from '../../../security/users/mdl/action-authorization/action-authorization.component';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

@Component({
  selector: 'app-edit-taller',
  templateUrl: './edit-taller.component.html',
  styleUrls: ['./edit-taller.component.css']
})
export class EditTallerComponent {


  //#region VARIABLES

  idUserLogON: number = 0;
  bShowSpinner: boolean = false;

  selectPrinter: any = {
    idSucursal: 0,
    idPrinter: 0,
    printerName: ''
  }

  oDataSale: any = {

    importe: '',
    descriptionTaller: '',
    idStatusSobre: 0,
    statusSobreDesc: ''

  }

  constructor(
    private dialogRef: MatDialogRef<EditTallerComponent>
    ,@Inject(MAT_DIALOG_DATA) public ODataP: any

    , private _adapter: DateAdapter<any>
    , @Inject(MAT_DATE_LOCALE) private _locale: string

    , private servicesGServ: ServicesGService
    , private authServ: AuthService

    , private salesServ: SalesService

    , private printTicketServ: PrintTicketService
    , private printersServ: PrintersService
    ) { }

    async ngOnInit() {

      this.authServ.checkSession();
      this.idUserLogON = await this.authServ.getIdUserSession();

      this._locale = 'mx';
      this._adapter.setLocale(this._locale);

      //this.idCaja = this.ODataP.idSale;

      if( this.ODataP.idSale.length > 0 ){

        this.fn_getSaleByID( this.ODataP.idSale );
        this.fn_getSelectPrintByIdUser( this.idUserLogON );

      }

    }

  //#endregion

  //#region MÉTODOS PARA EL FRONT
    fn_CerrarMDL( id: number ){
      this.dialogRef.close( id );
    }
  //#endregion

  //#region CONEXIONES AL BACK

  fn_getSaleByID( idSale: any ) {

    this.bShowSpinner = true;

    this.salesServ.CGetSaleByID( idSale )
      .subscribe( ( resp: any ) => {

        console.log(resp)

          if(resp.status == 0){

            this.oDataSale.descriptionTaller = resp.dataDetail[0].productDesc;
            this.oDataSale.importe = resp.dataDetail.reduce((sum: any, x: any) => sum + x.importe, 0);
            this.oDataSale.idStatusSobre = resp.data.idStatusSobre;
            this.oDataSale.statusSobreDesc = resp.data.statusSobreDesc;

          }else{
            this.servicesGServ.showSnakbar(resp.message);
          }
          this.bShowSpinner = false;
      } );

  }

  bShowAction: boolean = false;
  fn_editTaller(){

    if(!this.bShowAction){

      this.bShowAction = true;

      this.servicesGServ.showDialog('¿Estás seguro?'
      , 'Está apunto de editar el sobre de taller: #' + this.ODataP.idSale
      , '¿Desea continuar?'
      , 'Si', 'No', '500px' )
      .afterClosed().subscribe({
        next: ( resp ) =>{

          if(resp){

            var paramsMDL: any = {
              actionName: 'ventas_ChangeTaller'
              , bShowAlert: false
            }

            this.servicesGServ.showModalWithParams( ActionAuthorizationComponent, paramsMDL, '400px')
            .afterClosed().subscribe({
              next: ( auth_idUser ) =>{

                if( auth_idUser ){

                  this.bShowAction = false;

                  this.bShowSpinner = true;

                  var oParams: any = {
                    auth_idUser: auth_idUser,
                    idSale: this.ODataP.idSale,
                    importe: this.oDataSale.importe,
                    descriptionTaller: this.oDataSale.descriptionTaller,
                    idStatusSobre: this.oDataSale.idStatusSobre
                  }

                  this.salesServ.CEditSobreTaller( oParams )
                  .subscribe({
                    next: (resp: any) => {

                      if( resp.status === 0 ){

                        this.fn_CerrarMDL( this.ODataP.idSale )

                      }

                      this.servicesGServ.showAlertIA( resp );

                      this.bShowSpinner = false;

                    },
                    error: (ex) => {

                      this.servicesGServ.showSnakbar( ex.error.message );
                      this.bShowSpinner = false;

                    }
                  });

                }
                else{
                  this.bShowAction = false;
                }

              }
            });

          }
          else{
            this.bShowAction = false;
          }

        }
      });

    }

  }

  fn_getSelectPrintByIdUser( idUser: number ) {

    this.printersServ.CGetSelectPrinterByIdUser( idUser )
    .subscribe({

      next: ( resp: ResponseGet ) => {

        if( resp.status == 0 ){

          this.selectPrinter.idSucursal = resp.data.idSucursal;
          this.selectPrinter.idPrinter = resp.data.idPrinter;
          this.selectPrinter.printerName = resp.data.printerName;

        }
        else{

          this.selectPrinter.idSucursal = 0;
          this.selectPrinter.idPrinter = 0;
          this.selectPrinter.printerName = '';

        }

        console.log( resp );
      },
      error: (ex: HttpErrorResponse) => {
        this.servicesGServ.showSnakbar( ex.error.data );
      }

    })

  }

  //#endregion


//--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE ÁREAS

  cbxSobreTallerStatus: any[] = [];

  cbxSobreTallerStatus_Search() {

    var oParams: any ={
      search: this.oDataSale.statusSobreDesc
    }

      this.salesServ.CCbxGetSobreTellerStatusCombo( oParams )
       .subscribe( {
         next: (resp: ResponseGet) =>{
           if(resp.status === 0){
             this.cbxSobreTallerStatus = resp.data
           }
           else{
            this.cbxSobreTallerStatus = [];
           }
         },
         error: (ex) => {
           this.servicesGServ.showSnakbar( "Problemas con el servicio" );
           this.bShowSpinner = false;
         }
       });
  }

  cbxSobreTallerStatus_SelectedOption( event: MatAutocompleteSelectedEvent ) {

    this.cbxSobreTallerStatus_Clear();

    setTimeout (() => {

      const ODataCbx: any = event.option.value;

      this.oDataSale.idStatusSobre = ODataCbx.id;
      this.oDataSale.statusSobreDesc = ODataCbx.name;

      //alert(this.salesHeaderForm.idSaleType)


    }, 1);

  }

  cbxSobreTallerStatus_Clear(){
    this.oDataSale.idStatusSobre = 0;
    this.oDataSale.statusSobreDesc = '';
  }
  //--------------------------------------------------------------------------

}
