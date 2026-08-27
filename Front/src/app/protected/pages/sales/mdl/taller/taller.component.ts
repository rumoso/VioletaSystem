import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatSelect } from '@angular/material/select';
import { MatDatepicker } from '@angular/material/datepicker';
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
import { TallerFirmaModalComponent } from './taller-firma-modal.component';
import { TallerFirmaHistorialModalComponent } from './taller-firma-historial-modal.component';
import { TallerResponsablesDevolucionModalComponent } from './taller-responsables-devolucion-modal.component';
import { PaymentsComponent } from '../payments/payments.component';
import { ActionAuthorizationComponent } from '../../../security/users/mdl/action-authorization/action-authorization.component';
import { PrintTicketService } from 'src/app/protected/services/print-ticket.service';
import { MetalInventarioService } from 'src/app/protected/services/metal-inventario.service';
import { GarantiaComponent } from '../garantia/garantia.component';

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
  @ViewChild('refaccionProductoPrecioInput') refaccionProductoPrecioInput!: ElementRef;
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
    // Garantías (analisis/016): idTallerOrigen es la ÚNICA fuente del
    // vínculo, porque el folio ya no lo lleva dentro.
    bEsGarantia: 0,
    idTallerOrigen: '',
    idTallerOrigenID: 0,
    origenClienteDesc: '',
    origenFechaEntrega: '',
    headerImagesCount: 0,
    pagado: 0,
    pendingAmount: 0,
    saleTotal: 0
  };

  oFirmaStatus: any = null;
    oPagos: any[] = [];

    // Garantías levantadas SOBRE este folio (solo si es un taller normal).
    aGarantias: any[] = [];

    // Precio de la garantía: se captura a mano. No hay ningún cálculo
    // detrás — es lo que se le va a cobrar al cliente, que puede ser
    // nada. El costo interno (refacciones, mano de obra, metal) se sigue
    // registrando aparte como en cualquier folio.
    //
    // Arranca VACÍO, no en '0': el 0 va en el placeholder. Un campo de
    // dinero con un 0 escrito obliga a borrarlo antes de teclear el
    // importe — es el mismo criterio que ya se aplicó en Pagos.
    precioGarantia: any = '';

    // Control del patrón chip ↔ campo editable en el header
      // Valores: 'seller' | 'customer' | 'fechaPrometida' | 'fechaEntregada' | null
      editingHeaderField: string | null = null;

      // ViewChilds de los datepickers del header (referenciados desde ng-templates)
      @ViewChild('pickerPromesa') pickerPromesaRef!: MatDatepicker<any>;
      @ViewChild('pickerEntrega') pickerEntregaRef!: MatDatepicker<any>;

      // ViewChilds de los <input> dentro de los <ng-template> de los chips del header
      // (vendedor y cliente ya están declarados arriba: cbxSellerCBX, cbxCustomerCBX)
      @ViewChild('cbxFechaPrometidaInput') cbxFechaPrometidaInput!: ElementRef;

      // Foco pendiente: si llega un pedido de foco antes de que la vista esté lista
      // (típico en ngOnInit), se aplica apenas Angular termina el primer render.
      private _pendingFocusField: 'seller' | 'customer' | 'fechaPrometida' | 'fechaEntregada' | null = null;
      private _focusApplied = false;

      /**
       * Cadena de foco inteligente para talleres NUEVOS.
       * Abre el chip del campo correspondiente y enfoca su input.
       * Si el campo es una fecha, además abre el datepicker.
       * Usado en: ngOnInit (al crear), optionSelected (vendedor/cliente),
       *            dateChange (fechas).
       *
       * Estrategia de focus robusta: dos intentos con setTimeout (200ms y 500ms)
       * porque el chip se renderiza dentro de un <ng-template> que Angular tarda
       * en materializar, y el <mat-autocomplete> de Material añade un overlay que
       * puede interferir si el foco se aplica muy temprano.
       */
      fn_focusHeaderField(field: 'seller' | 'customer' | 'fechaPrometida' | 'fechaEntregada' | null): void {
        if (!field) return;
        this.editingHeaderField = field;
        this._pendingFocusField = field;

        // Si es fecha, NO enfocar el input: el usuario pidió que el foco quede
        // en el datepicker (popup de Material) al pasar a la fecha prometida.
        // El input es solo un disparador; el <input [matDatepicker]> ya está
        // conectado al picker via template, así que picker.open() funciona sin focus.
        if (field === 'fechaPrometida') {
          // Doble intento: 200ms (ng-template ya renderizado) y 500ms (respaldo)
          const tryOpen = (delay: number) => {
            setTimeout(() => {
              if (this._pendingFocusField !== field) return;
              this.fn_openHeaderDatepicker('prometida');
            }, delay);
          };
          tryOpen(200);
          tryOpen(500);
          return;
        }

        const tryFocus = (delay: number) => {
          setTimeout(() => {
            // Solo aplicar si sigue siendo el mismo pedido y no se aplicó antes
            if (this._pendingFocusField !== field) return;

            let inputRef: ElementRef | undefined;
            switch (field) {
              case 'seller':           inputRef = this.cbxSellerCBX; break;
              case 'customer':         inputRef = this.cbxCustomerCBX; break;
              case 'fechaEntregada':   return;
            }
            const el: HTMLElement | undefined = inputRef?.nativeElement;
            if (el && document.activeElement !== el) {
              el.focus();
              // Si después del focus el navegador lo rechazó (sigue otro elemento activo),
              // lo intentamos de nuevo en el siguiente tick
              if (document.activeElement !== el) {
                setTimeout(() => { if (document.activeElement !== el) el.focus(); }, 0);
              }
            }
          }, delay);
        };

        // Primer intento: 200ms (cubre el render del ng-template + primer paint de Material)
        tryFocus(200);
        // Segundo intento de respaldo: 500ms (cubre el caso donde el overlay del autocomplete
        // o el primer paint del Material form-field desplazó el input)
        tryFocus(500);
      }

      fn_editHeaderField(field: string): void {
        this.editingHeaderField = field;
      }

      fn_closeHeaderField(): void {
        this.editingHeaderField = null;
      }

      /**
       * Abre el datepicker del header correspondiente.
       * Se llama desde el HTML (input click o icono click) porque las template refs
       * dentro de <ng-template> no son accesibles directamente desde el template.
       */
      fn_openHeaderDatepicker(which: 'prometida' | 'entrega'): void {
        setTimeout(() => {
          const picker =
            which === 'prometida' ? this.pickerPromesaRef :
            this.pickerEntregaRef;
          if (picker) {
            picker.open();
          }
        }, 0);
      }

  // VARIABLES DE REFACCIONES
  refaccionTipo: string = 'producto'; // 'producto' o 'porDefinir'
  // Índice del tab activo del mat-tab-group (0 = Producto, 1 = Por Definir).
  // Refleja refaccionTipo pero permite que mat-tab-group controle el cambio
  // vía two-way binding sin disparar el radio button legacy.
  refaccionTabIndex: number = 0;

  productosList: any[] = [];
  refaccionForm: any = {
    tipo: 'producto',
    idRefaccion: 0,
    idProduct: 0,
    productDesc: '',
    cantidad: 1,
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
    valorMetal: '',
    costoMetal: ''
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
    valorMetal: '',
    costoMetal: ''
  };

  kilatajes_oro_cliente: number[] = [8, 10, 12, 14, 16, 18, 20, 22, 24];
  kilatajes_plata_cliente: number[] = [1000, 925, 720];
  metalClienteList: any[] = [];
  totalMetalCliente: number = 0;

  get kilatajes_cliente(): number[] {
    return this.metalClienteTipo === 'plata' ? this.kilatajes_plata_cliente : this.kilatajes_oro_cliente;
  }

  // VARIABLES DE METAL FINAL
  metalFinalTipo: string = 'oro'; // 'oro' o 'plata'
  bShowMetalFinalForm: boolean = false;

  metalFinalForm: any = {
    idMetalFinal: 0,
    idUserTecnico: 0,
    descripcion: '',
    tipo: 'oro',
    gramos: '',
    kilates: 0,
    costoMetal: '',
    precioFinal: ''
  };

  metalFinalList: any[] = [];
  totalMetalFinal: number = 0;

  get kilatajes_final(): number[] {
    return this.metalFinalTipo === 'plata' ? this.kilatajes_plata : this.kilatajes_oro;
  }

  // Técnicos distintos del folio (de mano de obra); si hay más de uno,
  // el renglón de Metal final debe especificar cuál
  get tecnicosDelFolio(): any[] {
    const seen: any = {};
    const out: any[] = [];
    for (const mo of this.manoObraList) {
      if (mo.idUserTecnico && !seen[mo.idUserTecnico]) {
        seen[mo.idUserTecnico] = true;
        out.push({ idUserTecnico: mo.idUserTecnico, tecnicoDesc: mo.tecnicoDesc });
      }
    }
    return out;
  }

  // Saldo de fino de la sucursal (para la alerta de "Poner metal")
  saldoFinoOroSucursal: number = 0;
  saldoFinoPlataSucursal: number = 0;

  get metalAgranelFaltanteMsg(): string {
    let finoOro = 0;
    let finoPlata = 0;
    for (const m of this.metalAgranelList) {
      const gramos = parseFloat(m.gramos) || 0;
      const kilates = parseFloat(m.kilates) || 0;
      if (m.tipo === 'plata') finoPlata += gramos * kilates / 1000;
      else finoOro += gramos * kilates / 24;
    }
    finoOro = Math.round(finoOro * 100) / 100;
    finoPlata = Math.round(finoPlata * 100) / 100;

    // El metal se mueve cuando el técnico ACEPTA la asignación (firma del
    // status 3); la alerta aplica mientras eso no haya pasado
    const bMetalMovido = this.tallerForm.idTallerStatus > 3
      || ( this.tallerForm.idTallerStatus === 3 && this.oFirmaStatus?.firma === 1 );
    if (bMetalMovido) return '';

    let msg = '';
    if (finoOro > this.saldoFinoOroSucursal) {
      msg += `Oro fino: el folio necesita ${ finoOro } g y la sucursal tiene ${ this.saldoFinoOroSucursal } g. `;
    }
    if (finoPlata > this.saldoFinoPlataSucursal) {
      msg += `Plata fina: el folio necesita ${ finoPlata } g y la sucursal tiene ${ this.saldoFinoPlataSucursal } g.`;
    }
    return msg;
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

  tall_CreateEditHeader: boolean = false;
  tall_CreateOrder: boolean = false;
  tall_AssignOrder: boolean = false;
  tall_FinalizeOrder: boolean = false;
  tall_DeliverOrder: boolean = false;
  tall_FirmaAsignado: boolean = false;
  tall_FirmaFinalizado: boolean = false;
  tall_FirmaEntregado: boolean = false;
  tall_ViewFirmaHistorial: boolean = false;
  tall_AddRefaccion: boolean = false;
  tall_DeleteRefaccion: boolean = false;
  tall_AddServicioExterno: boolean = false;
  tall_DeleteServicioExterno: boolean = false;
  tall_ManageServiciosExternos: boolean = false;
  tall_AddMetalAgranel: boolean = false;
  tall_DeleteMetalAgranel: boolean = false;
  tall_AddMetalCliente: boolean = false;
  tall_DeleteMetalCliente: boolean = false;
  tall_ViewMetalClienteImages: boolean = false;
  tall_AddManoObra: boolean = false;
  tall_DeleteManoObra: boolean = false;
  tall_EditManoObraPrecio: boolean = false;
  tall_ViewHeaderImages: boolean = false;
  tall_MakePayment: boolean = false;
  tall_EditAfterEntregado: boolean = false;
  tall_verCostos: boolean = false;
  tall_DevolutionClient: boolean = false;

  bShowActionAuthorization: boolean = false;

  // Colapsable: el form de "técnico + precio + AGREGAR" arranca oculto para
  // ahorrar espacio. Click en "+ Agregar mano de obra" lo expande; al guardar
  // o cancelar se vuelve a colapsar.
  bShowManoObraForm: boolean = false;

  // Colapsable: el form de refacción arranca oculto. Mismo patrón que
  // Mano de Obra: el header se muestra siempre, el body solo cuando hay
  // registros o el form está abierto.
  bShowRefaccionForm: boolean = false;

  // Colapsable: el form de servicios externos sigue el mismo patrón que
  // refacciones y mano de obra.
  bShowServicioExternoForm: boolean = false;

  // Colapsable: el form de metal a granel y activo del cliente.
  bShowMetalAgranelForm: boolean = false;
  bShowMetalClienteForm: boolean = false;

  // Bandera que indica si este taller es una "rápida": una versión simplificada
  // del taller sin F. Prometida, sin refacciones "Por Definir" y sin Servicios Externos.
  // Se recibe desde el llamador del modal (taller-list) vía ODataP.bRapida.
  bRapida: boolean = false;

  get bIsReadOnly(): boolean {
    return (this.oFirmaStatus?.firma === 0 || this.tallerForm.idTallerStatus === 5 || this.tallerForm.idTallerStatus === 6) && !this.tall_EditAfterEntregado;
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
    , private printTicketServ: PrintTicketService
    , private metalInvServ: MetalInventarioService

  ) { }

  async ngOnInit() {

    this.authServ.checkSession();
    this.idUserLogON = await this.authServ.getIdUserSession();

    this._locale = 'mx';
    this._adapter.setLocale(this._locale);

    var oActions = await this.authServ.CGetActionsPermissionPromise( this.idUserLogON );
    this.tall_CreateEditHeader       = oActions.some((action: any) => action.name === 'tall_CreateEditHeader');
    this.tall_CreateOrder            = oActions.some((action: any) => action.name === 'tall_CreateOrder');
    this.tall_AssignOrder            = oActions.some((action: any) => action.name === 'tall_AssignOrder');
    this.tall_FinalizeOrder          = oActions.some((action: any) => action.name === 'tall_FinalizeOrder');
    this.tall_DeliverOrder           = oActions.some((action: any) => action.name === 'tall_DeliverOrder');
    this.tall_FirmaAsignado          = oActions.some((action: any) => action.name === 'tall_FirmaAsignado');
    this.tall_FirmaFinalizado        = oActions.some((action: any) => action.name === 'tall_FirmaFinalizado');
    this.tall_FirmaEntregado         = oActions.some((action: any) => action.name === 'tall_FirmaEntregado');
    this.tall_ViewFirmaHistorial     = oActions.some((action: any) => action.name === 'tall_ViewFirmaHistorial');
    this.tall_AddRefaccion           = oActions.some((action: any) => action.name === 'tall_AddRefaccion');
    this.tall_DeleteRefaccion        = oActions.some((action: any) => action.name === 'tall_DeleteRefaccion');
    this.tall_AddServicioExterno     = oActions.some((action: any) => action.name === 'tall_AddServicioExterno');
    this.tall_DeleteServicioExterno  = oActions.some((action: any) => action.name === 'tall_DeleteServicioExterno');
    this.tall_ManageServiciosExternos= oActions.some((action: any) => action.name === 'tall_ManageServiciosExternos');
    this.tall_AddMetalAgranel        = oActions.some((action: any) => action.name === 'tall_AddMetalAgranel');
    this.tall_DeleteMetalAgranel     = oActions.some((action: any) => action.name === 'tall_DeleteMetalAgranel');
    this.tall_AddMetalCliente        = oActions.some((action: any) => action.name === 'tall_AddMetalCliente');
    this.tall_DeleteMetalCliente     = oActions.some((action: any) => action.name === 'tall_DeleteMetalCliente');
    this.tall_ViewMetalClienteImages = oActions.some((action: any) => action.name === 'tall_ViewMetalClienteImages');
    this.tall_AddManoObra            = oActions.some((action: any) => action.name === 'tall_AddManoObra');
    this.tall_DeleteManoObra         = oActions.some((action: any) => action.name === 'tall_DeleteManoObra');
    this.tall_EditManoObraPrecio     = oActions.some((action: any) => action.name === 'tall_EditManoObraPrecio');
    this.tall_ViewHeaderImages       = oActions.some((action: any) => action.name === 'tall_ViewHeaderImages');
    this.tall_MakePayment            = oActions.some((action: any) => action.name === 'tall_MakePayment');
    this.tall_EditAfterEntregado     = oActions.some((action: any) => action.name === 'tall_EditAfterEntregado');
    this.tall_verCostos              = oActions.some((action: any) => action.name === 'tall_verCostos');
    this.tall_DevolutionClient       = oActions.some((action: any) => action.name === 'tall_DevolutionClient');

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

    this.bRapida = !!(this.ODataP && this.ODataP.bRapida);

    if (this.ODataP && this.ODataP.idTaller > 0) {
      this.fn_getTallerData(this.ODataP.idTaller);
    } else {
      // Si es un taller nuevo, abrir el chip del vendedor y enfocar su input.
      // (No se puede enfocar directamente el nativeElement del input porque
      //  está dentro de un <ng-template> que aún no se ha renderizado.)
      this.fn_focusHeaderField('seller');
    }

    this.selectCajas = this.ODataP.selectCajas;
    this.selectPrinter = this.ODataP.selectPrinter;

  }

  fn_printTicketTaller() {
    if (this.selectPrinter.idPrinter > 0) {
      this.printTicketServ.printTicketTaller('TallerHeader', this.tallerForm.idTaller, this.selectPrinter.idPrinter, 1);
    } else {
      this.servicesGServ.showSnakbar('No hay impresora seleccionada');
    }
  }

  fn_ShowPayments(){
      if(this.selectCajas.idCaja > 0){

        let OParams: any = {
          idCaja: this.ODataP.selectCajas.idCaja,
          idCustomer: this.tallerForm.idCustomer,
          idSale: this.tallerForm.idSale,
          idTaller: this.tallerForm.idTaller,
          relationType: 'V',
          idSeller_idUser: this.tallerForm.idSeller_idUser,
          idSaleType: 1, //this.dataStone.idSaleType,
          saleTypeDesc: this.tallerForm.saleTypeDesc,
          total: this.totalTaller,
          pendingAmount: this.tallerForm.pendingAmount,//this.tallerForm.pendingAmount,

          selectCajas: this.ODataP.selectCajas
        }

          this.servicesGServ.showModalWithParams( PaymentsComponent, OParams, '1500px')
          .afterClosed().subscribe({
            next: ( resp ) =>{
              this.fn_getTallerData( this.tallerForm.idTaller );
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
          this.fn_loadSaldoFinoSucursal();
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

          // La bandera de rápida se persiste en BD: al consultar un taller existente
          // prevalece lo guardado, no lo que traía el modal al abrirse.
          this.bRapida = !!(data.bRapida && data.bRapida != 0);

          this.tallerForm = {
            idTaller: data.idTaller || 0,
            idSale: data.idSale,
            descripcion: data.descripcion || '',
            fechaIngreso: data.fechaIngreso + 'T10:27:51.000Z' || '',
            fechaPrometidaEntrega: data.fechaPrometida ? data.fechaPrometida + 'T10:27:51.000Z' : '',
            fechaEntrega: data.fechaEntrega || '',
            idCustomer: data.idCustomer || 0,
            customerDesc: data.customerDesc || '',
            idSeller_idUser: data.idSeller_idUser || 0,
            sellerDesc: data.sellerDesc || '',
            idTallerStatus: data.idTallerStatus || 0,
            manoObraPrecio: data.manoObraPrecio || '',
            bEsGarantia: data.bEsGarantia || 0,
            idTallerOrigen: data.idTallerOrigen || '',
            idTallerOrigenID: data.idTallerOrigenID || 0,
            origenClienteDesc: data.origenClienteDesc || '',
            origenFechaEntrega: data.origenFechaEntrega || '',
            pagado: data.pagado || 0,
            pendingAmount: data.pendingAmount || 0,
            saleTotal: data.saleTotal || 0
          };

          this.refaccionesList = resp.data.refaccionesDetail || [];
          this.serviciosExternosList = resp.data.serviciosExternos || [];
          this.metalAgranelList = resp.data.metalesAgranel || [];
          this.metalClienteList = resp.data.metalesCliente || [];
          this.metalFinalList = resp.data.metalesFinal || [];
          this.manoObraList = resp.data.oManoObra || [];
          this.oFirmaStatus = resp.data.oFirmaStatus || null;
          this.oPagos = resp.data.oPagos || [];
          this.aGarantias = resp.data.oGarantias || [];

          // El precio de la garantía es el que ya tenga guardado el
          // folio. Se lee ANTES de recalcular totales porque
          // fn_calcularTotalTaller lo usa como total cuando es garantía.
          // Solo se precarga si el folio ya trae un precio guardado; si
          // sigue en 0 el campo se queda vacío mostrando el placeholder.
          this.precioGarantia = ( this.bEsGarantia && Number( data.saleTotal ) > 0 )
              ? Number( data.saleTotal )
              : '';

          this.fn_calcularTotalRefacciones();
          this.fn_calcularTotalServiciosExternos();
          this.fn_calcularTotalMetalAgranel();
          this.fn_calcularTotalMetalCliente();
          this.fn_calcularTotalMetalFinal();
          this.fn_calcularTotalManoObra();
          this.fn_calcularTotalTaller();
          this.fn_loadTallerHeaderImagesCount(idTaller);
          this.fn_loadSaldoFinoSucursal();
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
      bRapida: this.bRapida ? 1 : 0,
      idUser: this.idUserLogON
    };

    // El precio de una garantía se captura a mano, así que viaja con el
    // guardado del encabezado — el mismo botón "Actualizar". Solo se
    // manda cuando el folio ES garantía: en un taller normal el Back
    // calcula el total desde sus renglones y no debe recibirlo.
    // Vacío se manda como 0, que es un valor válido.
    if( this.bEsGarantia ){
      oParams.precioTotal = this.precioGarantia === '' || this.precioGarantia === null
        ? 0
        : Number( this.precioGarantia );
    }

    var bNew = oParams.idTaller === 0;

    this.bShowSpinner = true;
    this.salesServ.CSaveTallerHeader(oParams)
    .subscribe({
      next: (resp: ResponseGet) => {
        this.servicesGServ.showAlertIA(resp);
        if (resp.status === 0) {
          this.tallerForm.idTaller = resp.data.idTaller;
          this.tallerForm.idSale = resp.data.idSale;
          if(bNew)
            this.tallerForm.idTallerStatus = 1;

          this.fn_getTallerData(this.tallerForm.idTaller);
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
    this.refaccionTabIndex = tipo === 'producto' ? 0 : 1;
    this.fn_resetRefaccionForm();

    // Focus on product combo when selecting "Producto"
    if (tipo === 'producto') {
      this.fn_focusProductCombo();
    }
  }

  /**
   * Cambio de tab (mat-tab-group) → refleja el cambio en refaccionTipo
   * usando el método legacy para mantener la lógica centralizada
   * (reset del form + focus en input).
   */
  fn_onRefaccionTabChange(index: number): void {
    const tipo = index === 0 ? 'producto' : 'porDefinir';
    if (tipo !== this.refaccionTipo) {
      this.fn_changeRefaccionTipo(tipo);
    }
  }

  fn_validateRefaccionProductoPrecio(): boolean {
    const costo  = parseFloat(this.refaccionForm.costo)  || 0;
    const precio = parseFloat(this.refaccionForm.precio) || 0;
    if (costo > 0) {
      const minPrecio = parseFloat((costo * 1.30).toFixed(2));
      if (precio < minPrecio) {
        this.servicesGServ.showSnakbar(
          `El precio mínimo permitido es ${minPrecio.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} (costo + 30%)`
        );
        this.refaccionForm.precio = minPrecio;
        return false;
      }
    }
    return true;
  }

  /**
   * Limpia los campos del form de refacción. NO toca el flag
   * bShowRefaccionForm: el form sigue abierto/colapsado como esté.
   * Usar fn_closeRefaccionForm() cuando se quiera limpiar Y colapsar.
   */
  fn_resetRefaccionForm() {
    this.refaccionForm = {
      tipo: this.refaccionTipo,
      idRefaccion: 0,
      idProduct: 0,
      productDesc: '',
      cantidad: 1,
      precio: '',
      costo: ''
    };
  }

  /** Bloquea teclas de decimales/signos en campos de cantidad (solo enteros). */
  fn_blockDecimalKey(event: KeyboardEvent): void {
    if (['.', ',', 'e', 'E', '+', '-'].includes(event.key)) {
      event.preventDefault();
    }
  }

  /** Normaliza la cantidad a un entero >= 1 al perder el foco. */
  fn_sanitizeCantidadEntero(form: any): void {
    let val = Math.round(Number(form.cantidad));
    if (isNaN(val) || val < 1) val = 1;
    form.cantidad = val;
  }

  /**
   * Cierra el form de refacción: limpia los campos + colapsa el body.
   * Llamar después de un save exitoso o al cancelar explícitamente.
   */
  fn_closeRefaccionForm() {
    this.fn_resetRefaccionForm();
    this.bShowRefaccionForm = false;
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

  fn_focusRefaccionProductoPrecio() {
    this.nextInputFocus(this.refaccionProductoPrecioInput, 50);
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
      if (!this.fn_validateRefaccionProductoPrecio()) return;
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
            this.fn_closeRefaccionForm();

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
            // Colapsar el form después de guardar
            this.bShowManoObraForm = false;
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

    // En una garantía el total que se le cobra al cliente NO se calcula:
    // es el precio capturado a mano (normalmente 0). Los costos internos
    // se siguen registrando, pero no forman el precio.
    if( this.bEsGarantia ){
      // Vacío cuenta como 0 — es un valor válido, no un dato faltante.
      this.totalTaller = Number( this.precioGarantia ) || 0;
      return;
    }

    this.totalTaller = this.totalRefacciones + this.totalServiciosExternos + this.totalMetalAgranel + manoObraTotal;
  }

  // ── Garantías (analisis/016) ──

  get bEsGarantia(): boolean {
    return Number( this.tallerForm.bEsGarantia ) === 1;
  }

  // Solo un folio ENTREGADO que no sea ya una garantía puede originar una.
  get bPuedeLevantarGarantia(): boolean {
    return Number( this.tallerForm.idTallerStatus ) === 5
        && !this.bEsGarantia
        && Number( this.tallerForm.idTaller ) > 0;
  }

  ev_fn_precioGarantia_change(): void {

    // Se respeta el vacío: no se rellena con 0 a la fuerza.
    if( this.precioGarantia === '' || this.precioGarantia === null ){
      this.fn_calcularTotalTaller();
      return;
    }

    const n = Number( this.precioGarantia );
    this.precioGarantia = ( isNaN(n) || n < 0 ) ? '' : Math.round( n * 100 ) / 100;
    this.fn_calcularTotalTaller();

  }

  // Al entrar al campo se selecciona lo que haya, para escribir encima
  // sin borrar primero. Mismo comportamiento que el importe en Pagos.
  ev_fn_seleccionarTexto( event: any ): void {

    const oInput = event?.target;
    if( !oInput ) return;

    setTimeout(() => oInput.select(), 0);

  }

  // Abre el modal con ESTE folio ya preseleccionado: aquí no hay nada
  // que buscar, ya se sabe sobre cuál se levanta.
  fn_LevantarGarantia(): void {

    const paramsMDL: any = {
      oTallerOrigen: {
        idTaller: this.tallerForm.idTaller,
        idSale: this.tallerForm.idSale,
        customerDesc: this.tallerForm.customerDesc,
        sellerDesc: this.tallerForm.sellerDesc,
        fechaEntregaDesc: this.tallerForm.fechaEntrega
      }
    };

    this.servicesGServ.showModalWithParams( GarantiaComponent, paramsMDL, '820px')
    .afterClosed().subscribe({
      next: ( resp ) => {

        if( resp && resp.idTaller ){
          // Se salta directo al folio nuevo. No se recarga este
          // primero: se está cerrando de todas formas, y al volver
          // aquí la garantía ya aparecerá en su lista.
          this.fn_AbrirTaller( resp.idTaller );
        }

      }
    });

  }

  // Navegar entre el folio de origen y sus garantías. Se cierra este
  // modal devolviendo el id a abrir: quien lo abrió (taller-list) es
  // el que sabe cómo levantar otro detalle.
  fn_AbrirTaller( idTaller: number ): void {

    if( !idTaller ){
      return;
    }

    this.dialogRef.close({ irATaller: idTaller });
  }

  fn_resetManoObraForm() {
    this.manoObraForm = {
      idManoObra: 0,
      idTecnico: 0,
      tecnicoDesc: '',
      precio: ''
    };
    this.bShowManoObraForm = false;
  }

  fn_toggleManoObraForm(): void {
    // Si está cerrando (estaba abierto), también resetea el form
    if (this.bShowManoObraForm) {
      this.fn_resetManoObraForm();
    } else {
      this.bShowManoObraForm = true;
      setTimeout(() => {
        if (this.cbxTecnicosCBX && this.cbxTecnicosCBX.nativeElement) {
          this.cbxTecnicosCBX.nativeElement.focus();
        }
      }, 50);
    }
  }

  fn_toggleRefaccionForm(): void {
    // Si está cerrando (estaba abierto), también resetea el form
    if (this.bShowRefaccionForm) {
      this.fn_closeRefaccionForm();
    } else {
      this.bShowRefaccionForm = true;
      // Dar foco al primer input del form:
      // - producto → cbxProductss
      // - porDefinir → refaccionPorDefinirDescInput
      // 80ms para dar tiempo a que Angular renderice el ng-template del body.
      // Se reintenta a 250ms por si el primer intento es aún antes del mount.
      const tryFocus = (attempt: number) => {
        const target: ElementRef | undefined =
          this.refaccionTipo === 'porDefinir' ? this.refaccionPorDefinirDescInput : this.cbxProductss;
        const el: HTMLElement | undefined = target?.nativeElement;
        if (el && document.body.contains(el)) {
          el.focus();
        } else if (attempt < 2) {
          setTimeout(() => tryFocus(attempt + 1), 150);
        }
      };
      setTimeout(() => tryFocus(0), 80);
    }
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
    // Abrir el form para que el usuario vea los datos cargados y pueda modificar
    this.bShowManoObraForm = true;
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

    if (parseFloat(this.servicioExternoForm.precio) < parseFloat(this.servicioExternoForm.costo)) {
      this.servicesGServ.showSnakbar('El precio no puede ser menor al costo');
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
            this.fn_closeServicioExternoForm();
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

  fn_closeServicioExternoForm() {
    this.fn_resetServicioExternoForm();
    this.bShowServicioExternoForm = false;
  }

  fn_toggleServicioExternoForm(): void {
    if (this.bShowServicioExternoForm) {
      this.fn_closeServicioExternoForm();
    } else {
      this.bShowServicioExternoForm = true;
      // Dar foco al input del combo de servicios externos.
      const tryFocus = (attempt: number) => {
        const el: HTMLElement | undefined = this.cbxServiciosExternosCBX?.nativeElement;
        if (el && document.body.contains(el)) {
          el.focus();
        } else if (attempt < 2) {
          setTimeout(() => tryFocus(attempt + 1), 150);
        }
      };
      setTimeout(() => tryFocus(0), 80);
    }
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
      valorMetal: '',
      costoMetal: '',
      costPricePerGram: 0
    };
  }

  fn_closeMetalAgranelForm() {
    this.fn_resetMetalAgranelForm();
    this.bShowMetalAgranelForm = false;
  }

  fn_toggleMetalAgranelForm(): void {
    if (this.bShowMetalAgranelForm) {
      this.fn_closeMetalAgranelForm();
    } else {
      this.bShowMetalAgranelForm = true;
      // Dar foco al input de gramos.
      const tryFocus = (attempt: number) => {
        const el: HTMLElement | undefined = this.metalAgranelGramosInput?.nativeElement;
        if (el && document.body.contains(el)) {
          el.focus();
        } else if (attempt < 2) {
          setTimeout(() => tryFocus(attempt + 1), 150);
        }
      };
      setTimeout(() => tryFocus(0), 80);
    }
  }

  fn_validateMetalAgranel(): boolean {
    const costPricePerGram = this.metalAgranelForm.costPricePerGram || 0;
    const gramos           = parseFloat(this.metalAgranelForm.gramos) || 0;
    const valorMetal       = parseFloat(this.metalAgranelForm.valorMetal) || 0;

    if (costPricePerGram > 0 && gramos > 0) {
      const minValor = parseFloat((costPricePerGram * gramos * 1.30).toFixed(2));
      if (valorMetal < minValor) {
        this.servicesGServ.showSnakbar(
          `El valor mínimo permitido es ${minValor.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} (costo + 30%)`
        );
        this.metalAgranelForm.valorMetal = minValor;
        return false;
      }
    }
    return true;
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

    if (!this.fn_validateMetalAgranel()) return;

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
        costoMetal: this.metalAgranelForm.costoMetal || 0,
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
            this.fn_closeMetalAgranelForm();
          }
          this.bShowSpinner = false;
        },
        error: (ex: HttpErrorResponse) => {
          this.servicesGServ.showSnakbar(ex.error.message || 'Error al guardar metal');
          this.bShowSpinner = false;
        }
      });
  }

  /**
   * Sanitiza en cada tecleo/pegado un campo decimal (gramos, valor del metal, etc.)
   * para que nunca tenga más de `maxDecimals` dígitos después del punto.
   * Ej: gramos (maxDecimals=1) → "2.2"; valor del metal (maxDecimals=2) → "8957.25".
   */
  fn_onDecimalInputChange(value: string, form: any, field: string, maxDecimals: number): void {
    let raw = (value ?? '').toString().replace(',', '.').replace(/[^0-9.]/g, '');
    const firstDot = raw.indexOf('.');
    if (firstDot !== -1) {
      raw = raw.slice(0, firstDot + 1) + raw.slice(firstDot + 1).replace(/\./g, '').slice(0, maxDecimals);
    }
    form[field] = raw;
  }

  /** Al perder el foco, convierte el campo a número redondeado a `decimals` decimales. */
  fn_normalizeDecimalBlur(form: any, field: string, decimals: number): void {
    if (form[field] === '' || form[field] === null || form[field] === undefined) return;
    const val = parseFloat(form[field]);
    const factor = Math.pow(10, decimals);
    form[field] = isNaN(val) ? '' : Math.round(val * factor) / factor;
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
            // Calcular: gramos * precio, redondeado a 2 decimales (ej. 8957.25)
            const pricePerGram = resp.data.price;
            this.metalAgranelForm.costPricePerGram = parseFloat(resp.data.costPrice) || 0;
            this.metalAgranelForm.valorMetal = Math.round(this.metalAgranelForm.gramos * pricePerGram * 100) / 100;
            this.metalAgranelForm.costoMetal = Math.round(this.metalAgranelForm.gramos * this.metalAgranelForm.costPricePerGram * 100) / 100;
          } else {
            this.servicesGServ.showSnakbar('No se encontró precio para este kilataje');
            this.metalAgranelForm.valorMetal = '';
            this.metalAgranelForm.costoMetal = '';
          }
        },
        error: (ex: HttpErrorResponse) => {
          this.servicesGServ.showSnakbar('Error al obtener el precio: ' + (ex.error.message || 'Error desconocido'));
          this.metalAgranelForm.valorMetal = '';
          this.metalAgranelForm.costoMetal = '';
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
      gramos: Math.round(parseFloat(item.gramos) * 10) / 10,
      kilates: parseInt(item.kilates) || 8,
      valorMetal: parseFloat(item.valorMetal),
      costoMetal: parseFloat(item.costoMetal) || 0,
      costPricePerGram: 0
    };
    // Abrir el form para que el usuario vea los datos cargados y pueda modificar
    this.bShowMetalAgranelForm = true;
    // Cargar costPrice para poder validar el mínimo al editar
    this.fn_loadMetalCostPrice(this.metalAgranelForm.kilates);
  }

  fn_loadMetalCostPrice(kilates: number) {
    if (!kilates) return;
    this.fxrateServ.CGetPriceByKilataje(kilates)
      .subscribe({
        next: (resp: any) => {
          if (resp.status === 0 && resp.data) {
            this.metalAgranelForm.costPricePerGram = parseFloat(resp.data.costPrice) || 0;
          }
        },
        error: () => {}
      });
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
      valorMetal: '',
      costoMetal: ''
    };
  }

  fn_closeMetalClienteForm() {
    this.fn_resetMetalClienteForm();
    this.bShowMetalClienteForm = false;
  }

  fn_toggleMetalClienteForm(): void {
    if (this.bShowMetalClienteForm) {
      this.fn_closeMetalClienteForm();
    } else {
      this.bShowMetalClienteForm = true;
      // Dar foco al input de gramos.
      const tryFocus = (attempt: number) => {
        const el: HTMLElement | undefined = this.metalClienteGramosInput?.nativeElement;
        if (el && document.body.contains(el)) {
          el.focus();
        } else if (attempt < 2) {
          setTimeout(() => tryFocus(attempt + 1), 150);
        }
      };
      setTimeout(() => tryFocus(0), 80);
    }
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
            // Calcular: gramos * precio, redondeado a 2 decimales (ej. 8957.25)
            const pricePerGram = resp.data.price;
            const costPricePerGram = parseFloat(resp.data.costPrice) || 0;
            this.metalClienteForm.valorMetal = Math.round(this.metalClienteForm.gramos * pricePerGram * 100) / 100;
            this.metalClienteForm.costoMetal = Math.round(this.metalClienteForm.gramos * costPricePerGram * 100) / 100;
          } else {
            this.servicesGServ.showSnakbar('No se encontró precio para este kilataje');
            this.metalClienteForm.valorMetal = '';
            this.metalClienteForm.costoMetal = '';
          }
        },
        error: (ex: HttpErrorResponse) => {
          this.servicesGServ.showSnakbar('Error al obtener el precio: ' + (ex.error.message || 'Error desconocido'));
          this.metalClienteForm.valorMetal = '';
          this.metalClienteForm.costoMetal = '';
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
        costoMetal: this.metalClienteForm.costoMetal || 0,
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
            this.fn_closeMetalClienteForm();
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
      gramos: Math.round(parseFloat(item.gramos) * 10) / 10,
      kilates: parseInt(item.kilates) || 8,
      valorMetal: parseFloat(item.valorMetal),
      costoMetal: parseFloat(item.costoMetal) || 0
    };
    // Abrir el form para que el usuario vea los datos cargados y pueda modificar
    this.bShowMetalClienteForm = true;
  }

  //#region MÉTODOS DE METAL FINAL

  fn_changeMetalFinalTipo(tipo: string) {
    this.metalFinalTipo = tipo;
    this.metalFinalForm.tipo = tipo;
    this.fn_resetMetalFinalForm();
  }

  fn_resetMetalFinalForm() {
    const tecnicos = this.tecnicosDelFolio;
    this.metalFinalForm = {
      idMetalFinal: 0,
      idUserTecnico: tecnicos.length === 1 ? tecnicos[0].idUserTecnico : 0,
      descripcion: '',
      tipo: this.metalFinalTipo,
      gramos: '',
      kilates: 0,
      costoMetal: '',
      precioFinal: ''
    };
  }

  fn_closeMetalFinalForm() {
    this.fn_resetMetalFinalForm();
    this.bShowMetalFinalForm = false;
  }

  fn_toggleMetalFinalForm(): void {
    if (this.bShowMetalFinalForm) {
      this.fn_closeMetalFinalForm();
    } else {
      this.fn_resetMetalFinalForm();
      this.bShowMetalFinalForm = true;
    }
  }

  fn_calculateMetalFinalValue() {
    if (!this.metalFinalForm.gramos || this.metalFinalForm.gramos <= 0 || !this.metalFinalForm.kilates) {
      this.metalFinalForm.precioFinal = '';
      this.metalFinalForm.costoMetal = '';
      return;
    }

    this.fxrateServ.CGetPriceByKilataje(this.metalFinalForm.kilates)
      .subscribe({
        next: (resp: any) => {
          if (resp.status === 0 && resp.data) {
            const pricePerGram = resp.data.price;
            const costPricePerGram = parseFloat(resp.data.costPrice) || 0;
            this.metalFinalForm.precioFinal = Math.round(this.metalFinalForm.gramos * pricePerGram * 100) / 100;
            this.metalFinalForm.costoMetal = Math.round(this.metalFinalForm.gramos * costPricePerGram * 100) / 100;
          } else {
            this.servicesGServ.showSnakbar('No se encontró precio para este kilataje');
            this.metalFinalForm.precioFinal = '';
            this.metalFinalForm.costoMetal = '';
          }
        },
        error: (ex: HttpErrorResponse) => {
          this.servicesGServ.showSnakbar('Error al obtener el precio: ' + (ex.error.message || 'Error desconocido'));
          this.metalFinalForm.precioFinal = '';
          this.metalFinalForm.costoMetal = '';
        }
      });
  }

  fn_agregarMetalFinal() {
    if (this.tecnicosDelFolio.length === 0) {
      this.servicesGServ.showSnakbar('El folio no tiene técnicos en mano de obra');
      return;
    }

    if (!this.metalFinalForm.idUserTecnico) {
      this.servicesGServ.showSnakbar('Especifica el técnico del metal final');
      return;
    }

    if (this.metalFinalForm.gramos <= 0) {
      this.servicesGServ.showSnakbar('Los gramos deben ser mayor a 0');
      return;
    }

    if (this.metalFinalForm.precioFinal <= 0) {
      this.servicesGServ.showSnakbar('El precio final debe ser mayor a 0');
      return;
    }

    const oParams: any = {
      idTaller: this.tallerForm.idTaller,
      idSale: this.tallerForm.idSale,
      metalFinal: {
        idMetalFinal: this.metalFinalForm.idMetalFinal,
        idUserTecnico: this.metalFinalForm.idUserTecnico,
        descripcion: this.metalFinalForm.descripcion,
        tipo: this.metalFinalForm.tipo,
        gramos: this.metalFinalForm.gramos,
        kilates: this.metalFinalForm.kilates,
        costoMetal: this.metalFinalForm.costoMetal || 0,
        precioFinal: this.metalFinalForm.precioFinal
      }
    };

    this.bShowSpinner = true;
    this.salesServ.CAddMetalFinal(oParams)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.servicesGServ.showAlertIA(resp, false);
          if (resp.status === 0) {
            this.getTallerMetalesFinal(this.tallerForm.idTaller);
            this.fn_closeMetalFinalForm();
          }
          this.bShowSpinner = false;
        },
        error: (ex: HttpErrorResponse) => {
          this.servicesGServ.showSnakbar(ex.error.message || 'Error al guardar metal final');
          this.bShowSpinner = false;
        }
      });
  }

  fn_eliminarMetalFinal(idMetalFinal: number) {
    this.servicesGServ.showDialog('¿Estás seguro?'
        , 'Está a punto de eliminar un metal final'
        , '¿Desea continuar?'
        , 'Si', 'No')
        .afterClosed().subscribe({
          next: async( resp ) =>{
            if(resp){

              this.bShowSpinner = true;

              const oParams: any = {
                idMetalFinal: idMetalFinal
              };

              this.salesServ.CDeleteMetalFinal(oParams)
                .subscribe({
                  next: (resp: any) => {
                    this.servicesGServ.showAlertIA(resp, false);
                    if (resp.status === 0) {
                      this.getTallerMetalesFinal(this.tallerForm.idTaller);
                    }
                    this.bShowSpinner = false;
                  },
                  error: (ex: HttpErrorResponse) => {
                    this.servicesGServ.showSnakbar(ex.error.message || 'Error al eliminar metal final');
                    this.bShowSpinner = false;
                  }
                });
            }
          }
        });
  }

  editMetalFinalGrid( item: any ){
    this.metalFinalTipo = item.tipo;
    this.metalFinalForm = {
      idMetalFinal: item.idMetalFinal,
      idUserTecnico: item.idUserTecnico,
      descripcion: item.descripcion || '',
      tipo: item.tipo,
      gramos: Math.round(parseFloat(item.gramos) * 10) / 10,
      kilates: parseInt(item.kilates) || 8,
      costoMetal: parseFloat(item.costoMetal) || 0,
      precioFinal: parseFloat(item.precioFinal)
    };
    this.bShowMetalFinalForm = true;
  }

  getTallerMetalesFinal( idTaller: number ){
    this.salesServ.getTallerMetalesFinal({ idTaller: idTaller })
    .subscribe({
      next: (resp: ResponseGet) => {
        if( resp.status === 0 ){
          this.metalFinalList = resp.data.metalesFinalDetail || [];
          this.fn_calcularTotalMetalFinal();
        }
      },
      error: (ex: HttpErrorResponse) => {
        console.log( ex )
      }
    });
  }

  // El precio del Metal final NO se suma al total del folio todavía
  // (pendiente de confirmar con el cliente cómo interactúa con Poner metal)
  fn_calcularTotalMetalFinal() {
    this.totalMetalFinal = this.metalFinalList.reduce((total, metal) => total + (parseFloat(metal.precioFinal) || 0), 0);
  }

  fn_loadSaldoFinoSucursal() {
    const idSucursal = this.tallerForm.idSucursal || environment.idSucursal;
    this.metalInvServ.CGetMetalInventarioSaldos('SUCURSAL', idSucursal)
      .subscribe({
        next: (resp: ResponseGet) => {
          if (resp.status === 0) {
            const rows = resp.data.rows || [];
            const oro = rows.find((r: any) => r.barCode === 'METAL-ORO-24');
            const plata = rows.find((r: any) => r.barCode === 'METAL-PLATA-1000');
            this.saldoFinoOroSucursal = oro ? parseFloat(oro.gramos) : 0;
            this.saldoFinoPlataSucursal = plata ? parseFloat(plata.gramos) : 0;
          }
        },
        error: () => {}
      });
  }

  //#endregion MÉTODOS DE METAL FINAL

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

  fn_createTallerRapidaOrder() {
    this.servicesGServ.showDialog('¿Estás seguro?'
        , 'Está a punto de convertir este taller en un pedido rápida'
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
                idTallerStatus: 5,
                precioTotal: this.totalTaller,
                idUser: this.idUserLogON
              };

              this.salesServ.CUpdateTallerStatus(oParams)
                .subscribe({
                  next: (respUpdate: ResponseDB_CRUD) => {
                    if (respUpdate.status === 0) {
                      this.servicesGServ.showSnakbar('Pedido de taller creado correctamente');
                      this.printTicketServ.printTicketTaller('TallerHeader', this.tallerForm.idTaller, this.selectPrinter.idPrinter, 1, false, false);
                      // Refrescar la pantalla con lo realmente guardado (status, folio, etc.)
                      this.fn_getTallerData(this.tallerForm.idTaller);
                    } else {
                      this.servicesGServ.showSnakbar('Error al crear el pedido de taller');
                      this.bShowSpinner = false;
                    }
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
                      if ((respUpdate as any).data?.idSale) {
                        this.tallerForm.idSale = (respUpdate as any).data.idSale;
                      }
                      this.printTicketServ.printTicketTaller('TallerHeader', this.tallerForm.idTaller, this.selectPrinter.idPrinter, 1, false, false);
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

    if (!this.bShowActionAuthorization) {
      this.bShowActionAuthorization = true;
      var paramsMDL: any = { actionName: 'tall_AssignOrder', bShowAlert: false };
      this.servicesGServ.showModalWithParams( ActionAuthorizationComponent, paramsMDL, '400px')
      .afterClosed().subscribe({
        next: ( auth_idUser ) =>{
          this.bShowActionAuthorization = false;
          if( auth_idUser ){
            this._fn_assignTallerOrder();
          }
        }
      });
    }

  }

  _fn_assignTallerOrder() {
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
                      this.fn_insertFirmaStatus(3);
                      this.fn_loadSaldoFinoSucursal();
                    } else {
                      // Bloqueo (p. ej. inventario de metal insuficiente): alerta visible
                      this.servicesGServ.showAlertIA(respUpdate);
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

    if (!this.bShowActionAuthorization) {
      this.bShowActionAuthorization = true;
      var paramsMDL: any = { actionName: 'tall_FinalizeOrder', bShowAlert: false };
      this.servicesGServ.showModalWithParams( ActionAuthorizationComponent, paramsMDL, '400px')
      .afterClosed().subscribe({
        next: ( auth_idUser ) =>{
          this.bShowActionAuthorization = false;
          if( auth_idUser ){
            this._fn_finalizeTallerOrder();
          }
        }
      });
    }

  }

  _fn_finalizeTallerOrder() {
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
                      this.fn_insertFirmaStatus(4);
                    } else {
                      // Bloqueo (p. ej. el metal final excede el inventario del técnico)
                      this.servicesGServ.showAlertIA(respUpdate);
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

    if (!this.bShowActionAuthorization) {
      this.bShowActionAuthorization = true;
      var paramsMDL: any = { actionName: 'tall_DeliverOrder', bShowAlert: false };
      this.servicesGServ.showModalWithParams( ActionAuthorizationComponent, paramsMDL, '400px')
      .afterClosed().subscribe({
        next: ( auth_idUser ) =>{
          this.bShowActionAuthorization = false;
          if( auth_idUser ){
            this._fn_deliverTallerOrder(auth_idUser);
          }
        }
      });
    }

  }

  _fn_deliverTallerOrder(auth_idUser: any) {
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
                idUser: this.idUserLogON,
                auth_idUser: auth_idUser
              };

              this.salesServ.CUpdateTallerStatus(oParams)
                .subscribe({
                  next: (respUpdate: any) => {
                    if (respUpdate.status === 0) {
                      this.servicesGServ.showSnakbar('Pedido de taller entregado correctamente');
                      this.tallerForm.idTallerStatus = 5;
                      this.tallerForm.fechaEntrega = respUpdate.data.fechaEntrega;
                      this.printTicketServ.printTicketTaller('TallerHeader', this.tallerForm.idTaller, this.selectPrinter.idPrinter, 1, true, true);
                      this.fn_insertFirmaStatus(5);
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

  fn_editAfterEntregado(): void {
    if (!this.bShowActionAuthorization) {
      this.bShowActionAuthorization = true;
      var paramsMDL: any = { actionName: 'tall_EditAfterEntregado', bShowAlert: false };
      this.servicesGServ.showModalWithParams(ActionAuthorizationComponent, paramsMDL, '400px')
        .afterClosed().subscribe({
          next: (auth_idUser) => {
            this.bShowActionAuthorization = false;
            if (auth_idUser) {
              const dialogRef = this.dialog.open(TallerFirmaModalComponent, {
                data: {
                  idTaller: this.tallerForm.idTaller,
                  currentStatus: this.tallerForm.idTallerStatus,
                  bEditAfterEntregado: true
                },
                disableClose: true
              });
              dialogRef.afterClosed().subscribe((result: any) => {
                if (result) {
                  this._fn_procesarEditAfterEntregado(auth_idUser, result.targetStatus, result.comentario);
                }
              });
            }
          }
        });
    }
  }

  _fn_procesarEditAfterEntregado(auth_idUser: number, targetStatus: number, motivo: string): void {
    this.bShowSpinner = true;
    const oParamsStatus: any = {
      idTaller: this.tallerForm.idTaller,
      idTallerStatus: targetStatus,
      precioTotal: this.totalTaller,
      idUser: this.idUserLogON
    };
    this.salesServ.CUpdateTallerStatus(oParamsStatus)
      .subscribe({
        next: (respUpdate: any) => {
          if (respUpdate.status === 0) {
            this.salesServ.CInsertUpdateTallerFirma({
              idFirma: 0,
              idTaller: this.tallerForm.idTaller,
              idTallerStatus: targetStatus,
              idUserCreate: this.idUserLogON,
              comentario: motivo
            }).subscribe({
              next: (r: any) => {
                this.oFirmaStatus = { firma: 0, idFirma: r.insertID, idTallerStatus: targetStatus, comentario: motivo, userFirmaDesc: '' };
              },
              error: () => {}
            });
            const statusLabels: any = { 2: 'Pedido', 3: 'Asignado', 4: 'Finalizado', 5: 'Entregado', 6: 'Devolución' };
            this.servicesGServ.showSnakbar('Estado cambiado a: ' + (statusLabels[targetStatus] || targetStatus));
            this.tallerForm.idTallerStatus = targetStatus;
          } else {
            this.servicesGServ.showSnakbar(respUpdate.message || 'Error al cambiar el estado');
          }
          this.bShowSpinner = false;
        },
        error: (ex: HttpErrorResponse) => {
          this.servicesGServ.showSnakbar(ex.error.message || 'Error al cambiar el estado');
          this.bShowSpinner = false;
        }
      });
  }

  fn_devolutionTallerOrder(): void {
    if (!this.bShowActionAuthorization) {
      this.bShowActionAuthorization = true;
      var paramsMDL: any = { actionName: 'tall_DevolutionClient', bShowAlert: false };
      this.servicesGServ.showModalWithParams(ActionAuthorizationComponent, paramsMDL, '400px')
        .afterClosed().subscribe({
          next: (auth_idUser) => {
            this.bShowActionAuthorization = false;
            if (auth_idUser) {
              const dialogRef = this.dialog.open(TallerFirmaModalComponent, {
                data: { idTaller: this.tallerForm.idTaller, idTallerStatus: 6, bDevolucion: true },
                disableClose: true
              });
              dialogRef.afterClosed().subscribe((result: any) => {
                if (result) {
                  this._fn_procesarDevolucion(auth_idUser, result.comentario);
                }
              });
            }
          }
        });
    }
  }

  _fn_procesarDevolucion(auth_idUser: number, motivo: string): void {
    this.bShowSpinner = true;
    const oParamsStatus: any = {
      idTaller: this.tallerForm.idTaller,
      idTallerStatus: 6,
      precioTotal: this.totalTaller,
      idUser: this.idUserLogON
    };
    this.salesServ.CUpdateTallerStatus(oParamsStatus)
      .subscribe({
        next: (respUpdate: any) => {
          if (respUpdate.status === 0) {
            this.salesServ.CInsertUpdateTallerFirma({
              idFirma: 0,
              idTaller: this.tallerForm.idTaller,
              idTallerStatus: 6,
              idUserCreate: this.idUserLogON,
              firma: 1,
              idUserFirma: auth_idUser,
              comentario: motivo
            }).subscribe({ next: () => {}, error: () => {} });
            this.servicesGServ.showSnakbar('Devolución registrada correctamente');
            this.tallerForm.idTallerStatus = 6;
          } else {
            this.servicesGServ.showSnakbar(respUpdate.message || 'Error al registrar la devolución');
          }
          this.bShowSpinner = false;
        },
        error: (ex: HttpErrorResponse) => {
          this.servicesGServ.showSnakbar(ex.error.message || 'Error al registrar la devolución');
          this.bShowSpinner = false;
        }
      });
  }

  fn_reInsertFirmaStatusWithAuth( idTallerStatus: number ): void {

    if (!this.bShowActionAuthorization) {
      this.bShowActionAuthorization = true;
      const actionMap: any = { 3: 'tall_AssignOrder', 4: 'tall_FinalizeOrder', 5: 'tall_DeliverOrder' };
      var paramsMDL: any = { actionName: actionMap[idTallerStatus] || 'tall_AssignOrder', bShowAlert: false };
      this.servicesGServ.showModalWithParams( ActionAuthorizationComponent, paramsMDL, '400px')
      .afterClosed().subscribe({
        next: ( auth_idUser ) =>{
          this.bShowActionAuthorization = false;
          if( auth_idUser ){
            this.fn_insertFirmaStatus( idTallerStatus );
          }
        }
      });
    }

  }

  fn_insertFirmaStatus( idTallerStatus: number ): void {
    this.salesServ.CInsertUpdateTallerFirma({
      idFirma: 0,
      idTaller: this.tallerForm.idTaller,
      idTallerStatus,
      idUserCreate: this.idUserLogON
    }).subscribe({
      next: (r: any) => {
        this.oFirmaStatus = { firma: 0, idFirma: r.insertID, idTallerStatus, comentario: '', userFirmaDesc: '' };
      }
    });
  }

  fn_openFirmaModal(): void {

    if (!this.bShowActionAuthorization) {
      this.bShowActionAuthorization = true;
      const actionMap: any = { 3: 'tall_FirmaAsignado', 4: 'tall_FirmaFinalizado', 5: 'tall_FirmaEntregado' };
      var paramsMDL: any = { actionName: actionMap[this.tallerForm.idTallerStatus] || 'tall_FirmaAsignado', bShowAlert: false };
      this.servicesGServ.showModalWithParams( ActionAuthorizationComponent, paramsMDL, '400px')
      .afterClosed().subscribe({
        next: ( auth_idUser ) =>{
          this.bShowActionAuthorization = false;
          if( auth_idUser ){
            this._fn_openFirmaModal();
          }
        }
      });
    }

  }

  _fn_openFirmaModal(): void {
    const dialogRef = this.dialog.open(TallerFirmaModalComponent, {
      data: {
        idFirma: this.oFirmaStatus?.idFirma || 0,
        idTaller: this.tallerForm.idTaller,
        idTallerStatus: this.tallerForm.idTallerStatus,
        idUserLogON: this.idUserLogON
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.oFirmaStatus = {
          ...this.oFirmaStatus,
          firma: result.firma,
          comentario: result.comentario,
          firmaDesc: result.firma === 1 ? 'Aprobado' : 'Rechazado',
          userFirmaDesc: ''
        };
      }
    });
  }

  fn_openFirmaHistorialModal(): void {
    this.dialog.open(TallerFirmaHistorialModalComponent, {
      data: {
        idTaller: this.tallerForm.idTaller,
        idSale: this.tallerForm.idSale
      },
      maxWidth: '960px',
      width: '90vw'
    });
  }

  fn_openResponsablesDevolucion(): void {
    this.dialog.open(TallerResponsablesDevolucionModalComponent, {
      data: {
        idTaller: this.tallerForm.idTaller,
        totalTaller: this.totalTaller
      },
      disableClose: false,
      maxWidth: '820px',
      width: '95vw'
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
      cantidad: parseInt(item.cantidad, 10) || 1,
      precio: parseFloat(item.precio),
      costo: parseFloat(item.costo)
    };
    // Abrir el form para que el usuario vea los datos cargados y pueda modificar
    this.bShowRefaccionForm = true;
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
    // Abrir el form para que el usuario vea los datos cargados y pueda modificar
    this.bShowServicioExternoForm = true;
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
        // nameConcat trae "barCode - name" (mismo formato que se ve en el combo),
        // así queda visible en la lista de refacciones igual que en la búsqueda.
        this.refaccionForm.productDesc = ODataCbx.nameConcat || ODataCbx.name;
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

      if (this.bRapida) {
        // En rápidas no hay F. Prometida: cliente → descripción directo.
        this.fn_closeHeaderField();
        this.nextInputFocus(this.descripcionInput, 80);
      } else {
        // Cadena de foco: cliente → fecha prometida (abre chip + abre datepicker)
        this.fn_focusHeaderField('fechaPrometida');
      }

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

      // Cadena de foco: vendedor → cliente (abre chip + enfoca input del autocomplete)
      this.fn_focusHeaderField('customer');

    }, 1);

  }

  cbxSellers_Clear(){
    this.tallerForm.idSeller_idUser = 0;
    this.tallerForm.sellerDesc = '';
    this.tallerForm.sellerResp = '';
  }

  nextInputFocus(inputRef: ElementRef | HTMLElement | any, time: number) {
    setTimeout(() => {
      const el: HTMLElement | undefined = inputRef?.nativeElement ?? inputRef;
      if (el && typeof (el as any).focus === 'function') {
        (el as HTMLElement).focus();
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

