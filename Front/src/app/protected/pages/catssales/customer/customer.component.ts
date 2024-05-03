import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { CustomersService } from 'src/app/protected/services/customers.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.css']
})
export class CustomerComponent implements OnInit {

  private _appMain: string = environment.appMain;

  title: string = 'Cliente';
  bShowSpinner: boolean = false;
  id: number = 0;
  name: string = '';

  idUserLogON: number = 0;

  isMDL: boolean = false;

  constructor(
    private dialogRef: MatDialogRef<CustomerComponent>
    ,@Inject(MAT_DIALOG_DATA) public OParamsData: any

    , private servicesGServ: ServicesGService
    , private customerServ: CustomersService
    , private fb: FormBuilder
    , private router: Router
    , private activatedRoute: ActivatedRoute

    , private _adapter: DateAdapter<any>
    , @Inject(MAT_DATE_LOCALE) private _locale: string

    , private authServ: AuthService
    ) { }

    customerForm: any = {
      idCustomer: 0,
      createDate: '',
      name: '',
      lastName: '',
      address: '',
      tel: '',
      eMail: '',
      active: true,
      idUser: 0
    };

    async ngOnInit() {
      this.authServ.checkSession();
      this.idUserLogON = await this.authServ.getIdUserSession();

      this._locale = 'mx';
      this._adapter.setLocale(this._locale);

      if( this.OParamsData.id > 0 ){

        this.bShowSpinner = true;

        this.customerServ.CGetCustomerByID( this.OParamsData.id )
          .subscribe( ( resp: any ) => {

             if(resp.status == 0){

                this.id = resp.data.idCustomer;

               this.customerForm = {
                idCustomer: resp.data.idCustomer,
                createDate: resp.data.createDate,
                name: resp.data.name,
                lastName: resp.data.lastName,
                address: resp.data.address,
                tel: resp.data.tel,
                eMail: resp.data.eMail,
                active: resp.data.active,
                idUser: this.idUserLogON
               };

               this.name = this.event_getDescCustomer();


             }else{
              this.servicesGServ.showSnakbar(resp.message);
             }
             this.bShowSpinner = false;
          } );

      }

      setTimeout (() => {
        this.ev_fn_nextInput_keyup_enter( 'tbxLastName' );
      }, 500);

    }

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////

ev_fn_nextInput_keyup_enter( idInput: any ){
  //console.log(150)
  setTimeout (() => {
    // idInput.nativeElement.focus();
    var miElemento = document.getElementById( idInput )!.focus();
  }, 100);

}

fn_validForm(){
  var bOK = false

  if( this.customerForm.name.length > 0){
    bOK = true;
  }

  return bOK;
}

close(){

  var bOK = this.id > 0;

  var OParamsOut: any = {
    bOK: bOK,
    id: this.id,
    name: this.name
  }

  this.dialogRef.close( OParamsOut );
}

public inputFocus(idInput: any) {
  if(idInput != null) { // PRESS ENTER
    idInput.focus();
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

    changeRoute( route: string ): void {
      this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
    }

    fn_saveCustomer() {

      this.customerForm.idUser = this.idUserLogON;

      this.bShowSpinner = true;

      if( this.id > 0 ){
        this.customerServ.CUpdateCustomer( this.customerForm )
          .subscribe({
            next: (resp: ResponseDB_CRUD) => {

              if( resp.status === 0 ){
                this.servicesGServ.showAlertIA( resp );
                this.name = this.event_getDescCustomer();

                this.close();
              }

              this.bShowSpinner = false;

            },
            error: (ex) => {

              this.servicesGServ.showSnakbar( "Problemas con el servicio" );
              this.bShowSpinner = false;

            }
          })
      }else{
      this.customerServ.CInsertCustomer( this.customerForm )
        .subscribe({
          next: (resp: ResponseDB_CRUD) => {

            if( resp.status === 0 ){
              this.id = resp.insertID;
              this.name = this.event_getDescCustomer();

              this.customerForm.idCustomer = resp.insertID;

              this.servicesGServ.showAlertIA( resp );

              this.close();

            }


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
// SECCIÓN DE EVENTOS
//////////////////////////////////////////////////////////////////////////////////////////////////

event_getDescCustomer(): string{

  return this.customerForm.lastName
  + ' ' + this.customerForm.name
  + ' - ' + this.customerForm.tel
  + ' - ' + this.customerForm.address

}

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE EVENTOS
//////////////////////////////////////////////////////////////////////////////////////////////////

}
