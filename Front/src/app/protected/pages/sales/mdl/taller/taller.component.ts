import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { SalesService } from 'src/app/protected/services/sales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { Subject, debounceTime } from 'rxjs';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { UsersService } from 'src/app/protected/services/users.service';
import { CustomersService } from 'src/app/protected/services/customers.service';
import { ProductsService } from 'src/app/protected/services/products.service';

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
    fechaEntregada: '',
    status: '',
    idTallerStatus: 0
  };

  // VARIABLES DE REFACCIONES
  refaccionTipo: string = 'producto'; // 'producto' o 'porDefinir'

  productosList: any[] = [];
  refaccionForm: any = {
    tipo: 'producto',
    idRefaccion: 0,
    idProduct: 0,
    productDesc: '',
    cantidad: 1,
    precio: 0,
    costo: 0
  };

  refaccionesList: any[] = [];
  totalRefacciones: number = 0;

  // VARIABLES DE SERVICIOS EXTERNOS
  servicioExternoForm: any = {
    idServicioExternoDetalle: 0,
    idServicioExterno: 0,
    servicioExternoDesc: '',
    cantidad: 1,
    precio: 0,
    costo: 0
  };
  serviciosExternosList: any[] = [];
  totalServiciosExternos: number = 0;

  // VARIABLES DE METAL AGRANEL
  metalTipo: string = 'oro'; // 'oro' o 'plata'

  metalAgranelForm: any = {
    idMetalAgranel: 0,
    tipo: 'oro',
    gramos: 0,
    kilates: 8,
    valorMetal: 0
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
    gramos: 0,
    kilates: 8,
    valorMetal: 0
  };

  kilatajes_oro_cliente: number[] = [8, 10, 12, 14, 16, 18, 20, 22, 24];
  kilatajes_plata_cliente: number[] = [1000, 925, 720];
  metalClienteList: any[] = [];
  totalMetalCliente: number = 0;

  // VARIABLES DE IMÁGENES METAL CLIENTE
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  metalClienteImages: any[] = [];
  currentImageIndex: number = 0;

  get kilatajes_cliente(): number[] {
    return this.metalClienteTipo === 'plata' ? this.kilatajes_plata_cliente : this.kilatajes_oro_cliente;
  }

  // VARIABLES DE MANO DE OBRA
  manoObraList: any[] = [];
  totalManoObra: number = 0;

  //#endregion

  constructor(
    private dialogRef: MatDialogRef<TallerComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any

    , private _adapter: DateAdapter<any>
    , @Inject(MAT_DATE_LOCALE) private _locale: string

    , private authServ: AuthService
    , private salesServ: SalesService
    , private servicesGServ: ServicesGService
    , private userServ: UsersService
    , private customersServ: CustomersService
    , private productsServ: ProductsService

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
      }

    })

    if (this.ODataP && this.ODataP.idTaller > 0) {
      this.fn_getTallerData(this.ODataP.idTaller);
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
            fechaEntregada: data.fechaEntregada || '',
            idCustomer: data.idCustomer || 0,
            customerDesc: data.customerDesc || '',
            idSeller_idUser: data.idSeller_idUser || 0,
            sellerDesc: data.sellerDesc || '',
            idTallerStatus: data.idTallerStatus || 0,
          };

          this.refaccionesList = resp.data.refaccionesDetail || [];
          this.serviciosExternosList = resp.data.serviciosExternos || [];
          this.metalAgranelList = resp.data.metalesAgranel || [];
          this.metalClienteList = resp.data.metalesCliente || [];

          this.fn_calcularTotalRefacciones();
          this.fn_calcularTotalServiciosExternos();
          this.fn_calcularTotalMetalAgranel();
          this.fn_calcularTotalMetalCliente();
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
  }

  fn_resetRefaccionForm() {
    this.refaccionForm = {
      tipo: this.refaccionTipo,
      idRefaccion: 0,
      idProduct: 0,
      productDesc: '',
      cantidad: 1,
      precio: 0,
      costo: 0
    };
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
      if (this.refaccionForm.costo <= 0) {
        this.servicesGServ.showSnakbar('El costo debe ser mayor a 0');
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

  fn_calcularTotalRefacciones() {
    this.totalRefacciones = this.refaccionesList.reduce((total, ref) => total + parseFloat( ref.total ), 0);
  }

  //#endregion MÉTODOS DE REFACCIONES

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
  }

  fn_resetServicioExternoForm() {
    this.servicioExternoForm = {
      idServicioExternoDetalle: 0,
      idServicioExterno: 0,
      servicioExternoDesc: '',
      cantidad: 1,
      precio: 0,
      costo: 0
    };
  }

  //#endregion MÉTODOS DE SERVICIOS EXTERNOS

  //#region MÉTODOS DE METAL AGRANEL

  fn_changeMetalTipo(tipo: string) {
    this.metalTipo = tipo;
    this.metalAgranelForm.tipo = tipo;
    this.fn_resetMetalAgranelForm();
  }

  fn_resetMetalAgranelForm() {
    const defaultKilates = this.metalTipo === 'plata' ? 1000 : 8;
    this.metalAgranelForm = {
      idMetalAgranel: 0,
      tipo: this.metalTipo,
      gramos: 0,
      kilates: defaultKilates,
      valorMetal: 0
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
          }
          this.bShowSpinner = false;
        },
        error: (ex: HttpErrorResponse) => {
          this.servicesGServ.showSnakbar(ex.error.message || 'Error al guardar metal');
          this.bShowSpinner = false;
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
  }

  fn_resetMetalClienteForm() {
    const defaultKilates = this.metalClienteTipo === 'plata' ? 1000 : 8;
    this.metalClienteForm = {
      idMetalCliente: 0,
      tipo: this.metalClienteTipo,
      gramos: 0,
      kilates: defaultKilates,
      valorMetal: 0
    };
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

  //#endregion MÉTODOS DE ACTIVO DEL CLIENTE

  //#region MÉTODOS DE IMÁGENES METAL CLIENTE

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  uploadMetalClienteImage(): void {
    if (!this.selectedFile) {
      this.servicesGServ.showSnakbar('Debe seleccionar una imagen');
      return;
    }

    if (this.metalClienteForm.idMetalCliente === 0) {
      this.servicesGServ.showSnakbar('Debe crear el metal primero');
      return;
    }

    this.bShowSpinner = true;
    this.salesServ.uploadMetalClienteImage(this.selectedFile, this.metalClienteForm.idMetalCliente)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.servicesGServ.showAlertIA(resp, false);
          if (resp.status === 0) {
            this.getMetalClienteImages(this.metalClienteForm.idMetalCliente);
            this.selectedFile = null;
            this.imagePreview = null;
            // Limpiar input file
            const fileInput = document.getElementById('metalClienteImageInput') as HTMLInputElement;
            if (fileInput) {
              fileInput.value = '';
            }
          }
          this.bShowSpinner = false;
        },
        error: (ex: HttpErrorResponse) => {
          this.servicesGServ.showSnakbar(ex.error.message || 'Error al subir imagen');
          this.bShowSpinner = false;
        }
      });
  }

  getMetalClienteImages(idMetalCliente: number): void {
    this.bShowSpinner = true;
    const oParams: any = {
      idMetalCliente: idMetalCliente
    };
    this.salesServ.getMetalClienteImages(oParams)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.bShowSpinner = false;
          if (resp.status === 0) {
            this.metalClienteImages = resp.data.imagesDetail || [];
            this.currentImageIndex = 0;
          }
        },
        error: (ex: HttpErrorResponse) => {
          this.servicesGServ.showSnakbar(ex.error.message || 'Error al cargar imágenes');
          this.bShowSpinner = false;
        }
      });
  }

  nextImage(): void {
    if (this.metalClienteImages.length > 0) {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.metalClienteImages.length;
    }
  }

  prevImage(): void {
    if (this.metalClienteImages.length > 0) {
      this.currentImageIndex = (this.currentImageIndex - 1 + this.metalClienteImages.length) % this.metalClienteImages.length;
    }
  }

  deleteMetalClienteImage(keyX: number): void {
    this.servicesGServ.showDialog('¿Estás seguro?'
        , 'Está a punto de eliminar esta imagen'
        , '¿Desea continuar?'
        , 'Si', 'No')
        .afterClosed().subscribe({
          next: async( resp ) =>{
            if(resp){

              this.bShowSpinner = true;

              const oParams: any = {
                keyX: keyX,
                idUser: this.idUserLogON
              };

              this.salesServ.deleteMetalClienteImage(oParams)
                .subscribe({
                  next: (resp: ResponseDB_CRUD) => {
                    if (resp.status === 0) {
                      this.getMetalClienteImages(this.metalClienteForm.idMetalCliente);
                    }
                    this.servicesGServ.showAlertIA( resp );
                    this.bShowSpinner = false;
                  },
                  error: (ex: HttpErrorResponse) => {
                    this.servicesGServ.showSnakbar(ex.error.message || 'Error al eliminar imagen');
                    this.bShowSpinner = false;
                  }
                });

            }
          }
        });
  }

  //#endregion MÉTODOS DE IMÁGENES METAL CLIENTE

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
      }, 1);

    }

    cbxProducts_Clear(){
      this.refaccionForm.idProduct = 0;
      this.refaccionForm.productDesc = '';
      this.refaccionForm.costo = 0;
      this.refaccionForm.precio = 0;
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
    }, 1);
  }

  cbxServiciosExternos_Clear() {
    this.servicioExternoForm.idServicioExterno = 0;
    this.servicioExternoForm.servicioExternoDesc = '';
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

