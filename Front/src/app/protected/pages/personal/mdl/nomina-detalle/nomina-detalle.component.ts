import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { NominaService } from 'src/app/protected/services/nomina.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { NominaReciboComponent } from '../nomina-recibo/nomina-recibo.component';

// Detalle de una corrida de nómina (analisis/007): tabla de empleados
// con su neto, acciones según estatus/permisos (excluir, pagar,
// cancelar), y acceso al recibo de cada empleado.

@Component({
  selector: 'app-nomina-detalle',
  templateUrl: './nomina-detalle.component.html',
  styleUrls: ['../../personal-catalogo-list/personal-catalogo-list.component.css', './nomina-detalle.component.css']
})
export class NominaDetalleComponent implements OnInit {

  id: number = 0;
  bShowSpinner: boolean = false;
  nomina: any = null;
  recibos: any[] = [];
  huboCambios: boolean = false;

  constructor(
    private dialogRef: MatDialogRef<NominaDetalleComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any

    , private authServ: AuthService
    , private servicesGServ: ServicesGService
    , private nominaServ: NominaService
    ) { }

  ngOnInit(): void {
    this.id = this.ODataP.id;
    this.fn_cargar();
  }

  fn_hasPermission( name: string ): boolean {
    return this.authServ.hasPermissionAction(name);
  }

  private fn_cargar() {

    this.bShowSpinner = true;
    this.nominaServ.CGetDetalle(this.id)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.bShowSpinner = false;
          if (resp.status === 0) {
            this.nomina = resp.data.nomina;
            this.recibos = resp.data.recibos;
          }
        },
        error: () => { this.bShowSpinner = false; }
      });
  }

  fn_abrirRecibo( recibo: any ) {

    this.servicesGServ.showModalWithParams(NominaReciboComponent, { idNominaRecibo: recibo.id }, '620px')
    .afterClosed().subscribe({
      next: () => {
        this.huboCambios = true;
        this.fn_cargar();
      }
    });
  }

  fn_excluir( recibo: any ) {

    this.servicesGServ.showDialog('¿Estás seguro?'
      , `Está a punto de excluir a "${ recibo.nombreEmpleado }" de esta nómina`
      , '¿Desea continuar?'
      , 'Si', 'No')
    .afterClosed().subscribe({
      next: (resp) => {
        if (resp) {
          this.bShowSpinner = true;
          this.nominaServ.CExcluirRecibo(recibo.id)
            .subscribe({
              next: (resp2: any) => {
                this.servicesGServ.showSnakbar(resp2.message);
                this.bShowSpinner = false;
                if (resp2.status === 0) {
                  this.huboCambios = true;
                  this.fn_cargar();
                }
              },
              error: (ex: HttpErrorResponse) => {
                console.log(ex)
                this.servicesGServ.showSnakbar('Problemas con el servicio');
                this.bShowSpinner = false;
              }
            });
        }
      }
    });
  }

  fn_pagar() {

    this.servicesGServ.showDialog('¿Confirmar pago?'
      , `Está a punto de pagar esta nómina por un total de ${ this.nomina.totalNeto } (neto). Después de pagar no se puede editar.`
      , '¿Desea continuar?'
      , 'Si', 'No')
    .afterClosed().subscribe({
      next: (resp) => {
        if (resp) {
          this.bShowSpinner = true;
          this.nominaServ.CPagar(this.id)
            .subscribe({
              next: (resp2: any) => {
                this.servicesGServ.showSnakbar(resp2.message);
                this.bShowSpinner = false;
                if (resp2.status === 0) {
                  this.huboCambios = true;
                  this.fn_cargar();
                }
              },
              error: (ex: HttpErrorResponse) => {
                console.log(ex)
                this.servicesGServ.showSnakbar('Problemas con el servicio');
                this.bShowSpinner = false;
              }
            });
        }
      }
    });
  }

  fn_cancelar() {

    const motivo = window.prompt('Motivo para cancelar esta nómina pagada:');

    if (motivo === null) {
      return;
    }
    if (!motivo.trim()) {
      this.servicesGServ.showSnakbar('El motivo es obligatorio.');
      return;
    }

    this.bShowSpinner = true;
    this.nominaServ.CCancelar(this.id, motivo.trim())
      .subscribe({
        next: (resp2: any) => {
          this.servicesGServ.showSnakbar(resp2.message);
          this.bShowSpinner = false;
          if (resp2.status === 0) {
            this.huboCambios = true;
            this.fn_cargar();
          }
        },
        error: (ex: HttpErrorResponse) => {
          console.log(ex)
          this.servicesGServ.showSnakbar('Problemas con el servicio');
          this.bShowSpinner = false;
        }
      });
  }

  fn_close() {
    this.dialogRef.close(this.huboCambios);
  }

}
