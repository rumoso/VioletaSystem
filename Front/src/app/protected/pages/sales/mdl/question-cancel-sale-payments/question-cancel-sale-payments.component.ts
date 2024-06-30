import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

@Component({
  selector: 'app-question-cancel-sale-payments',
  templateUrl: './question-cancel-sale-payments.component.html',
  styleUrls: ['./question-cancel-sale-payments.component.css']
})
export class QuestionCancelSalePaymentsComponent {

  bShowSpinner: boolean = false;

  paramsForm: any = {
    sOption: ''
  }

  constructor(
    private dialogRef: MatDialogRef<QuestionCancelSalePaymentsComponent>
    ,@Inject(MAT_DIALOG_DATA) public ODataP: any

    , private servicesGServ: ServicesGService
    , private authServ: AuthService

  ) { }

  fn_CerrarMDL( oResp: any ){
    this.dialogRef.close( oResp );
  }

}
