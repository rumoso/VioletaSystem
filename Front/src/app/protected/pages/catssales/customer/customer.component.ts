import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
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
  idCustomer: number = 0;

  idUserLogON: number = 0;

  constructor(
    private servicesGServ: ServicesGService
    , private customerServ: CustomersService
    , private fb: FormBuilder
    , private router: Router
    , private activatedRoute: ActivatedRoute

    , private _adapter: DateAdapter<any>
    , @Inject(MAT_DATE_LOCALE) private _locale: string

    , private authServ: AuthService
    ) { }

    customerForm: FormGroup = this.fb.group({
      idCustomer: 0,
      createDate: '',
      name: ['',[ Validators.required ]],
      lastName: '',
      address: '',
      tel: '',
      eMail: '',
      active: true,
      idUser: 0
    });

    async ngOnInit() {
      this.authServ.checkSession();
      this.idUserLogON = await this.authServ.getIdUserSession();

      this._locale = 'mx';
      this._adapter.setLocale(this._locale);
  
      if( !this.router.url.includes('editCustomer') ){
        return;
      }
  
      this.bShowSpinner = true;
  
      this.activatedRoute.params
        .pipe(
          switchMap( ({ id }) => this.customerServ.CGetCustomerByID( id ) )
        )
        .subscribe( ( resp: any ) => {
          console.log(resp)
           if(resp.status == 0){
              
              this.idCustomer = resp.data.idCustomer;
  
             this.customerForm.setValue({
              idCustomer: resp.data.idCustomer,
              createDate: resp.data.createDate,
              name: resp.data.name,
              lastName: resp.data.lastName,
              address: resp.data.address,
              tel: resp.data.tel,
              eMail: resp.data.eMail,
              active: resp.data.active,
              idUser: this.idUserLogON
             });
  
  
             //this.fn_getHitorialClinicoByIdPaciente(this.id);
             //this.fn_getRolesByIdUser();
           }else{
            this.servicesGServ.showSnakbar(resp.message);
           }
           this.bShowSpinner = false;
        } )
  
    }

    changeRoute( route: string ): void {
      this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
    }

    fn_saveCustomer() {

      this.customerForm.get('idUser')?.setValue( this.idUserLogON );

      this.bShowSpinner = true;
  
      if(this.idCustomer > 0){
        this.customerServ.CUpdateCustomer( this.customerForm.value )
          .subscribe({
            next: (resp: ResponseDB_CRUD) => {
              
              this.servicesGServ.showSnakbar(resp.message);
              this.bShowSpinner = false;
  
            },
            error: (ex) => {
  
              this.servicesGServ.showSnakbar( "Problemas con el servicio" );
              this.bShowSpinner = false;
  
            }
          })
      }else{
      this.customerServ.CInsertCustomer( this.customerForm.value )
        .subscribe({
          next: (resp: ResponseDB_CRUD) => {
  
            if( resp.status === 0 ){
              this.idCustomer = resp.insertID;
  
              this.customerForm.get('idCustomer')?.setValue( resp.insertID );
  
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

}
