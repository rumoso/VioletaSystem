import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { ComisionesService } from 'src/app/protected/services/comisiones.service';
import { ProductsService } from 'src/app/protected/services/products.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-cat',
  templateUrl: './cat.component.html',
  styleUrls: ['./cat.component.css']
})
export class CatComponent {

  // #region VARIABLES

  private _appMain: string = environment.appMain;

  title: string = '';
  bShowSpinner: boolean = false;

  idUserLogON: number = 0;

  oCatForm: any = {

    sOption: '',
    idRelation: 0,
    name: '',
    description: '',
    valor: 0,
    active: true

  };

  oCatList: any[] = [];

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

  // #endregion

  constructor(
    private dialogRef: MatDialogRef<CatComponent>
    ,@Inject(MAT_DIALOG_DATA) public ODataP: any
  
    , private servicesGServ: ServicesGService

    , private _adapter: DateAdapter<any>
    , @Inject(MAT_DATE_LOCALE) private _locale: string

    , private authServ: AuthService

    , private productsServ: ProductsService

  ) { }

  async ngOnInit() {

    this.authServ.checkSession();
    this.idUserLogON = await this.authServ.getIdUserSession();

    this._locale = 'mx';
    this._adapter.setLocale(this._locale);

    if( this.ODataP.sOption.length > 0 ){

      this.title = this.ODataP.sOption == 'Groups' ? 'Catálogo de grupos'
      : this.ODataP.sOption == 'Families' ? 'Catálogo de familias'
      : this.ODataP.sOption == 'Quality' ? 'Catálogo de calidades'
      : this.ODataP.sOption == 'Origin' ? 'Catálogo de origenes'
      : '';

      this.fn_getCatListWithPage();

    }

  }

  // #region MÉTODOS DEL FRONT

  fn_editData( item: any ){
    this.oCatForm = {

      idRelation: item.idRelation,
      name: item.name,
      description: item.description,
      valor: item.value,
      active: true
  
    };
  }

  fn_clear(){
    this.oCatForm = {

      idRelation: 0,
      name: '',
      description: '',
      valor: 0,
      active: true
  
    };
  }

  fn_validForm(){
    var bOK = false
  
    if( this.oCatForm.name.length > 0){
      bOK = true;
    }
  
    return bOK;
  }

  fn_CerrarMDL( id: number ){
    this.dialogRef.close( id );
  }

  ////************************************************ */
  // MÉTODOS DE PAGINACIÓN
  changePagination(pag: Pagination) {
    this.pagination = pag;
    this.fn_getCatListWithPage();
  }

  onChangeEvent(event: any){
    this.pagination.search = event.target.value;
    this.fn_getCatListWithPage();
  }
  ////************************************************ */

  // #endregion

  // #region CONEXIONES CON EL BACK

  fn_insertUpdateCat() {

    if( this.fn_validForm() ){
  
      this.servicesGServ.showDialog('¿Estás seguro?'
      , 'Está a punto de guardar'
      , '¿Desea continuar?'
      , 'Si', 'No')
        .afterClosed().subscribe({
        next: ( resp: any ) =>{
  
          if(resp){
  
            this.bShowSpinner = true;

            this.oCatForm.sOption = this.ODataP.sOption;
  
            this.productsServ.CInsertUpdateCat( this.oCatForm )
              .subscribe({
              next: (resp: ResponseDB_CRUD) => {
  
                if( resp.status === 0 ){
                  this.servicesGServ.showAlert('S', 'OK!', resp.message, true);
                }
                else{
                  this.servicesGServ.showAlert('W', 'Alerta!', resp.message, true);
                }

                this.fn_getCatListWithPage();
  
                this.bShowSpinner = false;
  
              },
              error: (ex) => {
                
                this.servicesGServ.showSnakbar( "Problemas con el servicio" );
                this.bShowSpinner = false;
  
              }
            })
  
          }
        }
      });
  
    }
  
  }
  
  fn_getCatListWithPage() {
  
    this.bShowSpinner = true;

    var oParams: any = {
      sOption: this.ODataP.sOption
    }

    this.productsServ.CGetCatListWithPage( this.pagination, oParams )
    .subscribe({
      next: (resp: ResponseGet) => {
        
        this.oCatList = resp.data.rows;
        this.pagination.length = resp.data.count;
        this.bShowSpinner = false;
  
      },
      error: (ex: HttpErrorResponse) => {
        
        this.servicesGServ.showSnakbar( ex.error.data );
        this.bShowSpinner = false;
  
      }
    })
  }
  

  // #endregion

}
