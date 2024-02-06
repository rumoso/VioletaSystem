import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { Subject, debounceTime } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { CustomersService } from 'src/app/protected/services/customers.service';
import { FormapagoService } from 'src/app/protected/services/formapago.service';
import { ProductsService } from 'src/app/protected/services/products.service';
import { SalesService } from 'src/app/protected/services/sales.service';
import { SalestypeService } from 'src/app/protected/services/salestype.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { CustomerComponent } from '../../../catssales/customer/customer.component';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PaymentsComponent } from '../payments/payments.component';
import { UsersService } from 'src/app/protected/services/users.service';
import { PrintTicketService } from 'src/app/protected/services/print-ticket.service';
import { ActionAuthorizationComponent } from '../../../security/users/mdl/action-authorization/action-authorization.component';
import { QuestionCancelPaymentComponent } from '../question-cancel-payment/question-cancel-payment.component';

@Component({
  selector: 'app-nsale',
  templateUrl: './nsale.component.html',
  styleUrls: ['./nsale.component.css']
})
export class NsaleComponent {

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // SECCIÓN DE VARIABLES
  //////////////////////////////////////////////////////////////////////////////////////////////////
  private _appMain: string = environment.appMain;
  public _idSucursal: number = environment.idSucursal;

  @ViewChild('cbxSellerCBX') cbxSellerCBX!: ElementRef;
  @ViewChild('cbxCustomerCBX') cbxCustomerCBX!: ElementRef;
  @ViewChild('cbxSaleTypeCBX') cbxSaleTypeCBX!: ElementRef;
  @ViewChild('barCode') barCode!: ElementRef;
  @ViewChild('tbxCantidad') tbxCantidad!: ElementRef;
  @ViewChild('cbxDescuento') cbxDescuento!: ElementRef;
  @ViewChild('total') total!: ElementRef;

  private timeCBXskeyup: Subject<any> = new Subject<any>();

  title: string = 'Venta';
  bShowSpinner: boolean = false;
  idSale: any = '';

  showPaymentsAtStart: boolean = true;

  idUserLogON: number = 0;

  dataStone: any = {
    idSale: '',

    idSeller_idUser: 0,
    sellerDesc: '',
    sellerResp: '',

    idCustomer: 0,
    customerDesc: '',
    customerResp: '',

    idSaleType: 0,
    saleTypeDesc: '',

    total: 0,
    pendingAmount: 0,
    pagado: 0,
  }

  salesHeaderForm: any = {
    idSale: '',

    idSeller_idUser: 0,
    sellerDesc: '',
    sellerResp: '',

    idCustomer: 0,
    customerDesc: '',
    customerResp: '',

    idSaleType: 0,
    saleTypeDesc: '',

    total: 0,
    pendingAmount: 0,
    pagado: 0,

    saleDetail: [],
    paymentList: [],
    ConsHistoryList: []

  };

  salesDetailForm: any = {
    barCode: '',
    idProduct: 0,
    productDesc: '',
    catInventary: 0,

    cantidad: 1,
    precioUnitario: 0,
    descuento: 0,
    cost: 0,
    precio: 0,
    importe: 0,

    description: '',
    precioSobre: 0
  }

  interface: any = {
    showDescuento: false,
    showReferencia: false,
    showFxRate: false
  }

  selectCajas: any = {
    idSucursal: 0,
    idCaja: 0,
    cajaDesc: '',
    idPrinter: 0
  }

  selectPrinter: any = {
    idSucursal: 0,
    idPrinter: 0,
    printerName: ''
  }

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

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE VARIABLES
  //////////////////////////////////////////////////////////////////////////////////////////////////

  constructor(
    private dialogRef: MatDialogRef<NsaleComponent>
    ,@Inject(MAT_DIALOG_DATA) public ODataP: any

    , private servicesGServ: ServicesGService
    , private fb: FormBuilder

    , private _adapter: DateAdapter<any>
    , @Inject(MAT_DATE_LOCALE) private _locale: string

    , private authServ: AuthService

    , private productsServ: ProductsService
    , private customersServ: CustomersService
    , private salesTypeServ: SalestypeService
    , private formaPagoServ: FormapagoService
    , private saleServ: SalesService
    , private userServ: UsersService

    , private printTicketServ: PrintTicketService
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
        }else if(value.iOption == 2){
          this.cbxSellers_Search();
        }
      })


      this.nextInputFocus( this.cbxSellerCBX, 500 );

      if( this.ODataP.idSale.length > 0 ){

        this.fn_getSaleByID( this.ODataP.idSale );

      }

      this.selectCajas = this.ODataP.selectCajas;
      this.selectPrinter = this.ODataP.selectPrinter;

    }

    ////************************************************ */
    // MÉTODOS DE PAGINACIÓN
    changePagination(pag: Pagination) {
      this.pagination = pag;
      this.fn_getPaymentsByIdSaleListWithPage( this.idSale );
    }

    onChangeEvent(event: any){
      this.pagination.search = event.target.value;
      this.fn_getPaymentsByIdSaleListWithPage( this.idSale );
    }
    ////************************************************ */

    hasPermissionAction( action: string ): boolean{
      return this.authServ.hasPermissionAction(action);
    }
//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

  bShowAction: boolean = false;
  fn_disableSaleDetail( item: any ){

    if(!this.bShowAction){
      
      this.bShowAction = true;

      this.servicesGServ.showDialog('¿Estás seguro?'
      , 'Está apunto de eliminar el producto: ' + item.productDesc + ' de la venta #' + this.idSale
      , '¿Desea continuar?'
      , 'Si', 'No', '500px' )
      .afterClosed().subscribe({
        next: ( resp ) =>{
          
          if(resp){

            var paramsMDL: any = {
              actionName: 'ventas_CancelarSaleDetail'
              , bShowAlert: false
            }
          
            this.servicesGServ.showModalWithParams( ActionAuthorizationComponent, paramsMDL, '400px')
            .afterClosed().subscribe({
              next: ( resp ) =>{
          
                if( resp ){

                  this.bShowAction = false;

                  this.bShowSpinner = true;

                  var oParams: any = {
                    idSaleDetail: item.idSaleDetail
                  }

                  this.saleServ.CDisableSaleDetail( oParams )
                  .subscribe({
                    next: (resp: any) => {
            
                      if( resp.status === 0 ){

                        this.fn_getSaleByID( this.idSale );

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

  bShowActionAuthorization: boolean = false;
  fn_disablePayment( item: any ){

    if(!this.bShowActionAuthorization){
      
      this.bShowActionAuthorization = true;

      this.servicesGServ.showDialog('¿Estás seguro?'
      , 'Está apunto de cancelar el pago #' + item.idPayment
      , '¿Desea continuar?'
      , 'Si', 'No' )
      .afterClosed().subscribe({
        next: ( resp ) =>{
          
          if(resp){

            this.bShowActionAuthorization = false;
            
            if( item.iPagoCortado > 0 ){

              this.servicesGServ.showModalWithParams( QuestionCancelPaymentComponent, item, '600px')
              .afterClosed().subscribe({
                next: ( sOption ) =>{

                  var paramsMDL: any = {
                    actionName: ( item.iPagoCortado > 0 ? 'ventas_CancelarPagoCortado' : 'ventas_CancelarPago' ) 
                    , bShowAlert: false
                  }
                
                  this.servicesGServ.showModalWithParams( ActionAuthorizationComponent, paramsMDL, '400px')
                  .afterClosed().subscribe({
                    next: ( resp ) =>{
                
                      if( resp ){
      
                        this.bShowSpinner = true;
      
                        var oParams: any = {
                          idSale: this.idSale,
                          idPayment: item.idPayment,
                          sOption: sOption
                        }
      
                        this.saleServ.CDisabledPayment( oParams )
                        .subscribe({
                          next: (resp: any) => {
                  
                            if( resp.status === 0 ){
      
                              this.fn_getSaleByID( this.idSale );
                                
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

                    }
                  });
  
                }
              });

            }else{

              var paramsMDL: any = {
                actionName: ( item.iPagoCortado > 0 ? 'ventas_CancelarPagoCortado' : 'ventas_CancelarPago' ) 
                , bShowAlert: false
              }
            
              this.servicesGServ.showModalWithParams( ActionAuthorizationComponent, paramsMDL, '400px')
              .afterClosed().subscribe({
                next: ( resp ) =>{
            
                  if( resp ){
  
                    this.bShowActionAuthorization = false;
  
                    this.bShowSpinner = true;
  
                    var oParams: any = {
                      idSale: this.idSale,
                      idPayment: item.idPayment,
                      sOption: ''
                    }
  
                    this.saleServ.CDisabledPayment( oParams )
                    .subscribe({
                      next: (resp: any) => {
              
                        if( resp.status === 0 ){
  
                          this.fn_getSaleByID( this.idSale );
                            
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
                    this.bShowActionAuthorization = false;
                  }
  
                }
              });

            }

          }
          else{
            this.bShowActionAuthorization = false;
          }
          
        }
      });

    }
          
  }

    fn_getProductByBarCode() {

      if(this.salesDetailForm.barCode.length > 0){
        
        this.bShowSpinner = true;

  
        this.productsServ.CGetProductByBarCode( this.salesDetailForm.barCode, this.idUserLogON )
          .subscribe({
            next: (resp: ResponseGet) => {
              
              if( resp.status === 0 ){
    
                this.salesDetailForm.idProduct = resp.data.idProduct ;
                this.salesDetailForm.productDesc = resp.data.name;
                this.salesDetailForm.cost = resp.data.cost;
                this.salesDetailForm.precioUnitario = resp.data.price;

                this.salesDetailForm.catInventary = resp.data.catInventary;

                this.nextInputFocus( this.tbxCantidad, 500);

              }else{
                
                this.salesDetailForm.barCode = '';
                this.salesDetailForm.idProduct = 0;
                this.salesDetailForm.productDesc = '';
                this.salesDetailForm.cost = 0;
                this.salesDetailForm.precioUnitario = 0;

                this.salesDetailForm.catInventary = 0;
                
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

  fn_getSaleByID( idSale: any ) {

    this.bShowSpinner = true;
  
    this.saleServ.CGetSaleByID( idSale )
      .subscribe( ( resp: any ) => {

        console.log(resp)

          if(resp.status == 0){
            
            this.idSale = resp.data.idSale;

            this.salesHeaderForm.idSale = resp.data.idSale;
            this.salesHeaderForm.idSeller_idUser = resp.data.idSeller_idUser;
            this.salesHeaderForm.sellerDesc = resp.data.sellerDesc;
            this.salesHeaderForm.sellerResp = '';

            this.salesHeaderForm.idCustomer = resp.data.idCustomer;
            this.salesHeaderForm.customerDesc = resp.data.customerDesc;
            this.salesHeaderForm.customerResp = '';

            this.salesHeaderForm.idSaleType = resp.data.idSaleType;
            this.salesHeaderForm.saleTypeDesc = resp.data.saleTypeDesc;

            this.salesHeaderForm.pendingAmount = resp.data.pendingAmount;
            this.salesHeaderForm.pagado = resp.data.pagado;

            this.salesHeaderForm.saleDetail = resp.dataDetail;

            this.salesHeaderForm.total = this.salesHeaderForm.saleDetail.reduce((sum: any, x: any) => sum + x.importe, 0);
            var sumDescuento = this.salesHeaderForm.saleDetail.reduce((sum: any, x: any) => sum + x.descuento, 0)
            this.interface.showDescuento = sumDescuento > 0;


            this.dataStone.idSale = resp.data.idSale;
            this.dataStone.idSeller_idUser = resp.data.idSeller_idUser;
            this.dataStone.sellerDesc = resp.data.sellerDesc;
            this.dataStone.sellerResp = '';

            this.dataStone.idCustomer = resp.data.idCustomer;
            this.dataStone.customerDesc = resp.data.customerDesc;
            this.dataStone.customerResp = '';

            this.dataStone.idSaleType = resp.data.idSaleType;
            this.dataStone.saleTypeDesc = resp.data.saleTypeDesc;

            this.dataStone.pendingAmount = resp.data.pendingAmount;
            this.dataStone.pagado = resp.data.pagado;

            this.fn_getPaymentsByIdSaleListWithPage( this.idSale );

            if( this.salesHeaderForm.idSaleType != 4 && this.showPaymentsAtStart && this.dataStone.pendingAmount > 0 && this._idSucursal > 0 ){
              this.showPaymentsAtStart = false;
              this.fn_ShowPayments();
            }

            if( this.salesHeaderForm.idSaleType == 4 ){
              this.fn_getConsHistory( this.salesHeaderForm.idSale );
            }

          }else{
            this.servicesGServ.showSnakbar(resp.message);
          }
          this.bShowSpinner = false;
      } );

  }

  fn_getPaymentsByIdSaleListWithPage( idSale: any ) {

    this.bShowSpinner = true;

    this.saleServ.CGetPaymentsByIdSaleListWithPage( this.pagination, idSale )
      .subscribe( ( resp: any ) => {

          if(resp.status == 0){
            this.salesHeaderForm.paymentList = resp.data.rows;
            this.pagination.length = resp.data.count;

            this.ev_showInterface()
          }else{
            this.salesHeaderForm.paymentList = []
          }
          this.bShowSpinner = false;
      } );

  }

  fn_getConsHistory( idSale: any ) {

    this.bShowSpinner = true;

    this.saleServ.CGetConsHistory( idSale )
      .subscribe( ( resp: any ) => {

          if(resp.status == 0){
            this.salesHeaderForm.ConsHistoryList = resp.data.rows;
          }else{
            this.salesHeaderForm.ConsHistoryList = []
          }

          this.bShowSpinner = false;

      } );

  }
    
//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////

fn_btnRePrinter( idPayment: any ){

  if( this.selectPrinter.idPrinter > 0 ){
  
    this.servicesGServ.showDialog('¿Estás seguro?'
    , 'Estás apunto de reimprimir este Pago'
    , '¿Desea continuar?'
    , 'Si', 'No')
    .afterClosed().subscribe({
      next: ( resp ) =>{
        
        if(resp){

          this.printTicketServ.printTicket("RePayment", this.idSale, this.selectPrinter.idPrinter, 1, idPayment);

        }

      }

    });

  }
  
}    

public nextInputFocus( idInput: any, milliseconds: number ) {
        setTimeout (() => {
          idInput.nativeElement.focus();
        }, milliseconds);
    }

    addSaleDetail(){

      if(this.ev_fnShowBtnAddSaleDetail()){

        if( this.salesHeaderForm.idSaleType != 5 ){

          if( this.salesHeaderForm.saleDetail.filter(( x: any ) => x.idProduct == this.salesDetailForm.idProduct).length == 0 ){
            if(this.salesDetailForm.catInventary >= this.salesDetailForm.cantidad){
  
              //SACO EL PREIMPORTE
              var preImporte = this.salesDetailForm.precioUnitario * this.salesDetailForm.cantidad;
  
              //SACO EL DESCUENTO
              // CONVIERTO EN DECIMAL LE PORCENTAJE
              var porcentajeDescuento = this.salesDetailForm.descuento / 100;
              var precioDescuento = porcentajeDescuento * this.salesDetailForm.precioUnitario;
    
              var precio = this.salesDetailForm.precioUnitario - precioDescuento;
    
              var importe = precio * this.salesDetailForm.cantidad;
  
              if(precio > this.salesDetailForm.cost){
                
                var saleDetail:any = {
                  select: false,
                  barCode: this.salesDetailForm.barCode,
                  idProduct: this.salesDetailForm.idProduct,
                  productDesc: this.salesDetailForm.productDesc,
                  cantidad: this.salesDetailForm.cantidad,
                  cost: this.salesDetailForm.cost,
                  precioUnitario: this.salesDetailForm.precioUnitario,
                  descuento: precioDescuento,
                  precio: precio,
                  importe: importe
                };
      
                this.salesHeaderForm.saleDetail.push(saleDetail);
      
                if(precioDescuento > 0)
                {
                  this.interface.showDescuento = true;
                }
      
                //VOY SUMANDO LOS IMPORTES
                this.salesHeaderForm.total = this.salesHeaderForm.saleDetail.reduce((sum: any, x: any) => sum + x.importe, 0);
                this.salesHeaderForm.pendingAmount = this.salesHeaderForm.total;
      
                this.fnClearSalesDetailForm();
  
              }else{
                this.servicesGServ.showAlert('W', 'Alerta!', "No se puede aplicar tanto descuento.", false);    
              }
    
              
            }else{
               this.servicesGServ.showAlert('W', 'Alerta!', "Solo hay " + this.salesDetailForm.catInventary + " en existencia.", true);
            }
          }else{
            this.servicesGServ.showAlert('W', 'Alerta!', "Este producto ya está en la lista.", true);
          }

        }else{

          if(this.salesHeaderForm?.saleDetail?.length == 0)
          {
            
            var saleDetail:any = {
              select: false,
              barCode: 'SOBRE001',
              idProduct: 0,
              productDesc: this.salesDetailForm.description,
              cantidad: 1,
              cost: this.salesDetailForm.precioSobre,
              precioUnitario: this.salesDetailForm.precioSobre,
              descuento: 0,
              precio: this.salesDetailForm.precioSobre,
              importe: this.salesDetailForm.precioSobre
            };
  
            this.salesHeaderForm.saleDetail.push(saleDetail);
  
            this.interface.showDescuento = false;
  
            //VOY SUMANDO LOS IMPORTES
            this.salesHeaderForm.total = this.salesHeaderForm.saleDetail.reduce((sum: any, x: any) => sum + x.importe, 0);
            this.salesHeaderForm.pendingAmount = this.salesHeaderForm.total;
  
            this.fnClearSalesDetailForm();

          }
          
        }
        
      }

    }

    fnClearSalesDetailForm(){
      this.salesDetailForm.idProduct = 0;
      this.salesDetailForm.barCode = '';
      this.salesDetailForm.productDesc = '';
      this.salesDetailForm.cantidad = 1;
      this.salesDetailForm.precioUnitario = 0;
      this.salesDetailForm.descuento = 0;
      this.salesDetailForm.cost = 0;
      this.salesDetailForm.precio = 0;
      this.salesDetailForm.importe = 0;
      
      this.salesDetailForm.description = '';
      this.salesDetailForm.precioSobre = 0;

      this.nextInputFocus( this.barCode , 0);
    }

  fn_ShowPayments(){
    if(this.event_fnAllOKSaleHeader() && this.selectCajas.idCaja > 0){

      let OParams: any = {
        idCaja: this.ODataP.selectCajas.idCaja,
        idCustomer: this.salesHeaderForm.idCustomer,
        idSale: this.salesHeaderForm.idSale,
        relationType: 'V',
        idSeller_idUser: this.salesHeaderForm.idSeller_idUser,
        idSaleType: this.dataStone.idSaleType,
        saleTypeDesc: this.salesHeaderForm.saleTypeDesc,
        total: this.salesHeaderForm.total,
        pendingAmount: this.salesHeaderForm.pendingAmount,

        selectCajas: this.ODataP.selectCajas
      }

        this.servicesGServ.showModalWithParams( PaymentsComponent, OParams, '1500px')
        .afterClosed().subscribe({
          next: ( resp ) =>{
            
            if( resp.length > 0 ){
            
              this.fn_NuevaVenta();

              this.fn_getSaleByID( resp );
          
            }
          }
      });

    }
  }

  bSaveSale: boolean = false;

  fn_ShowPaymentCreateSale( bShowPayment: boolean ){
    if( this.idSale.length == 0 && !this.bSaveSale){
      this.bSaveSale = true;

      this.servicesGServ.showDialog('¿Estás seguro?'
      , 'Está a punto de guardar la venta'
      , '¿Desea continuar?'
      , 'Si', 'No')
      .afterClosed().subscribe({
        next: ( resp ) =>{

          
          if(resp){
          
            this.bShowSpinner = true;

            this.saleServ.CInsertSale( this.salesHeaderForm )
              .subscribe({
                next: (resp: ResponseDB_CRUD) => {
        
                  if( resp.status === 0 ){
                    this.idSale = resp.insertID;
                    this.salesHeaderForm.idSale = resp.insertID;

                    this.salesHeaderForm.pendingAmount = this.salesHeaderForm.total;
                    this.salesHeaderForm.pagado = 0;

                    // if( bShowPayment ){
                    //   this.fn_ShowPayments();
                    // }
                    // else{
                      this.ev_PrintTicket()
                      this.servicesGServ.showAlertIA( resp );
                    //}

                  }
                  
                  this.bShowSpinner = false;

                  this.bSaveSale = false;
        
                },
                error: (ex) => {
        
                  this.servicesGServ.showSnakbar( ex.error.message );
                  this.bShowSpinner = false;
        
                }
              });

              


          }
          else{
            this.bSaveSale = false;
          }

      }
    });

    }
  }

  showCustomerCat( id: number ){

    var OParamsIN: any = {
      id: id
    }

    this.servicesGServ.showModalWithParams( CustomerComponent, OParamsIN, '1500px')
    .afterClosed().subscribe({
      next: ( resp: any ) =>{

        if( resp.bOK ){
          
          this.salesHeaderForm.idCustomer = resp.id;
          this.salesHeaderForm.customerDesc = resp.name;
          this.salesHeaderForm.customerResp = '';

        }
        
      }
    });
  }

    fn_QuestionPayment(){

    if(this.ev_fnAllOKToSave()){

        this.servicesGServ.showDialog('¿Estás seguro?'
        , 'Está a punto de pagar'
        , '¿Desea continuar?'
        , 'Si', 'No')
        .afterClosed().subscribe({
          next: ( resp ) =>{
            
            if(resp){
            
              this.bShowSpinner = true;

              this.saleServ.CInsertSale( this.salesHeaderForm )
                .subscribe({
                  next: (resp: ResponseDB_CRUD) => {
          
                    if( resp.status === 0 ){
                      this.salesHeaderForm.idSale = resp.insertID;

                      this.salesHeaderForm.pendingAmount = this.salesHeaderForm.total;
                      this.salesHeaderForm.pagado = 0;
                      //this.dialogRef.close( this.data );
                    }
          
                    this.servicesGServ.showSnakbar(resp.message);
                    this.bShowSpinner = false;
          
                  },
                  error: (ex) => {
          
                    this.servicesGServ.showSnakbar( ex.error.message );
                    this.bShowSpinner = false;
          
                  }
                });

            }

        }
      });

    }

  }

  fn_CerrarMDL(){
    this.dialogRef.close( true );
  }

  fn_NuevaVenta(){
    this.idSale = '';
    this.salesHeaderForm.idSale = '';
    this.salesHeaderForm.idSeller_idUser = 0;
    this.salesHeaderForm.sellerDesc = '';
    this.salesHeaderForm.sellerResp = '';


    this.salesHeaderForm.idCustomer = 0;
    this.salesHeaderForm.customerDesc = '';
    this.salesHeaderForm.customerResp = '';
    this.salesHeaderForm.idSaleType = 0;
    this.salesHeaderForm.saleTypeDesc = '';
    this.salesHeaderForm.total = 0;

    this.salesHeaderForm.pendingAmount = 0;
    this.salesHeaderForm.pagado = 0;

    this.salesHeaderForm.saleDetail = [];
    this.salesHeaderForm.paymentList = [];


    this.salesDetailForm.barCode = '';
    this.salesDetailForm.idProduct = 0;
    this.salesDetailForm.productDesc = '';
    this.salesDetailForm.catInventary = 0;
    this.salesDetailForm.cantidad = 1,
    this.salesDetailForm.precioUnitario = 0;
    this.salesDetailForm.descuento = 0;
    this.salesDetailForm.cost = 0;
    this.salesDetailForm.precio = 0;
    this.salesDetailForm.importe = 0;

    this.interface.showDescuento = false;

    this.dataStone.idSale = '';
    this.dataStone.idSeller_idUser = 0;
    this.dataStone.sellerDesc = '';
    this.dataStone.sellerResp = '';

    this.dataStone.idCustomer = 0;
    this.dataStone.customerDesc = '';
    this.dataStone.customerResp = '';
    this.dataStone.idSaleType = 0;
    this.dataStone.saleTypeDesc = '';
    this.dataStone.total = 0;
    this.dataStone.pendingAmount = 0;
    this.dataStone.pagado = 0;
  }

  fn_CrearVentaApartirDeConsignacion( idSaleType: number ){

    let productsSelect = this.salesHeaderForm.saleDetail.filter(function( item: any ) {
      return ( item.select == true
        && item.cantidad >= item.consCantidad 
        && item.consCantidad > 0 )
    });

    if( productsSelect.length > 0 ){

      this.servicesGServ.showDialog('¿Estás seguro?'
      , 'Está a punto de crear una venta ' + ( idSaleType == 1 ? 'a Crédito' : idSaleType == 2 ? 'de Contado' : idSaleType == 3 ? 'de apartado' : '' )
      , '¿Desea continuar?'
      , 'Si', 'No')
      .afterClosed().subscribe({
        next: ( resp ) =>{
          
          if(resp){

            var paramsMDL: any = {
              actionName: ( idSaleType == 1 ? 'ventas_consVentaCredito' : idSaleType == 2 ? 'ventas_consVentaContado' : idSaleType == 3 ? 'ventas_consApartado' : '' )
            }
          
            this.servicesGServ.showModalWithParams( ActionAuthorizationComponent, paramsMDL, '400px')
            .afterClosed().subscribe({
              next: ( resp ) =>{
          
                if( resp ){
                  
                  let ODataHeader: any = {
                    idSaleOld: this.dataStone.idSale
                    , idSeller_idUser: this.dataStone.idSeller_idUser
                    , idCustomer: this.dataStone.idCustomer
                    , idSaleType: idSaleType
                    
                    , saleDetail: productsSelect
                  }

                  this.bShowSpinner = true;

                  this.saleServ.CInsertSaleByConsignation( ODataHeader )
                  .subscribe({
                    next: (resp: any) => {
            
                      if( resp.status === 0 ){

                          this.fn_getSaleByID( this.idSale );
                          
                          if(this.selectPrinter.idPrinter > 0){
                            this.printTicketServ.printTicket("Venta", resp.idSaleNew, this.selectPrinter.idPrinter);
                          }

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

              }
            });

          }
          
        }
      });
          
    }else{
      this.servicesGServ.showAlert('W', 'Alerta!', "Selecciona almenos un producto de la lista.", false);
    }

  }


  fn_RegresarProductoDeConsignacion(){

    let productsSelect = this.salesHeaderForm.saleDetail.filter(function( item: any ) {
      return item.select == true
    });

    if( productsSelect.length > 0 ){

      this.servicesGServ.showDialog('¿Estás seguro?'
      , 'Está a punto de regresar ' + ( productsSelect.length > 1 ? 'los productos' : 'el producto' ) + ' al inventario'
      , '¿Desea continuar?'
      , 'Si', 'No')
      .afterClosed().subscribe({
        next: ( resp ) =>{
          
          if(resp){

            var paramsMDL: any = {
              actionName: 'ventas_consignacionRegresarAInventario'
            }
          
            this.servicesGServ.showModalWithParams( ActionAuthorizationComponent, paramsMDL, '400px')
            .afterClosed().subscribe({
              next: ( resp ) =>{
          
                if( resp ){
                  
                  let ODataHeader: any = {
                    idSaleOld: this.dataStone.idSale
                    , idSeller_idUser: this.dataStone.idSeller_idUser
                    
                    , saleDetail: productsSelect
                  }
      
                  this.bShowSpinner = true;
      
                  this.saleServ.CRegresarProductoDeConsignacion( ODataHeader )
                    .subscribe({
                      next: (resp: any) => {
              
                        if( resp.status === 0 ){
      
                          if( resp.bBorro == 1 ){
                            this.fn_CerrarMDL();
                          }else{
                            this.fn_getSaleByID( this.idSale );
                          }
      
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

              }
            });

          }

        }
      });

    }else{
      this.servicesGServ.showAlert('W', 'Alerta!', "Selecciona almenos un producto de la lista.", true);
    }

  }
    

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE EVENTOS
//////////////////////////////////////////////////////////////////////////////////////////////////

onConsDescuentoChange(descuento: number, item: any) {

  // //SACO EL DESCUENTO
  // // CONVIERTO EN DECIMAL LE PORCENTAJE
  var porcentajeDescuento = descuento / 100;
  var precioDescuento = porcentajeDescuento * item.precioUnitario;

  var precio = item.precioUnitario - precioDescuento;

  if(precio < item.cost){
    this.servicesGServ.showAlert('W', 'Alerta!', "No se puede aplicar tanto descuento.", false);
    item.consDescuento = 0;
  }

}

ev_fnShowBtnAddSaleDetail(): boolean {
  let bOK = false;

  if(
    (
      this.salesHeaderForm.idSaleType == 5
      && this.salesDetailForm.description.length > 0
      && this.salesDetailForm.precioSobre > 0
      && this.salesHeaderForm?.saleDetail?.length == 0
    )
    ||
    (
      this.salesHeaderForm.idSaleType != 5
      && this.salesDetailForm.idProduct > 0
      && this.salesDetailForm.barCode.length > 0
      && this.salesDetailForm.cantidad > 0
      && this.salesDetailForm.precioUnitario > 0
    )
    )
    {
      bOK = true;
    }

  return bOK;
}

ev_fnShowBtnGuardarSinAnticipo(): boolean {
  let bOK = false;

  if( this.salesHeaderForm.idSeller_idUser > 0
    && this.salesHeaderForm.idCustomer > 0
    && this.salesHeaderForm.idSaleType > 0
    && this.salesHeaderForm.saleDetail.length > 0
    )
    {
      bOK = true;
    }

  return bOK;
}

ev_fnShowBtnPagar(): boolean {
  let bOK = false;

  if( this.salesHeaderForm.idCustomer > 0
    && this.salesHeaderForm.saleDetail.length > 0
    )
    {
      bOK = true;
    }

  return bOK;
}

ev_fn_barCode_keyup_enter(event: any){
  if(event.keyCode == 13) { // PRESS ENTER
    
    if( this.salesDetailForm.barCode.length > 0){
      this.fn_getProductByBarCode();
    }
    // else if(this.salesHeaderForm.saleDetail.length > 0 && this.salesDetailForm.barCode.length == 0){
    //   this.fn_ShowPaymentCreateSale( this.salesHeaderForm.idSaleType != 3 && this.salesHeaderForm.idSaleType != 4 && this.selectCajas.idCaja > 0);
    // }

  }
}

ev_fn_cbxCantidad_keyup_enter(event: any){
  if(event.keyCode == 13) { // PRESS ENTER

    if( this.salesDetailForm.cantidad > 0 ){
      this.nextInputFocus( this.cbxDescuento, 0);
    }
    
  }
}

event_fnAllOKSaleHeader(): boolean {
  let bOK = false;

  if( this.salesHeaderForm.idCustomer > 0 // QUE TENGA CLIENTE
    && this.salesHeaderForm.idSaleType > 0 // QUE TENGA CONDICION DE PAGO
    && this.salesHeaderForm.saleDetail.length > 0 // QUE SE HAYA AGREGADO UN PRODUCTO
    && this.salesHeaderForm.total > 0 // QUE EL TOTAL SEA MAYOR
    )
    {
      bOK = true;
    }

  return bOK;
}

event_fnClick_DeleteProductFromList( index: number ){
  this.salesHeaderForm.saleDetail.splice( index, 1);
  this.salesHeaderForm.total = this.salesHeaderForm.saleDetail.reduce((sum: any, x: any) => sum + x.importe, 0);
}

ev_fnAllOKToSave(): boolean {
  let bOK = false;

  if( this.salesHeaderForm.idCustomer > 0 // QUE TENGA CLIENTE
    && this.salesHeaderForm.idSaleType > 0 // QUE TENGA CONDICION DE PAGO
    && this.salesHeaderForm.saleDetail.length > 0 // QUE SE HAYA AGREGADO UN PRODUCTO
    && this.salesHeaderForm.total > 0 // QUE EL TOTAL SEA MAYOR
    )
    {
      bOK = true;
    }

  return bOK;
}

ev_showInterface(){

  if( this.salesHeaderForm.paymentList?.length > 0 ){
    this.interface.showReferencia = this.salesHeaderForm.paymentList.filter(function( item: any ) {
      return item.referencia?.length > 0
    }).length > 0;
  
    this.interface.showFxRate = this.salesHeaderForm.paymentList.filter(function( item: any ) {
      return item.fxRate > 0
    }).length > 0;
  }else{
    this.interface.showReferencia = false;
    this.interface.showFxRate = false;
  }

}

async ev_PrintTicket(){
  this.printTicketServ.printTicket("Venta", this.idSale, this.selectPrinter.idPrinter);
}

async ev_PrintTicketConsHistoryList(){
  this.printTicketServ.printTicket("ConsHistory", this.idSale, this.selectPrinter.idPrinter);
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

    this.salesHeaderForm.idCustomer =  ODataCbx.idCustomer;
    this.salesHeaderForm.customerDesc = ODataCbx.name;

    this.nextInputFocus( this.cbxSaleTypeCBX, 500 );

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

  cbxProducts_SelectedOption( event: MatAutocompleteSelectedEvent ) {

    if(!event.option.value){
      return;
    }

    const ODataCbx: any = event.option.value;

    this.salesDetailForm.idProduct = ODataCbx.idProduct;
    this.salesDetailForm.productDesc = ODataCbx.name;
    this.salesDetailForm.barCode = ODataCbx.barCode;
    
    this.salesDetailForm.cost = ODataCbx.cost;
    this.salesDetailForm.precioUnitario = ODataCbx.price;
    this.salesDetailForm.catInventary = ODataCbx.catInventary;

    this.nextInputFocus( this.tbxCantidad, 500);
  }

  cbxProducts_Clear(){
    this.salesDetailForm.idProduct = 0;
    this.salesDetailForm.productDesc = '';
    this.salesDetailForm.barCode = '';
    this.salesDetailForm.precioUnitario = 0;
    this.salesDetailForm.catInventary = 0;
    this.salesDetailForm.cost = 0;
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

  cbxSalesType_SelectedOption( event: MatAutocompleteSelectedEvent ) {

    if(!event.option.value){
      return;
    }

    const ODataCbx: any = event.option.value;

    this.salesHeaderForm.idSaleType = ODataCbx.id;
    this.salesHeaderForm.saleTypeDesc = ODataCbx.name;

    //alert(this.salesHeaderForm.idSaleType)

    if(this.salesHeaderForm.idSaleType == 5){
      setTimeout (() => {
        var miInput = document.getElementById('tbxDescription');
        miInput?.focus();
      }, 500);
    }else{
      this.nextInputFocus( this.barCode, 500);
    }

  }

  cbxSalesType_Clear(){
    this.salesHeaderForm.idSaleType = 0;
    this.salesHeaderForm.saleTypeDesc = '';
    
  }
  //--------------------------------------------------------------------------

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE ÁREAS

  cbxSellers: any[] = [];

  cbxSellers_Search() {
      this.userServ.CCbxGetSellersCombo( this.salesHeaderForm.sellerDesc, this.idUserLogON )
       .subscribe( {
         next: (resp: ResponseGet) =>{
           if(resp.status === 0){
             this.cbxSellers = resp.data;
             this.salesHeaderForm.sellerResp = '';
             
           }
           else{
            this.cbxSellers = [];
            this.salesHeaderForm.sellerResp = resp.message;
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

    this.salesHeaderForm.idSeller_idUser =  ODataCbx.idUser;
    this.salesHeaderForm.sellerDesc = ODataCbx.name;
    this.salesHeaderForm.sellerResp = '';

    this.nextInputFocus( this.cbxCustomerCBX, 500 );

  }

  cbxSellers_Clear(){
    this.salesHeaderForm.idSeller_idUser = 0;
    this.salesHeaderForm.sellerDesc = '';
    this.salesHeaderForm.sellerResp = '';
  }
  //--------------------------------------------------------------------------

  

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE COMBOS
//////////////////////////////////////////////////////////////////////////////////////////////////

}
