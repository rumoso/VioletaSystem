import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { ProductsService } from 'src/app/protected/services/products.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { Subject, debounceTime } from 'rxjs';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

@Component({
  selector: 'app-seleccionar-producto-modal',
  templateUrl: './seleccionar-producto-modal.component.html',
  styleUrls: ['./seleccionar-producto-modal.component.css']
})
export class SeleccionarProductoModalComponent implements OnInit {

  productosList: any[] = [];
  cbxProductos: any[] = [];
  refaccionActual: any;
  productDesc: string = '';
  selectedProducto: any = null;
  private timeCBXskeyup: Subject<any> = new Subject<any>();

  constructor(
    public dialogRef: MatDialogRef<SeleccionarProductoModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private productsServ: ProductsService,
    private servicesGServ: ServicesGService
  ) {
    this.productosList = data.productosList || [];
    this.refaccionActual = data.refaccionActual || {};
  }

  ngOnInit(): void {
    this.timeCBXskeyup
      .pipe(debounceTime(500))
      .subscribe((value) => {
        if (value.sOption === 'cbxProduct') {
          this.cbxProducts_Search();
        }
      });
  }

  cbxProducts_Search() {
    const oParams: any = {
      iOption: 2,
      search: this.productDesc
    };

    this.productsServ.CCbxGetProductsCombo(oParams)
      .subscribe({
        next: (resp: ResponseGet) => {
          if (resp.status === 0) {
            this.cbxProductos = resp.data;
          } else {
            this.cbxProductos = [];
          }
        },
        error: (ex) => {
          this.servicesGServ.showSnakbar('Problemas con el servicio');
          this.cbxProductos = [];
        }
      });
  }

  cbxProducts_SelectedOption(event: MatAutocompleteSelectedEvent) {
    const producto = event.option.value;
    this.selectedProducto = producto;
    this.productDesc = producto.name;
    this.cbxProductos = [];
  }

  comboBoxKeyUp(sOption: string, txt: string, event: KeyboardEvent) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      let oCbxKeyUp: any = { sOption, txt: txt };
      this.timeCBXskeyup.next(oCbxKeyUp);
    }
  }

  fn_selectProducto() {
    if (this.selectedProducto && this.selectedProducto.idProduct) {
      this.dialogRef.close(this.selectedProducto);
    }
  }

  fn_cancel() {
    this.dialogRef.close();
  }

}
