import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { MetalInventarioService } from 'src/app/protected/services/metal-inventario.service';
import { UsersService } from 'src/app/protected/services/users.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-metal-inventario',
  templateUrl: './metal-inventario.component.html',
  styleUrls: ['./metal-inventario.component.css']
})
export class MetalInventarioComponent {

// #region VARIABLES

  public _idSucursal: number = environment.idSucursal;

  title = 'Inventario de Metal';
  bShowSpinner: boolean = false;

  idUserLogON: number = 0;

  bCanVer: boolean = false;
  bCanTransferir: boolean = false;

  saldosSucursal: any[] = [];

  trackList: any[] = [];
  pagination: Pagination = {
    search:'',
    length: 10,
    pageSize: 10,
    pageIndex: 0,
    pageSizeOptions: [5, 10, 25, 100]
  }

  // Kardex: solo se consulta por sucursal o por técnico (sin "todos")
  parametersForm: any = {
    tipoPropietario: 'SUCURSAL',
    idTecnico: 0,
    tecnicoDesc: '',
    startDate: '',
    endDate: ''
  };

  // Saldos del técnico consultado en el kardex
  saldosTecnicoFiltro: any[] = [];

  // Transferencia manual
  bShowTransferForm: boolean = false;
  productosMetal: any[] = [];
  sOperacion: string = 'ENTRADA'; // ENTRADA | TRASPASO_ST | TRASPASO_TS
  transferForm: any = {
    idProduct: 0,
    productoDesc: '',
    gramos: '',
    idTecnico: 0,
    tecnicoDesc: '',
    referencia: ''
  };

// #endregion

  constructor(
    private servicesGServ: ServicesGService
    , private metalInvServ: MetalInventarioService
    , private usersServ: UsersService
    , private authServ: AuthService
    ) { }

  async ngOnInit() {

    this.authServ.checkSession();
    this.idUserLogON = await this.authServ.getIdUserSession();

    this.bCanVer = this.authServ.hasPermissionAction('tall_MetalInvVer');
    this.bCanTransferir = this.authServ.hasPermissionAction('tall_MetalInvTransferir');

    if (this.bCanVer) {
      this.fn_getProductosMetal();
      this.fn_getSaldos();
      this.fn_getTrack();
    }

  }

// #region MÉTODOS PARA EL FRONT

  get productoSeleccionado(): any {
    return this.productosMetal.find( p => p.idProduct == this.transferForm.idProduct );
  }

  get filteredProductosMetal(): any[] {
    const sSearch = (this.transferForm.productoDesc || '').toLowerCase();
    if (!sSearch || this.transferForm.idProduct) {
      return this.productosMetal;
    }
    return this.productosMetal.filter( p => p.name.toLowerCase().includes(sSearch) );
  }

  get equivalenteFino(): string {
    const p = this.productoSeleccionado;
    const gramos = parseFloat(this.transferForm.gramos) || 0;
    if (!p || gramos <= 0) return '';
    const base = p.tipoMetal === 'plata' ? 1000 : 24;
    const fino = Math.round( gramos * parseFloat(p.medida) / base * 100 ) / 100;
    return `${ fino } g de ${ p.tipoMetal === 'plata' ? 'plata fina' : 'oro fino' }`;
  }

  fn_toggleTransferForm() {
    this.bShowTransferForm = !this.bShowTransferForm;
    if (this.bShowTransferForm) {
      this.sOperacion = 'ENTRADA';
      this.transferForm = { idProduct: 0, productoDesc: '', gramos: '', idTecnico: 0, tecnicoDesc: '', referencia: '' };
    }
  }

  changePagination(pag: Pagination) {
    this.pagination = pag;
    this.fn_getTrack();
  }

  fn_kardexPropietarioChange() {
    this.parametersForm.idTecnico = 0;
    this.parametersForm.tecnicoDesc = '';
    this.saldosTecnicoFiltro = [];
    this.pagination.pageIndex = 0;
    this.fn_getTrack();
  }

  parametersForm_Clear(){
    this.parametersForm = { tipoPropietario: 'SUCURSAL', idTecnico: 0, tecnicoDesc: '', startDate: '', endDate: '' };
    this.saldosTecnicoFiltro = [];
    this.pagination.pageIndex = 0;
    this.fn_getTrack();
  }

// #endregion

// #region CONEXIONES AL BACK

  fn_getProductosMetal() {
    this.metalInvServ.CCbxGetProductosMetal()
    .subscribe({
      next: (resp: ResponseGet) => {
        if (resp.status === 0) {
          this.productosMetal = resp.data || [];
        }
      },
      error: () => {}
    });
  }

  fn_getSaldos() {
    this.metalInvServ.CGetMetalInventarioSaldos('SUCURSAL', 0)
    .subscribe({
      next: (resp: ResponseGet) => {
        if (resp.status === 0) {
          this.saldosSucursal = resp.data.rows || [];
        }
      },
      error: (ex: HttpErrorResponse) => {
        this.servicesGServ.showSnakbar('Error al cargar los saldos');
      }
    });
  }

  fn_getSaldosTecnicoFiltro() {
    if (!this.parametersForm.idTecnico) {
      this.saldosTecnicoFiltro = [];
      return;
    }
    this.metalInvServ.CGetMetalInventarioSaldos('TECNICO', this.parametersForm.idTecnico)
    .subscribe({
      next: (resp: ResponseGet) => {
        if (resp.status === 0) {
          this.saldosTecnicoFiltro = resp.data.rows || [];
        }
      },
      error: () => {}
    });
  }

  fn_getTrack() {

    const oFiltro: any = {
      tipoPropietario: this.parametersForm.tipoPropietario,
      idPropietario: this.parametersForm.tipoPropietario === 'SUCURSAL'
        ? this._idSucursal
        : ( this.parametersForm.idTecnico || 0 ),
      startDate: this.parametersForm.startDate,
      endDate: this.parametersForm.endDate
    };

    this.bShowSpinner = true;
    this.metalInvServ.CGetMetalInventarioTrack(this.pagination, oFiltro)
    .subscribe({
      next: (resp: ResponseGet) => {
        if (resp.status === 0) {
          this.trackList = resp.data.rows || [];
          this.pagination.length = resp.data.count || 0;
        }
        this.bShowSpinner = false;
      },
      error: (ex: HttpErrorResponse) => {
        this.servicesGServ.showSnakbar('Error al cargar el kardex');
        this.bShowSpinner = false;
      }
    });
  }

  fn_transferir() {

    if (!this.transferForm.idProduct) {
      this.servicesGServ.showSnakbar('Selecciona el producto de metal');
      return;
    }
    if (!this.transferForm.gramos || this.transferForm.gramos <= 0) {
      this.servicesGServ.showSnakbar('Los gramos deben ser mayores a 0');
      return;
    }
    if ((this.sOperacion === 'TRASPASO_ST' || this.sOperacion === 'TRASPASO_TS') && !this.transferForm.idTecnico) {
      this.servicesGServ.showSnakbar('Selecciona el técnico');
      return;
    }

    var oParams: any = {
      idProduct: this.transferForm.idProduct,
      gramos: this.transferForm.gramos,
      referencia: this.transferForm.referencia || ''
    };

    if (this.sOperacion === 'ENTRADA') {
      oParams.tipoMovimiento = 'ENTRADA';
      oParams.tipoOrigen = 'EXTERNO';
      oParams.idOrigen = 0;
      oParams.tipoDestino = 'SUCURSAL';
      oParams.idDestino = this._idSucursal;
    } else if (this.sOperacion === 'TRASPASO_ST') {
      oParams.tipoMovimiento = 'TRASPASO';
      oParams.tipoOrigen = 'SUCURSAL';
      oParams.idOrigen = this._idSucursal;
      oParams.tipoDestino = 'TECNICO';
      oParams.idDestino = this.transferForm.idTecnico;
    } else {
      oParams.tipoMovimiento = 'TRASPASO';
      oParams.tipoOrigen = 'TECNICO';
      oParams.idOrigen = this.transferForm.idTecnico;
      oParams.tipoDestino = 'SUCURSAL';
      oParams.idDestino = this._idSucursal;
    }

    this.servicesGServ.showDialog('¿Estás seguro?'
    , `Está a punto de registrar el movimiento (${ this.equivalenteFino })`
    , '¿Desea continuar?'
    , 'Si', 'No')
    .afterClosed().subscribe({
      next: ( resp ) =>{
        if (resp) {
          this.bShowSpinner = true;
          this.metalInvServ.CAddMetalInventarioMovimiento(oParams)
          .subscribe({
            next: (resp: any) => {
              this.servicesGServ.showAlertIA(resp);
              if (resp.status === 0) {
                this.fn_toggleTransferForm();
                this.fn_getSaldos();
                this.fn_getSaldosTecnicoFiltro();
                this.fn_getTrack();
              }
              this.bShowSpinner = false;
            },
            error: (ex: HttpErrorResponse) => {
              this.servicesGServ.showSnakbar(ex.error.message || 'Error al registrar el movimiento');
              this.bShowSpinner = false;
            }
          });
        }
      }
    });

  }

// #endregion

  //--------------------------------------------------------------------------
  // COMBO DE TÉCNICOS (transferencia)

  cbxTecnicos: any[] = [];

  // Si ya hay un técnico seleccionado, el clic lo limpia para buscar de nuevo
  cbxTecnicos_Click() {
    if (this.transferForm.idTecnico) {
      this.cbxTecnicos_Clear();
    }
    this.cbxTecnicos_Search();
  }

  cbxTecnicos_Search() {
      this.usersServ.CCbxGetTecnicosCombo( this.transferForm.tecnicoDesc )
       .subscribe( {
         next: (resp: ResponseGet) =>{
           if(resp.status === 0){
             this.cbxTecnicos = resp.data
           }
           else{
            this.cbxTecnicos = [];
           }
         },
         error: (ex) => {
           this.servicesGServ.showSnakbar( "Problemas con el servicio" );
         }
       });
  }

  cbxTecnicos_SelectedOption( event: MatAutocompleteSelectedEvent ) {

    if(!event.option.value){
      return;
    }

    const ODataCbx: any = event.option.value;

    this.transferForm.idTecnico = ODataCbx.id;
    this.transferForm.tecnicoDesc = ODataCbx.nombre;

  }

  cbxTecnicos_Clear(){
    this.transferForm.idTecnico = 0;
    this.transferForm.tecnicoDesc = '';
  }
  //--------------------------------------------------------------------------

  //--------------------------------------------------------------------------
  // COMBO DE TÉCNICOS (filtro del kardex)

  cbxTecnicosKardex: any[] = [];

  cbxTecnicosKardex_Click() {
    if (this.parametersForm.idTecnico) {
      this.cbxTecnicosKardex_Clear();
    }
    this.cbxTecnicosKardex_Search();
  }

  cbxTecnicosKardex_Search() {
      this.usersServ.CCbxGetTecnicosCombo( this.parametersForm.tecnicoDesc )
       .subscribe( {
         next: (resp: ResponseGet) =>{
           if(resp.status === 0){
             this.cbxTecnicosKardex = resp.data
           }
           else{
            this.cbxTecnicosKardex = [];
           }
         },
         error: (ex) => {
           this.servicesGServ.showSnakbar( "Problemas con el servicio" );
         }
       });
  }

  cbxTecnicosKardex_SelectedOption( event: MatAutocompleteSelectedEvent ) {

    if(!event.option.value){
      return;
    }

    const ODataCbx: any = event.option.value;

    this.parametersForm.idTecnico = ODataCbx.id;
    this.parametersForm.tecnicoDesc = ODataCbx.nombre;

    this.pagination.pageIndex = 0;
    this.fn_getSaldosTecnicoFiltro();
    this.fn_getTrack();

  }

  cbxTecnicosKardex_Clear(){
    this.parametersForm.idTecnico = 0;
    this.parametersForm.tecnicoDesc = '';
    this.saldosTecnicoFiltro = [];
  }
  //--------------------------------------------------------------------------

  //--------------------------------------------------------------------------
  // COMBO DE PRODUCTO DE METAL (con buscador)

  cbxProducto_Click() {
    if (this.transferForm.idProduct) {
      this.cbxProducto_Clear();
    }
  }

  cbxProducto_SelectedOption( event: MatAutocompleteSelectedEvent ) {

    if(!event.option.value){
      return;
    }

    const ODataCbx: any = event.option.value;

    this.transferForm.idProduct = ODataCbx.idProduct;
    this.transferForm.productoDesc = ODataCbx.name;

  }

  cbxProducto_Clear(){
    this.transferForm.idProduct = 0;
    this.transferForm.productoDesc = '';
  }
  //--------------------------------------------------------------------------

}
