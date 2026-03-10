import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, OnInit, ViewChildren, QueryList } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { FxrateService } from 'src/app/protected/services/fxrate.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';
import { AddFxRateTypeDialogComponent } from './add-fxrate-type-dialog.component';

@Component({
  selector: 'app-fxrate',
  templateUrl: './fxrate.component.html',
  styleUrls: ['./fxrate.component.css']
})
export class FxrateComponent implements OnInit {

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE VARIABLES
//////////////////////////////////////////////////////////////////////////////////////////////////

  private _appMain: string = environment.appMain;

  title: string = 'Tipos de cambio';
  bShowSpinner: boolean = false;

  idUserLogON: number = 0;

  fxRateTypesWithRates: any[] = [];
  fxRateEditableData: any[] = [];
  hasChanges: boolean = false;
  filterText: string = '';

  newFxRateTypeForm: any = {
    nombre: '',
    descripcion: ''
  };

  @ViewChildren('costInput') costInputs!: QueryList<any>;
  @ViewChildren('utilityInput') utilityInputs!: QueryList<any>;
  @ViewChildren('ventaInput') ventaInputs!: QueryList<any>;

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE VARIABLES
//////////////////////////////////////////////////////////////////////////////////////////////////

  constructor(
    private servicesGServ: ServicesGService

    , private _adapter: DateAdapter<any>
    , @Inject(MAT_DATE_LOCALE) private _locale: string

    , private authServ: AuthService

    , private fxRateServ: FxrateService

    , private dialog: MatDialog

    ) { }

    async ngOnInit() {

      this.authServ.checkSession();
      this.idUserLogON = await this.authServ.getIdUserSession();

      this._locale = 'mx';
      this._adapter.setLocale(this._locale);

      this.fn_getFxRateTypesWithLatestRates();

    }




//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

fn_detectChanges() {
  this.hasChanges = false;

  if (this.fxRateTypesWithRates.length === 0 || this.fxRateEditableData.length === 0) {
    return;
  }

  for (let i = 0; i < this.fxRateEditableData.length; i++) {
    const edited = this.fxRateEditableData[i];
    const original = this.fxRateTypesWithRates[i];

    if (
      edited.fxRateCost !== original.fxRateCost ||
      edited.porcentUtility !== original.porcentUtility ||
      edited.fxRate !== original.fxRate
    ) {
      this.hasChanges = true;
      break;
    }
  }
}

fn_getFilteredData(): any[] {
  if (!this.filterText || this.filterText.trim().length === 0) {
    return this.fxRateEditableData;
  }

  return this.fxRateEditableData.filter(item =>
    item.referencia.toLowerCase().includes(this.filterText.toLowerCase())
  );
}

fn_moveFocusToVenta(index: number, event: any) {
  event.preventDefault();
  // Si el item es un Metal Fino (sin idFxRateTypeOrigin), calcular derivados
  const filteredData = this.fn_getFilteredData();
  if (filteredData && filteredData.length > index) {
    const item = filteredData[index];
    const esFino = !item.idFxRateTypeOrigin;
    if (esFino) {
      this.fn_calcularDerivados(item);
    } else {
      // No es fino: solo recalcula su propia venta
      if (item.fxRateCost !== null && item.fxRateCost !== undefined) {
        item.fxRate = parseFloat((item.fxRateCost * (1 + (item.porcentUtility || 0) / 100)).toFixed(2));
        this.fn_detectChanges();
      }
    }
  }

  // Usar setTimeout para asegurar que los ViewChildren estén listos
  setTimeout(() => {
    if (this.ventaInputs && this.ventaInputs.length > index) {
      const ventaInputElement = this.ventaInputs.toArray()[index].nativeElement;
      ventaInputElement.focus();
      ventaInputElement.select();
    }
  }, 0);
}

fn_calcularDerivados(fino: any): void {
  // Calcular la venta del propio fino: costo * (1 + %utilidad / 100)
  if (fino.fxRateCost !== null && fino.porcentUtility !== null) {
    fino.fxRate = parseFloat((fino.fxRateCost * (1 + (fino.porcentUtility || 0) / 100)).toFixed(2));
  }

  // Si el fino no tiene base configurada, no puede calcular derivados
  if (!fino.base || !fino.fxRateCost) {
    this.fn_detectChanges();
    return;
  }

  // Buscar todos los metales que dependen de este fino
  const derivados = this.fxRateEditableData.filter(
    (d: any) => d.idFxRateTypeOrigin === fino.idFxRateType
  );

  for (const derivado of derivados) {
    const nuevoCosto = (fino.fxRateCost / fino.base) * (derivado.medicion || 0);
    const nuevaPorcentUtility = fino.porcentUtility;
    const nuevaVenta = nuevoCosto * (1 + (nuevaPorcentUtility || 0) / 100);
    derivado.fxRateCost      = parseFloat(nuevoCosto.toFixed(2));
    derivado.porcentUtility  = nuevaPorcentUtility;
    derivado.fxRate          = parseFloat(nuevaVenta.toFixed(2));
  }

  this.fn_detectChanges();
}

fn_moveFocusToUtility(index: number, event: any) {
  event.preventDefault();

  setTimeout(() => {
    if (this.utilityInputs && this.utilityInputs.length > index) {
      const utilityInputElement = this.utilityInputs.toArray()[index].nativeElement;
      utilityInputElement.focus();
      utilityInputElement.select();
    }
  }, 0);
}

fn_moveFocusToNextCosto(index: number, event: any) {
  event.preventDefault();

  // Si no es la última fila, mover al costo de la siguiente
  if (index < this.fxRateEditableData.length - 1) {
    setTimeout(() => {
      if (this.costInputs && this.costInputs.length > index + 1) {
        const nextCostoInputElement = this.costInputs.toArray()[index + 1].nativeElement;
        nextCostoInputElement.focus();
        nextCostoInputElement.select();
      }
    }, 0);
  }
  // Si es la última fila, se queda en el input actual
}

fn_getFxRateTypesWithLatestRates() {

  this.bShowSpinner = true;
  this.fxRateServ.CGetFxRateTypesWithLatestRates()
  .subscribe({
    next: (resp: any) => {

      if(resp.status === 0){
        this.fxRateTypesWithRates = resp.data;
        // Crear una copia profunda para edición
        this.fxRateEditableData = JSON.parse(JSON.stringify(resp.data));
        this.hasChanges = false;
      }
      else{
        this.servicesGServ.showSnakbar('Error al obtener los tipos de cambio');
      }
      this.bShowSpinner = false;

    },
    error: (ex: HttpErrorResponse) => {

      this.servicesGServ.showSnakbar('Error al obtener los tipos de cambio');
      this.bShowSpinner = false;

    }
  })
}

fn_saveFxRateChanges() {

  let hasChanges = false;
  const changesToSave: any[] = [];

  // Detectar cambios
  for (let i = 0; i < this.fxRateEditableData.length; i++) {
    const edited = this.fxRateEditableData[i];
    const original = this.fxRateTypesWithRates[i];

    // Verificar si hay cambios en fxRateCost, porcentUtility o fxRate
    if (
      edited.fxRateCost !== original.fxRateCost ||
      edited.porcentUtility !== original.porcentUtility ||
      edited.fxRate !== original.fxRate
    ) {
      hasChanges = true;
      changesToSave.push({
        idFxRateType: edited.idFxRateType,
        referencia: edited.referencia,
        fxRate: edited.fxRate,
        fxRateCost: edited.fxRateCost,
        porcentUtility: edited.porcentUtility
      });
    }
  }

  if (!hasChanges) {
    this.servicesGServ.showSnakbar('No hay cambios para guardar');
    return;
  }

  this.servicesGServ.showDialog('¿Estás seguro?'
    , 'Está a punto de guardar los cambios de tipos de cambio'
    , '¿Desea continuar?'
    , 'Si', 'No')
    .afterClosed().subscribe({
      next: (resp: any) => {

        if (resp) {
          this.bShowSpinner = true;

          // Guardar todos los cambios
          this.fxRateServ.CSaveFxRateChanges(changesToSave)
            .subscribe({
              next: (resp: any) => {

                if (resp.status === 0) {
                  this.servicesGServ.showAlert('S', 'OK!', resp.message, true);
                  // Refrescar la tabla
                  this.fn_getFxRateTypesWithLatestRates();
                }
                else {
                  this.servicesGServ.showAlert('W', 'Alerta!', resp.message, true);
                  this.bShowSpinner = false;
                }

              },
              error: (ex) => {

                this.servicesGServ.showSnakbar("Problemas al guardar los cambios");
                this.bShowSpinner = false;

              }
            })

        }
      }
    });

}





//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////

fn_openAddReferenceModal() {
  const dialogRef = this.dialog.open(AddFxRateTypeDialogComponent, {
    width: '400px',
    disableClose: false,
    data: {
      nombre: '',
      descripcion: '',
      base: null,
      medicion: null,
      idFxRateTypeOrigin: null,
      idFxRateType: 0,
      originName: '',
      isEdit: false
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result && result.nombre && result.nombre.trim().length > 0) {
      // Confirmación adicional
      this.servicesGServ.showDialog('¿Estás seguro?'
        , `¿Deseas crear la referencia "${result.nombre}"?`
        , '¿Desea continuar?'
        , 'Si', 'No')
        .afterClosed().subscribe({
          next: (resp: any) => {
            if (resp) {
              this.bShowSpinner = true;

              this.fxRateServ.CCreateFxRateType({
                nombre: result.nombre.trim(),
                descripcion: result.descripcion ? result.descripcion.trim() : '',
                base: result.base !== null && result.base !== undefined && result.base !== '' ? result.base : null,
                medicion: result.medicion !== null && result.medicion !== undefined && result.medicion !== '' ? result.medicion : null,
                idFxRateTypeOrigin: result.idFxRateTypeOrigin || null
              })
                .subscribe({
                  next: (resp: any) => {

                    if (resp.status === 0) {
                      this.servicesGServ.showAlert('S', 'OK!', resp.message, true);
                      // Refrescar la tabla
                      this.fn_getFxRateTypesWithLatestRates();
                    }
                    else {
                      this.servicesGServ.showAlert('W', 'Alerta!', resp.message, true);
                      this.bShowSpinner = false;
                    }

                  },
                  error: (ex) => {

                    this.servicesGServ.showSnakbar("Problemas al crear la referencia");
                    this.bShowSpinner = false;

                  }
                })

            }
          }
        });
    }
  });
}

fn_hasReferencesWithoutRates(): boolean {
  return this.fxRateTypesWithRates.some(item => !item.fxRate || !item.fxRateCost);
}

fn_canEditOrDelete(item: any): boolean {
  return !item.fxRate || !item.fxRateCost;
}

fn_deleteReference(idFxRateType: number, nombre: string) {
  this.servicesGServ.showDialog('¿Estás seguro?'
    , `¿Deseas eliminar la referencia "${nombre}"?`
    , 'Esta acción no se puede deshacer'
    , 'Si', 'No')
    .afterClosed().subscribe({
      next: (resp: any) => {
        if (resp) {
          this.bShowSpinner = true;

          this.fxRateServ.CDeleteFxRateType(idFxRateType)
            .subscribe({
              next: (resp: any) => {

                if (resp.status === 0) {
                  this.servicesGServ.showAlert('S', 'OK!', resp.message, true);
                  // Refrescar la tabla
                  this.fn_getFxRateTypesWithLatestRates();
                }
                else {
                  this.servicesGServ.showAlert('W', 'Alerta!', resp.message, true);
                  this.bShowSpinner = false;
                }

              },
              error: (ex) => {

                this.servicesGServ.showSnakbar("Problemas al eliminar la referencia");
                this.bShowSpinner = false;

              }
            })

        }
      }
    });
}

fn_editReference(item: any) {
  const dialogRef = this.dialog.open(AddFxRateTypeDialogComponent, {
    width: '800px',
    disableClose: false,
    data: {
      idFxRateType: item.idFxRateType,
      nombre: item.referencia,
      descripcion: item.descripcion || '',
      base: item.base !== undefined ? item.base : null,
      medicion: item.medicion !== undefined ? item.medicion : null,
      idFxRateTypeOrigin: item.idFxRateTypeOrigin || null,
      originName: item.originName || '',
      isEdit: true
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result && result.nombre && result.nombre.trim().length > 0) {
      // Confirmación adicional
      this.servicesGServ.showDialog('¿Estás seguro?'
        , `¿Deseas actualizar la referencia a "${result.nombre}"?`
        , '¿Desea continuar?'
        , 'Si', 'No')
        .afterClosed().subscribe({
          next: (resp: any) => {
            if (resp) {
              this.bShowSpinner = true;

              this.fxRateServ.CUpdateFxRateType(item.idFxRateType, {
                nombre: result.nombre.trim(),
                descripcion: result.descripcion ? result.descripcion.trim() : '',
                base: result.base !== null && result.base !== undefined && result.base !== '' ? result.base : null,
                medicion: result.medicion !== null && result.medicion !== undefined && result.medicion !== '' ? result.medicion : null,
                idFxRateTypeOrigin: result.idFxRateTypeOrigin || null
              })
                .subscribe({
                  next: (resp: any) => {

                    if (resp.status === 0) {
                      this.servicesGServ.showAlert('S', 'OK!', resp.message, true);
                      // Refrescar la tabla
                      this.fn_getFxRateTypesWithLatestRates();
                    }
                    else {
                      this.servicesGServ.showAlert('W', 'Alerta!', resp.message, true);
                      this.bShowSpinner = false;
                    }

                  },
                  error: (ex) => {

                    this.servicesGServ.showSnakbar("Problemas al actualizar la referencia");
                    this.bShowSpinner = false;

                  }
                })

            }
          }
        });
    }
  });
}

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////



//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE EVENTOS
//////////////////////////////////////////////////////////////////////////////////////////////////

event_clear(){
  this.fn_getFxRateTypesWithLatestRates();
}





//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE EVENTOS
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE COMBOS
//////////////////////////////////////////////////////////////////////////////////////////////////







//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE COMBOS
//////////////////////////////////////////////////////////////////////////////////////////////////


}
