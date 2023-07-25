import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DDialog } from '../interfaces/general.interfaces';
import { ConfirmComponent } from '../components/confirm/confirm.component';
import { AlertComponent } from '../components/alert/alert.component';

@Injectable({
    providedIn: 'root'
  })
  export class ServicesGService {
  
    constructor(
      private _snackBar: MatSnackBar
      , private router: Router
      , public dialog: MatDialog
    ) { }
  
    _dDialog: DDialog = {
      header: '',
      message: '',
      question: '',
      buttonYes: '',
      buttonNo: ''
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
  
    showDialog( header: string, message: string, question: string, buttonYes: string, buttonNo: string ){
     
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

    showModalWithParams( component: any, params: any, width: string ){
      const dialog = this.dialog.open( component,{
        width: width,
        data: params
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

      if(showNavBar){
        this.showSnakbar( message )
      }
  
      return dialog;
    }
  }
  