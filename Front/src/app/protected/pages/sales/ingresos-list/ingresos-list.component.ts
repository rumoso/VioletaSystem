import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { PrintTicketService } from 'src/app/protected/services/print-ticket.service';
import { PrintersService } from 'src/app/protected/services/printers.service';
import { SalesService } from 'src/app/protected/services/sales.service';
import { UsersService } from 'src/app/protected/services/users.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { PageTitleService } from 'src/app/protected/services/page-title.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-ingresos-list',
  templateUrl: './ingresos-list.component.html',
  styleUrls: ['./ingresos-list.component.css']
})
export class IngresosListComponent implements OnInit, OnDestroy {

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
  length: 0,
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
  , private pageTitleServ: PageTitleService
  ) { }

ngOnDestroy(): void {
  this.pageTitleServ.clear();
}

async ngOnInit() {

  this.authServ.checkSession();
  this.pageTitleServ.set('attach_money', 'Ingresos', 'Entradas de dinero registradas en caja');
  this.idUserLogON = await this.authServ.getIdUserSession();

  this._locale = 'mx';
  this._adapter.setLocale(this._locale);

  this.fn_getIngresosListWithPage();
  this.fn_getSelectPrintByIdUser( this.idUserLogON );
}



// #region MÉTODOS DEL FRONT

////************************************************ */
    // MÉTODOS DE PAGINACIÓN
    changePagination(pag: Pagination) {
      this.pagination = pag;
      this.fn_getIngresosListWithPage();
    }

    onChangeEvent(event: any){
      this.pagination.search = event.target.value;
      this.fn_getIngresosListWithPage();
    }
    ////************************************************ */

fn_btnRePrinter( idIngreso: any ){

  if( this.selectPrinter.idPrinter > 0 ){

    this.servicesGServ.showDialog('¿Estás seguro?'
    , 'Estás apunto de reimprimir'
    , '¿Desea continuar?'
    , 'Si', 'No')
    .afterClosed().subscribe({
      next: ( resp ) =>{

        if(resp){

          this.printTicketServ.printTicket("Ingreso", idIngreso, this.selectPrinter.idPrinter, 1);

        }

      }

    });

  }

}

// Buscar desde el botón o con Enter: siempre desde la primera página.
fn_buscar(){

  this.pagination.pageIndex = 0;
  this.fn_getIngresosListWithPage();

}

fn_ClearFilters(){

  this.egresoForm = {
    date: '',
    description: '',
    amount: 0
  };

  this.fn_buscar();

}

changeRoute( route: string ): void {
  this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
}

//#endregion






edit( id: number ){
  this.servicesGServ.changeRouteWithParameter(`/${ this._appMain }/editProduct`, id)
}


// #region CONEXIONES AL BACK

fn_getIngresosListWithPage() {

  this.oData = [];

  this.bShowSpinner = true;

  // La fecha viaja como 'YYYY-MM-DD' (input type="date"): el SP compara
  // CAST(createDate AS DATE) contra un solo día. Se manda una copia para que
  // el servicio no ensucie el formulario con search/start/limiter.
  let OServParams: any = {
    date: this.egresoForm.date || ''
    , description: ( this.egresoForm.description || '' ).trim()
    , amount: this.egresoForm.amount || 0
  }

  this.salesServ.CGetIngresosListWithPage( this.pagination, OServParams )
  .subscribe({
    next: ( resp: any ) => {

      if(resp.status == 0){

        this.oData = resp.data.rows || [];
        this.pagination.length = resp.data.count || 0;

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
