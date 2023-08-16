import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { CustomersService } from 'src/app/protected/services/customers.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';
import { CustomerComponent } from '../customer/customer.component';
import { ElectronicMoneyMDLComponent } from '../mdl/electronic-money-mdl/electronic-money-mdl.component';

@Component({
  selector: 'app-customer-list',
  templateUrl: './customer-list.component.html',
  styleUrls: ['./customer-list.component.css']
})
export class CustomerListComponent implements OnInit {
  
  private _appMain: string = environment.appMain;

  constructor(
    private servicesGServ: ServicesGService
    , private fb: FormBuilder

    , private _adapter: DateAdapter<any>
    , @Inject(MAT_DATE_LOCALE) private _locale: string

    , private authServ: AuthService

    , private customersServ: CustomersService
    ) { }
    

  ngOnInit(): void {

    this.authServ.checkSession();

    this._locale = 'mx';
    this._adapter.setLocale(this._locale);

    this.fn_getCustomersListWithPage();
  }

  ////************************************************ */
    // MÉTODOS DE PAGINACIÓN
    changePagination(pag: Pagination) {
      this.pagination = pag;
      this.fn_getCustomersListWithPage();
    }

    onChangeEvent(event: any){
      this.pagination.search = event.target.value;
      this.fn_getCustomersListWithPage();
    }
    ////************************************************ */

    changeRoute( route: string ): void {
      this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
    }

  title = 'Lista de Clientes';
  bShowSpinner: boolean = false;
  catlist: any[] = [];

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

  parametersForm: FormGroup = this.fb.group({
    createDateStart: '',
    createDateEnd: '',
    name: '',
    lastName: ''
  });

  showCustomerCat( id: number ){

    var OParamsIN: any = {
      id: id
    }

    this.servicesGServ.showModalWithParams( CustomerComponent, OParamsIN, '1500px')
    .afterClosed().subscribe({
      next: ( resp: any ) =>{

        this.fn_getCustomersListWithPage();
        
      }
    });
  }

  fn_getCustomersListWithPage() {

    this.bShowSpinner = true;
    this.customersServ.CGetCustomersListWithPage( this.pagination, this.parametersForm.value )
    .subscribe({
      next: (resp: ResponseGet) => {
        console.log(resp)
        this.catlist = resp.data.rows;
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

  fn_deleteCustomer( idCustomer: number ){

    this.servicesGServ.showDialog('¿Estás seguro?'
                                      , 'Está a punto de borrar el cliente'
                                      , '¿Desea continuar?'
                                      , 'Si', 'No')
    .afterClosed().subscribe({
      next: ( resp ) =>{
        if(resp){
          this.bShowSpinner = true;
          
          this.customersServ.CDeleteCustomer( idCustomer )
          .subscribe({
            next: (resp: ResponseDB_CRUD) => {
              if( resp.status === 0 ){
                this.fn_getCustomersListWithPage();
              }
              this.servicesGServ.showSnakbar(resp.message);
              this.bShowSpinner = false;
            },
            error: (ex: HttpErrorResponse) => {
              console.log( ex )
              this.servicesGServ.showSnakbar( ex.error.data );
              this.bShowSpinner = false;
            }
      
          })

        }
      }
    });
  }

  parametersForm_Clear(){
    this.parametersForm.get('createDateStart')?.setValue( '' );
    this.parametersForm.get('createDateEnd')?.setValue( '' );
    this.parametersForm.get('name')?.setValue( '' );
    this.parametersForm.get('lastName')?.setValue( '' );

    this.fn_getCustomersListWithPage();
  }

  edit( id: number ){
    this.servicesGServ.changeRouteWithParameter(`/${ this._appMain }/editCustomer`, id)
  }

  fn_ShowAddElectronicMoney( idCustomer: number ){

    var paramsMDL: any = {
      idCustomer: idCustomer
    }
  
    this.servicesGServ.showModalWithParams( ElectronicMoneyMDLComponent, paramsMDL, '1500px')
    .afterClosed().subscribe({
      next: ( resp ) =>{
  
        this.fn_getCustomersListWithPage();
        
      }
    });
  
  }

}