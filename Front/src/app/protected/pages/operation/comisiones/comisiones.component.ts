import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { Subject, debounceTime } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseDB_CRUD, ResponseGet } from 'src/app/protected/interfaces/global.interfaces';
import { ComisionesService } from 'src/app/protected/services/comisiones.service';
import { UsersService } from 'src/app/protected/services/users.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';
import { ComisionComponent } from '../comision/comision.component';
import { ActionAuthorizationComponent } from '../../security/users/mdl/action-authorization/action-authorization.component';
import { GenComisionComponent } from '../gen-comision/gen-comision.component';

@Component({
  selector: 'app-comisiones',
  templateUrl: './comisiones.component.html',
  styleUrls: ['./comisiones.component.css']
})
export class ComisionesComponent {

  private _appMain: string = environment.appMain;
  public _idSucursal: number = environment.idSucursal;

  // #region VARIABLES

  idUserLogON: number = 0;

  private timeCBXskeyup: Subject<any> = new Subject<any>();

  title = 'Lista de Comisiones';
  bShowSpinner: boolean = false;

  oData: any[] = [];

  panelOpenState: boolean = false;

  sumComisiones: number = 0;
  
  //-------------------------------
  // VARIABLES PARA LA PAGINACIÓN
  iRows: number = 0;
  pagination: Pagination = {
    search:'',
    length: 10,
    pageSize: 10,
    pageIndex: 0,
    pageSizeOptions: [5, 10, 25, 100]
  }
  //-------------------------------

  parametersForm: any = {
    startDate: new Date(),
    endDate: new Date(),
    idSeller_idUser: 0,
    sellerDesc: '',
    sellerResp: '',
    comision: 0,
    bPending: false,
    bPagada: false,
    bCancel: false,
  };


  // #endregion

  constructor(
    private servicesGServ: ServicesGService

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

  ////************************************************ */
  // MÉTODOS DE PAGINACIÓN
  changePagination(pag: Pagination) {
    this.pagination = pag;
    //this.fn_getVentasListWithPage();
  }

  onChangeEvent(event: any){
    this.pagination.search = event.target.value;
    //this.fn_getVentasListWithPage();
  }
  ////************************************************ */

  changeRoute( route: string ): void {
    this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
  }

  // #region MÉTODOS DEL FRONT

  fn_ShowGenComision(){

    this.servicesGServ.showModalWithParams( GenComisionComponent, null, '800px')
    .afterClosed().subscribe({
      next: ( resp ) =>{
  
        if( resp ){

          this.fn_getComisionesListWithPage();

        }

      }
    }); 
  }

  fn_setDates(){
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    this.parametersForm.startDate = firstDayOfMonth;
    this.parametersForm.endDate = lastDayOfMonth;
  }

  fn_ShowComision( item: any ){

    var paramsMDL: any = {
      idComision: item.idComision,
      userName: item.userName
    }
  
    this.servicesGServ.showModalWithParams( ComisionComponent, paramsMDL, '2500px')
    .afterClosed().subscribe({
      next: ( resp ) =>{
        this.fn_getComisionesListWithPage();
      }
    });
  
  
  }

  fn_ClearParameters() {
    
    this.parametersForm = {
      startDate: new Date(),
      endDate: new Date(),
      idSeller_idUser: 0,
      sellerDesc: '',
      sellerResp: '',
      comision: 0
    };

    this.sumComisiones = 0;

    this.oData = [];

    this.fn_setDates();
  }

  // #endregion

// #region CONEXION CON EL BACK

  bShowActionAuthorization: boolean = false;
  fn_disabledComision( idComision: any ){

    if(!this.bShowActionAuthorization){
      
      this.bShowActionAuthorization = true;

      this.servicesGServ.showDialog('¿Estás seguro?'
      , 'Está a punto de cancelar esta comisión'
      , '¿Desea continuar?'
      , 'Si', 'No')
      .afterClosed().subscribe({
        next: ( resp ) =>{
          
          if(resp){

            var paramsMDL: any = {
              actionName: 'opera_CancelarComision'
              , bShowAlert: false
            }
          
            this.servicesGServ.showModalWithParams( ActionAuthorizationComponent, paramsMDL, '400px')
            .afterClosed().subscribe({
              next: ( resp ) =>{
          
                if( resp ){

                  this.bShowActionAuthorization = false;

                  this.bShowSpinner = true;

                  var oParams: any = {
                    idComision: idComision
                  }

                  this.comisionesServ.CDisabledComision( oParams )
                  .subscribe({
                    next: (resp: any) => {
            
                      this.servicesGServ.showAlertIA( resp );
                      
                      this.bShowSpinner = false;

                      this.fn_getComisionesListWithPage();
            
                    },
                    error: (ex) => {
            
                      this.servicesGServ.showSnakbar( ex.error.message );
                      this.bShowSpinner = false;
            
                    }
                  });

                }
                else{
                  this.bShowActionAuthorization = false;
                }

              }
            });

          }
          else{
            this.bShowActionAuthorization = false;
          }
          
        }
      });

    }
          
  }

  fn_getComisionesListWithPage() {
    
    this.oData = [];
    //this.physicalInventoryHeaderBySucursal = [];

    this.bShowSpinner = true;
    this.comisionesServ.CGetComisionesListWithPage( this.pagination, this.parametersForm )
    .subscribe({
      next: (resp: ResponseGet) => {
        console.log(resp)

        if( resp.status == 0 ){

          this.oData = resp.data.rows;
          this.pagination.length = resp.data.count;
          this.sumComisiones = resp.data.header.sumComisiones;
          
        }
        else{

          this.oData = [];
          this.pagination.length = 0;
          this.sumComisiones = 0;

        }

        this.bShowSpinner = false;

      },
      error: (ex: HttpErrorResponse) => {
        console.log( ex )
        this.servicesGServ.showSnakbar( ex.error.data );
        this.bShowSpinner = false;
      }
    })
  }

  fn_GenerarComision(){

    const data: any = {
      startDate: this.parametersForm.startDate,
      endDate: this.parametersForm.endDate,
      idSeller_idUser: this.parametersForm.idSeller_idUser
    };

    this.comisionesServ.CGenerarComision( data )
      .subscribe({
        next: (resp: ResponseDB_CRUD) => {

          if( resp.status === 0 ){

            var paramsMDL: any = {
              idComision: resp.insertID,
              userName: this.parametersForm.sellerDesc
            }

            this.fn_ShowComision( paramsMDL );
              
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

// #endregion

// #region EVENTOS

  

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
