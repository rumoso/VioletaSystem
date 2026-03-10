import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SalesService } from 'src/app/protected/services/sales.service';

@Component({
  selector: 'app-taller-firma-historial-modal',
  templateUrl: './taller-firma-historial-modal.component.html',
  styleUrls: ['./taller-firma-historial-modal.component.css']
})
export class TallerFirmaHistorialModalComponent implements OnInit {

  historial: any[] = [];
  bShowSpinner: boolean = false;

  constructor(
    private dialogRef: MatDialogRef<TallerFirmaHistorialModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { idTaller: number; idSale: string },
    private salesServ: SalesService
  ) { }

  ngOnInit(): void {
    this.fn_loadHistorial();
  }

  fn_loadHistorial(): void {
    this.bShowSpinner = true;
    this.salesServ.CGetTallerFirmasHistorial({ idTaller: this.data.idTaller })
      .subscribe({
        next: (resp: any) => {
          this.historial = resp.data || [];
          this.bShowSpinner = false;
        },
        error: () => {
          this.bShowSpinner = false;
        }
      });
  }

  getFirmaColor(firma: number): string {
    if (firma === 1) return '#4caf50';
    if (firma === 2) return '#f44336';
    return '#ff9800';
  }

  getFirmaIcon(firma: number): string {
    if (firma === 1) return 'verified';
    if (firma === 2) return 'cancel';
    return 'pending';
  }

  fn_close(): void {
    this.dialogRef.close();
  }
}
