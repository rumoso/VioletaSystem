import { Component, Inject } from '@angular/core';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { Subject, debounceTime } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { ComisionesService } from 'src/app/protected/services/comisiones.service';
import { UsersService } from 'src/app/protected/services/users.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';
import { ActionAuthorizationComponent } from '../../security/users/mdl/action-authorization/action-authorization.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-gen-comision',
  templateUrl: './gen-comision.component.html',
  styleUrls: ['./gen-comision.component.css']
})
export class GenComisionComponent {

  private _appMain: string = environment.appMain;
  public _idSucursal: number = environment.idSucursal;

  // #region VARIABLES

  idUserLogON: number = 0;

  private timeCBXskeyup: Subject<any> = new Subject<any>();
  
  bShowSpinner: boolean = false;

  parametersForm: any = {
    startDate: new Date(),
    endDate: new Date(),
    idSeller_idUser: 0,
    sellerDesc: '',
    sellerResp: '',
    comision: 0
  };

  // #endregion

  constructor(
    private dialogRef: MatDialogRef<GenComisionComponent>
    ,@Inject(MAT_DIALOG_DATA) public ODataP: any
    
    , private servicesGServ: ServicesGService

    , private _adapter: DateAdapter<any>
    , @Inject(MAT_DATE_LOCALE) private _locale: string

    , private authServ: AuthService

    , private comisionesServ: ComisionesService
    , private userServ: UsersService
  ) { }

  async ngOnInit() {

    this.authServ.checkSession();
    this.idUserLogON = await this.authServ.getIdUserSession();

    this._locale = 'mx';
    this._adapter.setLocale(this._locale);

    this.fn_setDates();

    //this.fn_getInventaryListWithPage();

    this.timeCBXskeyup
    .pipe(
      debounceTime(500)
    )
    .subscribe( value => {
      if(value.iOption == 1){
        this.cbxSellers_Search();
      }
    })
  }

  // #region MÉTODOS DEL FRONT

  fn_CerrarMDL( bOK: boolean ){
    this.dialogRef.close( bOK );
  }

  fn_setDates(){
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    this.parametersForm.startDate = firstDayOfMonth;
    this.parametersForm.endDate = lastDayOfMonth;
  }

  // fn_ShowComision( item: any ){

  //   var paramsMDL: any = {
  //     idComision: item.idComision,
  //     userName: item.userName
  //   }
  
  //   this.servicesGServ.showModalWithParams( ComisionComponent, paramsMDL, '2500px')
  //   .afterClosed().subscribe({
  //     next: ( resp ) =>{
  //       this.fn_getComisionesListWithPage();
  //     }
  //   });
  
  
  // }

  fn_ClearParameters() {
    
    this.parametersForm = {
      startDate: new Date(),
      endDate: new Date(),
      idSeller_idUser: 0,
      sellerDesc: '',
      sellerResp: '',
      comision: 0
    };

    this.fn_setDates();
  }

  // #endregion

 
 // #region CONEXION CON EL BACK

  bShowAction: boolean = false;
  fn_generarAllComisiones(){

    if(!this.bShowAction){
      
      this.bShowAction = true;

      this.servicesGServ.showDialog('¿Estás seguro?'
      , 'Está a punto de generar las comisiones'
      , '¿Desea continuar?'
      , 'Si', 'No')
      .afterClosed().subscribe({
        next: ( resp ) =>{
          
          if(resp){

            this.bShowAction = false;

            this.bShowSpinner = true;

            const data: any = {
              startDate: this.parametersForm.startDate,
              endDate: this.parametersForm.endDate,
              idSeller_idUser: this.parametersForm.idSeller_idUser
            };
          
            this.comisionesServ.CGenerarAllComisiones( data )
              .subscribe({
                next: (resp: ResponseDB_CRUD) => {
        
                  if( resp.status === 0 ){
        
                    this.fn_CerrarMDL( true );
        
                  }
                  else{
                    this.servicesGServ.showAlertIA( resp );
                  }
          
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
          
  }

// #endregion
 
 
  // #region COMBOSBOX




//--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE ÁREAS

  cbxSellers: any[] = [];

  CBXskeyup( iOption: number, txt: string ){

    let cbxKeyUp: any = {
      iOption: iOption,
      txt: txt
    }

    this.timeCBXskeyup.next( cbxKeyUp );
  }

  cbxSellers_Search() {
      this.userServ.CCbxGetSellersCombo( this.parametersForm.sellerDesc, this.idUserLogON )
       .subscribe( {
         next: (resp: ResponseGet) =>{
           if(resp.status === 0){
             this.cbxSellers = resp.data;
             this.parametersForm.sellerResp = '';
             
           }
           else{
            this.cbxSellers = [];
            this.parametersForm.sellerResp = resp.message;
           }
         },
         error: (ex) => {
           this.servicesGServ.showSnakbar( "Problemas con el servicio" );
           this.bShowSpinner = false;
         }
       });
  }

  cbxSellers_SelectedOption( event: MatAutocompleteSelectedEvent ) {

    if(!event.option.value){
      return;
    }

    const ODataCbx: any = event.option.value;

    this.parametersForm.idSeller_idUser =  ODataCbx.idUser;
    this.parametersForm.sellerDesc = ODataCbx.name;
    this.parametersForm.sellerResp = '';
    this.parametersForm.comision = ODataCbx.comision;

  }

  cbxSellers_Clear(){
    this.cbxSellers = [];
    this.parametersForm.idSeller_idUser = 0;
    this.parametersForm.sellerDesc = '';
    this.parametersForm.sellerResp = '';
    this.parametersForm.comision = 0;
  }
  //--------------------------------------------------------------------------

// #endregion

}
