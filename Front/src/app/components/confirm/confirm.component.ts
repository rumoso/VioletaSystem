import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
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
  // (ver confirm.component.html) — mecanismo nativo del CDK. Flecha
  // izquierda/derecha mueve el foco entre los dos botones — atado
  // directo en cada botón con (keydown.arrowleft/right) en vez de un
  // HostListener del componente, mismo patrón ya usado en el resto del
  // sistema para atajos de teclado. El CSS marca con un anillo azul
  // cuál botón tiene el foco en cada momento.
  fn_focusNo() {
    this.btnNoRef?.nativeElement?.focus();
  }

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
