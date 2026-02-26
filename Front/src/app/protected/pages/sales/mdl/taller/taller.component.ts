import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatSelect } from '@angular/material/select';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { SalesService } from 'src/app/protected/services/sales.service';
import { FxrateService } from 'src/app/protected/services/fxrate.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { Subject, debounceTime } from 'rxjs';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { UsersService } from 'src/app/protected/services/users.service';
import { CustomersService } from 'src/app/protected/services/customers.service';
import { ProductsService } from 'src/app/protected/services/products.service';
import { environment } from 'src/environments/environment';
import { MetalClienteImagesComponent } from './metal-cliente-images.component';
import { TallerHeaderImagesComponent } from './taller-header-images.component';
import { ServiciosExternosModalComponent } from './servicios-externos-modal/servicios-externos-modal.component';
import { SeleccionarProductoModalComponent } from './seleccionar-producto-modal.component';
import { PaymentsComponent } from '../payments/payments.component';

@Component({
  selector: 'app-taller',
  templateUrl: './taller.component.html',
  styleUrls: ['./taller.component.css']
})
export class TallerComponent implements OnInit {

  //#region VARIABLES

  idUserLogON: number = 0;
  bShowSpinner: boolean = false;
  title: string = 'Taller';

  @ViewChild('cbxSellerCBX') cbxSellerCBX!: ElementRef;
  @ViewChild('cbxCustomerCBX') cbxCustomerCBX!: ElementRef;
  @ViewChild('descripcionInput') descripcionInput!: ElementRef;
  @ViewChild('refaccionCantidadInput') refaccionCantidadInput!: ElementRef;
  @ViewChild('refaccionPorDefinirDescInput') refaccionPorDefinirDescInput!: ElementRef;
  @ViewChild('refaccionPorDefinirCantidadInput') refaccionPorDefinirCantidadInput!: ElementRef;
  @ViewChild('refaccionPorDefinirCostoInput') refaccionPorDefinirCostoInput!: ElementRef;
  @ViewChild('refaccionPorDefinirPrecioInput') refaccionPorDefinirPrecioInput!: ElementRef;
  @ViewChild('metalAgranelGramosInput') metalAgranelGramosInput!: ElementRef;
  @ViewChild('metalAgranelKilatesSelect', { read: ElementRef }) metalAgranelKilatesSelect!: ElementRef;
  @ViewChild('metalAgranelKilatesSelectRef') metalAgranelKilatesSelectRef!: MatSelect;
  @ViewChild('metalAgranelValorMetalInput') metalAgranelValorMetalInput!: ElementRef;
  @ViewChild('metalClienteGramosInput') metalClienteGramosInput!: ElementRef;
  @ViewChild('metalClienteKilatesSelect', { read: ElementRef }) metalClienteKilatesSelect!: ElementRef;
  @ViewChild('metalClienteKilatesSelectRef') metalClienteKilatesSelectRef!: MatSelect;
  @ViewChild('metalClienteValorMetalInput') metalClienteValorMetalInput!: ElementRef;
  @ViewChild('cbxServiciosExternosCBX') cbxServiciosExternosCBX!: ElementRef;
  @ViewChild('servicioExternoCantidadInput') servicioExternoCantidadInput!: ElementRef;
  @ViewChild('servicioExternoCostoInput', { read: ElementRef }) servicioExternoCostoInput!: ElementRef;
  @ViewChild('servicioExternoPrecioInput', { read: ElementRef }) servicioExternoPrecioInput!: ElementRef;
  @ViewChild('manoObraCantidadInput') manoObraCantidadInput!: ElementRef;
  @ViewChild('manoObraPrecioInput') manoObraPrecioInput!: ElementRef;
  @ViewChild('cbxProductss') cbxProductss!: ElementRef;
  @ViewChild('cbxTecnicosCBX') cbxTecnicosCBX!: ElementRef;

  private timeCBXskeyup: Subject<any> = new Subject<any>();

  tallerForm: any = {
    idTaller: 0,
    idSale: '',
    idSeller_idUser: 0,
    sellerDesc: '',
    sellerResp: '',
    idCustomer: 0,
    customerDesc: '',
    customerResp: '',
    descripcion: '',
    fechaIngreso: new Date(),
    fechaPrometidaEntrega: '',
    fechaEntrega: '',
    status: '',
    idTallerStatus: 0,
    manoObraPrecio: '',
    headerImagesCount: 0
  };

  // VARIABLES DE REFACCIONES
  refaccionTipo: string = 'producto'; // 'producto' o 'porDefinir'

  productosList: any[] = [];
  refaccionForm: any = {
    tipo: 'producto',
    idRefaccion: 0,
    idProduct: 0,
    productDesc: '',
    cantidad: '',
    precio: '',
    costo: ''
  };

  refaccionesList: any[] = [];
  totalRefacciones: number = 0;

  // VARIABLES DE SERVICIOS EXTERNOS
  servicioExternoForm: any = {
    idServicioExternoDetalle: 0,
    idServicioExterno: 0,
    servicioExternoDesc: '',
    cantidad: '',
    precio: '',
    costo: ''
  };
  serviciosExternosList: any[] = [];
  totalServiciosExternos: number = 0;

  // VARIABLES DE METAL AGRANEL
  metalTipo: string = 'oro'; // 'oro' o 'plata'

  metalAgranelForm: any = {
    idMetalAgranel: 0,
    tipo: 'oro',
    gramos: '',
    kilates: 0,
    valorMetal: ''
  };

  kilatajes_oro: number[] = [8, 10, 12, 14, 16, 18, 20, 22, 24];
  kilatajes_plata: number[] = [1000, 925, 720];
  metalAgranelList: any[] = [];
  totalMetalAgranel: number = 0;

  get kilatajes(): number[] {
    return this.metalTipo === 'plata' ? this.kilatajes_plata : this.kilatajes_oro;
  }

  // VARIABLES DE ACTIVO DEL CLIENTE
  metalClienteTipo: string = 'oro'; // 'oro' o 'plata'

  metalClienteForm: any = {
    idMetalCliente: 0,
    tipo: 'oro',
    gramos: '',
    kilates: 0,
    valorMetal: ''
  };

  kilatajes_oro_cliente: number[] = [8, 10, 12, 14, 16, 18, 20, 22, 24];
  kilatajes_plata_cliente: number[] = [1000, 925, 720];
  metalClienteList: any[] = [];
  totalMetalCliente: number = 0;

  get kilatajes_cliente(): number[] {
    return this.metalClienteTipo === 'plata' ? this.kilatajes_plata_cliente : this.kilatajes_oro_cliente;
  }

  // VARIABLES DE MANO DE OBRA
  manoObraForm: any = {
    idManoObra: 0,
    idTecnico: 0,
    tecnicoDesc: '',
    precio: ''
  };
  manoObraList: any[] = [];
  totalManoObra: number = 0;
  totalTaller: number = 0;
  cbxTecnicos: any[] = [];

  selectCajas: any = {
    idSucursal: 0,
    idCaja: 0,
    cajaDesc: '',
    idPrinter: 0
  }

  selectPrinter: any = {
    idSucursal: 0,
    idPrinter: 0,
    printerName: ''
  }

  //#endregion

  constructor(
    private dialogRef: MatDialogRef<TallerComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any

    , private _adapter: DateAdapter<any>
    , @Inject(MAT_DATE_LOCALE) private _locale: string

    , private authServ: AuthService
    , private salesServ: SalesService
    , private fxrateServ: FxrateService
    , private servicesGServ: ServicesGService
    , private userServ: UsersService
    , private customersServ: CustomersService
    , private productsServ: ProductsService
    , private dialog: MatDialog

  ) { }

  async ngOnInit() {

    this.authServ.checkSession();
    this.idUserLogON = await this.authServ.getIdUserSession();

    this._locale = 'mx';
    this._adapter.setLocale(this._locale);

    this.fn_loadProductos();

    this.timeCBXskeyup
      .pipe( debounceTime(500) )
      .subscribe( ( cbxKeyUp: any ) => {

        if( cbxKeyUp.iOption == 1 ){
          this.cbxCustomers_Search();
        }else if( cbxKeyUp.iOption == 2 ){
          this.cbxSellers_Search();
        }

      });

    this.timeCBXskeyup
    .pipe(
      debounceTime(500)
    )
    .subscribe( value => {
      if(value.sOption == 'cbxProduct'){
        this.cbxProducts_Search();
      }else if(value.sOption == 'cbxCustomerCBX'){
        this.cbxCustomers_Search();
      }else if(value.sOption == 'cbxSellerCBX'){
        this.cbxSellers_Search();
      }else if(value.sOption == 'cbxServiciosExternos'){
        this.cbxServiciosExternos_Search();
      }else if(value.sOption == 'cbxTecnicos'){
        this.cbxTecnicos_Search();
      }

    })

    if (this.ODataP && this.ODataP.idTaller > 0) {
      this.fn_getTallerData(this.ODataP.idTaller);
    } else {
      // Si es un taller nuevo, poner foco en el vendedor después de que se renderice el DOM
      setTimeout(() => {
        if (this.cbxSellerCBX && this.cbxSellerCBX.nativeElement) {
          this.cbxSellerCBX.nativeElement.focus();
        }
      }, 200);
    }

    this.selectCajas = this.ODataP.selectCajas;
    this.selectPrinter = this.ODataP.selectPrinter;

  }

  fn_ShowPayments(){
      if(this.selectCajas.idCaja > 0){

        let OParams: any = {
          idCaja: this.ODataP.selectCajas.idCaja,
          idCustomer: this.tallerForm.idCustomer,
          idSale: this.tallerForm.idSale,
          relationType: 'V',
          idSeller_idUser: this.tallerForm.idSeller_idUser,
          idSaleType: 2, //this.dataStone.idSaleType,
          saleTypeDesc: this.tallerForm.saleTypeDesc,
          total: this.totalTaller,
          pendingAmount: this.totalTaller,//this.tallerForm.pendingAmount,

          selectCajas: this.ODataP.selectCajas
        }

          this.servicesGServ.showModalWithParams( PaymentsComponent, OParams, '1500px')
          .afterClosed().subscribe({
            next: ( resp ) =>{

              // if( resp.length > 0 ){

              //   this.fn_NuevaVenta();

              //   this.fn_getSaleByID( resp );

              // }
            }
        });

      }
    }

  //#region CONEXIONES AL BACK

  fn_loadProductos() {
    // TODO: Cargar productos del back
    // Por ahora, agregamos datos de ejemplo
    this.productosList = [
      { idProduct: 1, name: 'Producto 1', price: 100, cost: 50 },
      { idProduct: 2, name: 'Producto 2', price: 200, cost: 100 },
      { idProduct: 3, name: 'Producto 3', price: 150, cost: 75 }
    ];
  }

  getTallerRefaccciones(idTaller: number) {

    this.bShowSpinner = true;
    var oParams: any = {
      idTaller: idTaller
    }
    this.salesServ.getTallerRefaccciones( oParams )
    .subscribe({
      next: (resp: ResponseGet) => {
        this.bShowSpinner = false;
        if (resp.status === 0) {
          this.refaccionesList = resp.data.refaccionesDetail;
          this.fn_calcularTotalRefacciones();
        }
      },
      error: (ex: HttpErrorResponse) => {
        this.servicesGServ.showSnakbar(ex.error.message || 'Error al cargar los datos');
        this.bShowSpinner = false;
      }
    })

  }

  getTallerServiciosExternos(idTaller: number) {

    this.bShowSpinner = true;
    var oParams: any = {
      idTaller: idTaller
    }
    this.salesServ.getTallerServiciosExternos( oParams )
    .subscribe({
      next: (resp: ResponseGet) => {
        this.bShowSpinner = false;
        if (resp.status === 0) {
          this.serviciosExternosList = resp.data.serviciosExternosDetail;
          this.fn_calcularTotalServiciosExternos();
        }
      },
      error: (ex: HttpErrorResponse) => {
        this.servicesGServ.showSnakbar(ex.error.message || 'Error al cargar los datos');
        this.bShowSpinner = false;
      }
    })

  }

  getTallerMetalesAgranel(idTaller: number) {

    this.bShowSpinner = true;
    var oParams: any = {
      idTaller: idTaller
    }
    this.salesServ.getTallerMetalesAgranel( oParams )
    .subscribe({
      next: (resp: ResponseGet) => {
        this.bShowSpinner = false;
        if (resp.status === 0) {
          this.metalAgranelList = resp.data.metalesAgranelDetail;
          this.fn_calcularTotalMetalAgranel();
        }
      },
      error: (ex: HttpErrorResponse) => {
        this.servicesGServ.showSnakbar(ex.error.message || 'Error al cargar los datos');
        this.bShowSpinner = false;
      }
    })

  }

  getTallerMetalesCliente(idTaller: number) {

    this.bShowSpinner = true;
    var oParams: any = {
      idTaller: idTaller
    }
    this.salesServ.getTallerMetalesCliente( oParams )
    .subscribe({
      next: (resp: ResponseGet) => {
        this.bShowSpinner = false;
        if (resp.status === 0) {
          this.metalClienteList = resp.data.metalesClienteDetail;
          this.fn_calcularTotalMetalCliente();
        }
      },
      error: (ex: HttpErrorResponse) => {
        this.servicesGServ.showSnakbar(ex.error.message || 'Error al cargar los datos');
        this.bShowSpinner = false;
      }
    })

  }

  fn_getTallerData(idTaller: number) {

    this.bShowSpinner = true;
    var oParams: any = {
      idTaller: idTaller
    }
    this.salesServ.CGetTallerByID( oParams )
    .subscribe({
      next: (resp: ResponseGet) => {
        this.bShowSpinner = false;
        if (resp.status === 0) {
          const data = resp.data.oTaller;

          this.tallerForm = {
            idTaller: data.idTaller || 0,
            idSale: data.idSale,
            descripcion: data.descripcion || '',
            fechaIngreso: data.fechaIngreso + 'T10:27:51.000Z' || '',
            fechaPrometidaEntrega: data.fechaPrometida + 'T10:27:51.000Z' || '',
            fechaEntrega: data.fechaEntrega || '',
            idCustomer: data.idCustomer || 0,
            customerDesc: data.customerDesc || '',
            idSeller_idUser: data.idSeller_idUser || 0,
            sellerDesc: data.sellerDesc || '',
            idTallerStatus: data.idTallerStatus || 0,
            manoObraPrecio: data.manoObraPrecio || ''
          };

          this.refaccionesList = resp.data.refaccionesDetail || [];
          this.serviciosExternosList = resp.data.serviciosExternos || [];
          this.metalAgranelList = resp.data.metalesAgranel || [];
          this.metalClienteList = resp.data.metalesCliente || [];
          this.manoObraList = resp.data.oManoObra || [];

          this.fn_calcularTotalRefacciones();
          this.fn_calcularTotalServiciosExternos();
          this.fn_calcularTotalMetalAgranel();
          this.fn_calcularTotalMetalCliente();
          this.fn_calcularTotalManoObra();
          this.fn_calcularTotalTaller();
          this.fn_loadTallerHeaderImagesCount(idTaller);
        }
      },
      error: (ex: HttpErrorResponse) => {
        this.servicesGServ.showSnakbar(ex.error.message || 'Error al cargar los datos');
        this.bShowSpinner = false;
      }
    })

  }

  fn_saveTaller() {

    if (this.tallerForm.descripcion.trim().length == 0 || this.tallerForm.idSeller_idUser == 0 || this.tallerForm.idCustomer == 0) {
      this.servicesGServ.showSnakbar('Debe completar los campos requeridos: Vendedor, Cliente y Descripción');
      return;
    }

    const oParams: any = {
      idTaller: this.tallerForm.idTaller,
      idSale: this.tallerForm.idSale || '',
      idSeller_idUser: this.tallerForm.idSeller_idUser,
      idCustomer: this.tallerForm.idCustomer,
      descripcion: this.tallerForm.descripcion,
      fechaIngreso: this.tallerForm.fechaIngreso,
      fechaPrometidaEntrega: this.tallerForm.fechaPrometidaEntrega,
      idUser: this.idUserLogON
    };

    this.bShowSpinner = true;
    this.salesServ.CSaveTallerHeader(oParams)
    .subscribe({
      next: (resp: ResponseGet) => {
        this.servicesGServ.showAlertIA(resp);
        if (resp.status === 0) {
          this.tallerForm.idTaller = resp.data.idTaller;
          this.tallerForm.idSale = resp.data.idSale;
        }
        this.bShowSpinner = false;
      },
      error: (ex: HttpErrorResponse) => {
        this.servicesGServ.showSnakbar(ex.error.message || 'Error al guardar');
        this.bShowSpinner = false;
      }
    })

  }


  //#endregion

  //#region MÉTODOS DE REFACCIONES

  fn_changeRefaccionTipo(tipo: string) {
    this.refaccionTipo = tipo;
    this.refaccionForm.tipo = tipo;
    this.fn_resetRefaccionForm();

    // Focus on product combo when selecting "Producto"
    if (tipo === 'producto') {
      this.fn_focusProductCombo();
    }
    // Toggle switch to "Por Definir" - focus on description
    else if (tipo === 'porDefinir') {
      setTimeout(() => {
        this.refaccionPorDefinirDescInput?.nativeElement?.focus();
      }, 50);
    }
  }

  fn_resetRefaccionForm() {
    this.refaccionForm = {
      tipo: this.refaccionTipo,
      idRefaccion: 0,
      idProduct: 0,
      productDesc: '',
      cantidad: '',
      precio: '',
      costo: ''
    };
  }

  fn_focusNextRefaccion(campo: string) {
    setTimeout(() => {
      if (campo === 'cantidad') {
        this.refaccionPorDefinirCantidadInput?.nativeElement?.focus();
      } else if (campo === 'costo') {
        this.refaccionPorDefinirCostoInput?.nativeElement?.focus();
      } else if (campo === 'precio') {
        this.refaccionPorDefinirPrecioInput?.nativeElement?.focus();
      }
    }, 50);
  }

  fn_focusProductCombo() {
    setTimeout(() => {
      if (this.cbxProductss?.nativeElement) {
        this.cbxProductss.nativeElement.focus();
      }
    }, 50);
  }

  fn_onProductoChange() {
    const producto = this.productosList.find(p => p.idProduct === this.refaccionForm.idProduct);
    if (producto) {
      this.refaccionForm.productDesc = producto.name;
      this.refaccionForm.precio = producto.price;
      this.refaccionForm.costo = producto.cost;
    }
  }

  fn_agregarRefaccion() {
    // Validaciones
    if (this.refaccionTipo === 'producto') {
      if (this.refaccionForm.idProduct === 0) {
        this.servicesGServ.showSnakbar('Debe seleccionar un producto');
        return;
      }
      if (this.refaccionForm.cantidad <= 0) {
        this.servicesGServ.showSnakbar('La cantidad debe ser mayor a 0');
        return;
      }
    } else {
      if (!this.refaccionForm.productDesc.trim()) {
        this.servicesGServ.showSnakbar('La descripción es requerida');
        return;
      }
      if (this.refaccionForm.cantidad <= 0) {
        this.servicesGServ.showSnakbar('La cantidad debe ser mayor a 0');
        return;
      }
    }

    // Preparar objeto para enviar al backend
    const oParams: any = {
      idTaller: this.tallerForm.idTaller,
      idSale: this.tallerForm.idSale,
      refaccion: {
        tipo: this.refaccionTipo,
        idRefaccion: this.refaccionForm.idRefaccion,
        idProduct: this.refaccionForm.idProduct,
        productDesc: this.refaccionForm.productDesc,
        cantidad: this.refaccionForm.cantidad,
        precio: this.refaccionForm.precio,
        costo: this.refaccionForm.costo,
        total: this.refaccionForm.cantidad * this.refaccionForm.precio
      }
    };
    console.log('Enviando al backend:', oParams);
    this.bShowSpinner = true;
    this.salesServ.CAddRefaccionTaller(oParams)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.servicesGServ.showAlertIA(resp, false);
          if (resp.status === 0) {
            this.getTallerRefaccciones( this.tallerForm.idTaller );
            this.fn_resetRefaccionForm();

            // Focus según el tipo de refacción
            if (this.refaccionTipo === 'producto') {
              this.fn_focusProductCombo();
            } else if (this.refaccionTipo === 'porDefinir') {
              setTimeout(() => {
                this.refaccionPorDefinirDescInput?.nativeElement?.focus();
              }, 50);
            }
          }
          this.bShowSpinner = false;
        },
        error: (ex: HttpErrorResponse) => {
          this.servicesGServ.showSnakbar(ex.error.message || 'Error al guardar refacción');
          this.bShowSpinner = false;
        }
      });
  }

  fn_eliminarRefaccion(idRefaccion: number) {

    this.servicesGServ.showDialog('¿Estás seguro?'
        , 'Está a punto de eliminar una refacción'
        , '¿Desea continuar?'
        , 'Si', 'No')
        .afterClosed().subscribe({
          next: async( resp ) =>{
            if(resp){

              this.bShowSpinner = true;

              const oParams: any = {
                idRefaccion: idRefaccion,
                idUser: this.idUserLogON
              };

              this.salesServ.CDeleteRefaccionTaller(oParams)
                .subscribe({
                  next: (resp: ResponseDB_CRUD) => {
                    if (resp.status === 0) {
                      this.getTallerRefaccciones( this.tallerForm.idTaller );
                      this.fn_calcularTotalRefacciones();
                    }
                    this.servicesGServ.showAlertIA( resp );
                    this.bShowSpinner = false;
                  },
                  error: (ex: HttpErrorResponse) => {
                    this.servicesGServ.showSnakbar(ex.error.message || 'Error al eliminar refacción');
                    this.bShowSpinner = false;
                  }
                });

            }
          }
        });
  }

  fn_changeProductoFromPorDefinir(item: any) {
    // Abrir modal para seleccionar un producto
    const dialogRef = this.dialog.open(SeleccionarProductoModalComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: {
        productosList: this.productosList,
        refaccionActual: item
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.idProduct > 0) {
        // Usuario seleccionó un producto
        this.bShowSpinner = true;

        const oParams: any = {
          idTaller: this.tallerForm.idTaller,
          idSale: this.tallerForm.idSale,
          refaccion: {
            tipo: 'producto',
            idRefaccion: item.idRefaccion,
            idProduct: result.idProduct,
            productDesc: result.name,
            cantidad: item.cantidad,
            precio: result.price,
            costo: result.cost,
            total: item.cantidad * result.price
          }
        };

        this.salesServ.CAddRefaccionTaller(oParams)
          .subscribe({
            next: (resp: ResponseGet) => {
              if (resp.status === 0) {
                this.servicesGServ.showSnakbar('Refacción actualizada correctamente');
                this.getTallerRefaccciones(this.tallerForm.idTaller);
              } else {
                this.servicesGServ.showSnakbar('Error al actualizar refacción');
              }
              this.bShowSpinner = false;
            },
            error: (ex: HttpErrorResponse) => {
              this.servicesGServ.showSnakbar(ex.error.message || 'Error al actualizar refacción');
              this.bShowSpinner = false;
            }
          });
      }
    });
  }

  fn_calcularTotalRefacciones() {
    this.totalRefacciones = this.refaccionesList.reduce((total, ref) => total + parseFloat( ref.total ), 0);
    this.fn_calcularTotalTaller();
  }

  //#endregion MÉTODOS DE REFACCIONES

  //#region MÉTODOS DE MANO DE OBRA

  fn_agregarManoObra() {
    // Validaciones
    if (this.manoObraForm.idTecnico === 0) {
      this.servicesGServ.showSnakbar('Debe seleccionar un técnico');
      return;
    }

    if (this.manoObraForm.precio <= 0) {
      this.servicesGServ.showSnakbar('El precio debe ser mayor a 0');
      return;
    }

    // Preparar objeto para enviar al backend
    const oParams: any = {
      idTaller: this.tallerForm.idTaller,
      idSale: this.tallerForm.idSale,
      manoObra: {
        idManoObra: this.manoObraForm.idManoObra,
        idTecnico: this.manoObraForm.idTecnico,
        tecnicoDesc: this.manoObraForm.tecnicoDesc,
        precio: this.manoObraForm.precio
      }
    };

    this.bShowSpinner = true;
    this.salesServ.CAddManoObraTaller(oParams)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.servicesGServ.showAlertIA(resp, false);
          if (resp.status === 0) {
            // Recargar la lista de mano de obra
            this.getTallerManoObra(this.tallerForm.idTaller);
            this.fn_resetManoObraForm();
          }
          this.bShowSpinner = false;
        },
        error: (ex: HttpErrorResponse) => {
          this.servicesGServ.showSnakbar(ex.error.message || 'Error al guardar mano de obra');
          this.bShowSpinner = false;
        }
      });
  }

  fn_eliminarManoObra(item: any) {
    this.servicesGServ.showDialog('¿Estás seguro?'
        , 'Está a punto de eliminar una mano de obra'
        , '¿Desea continuar?'
        , 'Si', 'No')
        .afterClosed().subscribe({
          next: async( resp ) =>{
            if(resp){

              this.bShowSpinner = true;

              const oParams: any = {
                idManoObra: item.idManoObra,
                idUser: this.idUserLogON
              };

              this.salesServ.CDeleteManoObraTaller(oParams)
                .subscribe({
                  next: (resp: ResponseDB_CRUD) => {
                    if (resp.status === 0) {
                      this.getTallerManoObra( this.tallerForm.idTaller );
                      this.fn_calcularTotalManoObra();
                    }
                    this.servicesGServ.showAlertIA( resp );
                    this.bShowSpinner = false;
                  },
                  error: (ex: HttpErrorResponse) => {
                    this.servicesGServ.showSnakbar(ex.error.message || 'Error al eliminar mano de obra');
                    this.bShowSpinner = false;
                  }
                });

            }
          }
        });
  }

  fn_calcularTotalManoObra() {
    this.totalManoObra = this.manoObraList.reduce((total, mo) => total + parseFloat( mo.precio ), 0);
    this.fn_calcularTotalTaller();
  }

  fn_calcularTotalTaller() {
    let manoObraTotal = this.totalManoObra;

    // Si no hay técnicos agregados, sumar el precio de mano de obra general
    if (this.manoObraList.length === 0 && this.tallerForm.manoObraPrecio > 0) {
      manoObraTotal += parseFloat(this.tallerForm.manoObraPrecio);
    }

    this.totalTaller = this.totalRefacciones + this.totalServiciosExternos + this.totalMetalAgranel + manoObraTotal;
  }

  fn_resetManoObraForm() {
    this.manoObraForm = {
      idManoObra: 0,
      idTecnico: 0,
      tecnicoDesc: '',
      precio: ''
    };
  }

  fn_saveManoObraPrecio() {
    if (this.tallerForm.idTaller === 0 || this.tallerForm.idSale === '') {
      return; // No guardar si no hay taller cargado
    }

    const oParams: any = {
      idTaller: this.tallerForm.idTaller,
      manoObraPrecio: this.tallerForm.manoObraPrecio,

      idUserLogON: this.idUserLogON,
      idSucursalLogON: 0
    };

    this.salesServ.CUpdateManoObraPrecio(oParams)
      .subscribe({
        next: (resp: ResponseGet) => {
          if (resp.status === 0) {
            this.servicesGServ.showSnakbar('Mano de Obra actualizada correctamente');
            // Pasar el foco al combo de técnicos después de guardar
            this.nextInputFocus(this.cbxTecnicosCBX, 100);
            // Recalcular total del taller
            this.fn_calcularTotalTaller();
          } else {
            this.servicesGServ.showSnakbar('Error al actualizar mano de obra');
          }
        },
        error: (ex) => {
          this.servicesGServ.showSnakbar('Error al guardar mano de obra');
        }
      });
  }

  getTallerManoObra(idTaller: number) {
    var oParams: any = {
      idTaller: idTaller
    };
    this.salesServ.CGetTallerManoObra(oParams)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.manoObraList = resp.status === 0 ? resp.data : [];
          this.fn_calcularTotalManoObra();
        },
        error: (ex) => {
          this.servicesGServ.showSnakbar('Error al cargar mano de obra');
        }
      });
  }

  editManoObraGrid( item: any ){
    this.manoObraForm = {
      idManoObra: item.idManoObra,
      idTecnico: item.idUserTecnico,
      tecnicoDesc: item.tecnicoDesc,
      precio: parseFloat(item.precio)
    };
  }

  //#endregion MÉTODOS DE MANO DE OBRA

  //#region MÉTODOS DE SERVICIOS EXTERNOS

  fn_agregarServicioExterno() {
    // Validaciones
    if (this.servicioExternoForm.idServicioExterno === 0) {
      this.servicesGServ.showSnakbar('Debe seleccionar un servicio externo');
      return;
    }

    if (this.servicioExternoForm.cantidad <= 0) {
      this.servicesGServ.showSnakbar('La cantidad debe ser mayor a 0');
      return;
    }

    if (this.servicioExternoForm.precio <= 0) {
      this.servicesGServ.showSnakbar('El precio debe ser mayor a 0');
      return;
    }

    // Preparar objeto para enviar al backend
    const oParams: any = {
      idTaller: this.tallerForm.idTaller,
      idSale: this.tallerForm.idSale,
      servicioExterno: {
        idServicioExternoDetalle: this.servicioExternoForm.idServicioExternoDetalle,
        idServicioExterno: this.servicioExternoForm.idServicioExterno,
        nombre: this.servicioExternoForm.servicioExternoDesc,
        cantidad: this.servicioExternoForm.cantidad,
        precio: this.servicioExternoForm.precio,
        costo: this.servicioExternoForm.costo,
        total: this.servicioExternoForm.cantidad * this.servicioExternoForm.precio
      }
    };

    this.bShowSpinner = true;
    this.salesServ.CAddServicioExternoTaller(oParams)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.servicesGServ.showAlertIA(resp, false);
          if (resp.status === 0) {
            // Recargar la lista de servicios externos
            this.getTallerServiciosExternos(this.tallerForm.idTaller);
            this.fn_resetServicioExternoForm();
            // Devolver el foco al combobox de servicios externos después de agregar
            this.nextInputFocus(this.cbxServiciosExternosCBX, 100);
          }
          this.bShowSpinner = false;
        },
        error: (ex: HttpErrorResponse) => {
          this.servicesGServ.showSnakbar(ex.error.message || 'Error al guardar servicio externo');
          this.bShowSpinner = false;
        }
      });
  }

  fn_eliminarServicioExterno(item: any) {
    this.servicesGServ.showDialog('¿Estás seguro?'
        , 'Está a punto de eliminar un servicio externo'
        , '¿Desea continuar?'
        , 'Si', 'No')
        .afterClosed().subscribe({
          next: async( resp ) =>{
            if(resp){

              this.bShowSpinner = true;

              const oParams: any = {
                idServicioExternoDetalle: item.idServicioExternoDetalle,
                idUser: this.idUserLogON
              };

              this.salesServ.CDeleteServicioExternoTaller(oParams)
                .subscribe({
                  next: (resp: ResponseDB_CRUD) => {
                    if (resp.status === 0) {
                      this.getTallerServiciosExternos( this.tallerForm.idTaller );
                      this.fn_calcularTotalServiciosExternos();
                    }
                    this.servicesGServ.showAlertIA( resp );
                    this.bShowSpinner = false;
                  },
                  error: (ex: HttpErrorResponse) => {
                    this.servicesGServ.showSnakbar(ex.error.message || 'Error al eliminar servicio externo');
                    this.bShowSpinner = false;
                  }
                });

            }
          }
        });
  }

  fn_calcularTotalServiciosExternos() {
    this.totalServiciosExternos = this.serviciosExternosList.reduce((total, serv) => total + parseFloat( serv.total ), 0);
    this.fn_calcularTotalTaller();
  }

  fn_resetServicioExternoForm() {
    this.servicioExternoForm = {
      idServicioExternoDetalle: 0,
      idServicioExterno: 0,
      servicioExternoDesc: '',
      cantidad: '',
      precio: '',
      costo: ''
    };
  }

  abrirModalServiciosExternos(): void {
    const dialogRef = this.dialog.open(ServiciosExternosModalComponent, {
      width: '900px',
      maxHeight: '90vh',
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().subscribe(result => {
      // Recargar la lista de servicios externos después de cerrar el modal
      if (this.tallerForm.idTaller > 0) {
        this.getTallerServiciosExternos(this.tallerForm.idTaller);
      }
    });
  }

  //#endregion MÉTODOS DE SERVICIOS EXTERNOS

  //#region MÉTODOS DE METAL AGRANEL

  fn_changeMetalTipo(tipo: string) {
    this.metalTipo = tipo;
    this.metalAgranelForm.tipo = tipo;
    this.fn_resetMetalAgranelForm();
    this.nextInputFocus( this.metalAgranelGramosInput, 100);
  }

  fn_resetMetalAgranelForm() {
    this.metalAgranelForm = {
      idMetalAgranel: 0,
      tipo: this.metalTipo,
      gramos: '',
      kilates: 0,
      valorMetal: ''
    };
  }

  fn_agregarMetalAgranel() {
    // Validaciones
    if (this.metalAgranelForm.gramos <= 0) {
      this.servicesGServ.showSnakbar('Los gramos deben ser mayor a 0');
      return;
    }

    if (this.metalAgranelForm.valorMetal <= 0) {
      this.servicesGServ.showSnakbar('El valor del metal debe ser mayor a 0');
      return;
    }

    // Preparar objeto para enviar al backend
    const oParams: any = {
      idTaller: this.tallerForm.idTaller,
      idSale: this.tallerForm.idSale,
      metalAgranel: {
        idMetalAgranel: this.metalAgranelForm.idMetalAgranel,
        tipo: this.metalAgranelForm.tipo,
        gramos: this.metalAgranelForm.gramos,
        kilates: this.metalAgranelForm.kilates,
        valorMetal: this.metalAgranelForm.valorMetal,
        total: this.metalAgranelForm.gramos * this.metalAgranelForm.valorMetal
      }
    };

    this.bShowSpinner = true;
    this.salesServ.CAddMetalAgranel(oParams)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.servicesGServ.showAlertIA(resp, false);
          if (resp.status === 0) {
            // Recargar la lista de metales
            this.getTallerMetalesAgranel(this.tallerForm.idTaller);
            this.fn_resetMetalAgranelForm();
            this.nextInputFocus(this.metalAgranelGramosInput, 100);
          }
          this.bShowSpinner = false;
        },
        error: (ex: HttpErrorResponse) => {
          this.servicesGServ.showSnakbar(ex.error.message || 'Error al guardar metal');
          this.bShowSpinner = false;
        }
      });
  }

  fn_calculateMetalValue() {
    // Validar que haya gramos ingresados
    if (!this.metalAgranelForm.gramos || this.metalAgranelForm.gramos <= 0 || !this.metalAgranelForm.kilates) {
      this.metalAgranelForm.valorMetal = '';
      return;
    }

    // Obtener el precio del kilataje
    this.fxrateServ.CGetPriceByKilataje(this.metalAgranelForm.kilates)
      .subscribe({
        next: (resp: any) => {
          if (resp.status === 0 && resp.data) {
            // Calcular: gramos * precio
            const pricePerGram = resp.data.price;
            this.metalAgranelForm.valorMetal = this.metalAgranelForm.gramos * pricePerGram;
          } else {
            this.servicesGServ.showSnakbar('No se encontró precio para este kilataje');
            this.metalAgranelForm.valorMetal = '';
          }
        },
        error: (ex: HttpErrorResponse) => {
          this.servicesGServ.showSnakbar('Error al obtener el precio: ' + (ex.error.message || 'Error desconocido'));
          this.metalAgranelForm.valorMetal = '';
        }
      });
  }

  fn_eliminarMetalAgranel(idMetalAgranel: number) {
    this.servicesGServ.showDialog('¿Estás seguro?'
        , 'Está a punto de eliminar un metal'
        , '¿Desea continuar?'
        , 'Si', 'No')
        .afterClosed().subscribe({
          next: async( resp ) =>{
            if(resp){

              this.bShowSpinner = true;

              const oParams: any = {
                idMetalAgranel: idMetalAgranel,
                idUser: this.idUserLogON
              };

              this.salesServ.CDeleteMetalAgranel(oParams)
                .subscribe({
                  next: (resp: ResponseDB_CRUD) => {
                    if (resp.status === 0) {
                      this.getTallerMetalesAgranel( this.tallerForm.idTaller );
                      this.fn_calcularTotalMetalAgranel();
                    }
                    this.servicesGServ.showAlertIA( resp );
                    this.bShowSpinner = false;
                  },
                  error: (ex: HttpErrorResponse) => {
                    this.servicesGServ.showSnakbar(ex.error.message || 'Error al eliminar metal');
                    this.bShowSpinner = false;
                  }
                });

            }
          }
        });
  }

  fn_calcularTotalMetalAgranel() {
    this.totalMetalAgranel = this.metalAgranelList.reduce((total, metal) => total + (parseFloat(metal.valorMetal) || 0), 0);
    this.fn_calcularTotalTaller();
  }

  editMetalAgranelGrid( item: any ){
    this.metalTipo = item.tipo;
    this.metalAgranelForm = {
      idMetalAgranel: item.idMetalAgranel,
      tipo: item.tipo,
      gramos: parseFloat(item.gramos),
      kilates: parseInt(item.kilates) || 8,
      valorMetal: parseFloat(item.valorMetal)
    };
  }

  //#endregion MÉTODOS DE METAL AGRANEL

  //#region MÉTODOS DE ACTIVO DEL CLIENTE

  fn_changeMetalClienteTipo(tipo: string) {
    this.metalClienteTipo = tipo;
    this.metalClienteForm.tipo = tipo;
    this.fn_resetMetalClienteForm();
    this.nextInputFocus( this.metalClienteGramosInput, 100);
  }

  fn_resetMetalClienteForm() {
    this.metalClienteForm = {
      idMetalCliente: 0,
      tipo: this.metalClienteTipo,
      gramos: '',
      kilates: 0,
      valorMetal: ''
    };
  }

  fn_calculateMetalClienteValue() {
    // Validar que haya gramos ingresados
    if (!this.metalClienteForm.gramos || this.metalClienteForm.gramos <= 0 || !this.metalClienteForm.kilates) {
      this.metalClienteForm.valorMetal = '';
      return;
    }

    // Obtener el precio del kilataje
    this.fxrateServ.CGetPriceByKilataje(this.metalClienteForm.kilates)
      .subscribe({
        next: (resp: any) => {
          if (resp.status === 0 && resp.data) {
            // Calcular: gramos * precio
            const pricePerGram = resp.data.price;
            this.metalClienteForm.valorMetal = this.metalClienteForm.gramos * pricePerGram;
          } else {
            this.servicesGServ.showSnakbar('No se encontró precio para este kilataje');
            this.metalClienteForm.valorMetal = '';
          }
        },
        error: (ex: HttpErrorResponse) => {
          this.servicesGServ.showSnakbar('Error al obtener el precio: ' + (ex.error.message || 'Error desconocido'));
          this.metalClienteForm.valorMetal = '';
        }
      });
  }

  fn_agregarMetalCliente() {
    // Validaciones
    if (this.metalClienteForm.gramos <= 0) {
      this.servicesGServ.showSnakbar('Los gramos deben ser mayor a 0');
      return;
    }

    if (this.metalClienteForm.valorMetal <= 0) {
      this.servicesGServ.showSnakbar('El valor del metal debe ser mayor a 0');
      return;
    }

    // Preparar objeto para enviar al backend
    const oParams: any = {
      idTaller: this.tallerForm.idTaller,
      idSale: this.tallerForm.idSale,
      metalCliente: {
        idMetalCliente: this.metalClienteForm.idMetalCliente,
        tipo: this.metalClienteForm.tipo,
        gramos: this.metalClienteForm.gramos,
        kilates: this.metalClienteForm.kilates,
        valorMetal: this.metalClienteForm.valorMetal,
        total: this.metalClienteForm.gramos * this.metalClienteForm.valorMetal
      }
    };

    this.bShowSpinner = true;
    this.salesServ.CAddMetalCliente(oParams)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.servicesGServ.showAlertIA(resp, false);
          if (resp.status === 0) {
            // Recargar la lista de metales
            this.getTallerMetalesCliente(this.tallerForm.idTaller);
            this.fn_resetMetalClienteForm();
            this.nextInputFocus(this.metalClienteGramosInput, 100);
          }
          this.bShowSpinner = false;
        },
        error: (ex: HttpErrorResponse) => {
          this.servicesGServ.showSnakbar(ex.error.message || 'Error al guardar metal del cliente');
          this.bShowSpinner = false;
        }
      });
  }

  fn_eliminarMetalCliente(idMetalCliente: number) {
    this.servicesGServ.showDialog('¿Estás seguro?'
        , 'Está a punto de eliminar un metal del cliente'
        , '¿Desea continuar?'
        , 'Si', 'No')
        .afterClosed().subscribe({
          next: async( resp ) =>{
            if(resp){

              this.bShowSpinner = true;

              const oParams: any = {
                idMetalCliente: idMetalCliente,
                idUser: this.idUserLogON
              };

              this.salesServ.CDeleteMetalCliente(oParams)
                .subscribe({
                  next: (resp: ResponseDB_CRUD) => {
                    if (resp.status === 0) {
                      this.getTallerMetalesCliente( this.tallerForm.idTaller );
                      this.fn_calcularTotalMetalCliente();
                    }
                    this.servicesGServ.showAlertIA( resp );
                    this.bShowSpinner = false;
                  },
                  error: (ex: HttpErrorResponse) => {
                    this.servicesGServ.showSnakbar(ex.error.message || 'Error al eliminar metal del cliente');
                    this.bShowSpinner = false;
                  }
                });

            }
          }
        });
  }

  fn_calcularTotalMetalCliente() {
    this.totalMetalCliente = this.metalClienteList.reduce((total, metal) => total + (parseFloat(metal.valorMetal) || 0), 0);
    this.fn_calcularTotalTaller();
  }

  editMetalClienteGrid( item: any ){
    this.metalClienteTipo = item.tipo;
    this.metalClienteForm = {
      idMetalCliente: item.idMetalCliente,
      tipo: item.tipo,
      gramos: parseFloat(item.gramos),
      kilates: parseInt(item.kilates) || 8,
      valorMetal: parseFloat(item.valorMetal)
    };
  }

  openMetalClienteImagesDialog(item: any) {
    let OParams: any = {
      idMetalCliente: item.idMetalCliente
    }

      this.servicesGServ.showModalWithParams( MetalClienteImagesComponent, OParams, '900px')
      .afterClosed().subscribe({
        next: ( resp ) =>{
          this.getTallerMetalesCliente( this.tallerForm.idTaller );
        }
    });
  }

  openTallerHeaderImagesDialog() {
    let OParams: any = {
      idTaller: this.tallerForm.idTaller
    }

      this.servicesGServ.showModalWithParams( TallerHeaderImagesComponent, OParams, '900px')
      .afterClosed().subscribe({
        next: ( resp ) =>{
          // Recargar el conteo de imágenes después de cerrar el diálogo
          this.fn_loadTallerHeaderImagesCount(this.tallerForm.idTaller);
        }
    });
  }

  fn_loadTallerHeaderImagesCount(idTaller: number) {
    const oParams: any = {
      idTaller: idTaller
    };
    this.salesServ.getMetalClienteImages(oParams)
      .subscribe({
        next: (resp: ResponseGet) => {
          if (resp.status === 0) {
            const imagesArray = resp.data.imagesDetail || [];
            this.tallerForm.headerImagesCount = imagesArray.length;
          }
        },
        error: (ex: HttpErrorResponse) => {
          // Silenciosamente ignorar errores en el conteo
          this.tallerForm.headerImagesCount = 0;
        }
      });
  }

  fn_createTallerOrder() {
    this.servicesGServ.showDialog('¿Estás seguro?'
        , 'Está a punto de convertir este taller en un pedido'
        , '¿Desea continuar?'
        , 'Si', 'No')
        .afterClosed().subscribe({
          next: (resp) => {
            if (resp) {
              this.bShowSpinner = true;

              // Calcular el total del taller
              this.fn_calcularTotalTaller();

              const oParams: any = {
                idTaller: this.tallerForm.idTaller,
                idTallerStatus: 2,
                precioTotal: this.totalTaller,
                idUser: this.idUserLogON
              };

              this.salesServ.CUpdateTallerStatus(oParams)
                .subscribe({
                  next: (respUpdate: ResponseDB_CRUD) => {
                    if (respUpdate.status === 0) {
                      this.servicesGServ.showSnakbar('Pedido de taller creado correctamente');
                      this.tallerForm.idTallerStatus = 2;
                    } else {
                      this.servicesGServ.showSnakbar('Error al crear el pedido de taller');
                    }
                    this.bShowSpinner = false;
                  },
                  error: (ex: HttpErrorResponse) => {
                    this.servicesGServ.showSnakbar(ex.error.message || 'Error al crear pedido de taller');
                    this.bShowSpinner = false;
                  }
                });
            }
          }
        });
  }

  fn_assignTallerOrder() {
    this.servicesGServ.showDialog('¿Estás seguro?'
        , 'Está a punto de asignar este pedido de taller'
        , '¿Desea continuar?'
        , 'Si', 'No')
        .afterClosed().subscribe({
          next: (resp) => {
            if (resp) {
              this.bShowSpinner = true;

              const oParams: any = {
                idTaller: this.tallerForm.idTaller,
                idTallerStatus: 3,
                precioTotal: this.totalTaller,
                idUser: this.idUserLogON
              };

              this.salesServ.CUpdateTallerStatus(oParams)
                .subscribe({
                  next: (respUpdate: ResponseDB_CRUD) => {
                    if (respUpdate.status === 0) {
                      this.servicesGServ.showSnakbar('Pedido de taller asignado correctamente');
                      this.tallerForm.idTallerStatus = 3;
                    } else {
                      this.servicesGServ.showSnakbar('Error al asignar el pedido de taller');
                    }
                    this.bShowSpinner = false;
                  },
                  error: (ex: HttpErrorResponse) => {
                    this.servicesGServ.showSnakbar(ex.error.message || 'Error al asignar pedido de taller');
                    this.bShowSpinner = false;
                  }
                });
            }
          }
        });
  }

  fn_finalizeTallerOrder() {
    this.servicesGServ.showDialog('¿Estás seguro?'
        , 'Está a punto de finalizar este pedido de taller'
        , '¿Desea continuar?'
        , 'Si', 'No')
        .afterClosed().subscribe({
          next: (resp) => {
            if (resp) {
              this.bShowSpinner = true;

              const oParams: any = {
                idTaller: this.tallerForm.idTaller,
                idTallerStatus: 4,
                precioTotal: this.totalTaller,
                idUser: this.idUserLogON
              };

              this.salesServ.CUpdateTallerStatus(oParams)
                .subscribe({
                  next: (respUpdate: ResponseDB_CRUD) => {
                    if (respUpdate.status === 0) {
                      this.servicesGServ.showSnakbar('Pedido de taller finalizado correctamente');
                      this.tallerForm.idTallerStatus = 4;
                    } else {
                      this.servicesGServ.showSnakbar('Error al finalizar el pedido de taller');
                    }
                    this.bShowSpinner = false;
                  },
                  error: (ex: HttpErrorResponse) => {
                    this.servicesGServ.showSnakbar(ex.error.message || 'Error al finalizar pedido de taller');
                    this.bShowSpinner = false;
                  }
                });
            }
          }
        });
  }

  fn_deliverTallerOrder() {
    this.servicesGServ.showDialog('¿Estás seguro?'
        , 'Está a punto de marcar este pedido como entregado'
        , '¿Desea continuar?'
        , 'Si', 'No')
        .afterClosed().subscribe({
          next: (resp) => {
            if (resp) {
              this.bShowSpinner = true;

              const oParams: any = {
                idTaller: this.tallerForm.idTaller,
                idTallerStatus: 5,
                precioTotal: this.totalTaller,
                idUser: this.idUserLogON
              };

              this.salesServ.CUpdateTallerStatus(oParams)
                .subscribe({
                  next: (respUpdate: any) => {
                    if (respUpdate.status === 0) {
                      this.servicesGServ.showSnakbar('Pedido de taller entregado correctamente');
                      this.tallerForm.idTallerStatus = 5;
                      this.tallerForm.fechaEntrega = respUpdate.data.fechaEntrega;
                    } else {
                      this.servicesGServ.showSnakbar('Error al entregar el pedido de taller');
                    }
                    this.bShowSpinner = false;
                  },
                  error: (ex: HttpErrorResponse) => {
                    this.servicesGServ.showSnakbar(ex.error.message || 'Error al entregar pedido de taller');
                    this.bShowSpinner = false;
                  }
                });
            }
          }
        });
  }

  //#endregion MÉTODOS DE ACTIVO DEL CLIENTE

  //#region MÉTODOS DEL FRONT

  editRefaccionGrid( item: any ){

    this.refaccionTipo = item.idProduct > 0 ? 'producto' : 'porDefinir'; // 'producto' o 'porDefinir'

    this.refaccionForm = {
      tipo: this.refaccionTipo,
      idRefaccion: item.idRefaccion,
      idProduct: item.idProduct,
      productDesc: item.productDesc,
      cantidad: parseFloat(item.cantidad),
      precio: parseFloat(item.precio),
      costo: parseFloat(item.costo)
    };
  }

  editServicioExternoGrid( item: any ){

    this.servicioExternoForm = {
      idServicioExternoDetalle: item.idServicioExternoDetalle,
      idServicioExterno: item.idServicioExterno,
      servicioExternoDesc: item.servicioExtName,
      cantidad: parseFloat(item.cantidad),
      precio: parseFloat(item.precio),
      costo: parseFloat(item.costo)
    };
  }

  fn_closeDialog(data?: any): void {
    this.dialogRef.close(data);
  }

  fn_cancel() {
    this.fn_closeDialog();
  }

  //--------------------------------------------------------------------------
    // MÉTODOS PARA COMBO DE ÁREAS

    cbxProducts: any[] = [];

    cbxProducts_Search() {

      var oParams: any = {
        iOption: 2,
        search: this.refaccionForm.productDesc
      }

      this.productsServ.CCbxGetProductsCombo( oParams )
        .subscribe( {
          next: (resp: ResponseGet) =>{
            if(resp.status === 0){
              this.cbxProducts = resp.data
            }
            else{
            this.cbxProducts = [];
            }
          },
          error: (ex) => {
            this.servicesGServ.showSnakbar( "Problemas con el servicio" );
            this.bShowSpinner = false;
          }
        });
    }

    cbxProducts_SelectedOption( event: MatAutocompleteSelectedEvent ) {

      this.cbxProducts_Clear();

      setTimeout (() => {
        const ODataCbx: any = event.option.value;
        this.refaccionForm.idProduct = ODataCbx.idProduct;
        this.refaccionForm.productDesc = ODataCbx.name;
        this.refaccionForm.costo = ODataCbx.cost;
        this.refaccionForm.precio = ODataCbx.price;
        this.nextInputFocus( this.refaccionCantidadInput, 100);
      }, 100);

    }

    cbxProducts_Clear(){
      this.refaccionForm.idProduct = 0;
      this.refaccionForm.productDesc = '';
      this.refaccionForm.costo = '';
      this.refaccionForm.precio = '';
    }
    //--------------------------------------------------------------------------

  //#endregion MÉTODOS DE COMBOS PRODUCTOS

  //#region MÉTODOS DE COMBOS CLIENTES Y VENDEDORES

  cbxCustomers: any[] = [];

  CBXskeyup( iOption: number, txt: string ){

    let cbxKeyUp: any = {
      iOption: iOption,
      txt: txt
    }

    this.timeCBXskeyup.next( cbxKeyUp );
  }

  cbxCustomers_Search() {
      this.customersServ.CCbxGetCustomersCombo( this.tallerForm.customerDesc, this.idUserLogON )
       .subscribe( {
         next: (resp: ResponseGet) =>{
           if(resp.status === 0){
             this.cbxCustomers = resp.data;
             this.tallerForm.customerResp = '';

           }
           else{
            this.cbxCustomers = [];
            this.tallerForm.customerResp = resp.message;
           }
         },
         error: (ex) => {
           this.servicesGServ.showSnakbar( "Problemas con el servicio" );
           this.bShowSpinner = false;
         }
       });
  }

  cbxCustomers_SelectedOption( event: MatAutocompleteSelectedEvent ) {

    this.cbxCustomers_Clear();

    setTimeout (() => {

      const ODataCbx: any = event.option.value;

      this.tallerForm.idCustomer =  ODataCbx.idCustomer;
      this.tallerForm.customerDesc = ODataCbx.name;

      // Pasar el foco a la descripción después de seleccionar cliente
      this.nextInputFocus(this.descripcionInput, 100);

    }, 1);

  }

  cbxCustomers_Clear(){
    this.tallerForm.idCustomer = 0;
    this.tallerForm.customerDesc = '';
    this.tallerForm.customerResp = '';
  }

  cbxSellers: any[] = [];

  cbxSellers_Search() {
      this.userServ.CCbxGetSellersCombo( this.tallerForm.sellerDesc, this.idUserLogON )
       .subscribe( {
         next: (resp: ResponseGet) =>{
           if(resp.status === 0){
             this.cbxSellers = resp.data;
             this.tallerForm.sellerResp = '';

           }
           else{
            this.cbxSellers = [];
            this.tallerForm.sellerResp = resp.message;
           }
         },
         error: (ex) => {
           this.servicesGServ.showSnakbar( "Problemas con el servicio" );
           this.bShowSpinner = false;
         }
       });
  }

  cbxSellers_SelectedOption( event: MatAutocompleteSelectedEvent ) {

    this.cbxSellers_Clear();

    setTimeout (() => {

      const ODataCbx: any = event.option.value;

      this.tallerForm.idSeller_idUser =  ODataCbx.idUser;
      this.tallerForm.sellerDesc = ODataCbx.name;
      this.tallerForm.sellerResp = '';

      // Pasar el foco al cliente después de seleccionar vendedor
      this.nextInputFocus(this.cbxCustomerCBX, 100);

    }, 1);

  }

  cbxSellers_Clear(){
    this.tallerForm.idSeller_idUser = 0;
    this.tallerForm.sellerDesc = '';
    this.tallerForm.sellerResp = '';
  }

  nextInputFocus(inputRef: ElementRef, time: number) {
    setTimeout(() => {
      if (inputRef && inputRef.nativeElement) {
        inputRef.nativeElement.focus();
      }
    }, time);
  }



  //--------------------------------------------------------------------------

  cbxServiciosExternos: any[] = [];

  cbxServiciosExternos_Search() {
    this.salesServ.CCbxGetServiciosExternosCombo( this.servicioExternoForm.servicioExternoDesc )
      .subscribe({
        next: (resp: ResponseGet) => {
          this.cbxServiciosExternos = resp.status === 0 ? resp.data : [];
        },
        error: (ex) => {
          this.servicesGServ.showSnakbar("Problemas con el servicio");
          this.bShowSpinner = false;
        }
      });
  }

  cbxServiciosExternos_SelectedOption(event: MatAutocompleteSelectedEvent) {
    this.cbxServiciosExternos_Clear();
    setTimeout(() => {
      const ODataCbx: any = event.option.value;
      this.servicioExternoForm.idServicioExterno = ODataCbx.id;
      this.servicioExternoForm.servicioExternoDesc = ODataCbx.name;
      this.nextInputFocus( this.servicioExternoCantidadInput, 100);
    }, 100);
  }

  cbxServiciosExternos_Clear() {
    this.servicioExternoForm.idServicioExterno = 0;
    this.servicioExternoForm.servicioExternoDesc = '';
  }

  fn_focusServicioExternoCosto() {
    this.nextInputFocus(this.servicioExternoCostoInput, 100);
  }

  fn_focusServicioExternoPrecio() {
    this.nextInputFocus(this.servicioExternoPrecioInput, 100);
  }

  fn_focusMetalAgranelKilates() {
    this.nextInputFocus(this.metalAgranelKilatesSelect, 100);
    setTimeout(() => {
      this.metalAgranelKilatesSelectRef?.open();
    }, 150);
  }

  fn_focusMetalAgranelValor() {
    this.nextInputFocus(this.metalAgranelValorMetalInput, 100);
  }

  fn_focusMetalClienteKilates() {
    this.nextInputFocus(this.metalClienteKilatesSelect, 100);
    setTimeout(() => {
      this.metalClienteKilatesSelectRef?.open();
    }, 150);
  }

  fn_focusMetalClienteValor() {
    this.nextInputFocus(this.metalClienteValorMetalInput, 100);
  }

  fn_onMetalAgranelKilatesChange() {
    this.fn_calculateMetalValue();
    this.fn_focusMetalAgranelValor();
  }

  fn_onMetalClienteKilatesChange() {
    this.fn_calculateMetalClienteValue();
    this.fn_focusMetalClienteValor();
  }

  //--------------------------------------------------------------------------

  // MÉTODOS PARA COMBO DE TÉCNICOS

  cbxTecnicos_Search() {
    this.userServ.CCbxGetTecnicosCombo(this.manoObraForm.tecnicoDesc)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.cbxTecnicos = resp.status === 0 ? resp.data : [];
        },
        error: (ex) => {
          this.servicesGServ.showSnakbar("Problemas al cargar técnicos");
        }
      });
  }

  cbxTecnicos_SelectedOption(event: MatAutocompleteSelectedEvent) {
    this.cbxTecnicos_Clear();
    setTimeout(() => {
      const ODataCbx: any = event.option.value;
      this.manoObraForm.idTecnico = ODataCbx.id;
      this.manoObraForm.tecnicoDesc = ODataCbx.nombre;
      this.nextInputFocus( this.manoObraCantidadInput, 100);
    }, 100);
  }

  cbxTecnicos_Clear() {
    this.manoObraForm.idTecnico = 0;
    this.manoObraForm.tecnicoDesc = '';
  }

  //--------------------------------------------------------------------------

  comboBoxKeyUp(sOption: string, txt: string, event: KeyboardEvent) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      let oCbxKeyUp: any = { sOption, txt: txt };
      this.timeCBXskeyup.next(oCbxKeyUp);
    }
  }

  //#endregion MÉTODOS DE COMBOS CLIENTES Y VENDEDORES
}

