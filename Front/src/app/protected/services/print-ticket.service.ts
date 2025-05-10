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
import { PrintersService } from './printers.service';
import { ProductsService } from './products.service';

@Injectable({
  providedIn: 'root'
})
export class PrintTicketService {

  _api: string = 'http://localhost/printT/Print';


  constructor(
    private http: HttpClient
    , private sucursalesServ: SucursalesService
    , private salesServ: SalesService
    , private customersServ: CustomersService
    , private servicesG: ServicesGService
    , private cajasServ: CajasService
    , private printersServ: PrintersService
    , private productsServ: ProductsService
  ) { }

  async printTicket( type: string, idRelation: any, idPrinter: number, iCopy: number, iPayments: number = 0, idPayment: any = '', sumCambio: number = 0 ): Promise<any> {

    var bOK = false;
    var sBarCode = '';

    let USDollar = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    });

    var oLinesP: any = [];

    if(type == "Venta"){

      const sale = await this.salesServ.CGetSaleByIDPromise( idRelation );

      console.log(sale);

      // CONSTRUYO EL HEADER
      const HeaderSuc = await this.sucursalesServ.CGetPrintTicketSuc( sale.data.idSucursal, "Header");

      var oLines: any = [];


      // oLines = [];
      // var oLine: any = { aling: "Left", size: 7, text: "ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNO" }
      // oLines.push( oLine );
      // oLinesP.push( { oLines: oLines } );

      // oLines = [];
      // var oLine: any = { aling: "Left", size: 7, text: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcd" }
      // oLines.push( oLine );
      // oLinesP.push( { oLines: oLines } );

      // oLines = [];
      // var oLine: any = { aling: "Left", size: 7, text: "12345678901234567890123456789012345678901234567890" }
      // oLines.push( oLine );
      // oLinesP.push( { oLines: oLines } );

      // oLines = [];
      // var oLine: any = { bImage: true  }
      // oLines.push( oLine );
      // oLinesP.push( { oLines: oLines } );


      oLines = [];
      var oLine: any = { aling: "Center", size: 15, text: "NOTA: " + sale.data.saleTypeDesc }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 15, text: "Folio: #" + sale.data.idSale }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      if( sale.data.fechaEntrega ){
        oLines = [];
        var oLine: any = { aling: "Center", size: 15, text: "Fecha de entrega: " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 15, text: sale.data.fechaEntrega }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );
      }

      if( sale.data.statusSobreDesc == 'Entregado' ){

        oLines = [];
        var oLine: any = { aling: "Center", size: 15, text: "ENTREGADO" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );
      }

      if(sale.data.active == 0){

        oLines = [];
        var oLine: any = { aling: "Center", size: 20, text: "CANCELADA" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );
      }

      oLines = [];
      var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      for(var i = 0; i < HeaderSuc.length; i++){

        oLines = [];

        var oLine: any = {
          aling: HeaderSuc[i].aling
          , size: HeaderSuc[i].size
          , text: HeaderSuc[i].text
        }

        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );
      }

      // AGREGO LA INFORMACIÓN DEL CLIENTE
      const OCustomerData = await this.customersServ.CGetCustomerByIDPromise( sale.data.idCustomer );

      if( OCustomerData != null ){

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "CLIENTE: " + OCustomerData.lastName + " " + OCustomerData.name }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "DIRECCIÓN: " + OCustomerData.address }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "TELEFONO: " + OCustomerData.tel }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );
      }

      // AGREGO LA INFORMACIÓN DELA OPERACIÓN
      if( sale != null ){

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, text: "OPERACIÓN: Venta de " + sale.data.saleTypeDesc }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "Folio: #" + sale.data.idSale }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "FECHA: " + sale.data.createDateString }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "ATENDIÓ: " + sale.data.sellerDesc }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

      }

      if( sale.data.idSaleType == 5 ){

        oLines = [];
        var oLine: any = { aling: "Left", size: 5, style: "Bold", text: "DESCRIPCIÓN", iWith: 100 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        for(var i = 0; i < sale.dataDetail.length; i++){

          var ODataDetail = sale.dataDetail[i];

          oLines = [];
          var oLine: any = { aling: "Left", size: 7, text: ODataDetail.productDesc, iWith: 100 }
          oLines.push( oLine );
          oLinesP.push( { oLines: oLines } );

        }

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

      }else{

        oLines = [];
        var oLine: any = { aling: "Left", size: 5, style: "Bold", text: "DESCRIPCIÓN", iWith: 42 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 5, style: "Bold", text: "CAN", iWith: 8 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 5, style: "Bold", text: "PRECIO", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 5, style: "Bold", text: "IMPORTE", iWith: 25 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        for(var i = 0; i < sale.dataDetail.length; i++){

          var ODataDetail = sale.dataDetail[i];

          oLines = [];
          var oLine: any = { aling: "Left", size: 7, text: ODataDetail.barCode + '-' + ODataDetail.productDesc, iWith: 42 }
          oLines.push( oLine );
          var oLine: any = { aling: "Center", size: 7, text: ODataDetail.cantidad, iWith: 8 }
          oLines.push( oLine );
          var oLine: any = { aling: "Right", size: 7, text: USDollar.format( ODataDetail.precio ), iWith: 25 }
          oLines.push( oLine );
          var oLine: any = { aling: "Right", size: 7, text: USDollar.format( ODataDetail.importe ), iWith: 25 }
          oLines.push( oLine );
          oLinesP.push( { oLines: oLines } );

        }

      }

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: "SUBTOTAL:", iWith: 75 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( sale.data.saleTotal ), iWith: 25 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: "IVA:", iWith: 75 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( 0 ), iWith: 25 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: "TOTAL:", iWith: 75 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( sale.data.saleTotal ), iWith: 25 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      //SI ES DE CONSIGNACIÓN, DEBE FIRMAR EL CLIENTE
      if(sale.data.idSaleType == 4 || sale.data.idSaleType == 1){

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, text: "---------------------------------------------------- " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, text: "CLIENTE: " + OCustomerData.lastName + " " + OCustomerData.name }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

      }

      if( sale.data.idSaleType == 6 ){

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, text: "EL PRECIO Y LAS CONDICIONES PUEDEN VARIAR SI SE PRESENTAN CAMBIOS EN LAS CARACTERÍSTICAS DEL PRODUCTO O SERVICIO EN UN PLAZO DE 7 DÍAS, O EN FUNCIÓN DE LA DISPONIBILIDAD. POR FAVOR, CONFIRME LA DISPONIBILIDAD Y PRECIO ANTES DE REALIZAR SU PEDIDO." }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, text: "CONSERVE SU TICKET PARA ACLARACIONES" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

      }else{

        // CONSTRUYO EL FOOTER
        const FooterSuc = await this.sucursalesServ.CGetPrintTicketSuc( sale.data.idSucursal, "footer");

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        for(var i = 0; i < FooterSuc.length; i++){

          oLines = [];

          var oLine: any = {
            aling: FooterSuc[i].aling
            , size: FooterSuc[i].size
            , text: FooterSuc[i].text
          }

          oLines.push( oLine );
          oLinesP.push( { oLines: oLines } );
        }

      }

    }
    else if(type == "Payments" || type == "RePayment"){

      const sale = await this.salesServ.CGetSaleByIDPromise( idRelation );

      console.log(sale);

      // CONSTRUYO EL HEADER
      const HeaderSuc = await this.sucursalesServ.CGetPrintTicketSuc( sale.data.idSucursal, "Header");

      var oLines: any = [];

      // oLines = [];
      // var oLine: any = { bImage: true, base64Image: this.base64VioletaIcon }
      // oLines.push( oLine );
      // oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 20, text: "PAGO" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      for(var i = 0; i < HeaderSuc.length; i++){

        oLines = [];

        var oLine: any = {
          aling: HeaderSuc[i].aling
          , size: HeaderSuc[i].size
          , text: HeaderSuc[i].text
        }

        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );
      }

      // AGREGO LA INFORMACIÓN DEL CLIENTE
      const OCustomerData = await this.customersServ.CGetCustomerByIDPromise( sale.data.idCustomer );

      if( OCustomerData != null ){

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "CLIENTE: " + OCustomerData.lastName + " " + OCustomerData.name }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "DIRECCIÓN: " + OCustomerData.address }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "TELEFONO: " + OCustomerData.tel }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );
      }

      // AGREGO LA INFORMACIÓN DELA OPERACIÓN
      if( sale != null ){

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, text: "OPERACIÓN: "
        + ( sale.data.idSaleType == "1" ? "Abono al crédito #" : sale.data.idSaleType == "2" ? "Pago de la venta #" : sale.data.idSaleType == "3" ? "Abono al apartado #" : "Pago al #" ) +  sale.data.idSale }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "FECHA: " + sale.dataPayments[0].createDateString }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "ATENDIÓ: " + sale.data.sellerDesc }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

      }

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 5, style: "Bold", text: "# PAGO", iWith: 25 }
      oLines.push( oLine );
      var oLine: any = { aling: "Center", size: 5, style: "Bold", text: "FORMA DE PAGO", iWith: 45 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 5, style: "Bold", text: "PAGO", iWith: 30 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      var dataPayments = [];

      if(type == "RePayment"){
        dataPayments = sale.dataPayments.filter( ( item: any ) => item.idPayment === idPayment);
      }
      else{
        dataPayments = sale.dataPayments;
      }

      for(var i = 0; i < iPayments; i++){

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, text: dataPayments[i].idPayment, iWith: 20 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 7, text: ( dataPayments[i].fxRate > 0 ?
          dataPayments[i].formaPagoDesc + '(' + USDollar.format( dataPayments[i].pagoF ) + ')'
          : dataPayments[i].formaPagoDesc ), iWith: 50 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 7, text: USDollar.format( dataPayments[i].pago ), iWith: 30 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

      }

      oLines = [];
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: "PAGADO:", iWith: 75 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( sale.data.pagado ), iWith: 25 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: "PENDIENTE:", iWith: 75 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( sale.data.pendingAmount ), iWith: 25 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: "CAMBIO:", iWith: 75 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( sumCambio ), iWith: 25 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      if(sale.data.pendingAmount <= 0){
        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 20, text: "PAGADO" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );
      }

      // CONSTRUYO EL FOOTER
      // const FooterSuc = await this.sucursalesServ.CGetPrintTicketSuc( sale.data.idSucursal, "footer");

      // oLines = [];
      // var oLine: any = { aling: "Left", size: 7, text: " " }
      // oLines.push( oLine );
      // oLinesP.push( { oLines: oLines } );

      // for(var i = 0; i < FooterSuc.length; i++){

      //   oLines = [];

      //   var oLine: any = {
      //     aling: FooterSuc[i].aling
      //     , size: FooterSuc[i].size
      //     , text: FooterSuc[i].text
      //   }

      //   oLines.push( oLine );
      //   oLinesP.push( { oLines: oLines } );
      // }

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 7, text: "GRACIAS POR SU PAGO" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );
      oLines = [];
      var oLine: any = { aling: "Center", size: 7, text: "CONSERVE SU TICKET PARA ACLARACIONES" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

    }
    else if(type == "CorteCaja"){

      var idCorteCaja = idRelation;

      const oCorteCaja = await this.salesServ.CGetCorteCajaByIDPromise( idCorteCaja );

      console.log( oCorteCaja )

      const HeaderSuc = await this.sucursalesServ.CGetPrintTicketSuc( oCorteCaja.data.idSucursal, "Header");

      var oLines: any = [];

      oLines = [];
      var oLine: any = { aling: "Center", size: 20, text: "CORTE DE CAJA" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      for(var i = 0; i < HeaderSuc.length; i++){

        oLines = [];

        var oLine: any = {
          aling: HeaderSuc[i].aling
          , size: HeaderSuc[i].size
          , text: HeaderSuc[i].text
        }

        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

      }


      if( oCorteCaja != null ){

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, text: "OPERACIÓN: Corte de Caja" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "Folio: #" + idCorteCaja }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "FECHA: " + oCorteCaja.data.createDateString }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "CREADO POR: " + oCorteCaja.data.createUserName }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, style: "Bold", text: "INGRESOS:", iWith: 100 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: "VENTA:", iWith: 33 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: "TALLER:", iWith: 33 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: "INGRESO TOTAL:", iWith: 34 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.sales ), iWith: 33 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.tallerSales ), iWith: 33 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.ingresoTotal ), iWith: 34 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: "EGRESOS:", iWith: 33 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: "INGR MANUALES:", iWith: 33 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: "INGRESO TOTAL:", iWith: 34 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.egresos ), iWith: 33 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.ingresosManuales ), iWith: 33 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.ingresoReal ), iWith: 34 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, style: "Bold", text: "DESGLOSE SISTEMA", iWith: 50 }
        oLines.push( oLine );
        var oLine: any = { aling: "Left", size: 7, style: "Bold", text: "EXISTENCIA EN CAJA", iWith: 50 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: "PESOS", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.pesos ), iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: "PESOS", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.pesosCaja ), iWith: 25 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: "DÓLARES (TC: "+ oCorteCaja.data.fxRate +")", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.dolares ), iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: "DÓLARES", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.dolaresCaja ), iWith: 25 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: "VOUCHERS", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.vouchers ), iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: "VOUCHERS", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.vouchersCaja ), iWith: 25 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: "TRANSFER", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.transferencias ), iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: "TRANSFER", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.transferenciasCaja ), iWith: 25 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: " ", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 6, style: "Bold", text: "TOTAL EN CAJA", iWith: 50 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.totalCaja ), iWith: 25 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: " ", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 7, style: "Bold", text: " ", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: "DIFERENCIA", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.diferencia ), iWith: 25 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );


        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: "SI CUADRÓ", iWith: 50 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: "NO CUADRÓ", iWith: 50 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: ( oCorteCaja.data.bCuadro == 1 ? "X" : " " ), iWith: 50 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: ( oCorteCaja.data.bCuadro == 2 ? "X" : " " ), iWith: 50 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, style: "Bold", text: "COMENTARIOS:", iWith: 100 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, style: "Bold", text: oCorteCaja.data.observaciones, iWith: 100 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        const oEgresos = await this.salesServ.CGetEgresosByIDCorteCaja( idCorteCaja );

        if( oEgresos.data.length > 0 ){

          oLines = [];
          var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
          oLines.push( oLine );
          oLinesP.push( { oLines: oLines } );

          oLines = [];
          var oLine: any = { aling: "Left", size: 7, style: "Bold", text: "LISTA DE EGRESOS:", iWith: 100 }
          oLines.push( oLine );
          oLinesP.push( { oLines: oLines } );

          oLines = [];
          var oLine: any = { aling: "Center", size: 10, text: " " }
          oLines.push( oLine );
          oLinesP.push( { oLines: oLines } );

          oLines = [];
          var oLine: any = { aling: "Left", size: 5, style: "Bold", text: "# EGRESO", iWith: 20 }
          oLines.push( oLine );
          var oLine: any = { aling: "Left", size: 5, style: "Bold", text: "DESCRIPCIÓN", iWith: 60 }
          oLines.push( oLine );
          var oLine: any = { aling: "Right", size: 5, style: "Bold", text: "MONTO", iWith: 20 }
          oLines.push( oLine );
          oLinesP.push( { oLines: oLines } );

          for(var i = 0; i < oEgresos.data.length; i++){

            oLines = [];
            var oLine: any = { aling: "Left", size: 7, text: oEgresos.data[i].idEgreso, iWith: 20 }
            oLines.push( oLine );
            var oLine: any = { aling: "Left", size: 7, text: oEgresos.data[i].description, iWith: 60 }
            oLines.push( oLine );
            var oLine: any = { aling: "Right", size: 7, text: USDollar.format( oEgresos.data[i].amount ), iWith: 20 }
            oLines.push( oLine );
            oLinesP.push( { oLines: oLines } );

          }

        }

        const oIngresos = await this.salesServ.CGetIngresosByIDCorteCaja( idCorteCaja );

        if( oIngresos.data.length > 0 ){

          oLines = [];
          var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
          oLines.push( oLine );
          oLinesP.push( { oLines: oLines } );

          oLines = [];
          var oLine: any = { aling: "Left", size: 7, style: "Bold", text: "LISTA DE INGRESOS MANUALES:", iWith: 100 }
          oLines.push( oLine );
          oLinesP.push( { oLines: oLines } );

          oLines = [];
          var oLine: any = { aling: "Center", size: 10, text: " " }
          oLines.push( oLine );
          oLinesP.push( { oLines: oLines } );

          oLines = [];
          var oLine: any = { aling: "Left", size: 5, style: "Bold", text: "# Ingreso", iWith: 20 }
          oLines.push( oLine );
          var oLine: any = { aling: "Left", size: 5, style: "Bold", text: "DESCRIPCIÓN", iWith: 50 }
          oLines.push( oLine );
          var oLine: any = { aling: "Right", size: 5, style: "Bold", text: "MONTO", iWith: 30 }
          oLines.push( oLine );
          oLinesP.push( { oLines: oLines } );

          for(var i = 0; i < oIngresos.data.length; i++){

            oLines = [];
            var oLine: any = { aling: "Left", size: 7, text: oIngresos.data[i].idIngreso, iWith: 20 }
            oLines.push( oLine );
            var oLine: any = { aling: "Left", size: 7, text: oIngresos.data[i].description, iWith: 50 }
            oLines.push( oLine );
            var oLine: any = { aling: "Right", size: 7, text: USDollar.format( oIngresos.data[i].amount ), iWith: 30 }
            oLines.push( oLine );
            oLinesP.push( { oLines: oLines } );

          }

        }

      }



    }
    else if(type == "Egreso"){

      const egreso = await this.salesServ.CGetEgresoByIDPromise( idRelation );

      console.log(egreso);

      // CONSTRUYO EL HEADER
      const HeaderSuc = await this.sucursalesServ.CGetPrintTicketSuc( egreso.data.idSucursal, "Header");

      var oLines: any = [];

      oLines = [];
      var oLine: any = { aling: "Center", size: 20, text: "EGRESO" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      for(var i = 0; i < HeaderSuc.length; i++){

        oLines = [];

        var oLine: any = {
          aling: HeaderSuc[i].aling
          , size: HeaderSuc[i].size
          , text: HeaderSuc[i].text
        }

        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );
      }

      // AGREGO LA INFORMACIÓN DELA OPERACIÓN
      if( egreso != null ){

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, text: "OPERACIÓN: EGRESO #" +  egreso.data.idEgreso }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "FECHA: " + egreso.data.createDateString }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

      }

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 5, style: "Bold", text: "DESCRIPCIÓN", iWith: 75 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 5, style: "Bold", text: "MONTO", iWith: 25 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, style: "Bold", text: egreso.data.description, iWith: 75 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( egreso.data.amount ), iWith: 25 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 7, text: "---------------------------------------------------- " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 7, text: "FIRMA DE QUIEN EXPIDE" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 7, text: "---------------------------------------------------- " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 7, text: "FIRMA DE QUIEN RECIBE" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

    }
    else if(type == "Ingreso"){

      const ingreso = await this.salesServ.CGetIngresoByIDPromise( idRelation );

      // CONSTRUYO EL HEADER
      const HeaderSuc = await this.sucursalesServ.CGetPrintTicketSuc( ingreso.data.idSucursal, "Header");

      var oLines: any = [];

      oLines = [];
      var oLine: any = { aling: "Center", size: 20, text: "INGRESO" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      for(var i = 0; i < HeaderSuc.length; i++){

        oLines = [];

        var oLine: any = {
          aling: HeaderSuc[i].aling
          , size: HeaderSuc[i].size
          , text: HeaderSuc[i].text
        }

        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );
      }

      // AGREGO LA INFORMACIÓN DELA OPERACIÓN
      if( ingreso != null ){

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, text: "OPERACIÓN: INGRESO #" +  ingreso.data.idIngreso }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "FECHA: " + ingreso.data.createDateString }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

      }

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 5, style: "Bold", text: "DESCRIPCIÓN", iWith: 75 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 5, style: "Bold", text: "MONTO", iWith: 25 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, style: "Bold", text: ingreso.data.description, iWith: 75 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( ingreso.data.amount ), iWith: 25 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

    }
    else if(type == "ConsHistory"){

      const sale = await this.salesServ.CGetSaleByIDPromise( idRelation );

      // CONSTRUYO EL HEADER
      const HeaderSuc = await this.sucursalesServ.CGetPrintTicketSuc( sale.data.idSucursal, "Header");

      var oLines: any = [];

      for(var i = 0; i < HeaderSuc.length; i++){

        oLines = [];

        var oLine: any = {
          aling: HeaderSuc[i].aling
          , size: HeaderSuc[i].size
          , text: HeaderSuc[i].text
        }

        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );
      }

      var OConsHistory = await this.salesServ.CGetConsHistoryPromise( idRelation );

      OConsHistory.data.rows[0].createDateString

      // AGREGO LA INFORMACIÓN DELA OPERACIÓN
      if( OConsHistory != null ){

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, text: "OPERACIÓN: Movimientos de #" +  sale.data.idSale }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: "PRODUCTO", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 6, style: "Bold", text: "CANT", iWith: 10 }
        oLines.push( oLine );
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: "DESCRIPCIÓN", iWith: 40 }
        oLines.push( oLine );
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: "FECHA", iWith: 25 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        for(var i = 0; i < OConsHistory.data.rows.length; i++){

          var oConsHistoryLine = OConsHistory.data.rows[i];

          oLines = [];
          var oLine: any = { aling: "Left", size: 7, text: oConsHistoryLine.name, iWith: 25 }
          oLines.push( oLine );
          var oLine: any = { aling: "Center", size: 7, text: oConsHistoryLine.consCantidad, iWith: 10 }
          oLines.push( oLine );
          var oLine: any = { aling: "Left", size: 7, text: oConsHistoryLine.description, iWith: 40 }
          oLines.push( oLine );
          var oLine: any = { aling: "Left", size: 7, text: oConsHistoryLine.createDateString, iWith: 25 }
          oLines.push( oLine );

          oLinesP.push( { oLines: oLines } );

        }

      }

    }
    else if(type == "DineroElectronico"){

      // AGREGO LA INFORMACIÓN DEL CLIENTE
      const OCustomerData = await this.customersServ.CGetCustomerByIDPromise( idRelation );

      if( OCustomerData != null ){

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "CLIENTE: " + OCustomerData.lastName + " " + OCustomerData.name }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "DIRECCIÓN: " + OCustomerData.address }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "TELEFONO: " + OCustomerData.tel }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

      }


      oLines = [];
      var oLine: any = { aling: "Left", size: 7, style: "Bold", text: "DESCRIPCIÓN", iWith: 60 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: "SALDO", iWith: 40 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 9, text: 'Dinero Electrónico', iWith: 60 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 9, text: USDollar.format( iPayments ), iWith: 40 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

    }
    else if(type == "codigoBarras"){

      var oProduct = await this.productsServ.CGetProductByIDPromise( idRelation )
      console.log(oProduct)

      var sCodeProduct = '';
      sCodeProduct += this.safeSubstring(oProduct.groupDesc, 0, 1);
      sCodeProduct += this.safeSubstring(oProduct.familyDesc, 0, 2);
      sCodeProduct += oProduct.qualityValue > 0 ? oProduct.qualityValue : '';
      sCodeProduct += this.safeSubstring(oProduct.originDesc, 0, 1);
      sCodeProduct += oProduct.gramos > 0 ? oProduct.gramos : '';

      console.log(sCodeProduct)

      sBarCode = oProduct.barCode;

      oLines = [];
      var oLine: any = { aling: "Center", size: 6, style: "Regular", text: sCodeProduct, iWith: 33 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 6, style: "Regular", text: USDollar.format( oProduct.price ), iWith: 33 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

    }
    // else if(type == "calification"){

    //   const sale = await this.salesServ.CGetSaleByIDPromise( idRelation );

    //   console.log(sale);

    //   // CONSTRUYO EL HEADER
    //   const HeaderSuc = await this.sucursalesServ.CGetPrintTicketSuc( sale.data.idSucursal, "Header");

    //   var oLines: any = [];

    //   oLines = [];
    //   var oLine: any = { aling: "Center", size: 15, text: "NOTA: " + sale.data.saleTypeDesc }
    //   oLines.push( oLine );
    //   oLinesP.push( { oLines: oLines } );

    //   oLines = [];
    //   var oLine: any = { aling: "Left", size: 7, text: " " }
    //   oLines.push( oLine );
    //   oLinesP.push( { oLines: oLines } );

    //   oLines = [];
    //   var oLine: any = { aling: "Center", size: 15, text: "Folio: #" + sale.data.idSale }
    //   oLines.push( oLine );
    //   oLinesP.push( { oLines: oLines } );

    //   oLines = [];
    //   var oLine: any = { aling: "Left", size: 7, text: " " }
    //   oLines.push( oLine );
    //   oLinesP.push( { oLines: oLines } );

    //   // AGREGO LA INFORMACIÓN DEL CLIENTE
    //   const OCustomerData = await this.customersServ.CGetCustomerByIDPromise( sale.data.idCustomer );

    //   if( OCustomerData != null ){

    //     oLines = [];
    //     var oLine: any = { aling: "Left", size: 7, text: "CLIENTE: " + OCustomerData.lastName + " " + OCustomerData.name }
    //     oLines.push( oLine );
    //     oLinesP.push( { oLines: oLines } );

    //     oLines = [];
    //     var oLine: any = { aling: "Left", size: 7, text: "DIRECCIÓN: " + OCustomerData.address }
    //     oLines.push( oLine );
    //     oLinesP.push( { oLines: oLines } );

    //     oLines = [];
    //     var oLine: any = { aling: "Left", size: 7, text: "TELEFONO: " + OCustomerData.tel }
    //     oLines.push( oLine );
    //     oLinesP.push( { oLines: oLines } );

    //     oLines = [];
    //     var oLine: any = { aling: "Left", size: 7, text: " " }
    //     oLines.push( oLine );
    //     oLinesP.push( { oLines: oLines } );
    //   }

    //   // AGREGO LA INFORMACIÓN DELA OPERACIÓN
    //   if( sale != null ){

    //     oLines = [];
    //     var oLine: any = { aling: "Center", size: 7, text: "OPERACIÓN: Venta de " + sale.data.saleTypeDesc }
    //     oLines.push( oLine );
    //     oLinesP.push( { oLines: oLines } );

    //     oLines = [];
    //     var oLine: any = { aling: "Left", size: 7, text: "Folio: #" + sale.data.idSale }
    //     oLines.push( oLine );
    //     oLinesP.push( { oLines: oLines } );

    //     oLines = [];
    //     var oLine: any = { aling: "Left", size: 7, text: "FECHA: " + sale.data.createDateString }
    //     oLines.push( oLine );
    //     oLinesP.push( { oLines: oLines } );

    //     oLines = [];
    //     var oLine: any = { aling: "Left", size: 7, text: "ATENDIÓ: " + sale.data.sellerDesc }
    //     oLines.push( oLine );
    //     oLinesP.push( { oLines: oLines } );

    //     oLines = [];
    //     var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
    //     oLines.push( oLine );
    //     oLinesP.push( { oLines: oLines } );

    //   }

    //   oLines = [];
    //   var oLine: any = { aling: "Center", size: 10, text: "De manera honesta, me gustaría que calificara mi servicio. Su opinión es muy importante para nosotros. ¡Gracias!" }
    //   oLines.push( oLine );
    //   oLinesP.push( { oLines: oLines } );


    //   oLines = [];
    //   var oLine: any = { bImage: true  }
    //   oLines.push( oLine );
    //   oLinesP.push( { oLines: oLines } );

    // }



    if(idPrinter > 0){

      var oPrinterData = await this.printersServ.CGetPrinterByIDPromise( idPrinter );

      if( oPrinterData.status == 0 && oLinesP.length > 0 ){

        let oPrinter: any = {
          printerName: oPrinterData.data.printerName,
          maxMargen: oPrinterData.data.maxMargen,
          sBarCode: sBarCode
        };

        let printParameters: any = {
          oPrinter: oPrinter,
          oLinesP: oLinesP
        }

        console.log(printParameters);

        for( var pri = 0; pri < iCopy; pri++ ){
          bOK = await this.CPrintTicketAwait( oPrinterData.data._api, printParameters );
        }

        return new Promise((resolve, reject) => {
          resolve( bOK )
        });

      }

    }


  }

  CPrintTicketAwait( _api:string, data : any ): Promise<any> {

    return new Promise((resolve, reject) => {

      this.http.post<ResponseGet>( `${ _api }/printTicket`, data)
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

  safeSubstring(input: string | null | undefined, start: number, length?: number): string {
    if (input == null || input == 'N/A') {
        return '';
    }

    return input.substring(start, length).toUpperCase();
  }

  base64VioletaIcon: string = "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"

}
