import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DDialog } from 'src/app/interfaces/general.interfaces';

@Component({
  selector: 'app-confirm',
  templateUrl: './confirm.component.html',
  styleUrls: ['./confirm.component.css']
})
export class ConfirmComponent implements OnInit {

  constructor(
    private dialogRef: MatDialogRef<ConfirmComponent>
    ,@Inject(MAT_DIALOG_DATA) public data: DDialog
  ) { }

  ngOnInit(): void {
  }

  bClicked: boolean = false;
  delete(){
    if(this.bClicked) return;

    this.bClicked = true;
    this.dialogRef.close(true);
  }

  close(){
    this.dialogRef.close();
  }

}
