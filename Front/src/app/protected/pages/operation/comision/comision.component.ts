import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseDB_CRUD, ResponseGet } from 'src/app/protected/interfaces/global.interfaces';
import { ComisionesService } from 'src/app/protected/services/comisiones.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';
import { ActionAuthorizationComponent } from '../../security/users/mdl/action-authorization/action-authorization.component';

@Component({
  selector: 'app-comision',
  templateUrl: './comision.component.html',
  styleUrls: ['./comision.component.css']
})
export class ComisionComponent {

  private _appMain: string = environment.appMain;
  public _idSucursal: number = environment.idSucursal;

  // #region VARIABLES

  idUserLogON: number = 0;

  title = 'Comisión';
  bShowSpinner: boolean = false;

  oComisionDetail: any[] = [];
  oComisionesPagosDetail: any[] = [];

  panelComisionDetailOpenState: boolean = false;
  panelPagosDetailState: boolean = false;

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
    startDate: '',
    endDate: '',
    idSeller_idUser: 0,
    sellerDesc: '',
    sellerResp: '',
    comision: 0
  };

  oComisionDetailHeader: any = {
    sumComisiones: 0
  };


  // #endregion

  constructor(
    private dialogRef: MatDialogRef<ComisionComponent>
    ,@Inject(MAT_DIALOG_DATA) public ODataP: any
  
    , private servicesGServ: ServicesGService

    , private _adapter: DateAdapter<any>
    , @Inject(MAT_DATE_LOCALE) private _locale: string

    , private authServ: AuthService

    , private comisionesServ: ComisionesService
  ) { }

  async ngOnInit() {

    this.authServ.checkSession();
    this.idUserLogON = await this.authServ.getIdUserSession();

    this._locale = 'mx';
    this._adapter.setLocale(this._locale);

    if( this.ODataP.idComision.length > 0 ){

      this.fn_GetComisionDetail();

    }

  }

  ////************************************************ */
  // MÉTODOS DE PAGINACIÓN
  changePagination(pag: Pagination) {
    this.pagination = pag;
    this.fn_getComisionesPagosDetailListWithPage();
  }

  onChangeEvent(event: any){
    this.pagination.search = event.target.value;
    this.fn_getComisionesPagosDetailListWithPage();
  }
  ////************************************************ */

  changeRoute( route: string ): void {
    this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
  }

  // #region MÉTODOS DEL FRONT

  fn_CerrarMDL( id: number ){
    this.dialogRef.close( id );
  }

  fn_ClearParameters() {
    
    this.parametersForm = {
      startDate: '',
      endDate: '',
      idSeller_idUser: 0,
      sellerDesc: '',
      sellerResp: '',
      comision: 0
    };

    this.oComisionDetailHeader = {
      sumComisiones: 0
    };
  }

  // #endregion

// #region CONEXION CON EL BACK

bShowActionAuthorization: boolean = false;
  fn_startPhysicInventory( idComisionDetail: number ){

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
                    idComisionDetail: idComisionDetail
                  }

                  this.comisionesServ.CDisabledComisionDetail( oParams )
                  .subscribe({
                    next: (resp: any) => {
            
                      this.servicesGServ.showAlertIA( resp );
                      
                      this.bShowSpinner = false;

                      this.fn_GetComisionDetail();
            
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

  fn_getComisionesPagosDetailListWithPage() {
      
    this.oComisionesPagosDetail = [];
    //this.physicalInventoryHeaderBySucursal = [];

    this.bShowSpinner = true;

    var oParams: any = {
      idComision: this.ODataP.idComision
    }

    this.comisionesServ.CGetComisionesPagosDetailListWithPage( this.pagination, oParams )
    .subscribe({
      next: (resp: ResponseGet) => {
        console.log(resp)

        if(resp.status == 0){

          this.oComisionesPagosDetail = resp.data.rows;
          this.pagination.length = resp.data.count;

        }else{

          this.oComisionesPagosDetail = [];
          this.pagination.length = 0;
          
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

  fn_GetComisionDetail() {
    
    this.oComisionDetail = [];
    //this.physicalInventoryHeaderBySucursal = [];

    this.bShowSpinner = true;

    var oParams: any = {
      idComision: this.ODataP.idComision
    }

    this.comisionesServ.CGetComisionDetail( oParams )
    .subscribe({
      next: (resp: ResponseGet) => {
        console.log(resp)

        if(resp.status == 0){
          
          this.oComisionDetail = resp.data.rows;
          this.oComisionDetailHeader.sumComisiones = resp.data.header;

        }else{

          this.oComisionDetail = [];
          this.oComisionDetailHeader.sumComisiones = 0;

        }

        this.bShowSpinner = false;
        
        this.fn_getComisionesPagosDetailListWithPage();

      },
      error: (ex: HttpErrorResponse) => {
        console.log( ex )
        this.servicesGServ.showSnakbar( ex.error.data );
        this.bShowSpinner = false;
      }
    })
  }

// #endregion

// #region EVENTOS

  fn_GenerarComision(){

    const data: any = {
      startDate: '20240101',
      endDate: '20240201',
      idSeller_idUser: 15
    };

    this.comisionesServ.CGenerarComision( data )
      .subscribe({
        next: (resp: ResponseDB_CRUD) => {

          console.log( resp );

        },
        error: (ex) => {

          this.servicesGServ.showSnakbar( ex.error.message );
          this.bShowSpinner = false;

        }
      });

  }

// #endregion

}