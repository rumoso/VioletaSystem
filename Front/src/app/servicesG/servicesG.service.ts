import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DDialog } from '../interfaces/general.interfaces';
import { ConfirmComponent } from '../components/confirm/confirm.component';
import { AlertComponent } from '../components/alert/alert.component';
import { Overlay } from '@angular/cdk/overlay';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { ColumnFormat } from '../protected/interfaces/global.interfaces';

@Injectable({
    providedIn: 'root'
  })
  export class ServicesGService {
  
    constructor(
      private _snackBar: MatSnackBar
      , private router: Router
      , public dialog: MatDialog
      , private overlay: Overlay
    ) { }
  
    _dDialog: DDialog = {
      header: '',
      message: '',
      question: '',
      buttonYes: '',
      buttonNo: ''
    }

    // exportToExcel(data: any[], filename: string): void {
    //   const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    //   const wb: XLSX.WorkBook = XLSX.utils.book_new();
    //   XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    //   const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    //   const blob: Blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    //   saveAs(blob, filename);
    // }

    exportToExcel(data: any[], filename: string, columnFormats?: ColumnFormat[]): void {
      const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
  
      // Aplicar formatos a columnas completas si se proporcionan
      if (columnFormats) {
        this.applyColumnFormats(ws, columnFormats);
      }

      const columnWidths = this.calculateColumnWidths(data);
      ws['!cols'] = columnWidths;

      // Configurar protección de la hoja directamente en la hoja de trabajo
      ws['!protect'] = {
        password: 'Violeta2024', // Define una contraseña si es necesario
        formatCells: false,
        formatColumns: false,
        formatRows: false,
        insertColumns: false,
        insertRows: false,
        insertHyperlinks: false,
        deleteColumns: false,
        deleteRows: false,
      };

      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  
      const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob: Blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, filename);
    }
  
    private applyColumnFormats(ws: XLSX.WorkSheet, columnFormats: ColumnFormat[]): void {
      columnFormats.forEach((format) => {
        const { col, numberFormat, currencyFormat, textAlignment } = format;
  
        // Aplicar formato a todas las celdas de la columna
        for (let row = 1; row <= XLSX.utils.decode_range(ws['!ref']!).e.r; ++row) {
          const cellAddress = { r: row, c: col };
          const cell = ws[XLSX.utils.encode_cell(cellAddress)];
  
          // Aplicar formato según las opciones proporcionadas para la columna específica
          if (numberFormat) {
            cell.z = numberFormat;
          }
  
          if (currencyFormat) {
            cell.z = '$#,##0.00';
          }
  
          if (textAlignment) {
            cell.s = { alignment: { horizontal: textAlignment } };
          }
        }
      });
    }

    private calculateColumnWidths(data: any[]): XLSX.ColInfo[] {
      const columnWidths: XLSX.ColInfo[] = [];
  
      if (data.length > 0) {
        const keys = Object.keys(data[0]);
        
        keys.forEach((key) => {
          const maxColumnLength = Math.max(...data.map((row) => row[key]?.toString().length || 0));
          const adjustedWidth = maxColumnLength > 10 ? maxColumnLength + 2 : 10; // Ajuste adicional para asegurar un ancho mínimo
          columnWidths.push({ wch: adjustedWidth });
        });
      }
  
      return columnWidths;
    }
  
  

  
    showSnakbar( text: string ): void {
      this._snackBar.open( text, 'Close',{
        duration: 2500
      } )
    }
  
    changeRoute( route: string ): void {
      this.router.navigate( [route] );
    }
  
    changeRouteWithParameter( route: string, parameter : number ): void {
      this.router.navigate( [route, parameter] );
    }
  
    showDialog( header: string, message: string, question: string, buttonYes: string, buttonNo: string, sWidth: string = '250px' ){
     
      this._dDialog.header = header;
      this._dDialog.message = message;
      this._dDialog.question = question;
      this._dDialog.buttonYes = buttonYes;
      this._dDialog.buttonNo = buttonNo;
  
      const dialog = this.dialog.open( ConfirmComponent,{
        width: sWidth,
        data: this._dDialog
      } )
  
      return dialog;
    }

    showModalWithParams( component: any, params: any, width: string ){
      const scrollStrategy = this.overlay.scrollStrategies.reposition();
      const dialog = this.dialog.open( component,{
        width: width,
        data: params,
        autoFocus: false,
        maxHeight: '100vh', //you can adjust the value as per your view
        maxWidth: '190vh'
      } )
  
      return dialog;
    }
  
    showMDL( header: string, message: string, question: string, buttonYes: string, buttonNo: string ){
     
      this._dDialog.header = header;
      this._dDialog.message = message;
      this._dDialog.question = question;
      this._dDialog.buttonYes = buttonYes;
      this._dDialog.buttonNo = buttonNo;
  
      const dialog = this.dialog.open( ConfirmComponent,{
        width: '250px',
        data: this._dDialog
      } )
  
      return dialog;
    }

    showAlert( type: string, header: string, message: string, showNavBar: boolean = false ){
     
      let paramsAlert: any = {
        type: type,
        header: header,
        message: message
      }

      const dialog = this.dialog.open( AlertComponent,{
        width: 'auto',
        data: paramsAlert
      } )

      // if(showNavBar){
      //   this.showSnakbar( message )
      // }
  
      return dialog;
    }

    showAlertIA( resp: any, bShowTrue: boolean = true ){

      var type = resp.status == 0 ? 'S' : 'W';
      var header = resp.status == 0 ? 'OK!' : 'Alerta!';
      var message = resp.message;
     
      let paramsAlert: any = {
        type: type,
        header: header,
        message: message
      }

      if( resp.status != 0 || bShowTrue ){
        const dialog = this.dialog.open( AlertComponent,{
          width: 'auto',
          data: paramsAlert
        } )

        return dialog;
      }
      else{
        return false;
      }
      
    }

    Unidades( num: number){

      switch(num)
      {
          case 1: return "UN";
          case 2: return "DOS";
          case 3: return "TRES";
          case 4: return "CUATRO";
          case 5: return "CINCO";
          case 6: return "SEIS";
          case 7: return "SIETE";
          case 8: return "OCHO";
          case 9: return "NUEVE";
      }
  
      return "";
  }//Unidades()
  
  Decenas( num: any ){
  
      var decena = Math.floor(num/10);
      var unidad = num - (decena * 10);
  
      switch(decena)
      {
          case 1:
              switch(unidad)
              {
                  case 0: return "DIEZ";
                  case 1: return "ONCE";
                  case 2: return "DOCE";
                  case 3: return "TRECE";
                  case 4: return "CATORCE";
                  case 5: return "QUINCE";
                  default: return "DIECI" + this.Unidades(unidad);
              }
          case 2:
              switch(unidad)
              {
                  case 0: return "VEINTE";
                  default: return "VEINTI" + this.Unidades(unidad);
              }
          case 3: return this.DecenasY("TREINTA", unidad);
          case 4: return this.DecenasY("CUARENTA", unidad);
          case 5: return this.DecenasY("CINCUENTA", unidad);
          case 6: return this.DecenasY("SESENTA", unidad);
          case 7: return this.DecenasY("SETENTA", unidad);
          case 8: return this.DecenasY("OCHENTA", unidad);
          case 9: return this.DecenasY("NOVENTA", unidad);
          case 0: return this.Unidades(unidad);
          default: return ""
      }
  }//Unidades()
  
  DecenasY(strSin: string, numUnidades: number) {
      if (numUnidades > 0)
      return strSin + " Y " + this.Unidades(numUnidades)
  
      return strSin;
  }//DecenasY()
  
  Centenas( num:number ) {
      var centenas = Math.floor(num / 100);
      var decenas = num - (centenas * 100);
  
      switch(centenas)
      {
          case 1:
              if (decenas > 0)
                  return "CIENTO " + this.Decenas(decenas);
              return "CIEN";
          case 2: return "DOSCIENTOS " + this.Decenas(decenas);
          case 3: return "TRESCIENTOS " + this.Decenas(decenas);
          case 4: return "CUATROCIENTOS " + this.Decenas(decenas);
          case 5: return "QUINIENTOS " + this.Decenas(decenas);
          case 6: return "SEISCIENTOS " + this.Decenas(decenas);
          case 7: return "SETECIENTOS " + this.Decenas(decenas);
          case 8: return "OCHOCIENTOS " + this.Decenas(decenas);
          case 9: return "NOVECIENTOS " + this.Decenas(decenas);
      }
  
      return this.Decenas(decenas);
  }//Centenas()
  
  Seccion(num: number, divisor: number, strSingular: string, strPlural: string) {
      var cientos = Math.floor(num / divisor)
      var resto = num - (cientos * divisor)
  
      var letras = "";
  
      if (cientos > 0)
          if (cientos > 1)
              letras = this.Centenas(cientos) + " " + strPlural;
          else
              letras = strSingular;
  
      if (resto > 0)
          letras += "";
  
      return letras;
  }//Seccion()
  
  Miles( num: number ) {
      var divisor = 1000;
      var cientos = Math.floor(num / divisor)
      var resto = num - (cientos * divisor)
  
      var strMiles = this.Seccion(num, divisor, "UN MIL", "MIL");
      var strCentenas = this.Centenas(resto);
  
      if(strMiles == "")
          return strCentenas;
  
      return strMiles + " " + strCentenas;
  }//Miles()
  
  Millones( num: number ) {
      var divisor = 1000000;
      var cientos = Math.floor(num / divisor)
      var resto = num - (cientos * divisor)
  
      let strMillones = this.Seccion(num, divisor, this.millon(num, true), this.millon(num, false));
      var strMiles = this.Miles(resto);
  
      if(strMillones == "")
          return strMiles;
  
      return strMillones + " " + strMiles;
  }//Millones()

  millon( num: number, singular: boolean) {
    var letraMillon = '';
    if (singular == true)
        letraMillon = 'UN MILLON';
    else
        letraMillon = 'MILLONES'
    if (num % 1000000 == 0)
        letraMillon = letraMillon + ' DE'
    return letraMillon;
}
  
  NumeroALetras( num: number ) {
      var data = {
          numero: num,
          enteros: Math.floor(num),
          centavos: (((Math.round(num * 100)) - (Math.floor(num) * 100))),
          letrasCentavos: "",
          letrasMonedaPlural: 'PESOS',//"PESOS", 'Dólares', 'Bolívares', 'etcs'
          letrasMonedaSingular: 'PESO', //"PESO", 'Dólar', 'Bolivar', 'etc'
  
          letrasMonedaCentavoPlural: "CENTAVOS",
          letrasMonedaCentavoSingular: "CENTAVO"
      };
  
      if (data.centavos > 0) {
          data.letrasCentavos = "CON " + 
          (data.centavos == 1) ? this.Millones(data.centavos) + " " + data.letrasMonedaCentavoSingular
          : this.Millones(data.centavos) + " " + data.letrasMonedaCentavoPlural;
      };
  
      if(data.enteros == 0)
          return "CERO " + data.letrasMonedaPlural + " " + data.letrasCentavos + " 00/100 M.N";
      if (data.enteros == 1)
          return this.Millones(data.enteros) + " " + data.letrasMonedaSingular + " " + data.letrasCentavos + " 00/100 M.N";
      else
          return this.Millones(data.enteros) + " " + data.letrasMonedaPlural + " " + data.letrasCentavos + " 00/100 M.N";
  }//NumeroALetras()
  }
  