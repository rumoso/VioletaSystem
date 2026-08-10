import { Component, ElementRef, HostListener, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { DDialog } from 'src/app/interfaces/general.interfaces';

@Component({
  selector: 'app-confirm',
  templateUrl: './confirm.component.html',
  styleUrls: ['./confirm.component.css']
})
export class ConfirmComponent implements OnInit, OnDestroy {

  @ViewChild('btnSi') btnSiRef!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnNo') btnNoRef!: ElementRef<HTMLButtonElement>;

  private afterOpenedSub: Subscription | null = null;

  constructor(
    private dialogRef: MatDialogRef<ConfirmComponent>
    ,@Inject(MAT_DIALOG_DATA) public data: DDialog
  ) { }

  // "Sí" enfocado por default: Enter confirma de una — es la acción más
  // común. Flecha izquierda/derecha mueve el foco entre los dos
  // botones (mismo patrón que un grupo de opciones), y el CSS marca
  // con un anillo azul cuál tiene el foco en cada momento. El autoFocus
  // de Material está desactivado (ver servicesG.service.ts) — se
  // espera a `afterOpened()` en vez de un timer a ciegas, porque la
  // animación de apertura del dialog puede tardar más que un
  // setTimeout(0) y pisar el foco si se pone antes de tiempo.
  ngOnInit(): void {
    this.afterOpenedSub = this.dialogRef.afterOpened().subscribe(() => {
      this.btnSiRef?.nativeElement?.focus();
    });
  }

  ngOnDestroy(): void {
    this.afterOpenedSub?.unsubscribe();
  }

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
