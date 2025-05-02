import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { PrintTicketService } from 'src/app/protected/services/print-ticket.service';
import { PrintersService } from 'src/app/protected/services/printers.service';
import { SalesService } from 'src/app/protected/services/sales.service';
import { UsersService } from 'src/app/protected/services/users.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-egresos-list',
  templateUrl: './egresos-list.component.html',
  styleUrls: ['./egresos-list.component.css']
})
export class EgresosListComponent {

// #region VARIABLES

private _appMain: string = environment.appMain;

idUserLogON: number = 0;

bShowSpinner: boolean = false;
oData: any[] = [];
panelOpenState: boolean = false;

egresoForm: any = {
  date: '',
  description: '',
  amount: 0
};

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

// #endregion

constructor(
  private servicesGServ: ServicesGService

  , private _adapter: DateAdapter<any>
  , @Inject(MAT_DATE_LOCALE) private _locale: string

  , private authServ: AuthService
  , private userServ: UsersService
  , private salesServ: SalesService
  , private printersServ: PrintersService
  , private printTicketServ: PrintTicketService
  ) { }

async ngOnInit() {

  this.authServ.checkSession();
  this.idUserLogON = await this.authServ.getIdUserSession();

  this._locale = 'mx';
  this._adapter.setLocale(this._locale);

  this.fn_getSelectPrintByIdUser( this.idUserLogON );
}



// #region MÉTODOS DEL FRONT

////************************************************ */
    // MÉTODOS DE PAGINACIÓN
    changePagination(pag: Pagination) {
      this.pagination = pag;
      this.fn_getEgresosListWithPage();
    }

    onChangeEvent(event: any){
      this.pagination.search = event.target.value;
      this.fn_getEgresosListWithPage();
    }
    ////************************************************ */

fn_btnRePrinter( idEgreso: any ){

  if( this.selectPrinter.idPrinter > 0 ){

    this.servicesGServ.showDialog('¿Estás seguro?'
    , 'Estás apunto de reimprimir'
    , '¿Desea continuar?'
    , 'Si', 'No')
    .afterClosed().subscribe({
      next: ( resp ) =>{

        if(resp){

          this.printTicketServ.printTicket("Egreso", idEgreso, this.selectPrinter.idPrinter, 1);

        }

      }

    });

  }

}

parametersForm_Clear(){

  this.egresoForm = {
    date: '',
    description: '',
    amount: 0
  };

  this.oData = [];

}

changeRoute( route: string ): void {
  this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
}

//#endregion






edit( id: number ){
  this.servicesGServ.changeRouteWithParameter(`/${ this._appMain }/editProduct`, id)
}


// #region CONEXIONES AL BACK

fn_getEgresosListWithPage() {

  this.oData = [];

  this.bShowSpinner = true;

  this.salesServ.CGetEgresosListWithPage( this.pagination, this.egresoForm )
  .subscribe({
    next: ( resp: any ) => {

      if(resp.status == 0){

        this.oData = resp.data.rows;
        this.pagination.length = resp.data.count;

      }

      this.bShowSpinner = false;

    },
    error: (err: any) => {
      this.bShowSpinner = false;
    }
  }  );

}

fn_getSelectPrintByIdUser( idUser: number ) {

  this.printersServ.CGetSelectPrinterByIdUser( idUser )
  .subscribe({

    next: ( resp: ResponseGet ) => {

      if( resp.status == 0 ){

        this.selectPrinter.idSucursal = resp.data.idSucursal;
        this.selectPrinter.idPrinter = resp.data.idPrinter;
        this.selectPrinter.printerName = resp.data.printerName;

      }
      else{

        this.selectPrinter.idSucursal = 0;
        this.selectPrinter.idPrinter = 0;
        this.selectPrinter.printerName = '';

      }

      console.log( resp );
    },
    error: (ex: HttpErrorResponse) => {
      this.servicesGServ.showSnakbar( ex.error.data );
    }

  })

}

// #endregion


}
