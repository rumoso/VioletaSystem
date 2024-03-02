import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ColumnFormat } from 'src/app/protected/interfaces/global.interfaces';
import { ProductsService } from 'src/app/protected/services/products.service';
import { SuppliersService } from 'src/app/protected/services/suppliers.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-repcomprasproveedor',
  templateUrl: './repcomprasproveedor.component.html',
  styleUrls: ['./repcomprasproveedor.component.css']
})
export class RepcomprasproveedorComponent {

  private _appMain: string = environment.appMain;

  idUserLogON: number = 0;

  constructor(
    private servicesGServ: ServicesGService
    , private productsServ: ProductsService
    , private fb: FormBuilder

    , private _adapter: DateAdapter<any>
    , @Inject(MAT_DATE_LOCALE) private _locale: string

    , private authServ: AuthService

    , private suppliersServ: SuppliersService
    ) { }

    async ngOnInit() {

      this.authServ.checkSession();
      this.idUserLogON = await this.authServ.getIdUserSession();

      this._locale = 'mx';
      this._adapter.setLocale(this._locale);

      this.fn_getRepComprasProveedorListWithPage();
    }

    ////************************************************ */
    // MÉTODOS DE PAGINACIÓN
    changePagination(pag: Pagination) {
      this.pagination = pag;
      this.fn_getRepComprasProveedorListWithPage();
    }

    onChangeEvent(event: any){
      this.pagination.search = event.target.value;
      this.fn_getRepComprasProveedorListWithPage();
    }
    ////************************************************ */

    changeRoute( route: string ): void {
      this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
    }

  title = 'Lista de Products';
  bShowSpinner: boolean = false;
  catlist: any[] = [];
  inventaryBySucursalList: any[] = [];

  panelOpenState: boolean = false;
  
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
    idSupplier: 0,
    supplierDesc: '',
  };

  oHeaderForm: any = {
    iPzs: 0,
    costSum: 0,
    priceSum: 0,
  };

  // fn_gerReport()
  // {
  //   this.fn_getInventaryListWithPage();
  //   this.fn_getInventaryBySucursal();
  // }

  exportDataToExcel( bCostos: boolean ): void {
    
    this.bShowSpinner = true;

    var Newpagination: Pagination = {
      search:'',
      length: 10000000,
      pageSize: 10000000,
      pageIndex: 0,
      pageSizeOptions: [5, 10, 25, 100]
    }

    this.productsServ.CGetInventaryListWithPage( Newpagination, this.parametersForm.value )
    .subscribe({
      next: (resp: ResponseGet) => {
        console.log(resp)

        if(resp.status == 0){

          if( bCostos ){

            const columnFormats: ColumnFormat[] = [
              { col: 0, currencyFormat: false, textAlignment: 'left' },
              { col: 1, currencyFormat: false, textAlignment: 'left' },
              { col: 2, numberFormat: '#,##0', textAlignment: 'right' },
              { col: 3, numberFormat: '#,##0', textAlignment: 'right' },
              { col: 4, numberFormat: '#,##0', textAlignment: 'right' },
              { col: 5, currencyFormat: true, textAlignment: 'right' },
              { col: 6, currencyFormat: true, textAlignment: 'right' },
            ];

            var NewObj = resp.data.rows.map((originalItem: any) => {
              return {
                'Código de barras	': originalItem.barCode,
                'Nombre': originalItem.name,
                'Apartado': originalItem.catInventaryApart,
                'Consignación': originalItem.catInventaryCons,
                'Mostrador': originalItem.catInventary,
                'cost': originalItem.cost,
                'price': originalItem.price
              };
            });
  
            const currentDateTime = new Date();
            const formattedDateTime = currentDateTime.toISOString().replace(/[:.]/g, '-');
  
            this.servicesGServ.exportToExcel(NewObj, `RepInventarioConCostos_${formattedDateTime}.xlsx`, columnFormats);

          }else{

            const columnFormats: ColumnFormat[] = [
              { col: 0, currencyFormat: false, textAlignment: 'left' },
              { col: 1, currencyFormat: false, textAlignment: 'left' },
              { col: 2, numberFormat: '#,##0', textAlignment: 'right' },
              { col: 3, numberFormat: '#,##0', textAlignment: 'right' },
              { col: 4, numberFormat: '#,##0', textAlignment: 'right' },
            ];

            var NewObj = resp.data.rows.map((originalItem: any) => {
              return {
                'Código de barras	': originalItem.barCode,
                'Nombre': originalItem.name,
                'Apartado': originalItem.catInventaryApart,
                'Consignación': originalItem.catInventaryCons,
                'Mostrador': originalItem.catInventary,
              };
            });

            const currentDateTime = new Date();
            const formattedDateTime = currentDateTime.toISOString().replace(/[:.]/g, '-');
  
            this.servicesGServ.exportToExcel(NewObj, `RepInventario_${formattedDateTime}.xlsx`, columnFormats);

          }

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

  fn_getRepComprasProveedorListWithPage() {
    
    this.catlist = [];
    
    this.bShowSpinner = true;
    this.productsServ.CGetRepComprasProveedorListWithPage( this.pagination, this.parametersForm )
    .subscribe({
      next: (resp: ResponseGet) => {
        console.log(resp)
        this.catlist = resp.data.rows;
        this.pagination.length = resp.data.count;
        this.bShowSpinner = false;

        if( resp.data.count > 0 ){
          this.oHeaderForm.iPzs = resp.data.rows[0].iPzs;
          this.oHeaderForm.costSum = resp.data.rows[0].costSum;
          this.oHeaderForm.priceSum = resp.data.rows[0].priceSum;
        }else{
          this.oHeaderForm.iPzs = 0;
          this.oHeaderForm.costSum = 0;
          this.oHeaderForm.priceSum = 0;
        }

      },
      error: (ex: HttpErrorResponse) => {
        console.log( ex )
        this.servicesGServ.showSnakbar( ex.error.data );
        this.bShowSpinner = false;
      }
    })
  }

  parametersForm_Clear(){
    this.parametersForm.idSupplier = 0;
    this.parametersForm.supplierDesc = '';

  }

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE CALIDAD

  cbxSupplierList: any[] = [];

  cbxSupplier_Search() {

      this.suppliersServ.CCbxGetSuppliersCombo( this.parametersForm.supplierDesc )
       .subscribe( {
         next: (resp: ResponseGet) =>{
           if(resp.status === 0){
             this.cbxSupplierList = resp.data
           }
           else{
            this.cbxSupplierList = [];
           }
         },
         error: (ex) => {
           this.servicesGServ.showSnakbar( "Problemas con el servicio" );
           this.bShowSpinner = false;
         }
       });
  }

  cbxSupplier_SelectedOption( event: MatAutocompleteSelectedEvent ) {

    if(!event.option.value){
      return;
    }

    const rol: any = event.option.value;

    if(this.parametersForm.idSupplier != rol.idSupplier){
      this.parametersForm.idSupplier = rol.idSupplier;
      this.parametersForm.supplierDesc = rol.name;
    }

  }

  cbxSupplier_Clear(){
    this.parametersForm.idSupplier = 0;
    this.parametersForm.supplierDesc = '';
  }
  //--------------------------------------------------------------------------

}
