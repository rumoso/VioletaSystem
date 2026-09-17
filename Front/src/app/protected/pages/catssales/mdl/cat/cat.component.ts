import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { ComisionesService } from 'src/app/protected/services/comisiones.service';
import { ProductsService } from 'src/app/protected/services/products.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-cat',
  templateUrl: './cat.component.html',
  styleUrls: ['./cat.component.css']
})
export class CatComponent implements AfterViewInit {

  // #region VARIABLES

  @ViewChild('nameInput') nameInputRef?: ElementRef<HTMLInputElement>;

  // Nombre del registro que se está editando (para el encabezado del form).
  sNombreEditando: string = '';

  private _appMain: string = environment.appMain;

  title: string = '';
  bShowSpinner: boolean = false;

  idUserLogON: number = 0;

  oCatForm: any = {

    sOption: '',
    idRelation: 0,
    name: '',
    description: '',
    valor: 0,
    active: true

  };

  oCatList: any[] = [];

  //-------------------------------
  // VARIABLES PARA LA PAGINACIÓN
  iRows: number = 0;
  pagination: Pagination = {
    search:'',
    length: 10,
    pageSize: 10,
    pageIndex: 0,
    pageSizeOptions: [5, 10, 25, 100]
  }
  //-------------------------------

  // #endregion

  constructor(
    private dialogRef: MatDialogRef<CatComponent>
    ,@Inject(MAT_DIALOG_DATA) public ODataP: any
  
    , private servicesGServ: ServicesGService

    , private _adapter: DateAdapter<any>
    , @Inject(MAT_DATE_LOCALE) private _locale: string

    , private authServ: AuthService

    , private productsServ: ProductsService

  ) { }

  async ngOnInit() {

    this.authServ.checkSession();
    this.idUserLogON = await this.authServ.getIdUserSession();

    this._locale = 'mx';
    this._adapter.setLocale(this._locale);

    if( this.ODataP.sOption.length > 0 ){

      this.title = this.ODataP.sOption == 'Groups' ? 'Catálogo de grupos'
      : this.ODataP.sOption == 'Families' ? 'Catálogo de familias'
      : this.ODataP.sOption == 'Quality' ? 'Catálogo de calidades'
      : this.ODataP.sOption == 'Origin' ? 'Catálogo de origenes'
      : '';

      this.fn_getCatListWithPage();

    }

  }

  ngAfterViewInit(): void {
    this.fn_enfocarNombre();
  }

  // #region MÉTODOS DEL FRONT

  // Solo el catálogo de calidades maneja "valor" (kilataje/ley).
  get bConValor(): boolean {
    return this.ODataP?.sOption == 'Quality';
  }

  private fn_enfocarNombre(){
    setTimeout( () => this.nameInputRef?.nativeElement?.focus(), 150 );
  }

  // Enter en un campo pasa al siguiente.
  fn_siguiente( evento: Event, idSiguiente: string ){
    evento.preventDefault();
    document.getElementById( idSiguiente )?.focus();
  }

  // Enter en el último campo guarda, si el formulario es válido.
  fn_enterGuardar( evento: Event ){
    evento.preventDefault();
    if( this.fn_validForm() ){
      this.fn_insertUpdateCat();
    }
  }

  fn_editData( item: any ){
    // El Back regresa `valor` (antes se leía `item.value`, que no existe, y
    // al guardar una calidad editada se perdía su valor). `active` se toma
    // del registro: antes se forzaba a true y editar reactivaba sin avisar.
    this.oCatForm = {

      idRelation: item.idRelation,
      name: item.name || '',
      description: item.description || '',
      valor: item.valor ?? 0,
      active: Number(item.active) === 1

    };
    this.sNombreEditando = item.name || '';
    this.fn_enfocarNombre();
  }

  fn_clear(){
    this.oCatForm = {

      idRelation: 0,
      name: '',
      description: '',
      valor: 0,
      active: true

    };
    this.sNombreEditando = '';
    this.fn_enfocarNombre();
  }

  fn_validForm(){
    return ( this.oCatForm.name || '' ).trim().length > 0;
  }

  fn_CerrarMDL( id: number ){
    this.dialogRef.close( id );
  }

  ////************************************************ */
  // MÉTODOS DE PAGINACIÓN
  changePagination(pag: Pagination) {
    this.pagination = pag;
    this.fn_getCatListWithPage();
  }

  onChangeEvent(event: any){
    this.pagination.search = event.target.value;
    this.fn_getCatListWithPage();
  }
  ////************************************************ */

  // #endregion

  // #region CONEXIONES CON EL BACK

  fn_insertUpdateCat() {

    if( this.fn_validForm() ){
  
      this.servicesGServ.showDialog('¿Estás seguro?'
      , 'Está a punto de guardar'
      , '¿Desea continuar?'
      , 'Si', 'No')
        .afterClosed().subscribe({
        next: ( resp: any ) =>{
  
          if(resp){
  
            this.bShowSpinner = true;

            this.oCatForm.sOption = this.ODataP.sOption;
  
            this.productsServ.CInsertUpdateCat( this.oCatForm )
              .subscribe({
              next: (resp: ResponseDB_CRUD) => {
  
                if( resp.status === 0 ){
                  this.servicesGServ.showAlert('S', 'OK!', resp.message, true);
                  this.fn_clear();
                }
                else{
                  this.servicesGServ.showAlert('W', 'Alerta!', resp.message, true);
                }

                this.fn_getCatListWithPage();
  
                this.bShowSpinner = false;
  
              },
              error: (ex) => {
                
                this.servicesGServ.showSnakbar( "Problemas con el servicio" );
                this.bShowSpinner = false;
  
              }
            })
  
          }
        }
      });
  
    }
  
  }
  
  fn_getCatListWithPage() {
  
    this.bShowSpinner = true;

    var oParams: any = {
      sOption: this.ODataP.sOption
    }

    this.productsServ.CGetCatListWithPage( this.pagination, oParams )
    .subscribe({
      next: (resp: ResponseGet) => {
        
        this.oCatList = resp.data?.rows || [];
        this.pagination.length = resp.data?.count || 0;
        this.bShowSpinner = false;
  
      },
      error: (ex: HttpErrorResponse) => {
        
        this.servicesGServ.showSnakbar( ex.error.data );
        this.bShowSpinner = false;
  
      }
    })
  }
  

  // #endregion

}
