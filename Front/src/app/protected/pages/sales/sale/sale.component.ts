import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { Subject, debounceTime } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { CustomersService } from 'src/app/protected/services/customers.service';
import { FormapagoService } from 'src/app/protected/services/formapago.service';
import { ProductsService } from 'src/app/protected/services/products.service';
import { SalestypeService } from 'src/app/protected/services/salestype.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-sale',
  templateUrl: './sale.component.html',
  styleUrls: ['./sale.component.css']
})
export class SaleComponent implements OnInit {

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // SECCIÓN DE VARIABLES
  //////////////////////////////////////////////////////////////////////////////////////////////////
  private _appMain: string = environment.appMain;

  @ViewChild('barCode') barCode!: ElementRef;
  @ViewChild('cbxCustomerCBX') cbxCustomerCBX!: ElementRef;
  @ViewChild('tbxAnticipo') tbxAnticipo!: ElementRef;
  @ViewChild('cbxFormasPagoCBX') cbxFormasPagoCBX!: ElementRef;

  private timeCBXskeyup: Subject<any> = new Subject<any>();

  title: string = 'Venta';
  bShowSpinner: boolean = false;
  idSale: number = 0;

  idUserLogON: number = 0;

  salesHeaderForm: any = {
    idSeller_idUser: 0,

    idCustomer: 0,
    customerDesc: '',
    customerResp: '',

    idSalesType: 0,
    salesTypeDesc: '',

    idFormaPago: 0,
    formaPagoDesc: '',

    total: 0,
    pagaCon: 0,
    cambio: 0,

    anticipo: 0,

    saleDetail: []

  };

  salesDetailForm: any = {
    barCode: '',
    idProduct: 0,
    productDesc: '',

    cantidad: 1,
    precioUnitario: 0,
    descuento: 0,
    precio: 0,
    importe: 0,
}

  interface: any = {
    showDescuento: false,
    showCredito: false
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE VARIABLES
  //////////////////////////////////////////////////////////////////////////////////////////////////

  constructor(
    private servicesGServ: ServicesGService
    , private fb: FormBuilder

    , private _adapter: DateAdapter<any>
    , @Inject(MAT_DATE_LOCALE) private _locale: string

    , private authServ: AuthService

    , private productsServ: ProductsService
    , private customersServ: CustomersService
    , private salesTypeServ: SalestypeService
    , private formaPagoServ: FormapagoService
    ) { }

    async ngOnInit() {

      this.authServ.checkSession();
      this.idUserLogON = await this.authServ.getIdUserSession();

      this._locale = 'mx';
      this._adapter.setLocale(this._locale);

      //this.fn_getProductsListWithPage();

      this.timeCBXskeyup
      .pipe(
        debounceTime(500)
      )
      .subscribe( value => {
        if(value.iOption == 1){
          this.cbxCustomers_Search();
        }
      })


      setTimeout (() => {
        this.cbxCustomerCBX.nativeElement.focus();
      }, 1000);
      
    }

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

    fn_getProductByBarCode(event: any, idInput: any) {

      if(this.salesDetailForm.barCode.length > 0){
        
        this.bShowSpinner = true;

  
        this.productsServ.CGetProductByBarCode( this.salesDetailForm.barCode, this.idUserLogON )
          .subscribe({
            next: (resp: ResponseGet) => {
              
              if( resp.status === 0 ){
    
                this.salesDetailForm.idProduct = resp.data.idProduct ;
                this.salesDetailForm.productDesc = resp.data.name;
                this.salesDetailForm.precioUnitario = resp.data.price;

                this.nextInputEnter(event, idInput)

              }
    
              this.servicesGServ.showSnakbar(resp.message);
              this.bShowSpinner = false;
    
            },
            error: (ex) => {
    
              this.servicesGServ.showSnakbar( "Problemas con el servicio" );
              this.bShowSpinner = false;
    
            }
          })

      }

    }

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////

    public nextInputEnter(event: any, idInput: any) {
      console.log(event)
      if(event.keyCode == 13) { // PRESS ENTER
        idInput.focus();
      }
    }

    public inputFocus(idInput: any) {
      if(idInput != null) { // PRESS ENTER
        idInput.focus();
      }
    }

    addSaleDetail(){

      if(this.ev_fnShowBtnAddSaleDetail()){

        //SACO EL PREIMPORTE
        var preImporte = this.salesDetailForm.precioUnitario * this.salesDetailForm.cantidad;
              
        //SACO EL DESCUENTO
        // CONVIERTO EN DECIMAL LE PORCENTAJE
        var porcentajeDescuento = this.salesDetailForm.descuento / 100;
        var precioDescuento = porcentajeDescuento * this.salesDetailForm.precioUnitario;

        var precio = this.salesDetailForm.precioUnitario - precioDescuento;

        var importe = precio * this.salesDetailForm.cantidad;

        var saleDetail:any = {
          barCode: this.salesDetailForm.barCode,
          idProduct: this.salesDetailForm.idProduct,
          productDesc: this.salesDetailForm.productDesc,
          cantidad: this.salesDetailForm.cantidad,
          precioUnitario: this.salesDetailForm.precioUnitario,
          descuento: precioDescuento,
          precio: precio,
          importe: importe
        };

        this.salesHeaderForm.saleDetail.push(saleDetail);

        console.log(saleDetail);

        if(precioDescuento > 0)
        {
          this.interface.showDescuento = true;
        }

        //VOY SUMANDO LOS IMPORTES
        this.salesHeaderForm.total = this.salesHeaderForm.saleDetail.reduce((sum: any, x: any) => sum + x.importe, 0);

        this.fnClearSalesDetailForm();

      }

    }

    fnClearSalesDetailForm(){
      this.salesDetailForm.idProduct = 0;
      this.salesDetailForm.barCode = '';
      this.salesDetailForm.productDesc = '';
      this.salesDetailForm.cantidad = 1;
      this.salesDetailForm.precioUnitario = 0;
      this.salesDetailForm.descuento = 0;
      this.salesDetailForm.precio = 0;
      this.salesDetailForm.importe = 0;

      this.barCode.nativeElement.focus();
    }

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE EVENTOS
//////////////////////////////////////////////////////////////////////////////////////////////////

ev_fnShowBtnAddSaleDetail(): boolean {
  let bOK = false;

  if( this.salesDetailForm.idProduct > 0
    && this.salesDetailForm.cantidad > 0
    && this.salesDetailForm.precioUnitario > 0
    )
    {
      bOK = true;
    }

  return bOK;
}

event_fn_barCode_keyup_enter(event: any, idInput: any){
  if(event.keyCode == 13) { // PRESS ENTER
    
    if( this.salesDetailForm.barCode.length > 0){
      this.fn_getProductByBarCode( event, idInput );
    }else if(this.interface.showCredito && this.salesHeaderForm.saleDetail.length > 0){
      this.tbxAnticipo.nativeElement.focus();
    }else if(this.salesHeaderForm.saleDetail.length > 0){
      this.cbxFormasPagoCBX.nativeElement.focus();
    }
  }
}

event_fn_PagaCon_GetCambio( event: any ){

  if(event.keyCode == 13) { // PRESS ENTER

    if(this.salesHeaderForm.pagaCon > 0){
      let importe = 0;
      if(this.interface.showCredito){
        importe = this.salesHeaderForm.anticipo;
      }else{
        importe = this.salesHeaderForm.total;
      }

      this.salesHeaderForm.cambio = this.salesHeaderForm.pagaCon - importe;
    }
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE EVENTOS
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE COMBOS
//////////////////////////////////////////////////////////////////////////////////////////////////
    

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE ÁREAS

  cbxCustomers: any[] = [];

  CBXskeyup( iOption: number, txt: string ){

    let cbxKeyUp: any = {
      iOption: iOption,
      txt: txt
    }

    this.timeCBXskeyup.next( cbxKeyUp );
  }

  cbxCustomers_Search() {
      this.customersServ.CCbxGetCustomersCombo( this.salesHeaderForm.customerDesc, this.idUserLogON )
       .subscribe( {
         next: (resp: ResponseGet) =>{
           if(resp.status === 0){
             this.cbxCustomers = resp.data;
             this.salesHeaderForm.customerResp = '';
             
           }
           else{
            this.cbxCustomers = [];
            this.salesHeaderForm.customerResp = resp.message;
           }
         },
         error: (ex) => {
           this.servicesGServ.showSnakbar( "Problemas con el servicio" );
           this.bShowSpinner = false;
         }
       });
  }

  cbxCustomers_SelectedOption( event: MatAutocompleteSelectedEvent, idInput: any ) {

    if(!event.option.value){
      return;
    }

    const ODataCbx: any = event.option.value;

    console.log(ODataCbx)

    this.salesHeaderForm.idCustomer =  ODataCbx.idCustomer;
    this.salesHeaderForm.customerDesc = ODataCbx.name;

    setTimeout (() => {
      this.inputFocus(idInput);
    }, 500);

  }

  cbxCustomers_Clear(){
    this.salesHeaderForm.idCustomer = 0;
    this.salesHeaderForm.customerDesc = '';
    this.salesHeaderForm.customerResp = '';
  }
  //--------------------------------------------------------------------------

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE ÁREAS

  cbxProducts: any[] = [];

  cbxProducts_Search() {
      this.productsServ.CCbxGetProductsCombo( this.salesDetailForm.productDesc, this.idUserLogON )
       .subscribe( {
         next: (resp: ResponseGet) =>{
           if(resp.status === 0){
             this.cbxProducts = resp.data
           }
           else{
            this.cbxProducts = [];
           }
         },
         error: (ex) => {
           this.servicesGServ.showSnakbar( "Problemas con el servicio" );
           this.bShowSpinner = false;
         }
       });
  }

  cbxProducts_SelectedOption( event: MatAutocompleteSelectedEvent, idInput: any ) {

    if(!event.option.value){
      return;
    }

    const ODataCbx: any = event.option.value;

    console.log(ODataCbx)

    this.salesDetailForm.idProduct = ODataCbx.idProduct;
    this.salesDetailForm.productDesc = ODataCbx.name;
    this.salesDetailForm.barCode = ODataCbx.barCode;
    this.salesDetailForm.precioUnitario = ODataCbx.price;

    

    setTimeout (() => {
      this.inputFocus(idInput);
    }, 500);

  }

  cbxProducts_Clear(){
    this.salesDetailForm.idProduct = 0;
    this.salesDetailForm.productDesc = '';
    this.salesDetailForm.barCode = '';
    this.salesDetailForm.precioUnitario = 0;
  }
  //--------------------------------------------------------------------------

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE ÁREAS

  cbxSalesType: any[] = [];

  cbxSalesType_Search() {
      this.salesTypeServ.CCbxGetSalesTypeCombo( this.salesHeaderForm.saleTypeDesc )
       .subscribe( {
         next: (resp: ResponseGet) =>{
           if(resp.status === 0){
             this.cbxSalesType = resp.data
           }
           else{
            this.cbxSalesType = [];
           }
         },
         error: (ex) => {
           this.servicesGServ.showSnakbar( "Problemas con el servicio" );
           this.bShowSpinner = false;
         }
       });
  }

  cbxSalesType_SelectedOption( event: MatAutocompleteSelectedEvent, idInput: any ) {

    if(!event.option.value){
      return;
    }

    const ODataCbx: any = event.option.value;

    console.log(ODataCbx)

    this.salesHeaderForm.idSaleType = ODataCbx.id;
    this.salesHeaderForm.saleTypeDesc = ODataCbx.name;

    setTimeout (() => {
      this.inputFocus(idInput);
    }, 500);

    if(this.salesHeaderForm.idSaleType == 1){
      this.interface.showCredito = true;
    }

  }

  cbxSalesType_Clear(){
    this.salesHeaderForm.idSaleType = 0;
    this.salesHeaderForm.saleTypeDesc = '';
    
    this.interface.showCredito = false;
  }
  //--------------------------------------------------------------------------

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE ÁREAS

  cbxFormasPago: any[] = [];

  cbxFormasPago_Search() {
      this.formaPagoServ.CCbxGetFormaPagoCombo( this.salesHeaderForm.formaPagoDesc )
       .subscribe( {
         next: (resp: ResponseGet) =>{
           if(resp.status === 0){
             this.cbxFormasPago = resp.data
           }
           else{
            this.cbxFormasPago = [];
           }
         },
         error: (ex) => {
           this.servicesGServ.showSnakbar( "Problemas con el servicio" );
           this.bShowSpinner = false;
         }
       });
  }

  cbxFormasPago_SelectedOption( event: MatAutocompleteSelectedEvent, idInput: any ) {

    if(!event.option.value){
      return;
    }

    const ODataCbx: any = event.option.value;

    console.log(ODataCbx)

    this.salesHeaderForm.idFormaPago = ODataCbx.id;
    this.salesHeaderForm.formaPagoDesc = ODataCbx.name;

    setTimeout (() => {
      this.inputFocus(idInput);
    }, 500);

  }

  cbxFormasPago_Clear(){
    this.salesHeaderForm.idFormaPago = 0;
    this.salesHeaderForm.formaPagoDesc = '';
  }
  //--------------------------------------------------------------------------

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE COMBOS
//////////////////////////////////////////////////////////////////////////////////////////////////

}
