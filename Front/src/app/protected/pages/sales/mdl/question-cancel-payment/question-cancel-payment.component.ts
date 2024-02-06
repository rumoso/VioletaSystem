import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { SalesService } from 'src/app/protected/services/sales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

@Component({
  selector: 'app-question-cancel-payment',
  templateUrl: './question-cancel-payment.component.html',
  styleUrls: ['./question-cancel-payment.component.css']
})
export class QuestionCancelPaymentComponent {

  bShowSpinner: boolean = false;

  paramsForm: any = {
    sOption: ''
  }

  constructor(
    private dialogRef: MatDialogRef<QuestionCancelPaymentComponent>
    ,@Inject(MAT_DIALOG_DATA) public ODataP: any
  
    , private servicesGServ: ServicesGService
    , private authServ: AuthService
  
  ) { }

  fn_CerrarMDL( oResp: any ){
    this.dialogRef.close( oResp );
  }

}
