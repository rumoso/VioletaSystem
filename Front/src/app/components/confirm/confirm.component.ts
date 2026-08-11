import { Component, ElementRef, HostListener, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DDialog } from 'src/app/interfaces/general.interfaces';

@Component({
  selector: 'app-confirm',
  templateUrl: './confirm.component.html',
  styleUrls: ['./confirm.component.css']
})
export class ConfirmComponent implements OnInit {

  @ViewChild('btnSi') btnSiRef!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnNo') btnNoRef!: ElementRef<HTMLButtonElement>;

  constructor(
    private dialogRef: MatDialogRef<ConfirmComponent>
    ,@Inject(MAT_DIALOG_DATA) public data: DDialog
  ) { }

  ngOnInit(): void {
  }

  // El foco inicial en "Sí" lo pone `cdkFocusInitial` en el propio botón
  // (ver confirm.component.html) — es el mecanismo del CDK diseñado
  // para esto, ya sincronizado con la apertura del dialog (a diferencia
  // de un setTimeout o de suscribirse a afterOpened() a mano, que puede
  // perderse la emisión si el dialog ya abrió antes de suscribirse).
  // Flecha izquierda/derecha mueve el foco entre los dos botones, y el
  // CSS marca con un anillo azul cuál lo tiene en cada momento.
  @HostListener('keydown.arrowleft')
  fn_focusNo() {
    this.btnNoRef?.nativeElement?.focus();
  }

  @HostListener('keydown.arrowright')
  fn_focusSi() {
    this.btnSiRef?.nativeElement?.focus();
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
