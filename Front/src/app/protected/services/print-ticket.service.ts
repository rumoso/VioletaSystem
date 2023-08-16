import { Injectable } from '@angular/core';
import { SucursalesService } from './sucursales.service';
import { Observable, async } from 'rxjs';
import { SalesService } from './sales.service';
import { CustomersService } from './customers.service';
import { ResponseGet } from '../interfaces/global.interfaces';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { CajasService } from './cajas.service';

@Injectable({
  providedIn: 'root'
})
export class PrintTicketService {


  _api: string = 'http://localhost/printT/Print';
  private idSucursal: number = environment.idSucursal;

  constructor(
    private http: HttpClient
    , private sucursalesServ: SucursalesService
    , private salesServ: SalesService
    , private customersServ: CustomersService
    , private servicesG: ServicesGService
    , private cajasServ: CajasService
  ) { }

  async printTicket( type: string, idRelation: number, selectCajas: any ): Promise<any> {

    var bOK = false;

    if(type == "Venta"){

      const sale = await this.salesServ.CGetSaleByIDPromise( idRelation );

      console.log(sale);


        // CONSTRUYO EL HEADER
        const HeaderSuc = await this.sucursalesServ.CGetPrintTicketSuc( this.idSucursal, "Header");

        var headerDataL: any = [];

        for(var i = 0; i < HeaderSuc.length; i++){
          var header: any = {
            aling: HeaderSuc[i].aling
            , size: HeaderSuc[i].size
            , text: HeaderSuc[i].text
          }

          headerDataL.push( header );
        }

        //console.log(headerL)

        var customerDataL: any = [];

        // AGREGO LA INFORMACIÓN DEL CLIENTE
        const OCustomerData = await this.customersServ.CGetCustomerByIDPromise( sale.data.idCustomer );

        if( OCustomerData != null ){
          var OData: any = { aling: "Left", size: 7, text: "CLIENTE: " + OCustomerData.lastName + " " + OCustomerData.name }
          customerDataL.push( OData );
          var OData: any = { aling: "Left", size: 7, text: "DIRECCIÓN: " + OCustomerData.address }
          customerDataL.push( OData );
          var OData: any = { aling: "Left", size: 7, text: "TELEFONO: " + OCustomerData.tel }
          customerDataL.push( OData );
          var OData: any = { aling: "Left", size: 7, text: "" }
          customerDataL.push( OData );
        }

        //console.log(customerDataL)

        var operacionDataL: any = [];

        // AGREGO LA INFORMACIÓN DELA OPERACIÓN
        if( sale != null ){
          var OData: any = { aling: "Center", size: 7, text: "OPERACIÓN: Venta de " + sale.data.saleTypeDesc }
          operacionDataL.push( OData );
          var OData: any = { aling: "Left", size: 7, text: "Folio: #" + sale.data.idSale }
          operacionDataL.push( OData );
          var OData: any = { aling: "Left", size: 7, text: "FECHA: " + sale.data.createDateString }
          operacionDataL.push( OData );
          var OData: any = { aling: "Left", size: 7, text: "ATENDIÓ: " + sale.data.sellerDesc}
          operacionDataL.push( OData );

          var OData: any = { aling: "Center", size: 10, text: "---------------------------------------------------------"}
          operacionDataL.push( OData );
        }

        //console.log(operacionDataL)

        let USDollar = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        });

        var productsDetailL: any = [];

        for(var i = 0; i < sale.dataDetail.length; i++){

          var ODataDetail = sale.dataDetail[i];

          var DataDetail: any = {
            productDesc: ODataDetail.productDesc
            , cantidad: ODataDetail.cantidad
            , precio: USDollar.format( ODataDetail.precio )
            , importe: USDollar.format( ODataDetail.importe )
          }

          productsDetailL.push( DataDetail );
        }


        var totalesL: any = [];

        var OData: any = { aling: "Right", size: 7, text: "SUBTOTAL:", importe: USDollar.format( sale.data.saleTotal ) }
        totalesL.push( OData );

        var OData: any = { aling: "Right", size: 7, text: "IVA:", importe: USDollar.format( 0 ) }
        totalesL.push( OData );

        var OData: any = { aling: "Right", size: 7, text: "TOTAL:", importe: USDollar.format( sale.data.saleTotal ) }
        totalesL.push( OData );

        // CONSTRUYO EL HEADER
        const FooterSuc = await this.sucursalesServ.CGetPrintTicketSuc( this.idSucursal, "footer");

        var footerSucDataL: any = [];

        for(var i = 0; i < FooterSuc.length; i++){
          var footer: any = {
            aling: FooterSuc[i].aling
            , size: FooterSuc[i].size
            , text: FooterSuc[i].text
          }

          footerSucDataL.push( footer );
        }

        //SI ES DE CONTADO NO APARECE TANTO DETALLE EN EL PAGO
        if(sale.data.idSaleType == 2){

          var paymentsL: any = [];

          for(var i = 0; i < sale.dataPayments.length; i++){
            var payment: any = {
              aling: "Right"
              , size: 7
              , text: sale.dataPayments[i].formaPagoDesc
              , importe: USDollar.format( sale.dataPayments[i].pago )
            }

            paymentsL.push( payment );
          }

        }else{

          var payments2L: any = [];

          for(var i = 0; i < sale.dataPayments.length; i++){
            var payments2: any = {
              size: 7
              , text: sale.dataPayments[i].formaPagoDesc
              , importe: USDollar.format( sale.dataPayments[i].pago )
              , fecha: sale.dataPayments[i].createDateString
            }

            payments2L.push( payments2 );
          }

          var payments2: any = {
            size: 7
            , text: "PAGADO"
            , importe: USDollar.format( sale.data.pagado )
            , fecha: ""
          }

          payments2L.push( payments2 );

          var payments2: any = {
            size: 7
            , text: "PENDIENTE"
            , importe: USDollar.format( sale.data.pendingAmount )
            , fecha: ""
          }

          payments2L.push( payments2 );

        }

        const caja = await this.cajasServ.CGetCajaByIDPromise( selectCajas.idCaja );
        console.log( caja.data );

        //console.log(sale)

        let printParameters: any = {
          type: type,
          PrinterName: caja.data.impresoraName,
          oData: {
            headerData: headerDataL,
            customerData: customerDataL,
            operacionData: operacionDataL,
            productsDetail: productsDetailL,
            totales: totalesL,
            payments: paymentsL,
            payments2: payments2L,
            footerSucData: footerSucDataL
          }
        }

        console.log(  printParameters )

        bOK = await this.CPrintTicketAwait( printParameters );

        return new Promise((resolve, reject) => {
          resolve( bOK )
        });

      }

  }

  CPrintTicketAwait( data : any ): Promise<any> {
    
    return new Promise((resolve, reject) => {

      this.http.post<ResponseGet>( `${ this._api }/printTicket`, data)
      .subscribe({
        next: ( resp: ResponseGet ) => {
          resolve( resp );
        }
        , error: ( err: any ) => {
          reject( err );
        }
      });

    });

  }

}
