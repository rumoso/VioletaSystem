import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { SalesService } from 'src/app/protected/services/sales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';


@Component({
  selector: 'app-taller-firma-modal',
  templateUrl: './taller-firma-modal.component.html',
  styleUrls: ['./taller-firma-modal.component.css']
})
export class TallerFirmaModalComponent implements OnInit {

  comentario: string = '';
  bShowSpinner: boolean = false;

  // Modo bEditAfterEntregado
  selectedStatus: number = 0;
  readonly statusOptions = [
    { value: 2, label: 'Pedido' },
    { value: 3, label: 'Asignado' },
    { value: 4, label: 'Finalizado / Mostrador' },
    { value: 5, label: 'Entregado' },
    { value: 6, label: 'Devolución' }
  ];

  // Labels por status
  readonly statusLabels: { [key: number]: string } = {
    3: 'Asignado',
    4: 'Finalizado / Mostrador',
    5: 'Entregado',
    6: 'Devolución del cliente'
  };

  constructor(
    private dialogRef: MatDialogRef<TallerFirmaModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private salesServ: SalesService,
    private servicesGServ: ServicesGService
  ) { }

  ngOnInit(): void { }

  get statusDesc(): string {
    return this.statusLabels[this.data?.idTallerStatus] || `Status ${this.data?.idTallerStatus}`;
  }

  fn_aprobar(): void {
    this.fn_firmar(1);
  }

  fn_rechazar(): void {
    if (!this.comentario || this.comentario.trim().length === 0) {
      this.servicesGServ.showSnakbar('El comentario es obligatorio para rechazar');
      return;
    }
    this.fn_firmar(2);
  }

  fn_noFirmar(): void {
    this.dialogRef.close(null);
  }

  fn_confirmarEditAfterEntregado(): void {
    if (!this.selectedStatus) {
      this.servicesGServ.showSnakbar('Seleccione el estado destino');
      return;
    }
    if (!this.comentario || this.comentario.trim().length === 0) {
      this.servicesGServ.showSnakbar('El motivo es obligatorio');
      return;
    }
    this.dialogRef.close({
      targetStatus: this.selectedStatus,
      comentario: this.comentario.trim()
    });
  }

  // Modo devolución: solo captura el motivo y cierra sin llamar la API de firma
  fn_confirmarDevolucion(): void {
    if (!this.comentario || this.comentario.trim().length === 0) {
      this.servicesGServ.showSnakbar('El motivo de la devolución es obligatorio');
      return;
    }
    this.dialogRef.close({ comentario: this.comentario.trim() });
  }

  private fn_firmar(firma: number): void {
    this.bShowSpinner = true;
    const oParams: any = {
      idFirma: this.data.idFirma,
      idTaller: this.data.idTaller,
      idTallerStatus: this.data.idTallerStatus,
      firma: firma,
      idUserFirma: this.data.idUserLogON,
      comentario: this.comentario.trim()
    };

    this.salesServ.CInsertUpdateTallerFirma(oParams)
      .subscribe({
        next: (resp: ResponseDB_CRUD) => {
          this.bShowSpinner = false;
          this.servicesGServ.showAlertIA(resp, false);
          if (resp.status === 0) {
            this.dialogRef.close({ firma, comentario: this.comentario.trim() });
          }
        },
        error: (ex: HttpErrorResponse) => {
          this.servicesGServ.showSnakbar(ex.error?.message || 'Error al registrar la firma');
          this.bShowSpinner = false;
        }
      });
  }
}
