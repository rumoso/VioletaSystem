import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ProductsService } from 'src/app/protected/services/products.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

@Component({
  selector: 'app-inventary-log',
  templateUrl: './inventary-log.component.html',
  styleUrls: ['./inventary-log.component.css']
})
export class InventaryLogComponent {

  idUserLogON: number = 0;

  title = 'Lista de Products';
  bShowSpinner: boolean = false;

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
    idProduct: 0,
    barCode: '',
    productDesc: '',
  };

  inventaryLoglist: any[] = [];

  constructor(
    private servicesGServ: ServicesGService
    , private productsServ: ProductsService

    , private _adapter: DateAdapter<any>
    , @Inject(MAT_DATE_LOCALE) private _locale: string

    , private authServ: AuthService
    ) { }

    async ngOnInit() {

      this.authServ.checkSession();
      this.idUserLogON = await this.authServ.getIdUserSession();

      this._locale = 'mx';
      this._adapter.setLocale(this._locale);

      this.fn_nextInput('barCode');

    }

    ////************************************************ */
    // MÉTODOS DE PAGINACIÓN
    changePagination(pag: Pagination) {
      this.pagination = pag;
      this.fn_getInventarylogByIdProductWithPage();
    }

    onChangeEvent(event: any){
      this.pagination.search = event.target.value;
      this.fn_getInventarylogByIdProductWithPage();
    }
    ////************************************************ */

  fn_nextInput( idInput: any ){
    setTimeout (() => {
      var miElemento = document.getElementById( idInput )!.focus();
    }, 100);
  }

  fn_getInventarylogByIdProductWithPage() {

    this.bShowSpinner = true;
    this.productsServ.CGetInventarylogByIdProductWithPage( this.pagination, this.parametersForm.idProduct )
    .subscribe({
      next: (resp: ResponseGet) => {
        this.inventaryLoglist = resp.data.rows;
        this.pagination.length = resp.data.count;
        this.bShowSpinner = false;
      },
      error: (ex: HttpErrorResponse) => {
        console.log( ex )
        this.servicesGServ.showSnakbar( ex.error.data );
        this.bShowSpinner = false;
      }
    })
  }

  fn_getProductByBarCode() {

    if(this.bShowSpinner) return;

    if(this.parametersForm.barCode.length > 0){

      this.bShowSpinner = true;
      this.productsServ.CGetProductByBarCode( this.parametersForm.barCode, this.idUserLogON )
        .subscribe({
          next: (resp: ResponseGet) => {
            if( resp.status === 0 ){
              this.parametersForm.idProduct = resp.data.idProduct ;
              this.parametersForm.productDesc = resp.data.name;
              this.fn_getInventarylogByIdProductWithPage();
            }else{
              this.parametersForm.idProduct = 0;
              this.parametersForm.productDesc = '';
            }
            this.servicesGServ.showAlertIA(resp, false);
            this.bShowSpinner = false;
          },
          error: (ex) => {

            this.servicesGServ.showSnakbar( "Problemas con el servicio" );
            this.bShowSpinner = false;

          }
        })

    }

  }

}
