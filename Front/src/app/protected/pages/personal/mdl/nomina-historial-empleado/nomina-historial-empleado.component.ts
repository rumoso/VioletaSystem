import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { NominaService } from 'src/app/protected/services/nomina.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { NominaReciboComponent } from '../nomina-recibo/nomina-recibo.component';

// Historial de nómina de un empleado (analisis/007, punto 11): todas
// las corridas donde apareció, con su neto — solo lectura.

@Component({
  selector: 'app-nomina-historial-empleado',
  templateUrl: './nomina-historial-empleado.component.html',
  styleUrls: ['../../personal-catalogo-list/personal-catalogo-list.component.css', './nomina-historial-empleado.component.css']
})
export class NominaHistorialEmpleadoComponent implements OnInit {

  bShowSpinner: boolean = false;
  nombreEmpleado: string = '';
  historial: any[] = [];

  constructor(
    private dialogRef: MatDialogRef<NominaHistorialEmpleadoComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any

    , private servicesGServ: ServicesGService
    , private nominaServ: NominaService
    ) { }

  ngOnInit(): void {
    this.nombreEmpleado = this.ODataP.nombreEmpleado;
    this.bShowSpinner = true;
    this.nominaServ.CGetNominasByEmpleado(this.ODataP.idEmpleado)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.historial = resp.status === 0 ? (resp.data || []) : [];
          this.bShowSpinner = false;
        },
        error: () => { this.bShowSpinner = false; }
      });
  }

  fn_abrirRecibo( item: any ) {
    this.servicesGServ.showModalWithParams(NominaReciboComponent, { idNominaRecibo: item.idNominaRecibo }, '620px');
  }

  fn_close() {
    this.dialogRef.close();
  }

}
