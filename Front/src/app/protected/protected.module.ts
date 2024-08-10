
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MaterialModule } from "../material/material.module";
import { ProtectedRoutingModule } from './protected-routing.module';
import { MainComponent } from './pages/main/main.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

import { ComponentsModule } from '../components/components.module';
import { UserListComponent } from './pages/security/users/user-list/user-list.component';
import { UserComponent } from "./pages/security/users/user/user.component";
import { ProductListComponent } from './pages/catssales/product-list/product-list.component';
import { ProductComponent } from './pages/catssales/product/product.component';
import { CustomerListComponent } from './pages/catssales/customer-list/customer-list.component';
import { CustomerComponent } from './pages/catssales/customer/customer.component';
import { FxrateComponent } from './pages/settings/fxrate/fxrate.component';
import { SaleListComponent } from './pages/sales/sale-list/sale-list.component';
import { NsaleComponent } from './pages/sales/mdl/nsale/nsale.component';
import { PaymentsComponent } from './pages/sales/mdl/payments/payments.component';
import { ElectronicMoneyMDLComponent } from './pages/catssales/mdl/electronic-money-mdl/electronic-money-mdl.component';
import { InventaryComponent } from './pages/reports/inventary/inventary.component';
import { SelectCajaComponent } from './pages/sales/mdl/select-caja/select-caja.component';
import { CorteCajaComponent } from './pages/sales/mdl/corte-caja/corte-caja.component';
import { EgresosComponent } from './pages/sales/mdl/egresos/egresos.component';
import { SelectPrintComponent } from './pages/sales/mdl/select-print/select-print.component';
import { ActionsComponent } from './pages/security/users/mdl/actions/actions.component';
import { CortesCajaComponent } from './pages/sales/cortes-caja/cortes-caja.component';
import { RoleComponent } from './pages/security/roles/role/role.component';
import { RoleListComponent } from './pages/security/roles/role-list/role-list.component';
import { ActionAuthorizationComponent } from './pages/security/users/mdl/action-authorization/action-authorization.component';
import { CortecajadetailComponent } from './pages/sales/mdl/cortecajadetail/cortecajadetail.component';
import { InventarylogComponent } from './pages/catssales/mdl/inventarylog/inventarylog.component';
import { UtilidadComponent } from './pages/reports/utilidad/utilidad.component';
import { SuppliersComponent } from './pages/catssales/suppliers/suppliers.component';
import { ActionsconfComponent } from './pages/security/mdl/actionsconf/actionsconf.component';
import { PhysicalInventoryComponent } from './pages/reports/physical-inventory/physical-inventory.component';
import { PhysicalInventoryListComponent } from './pages/reports/physical-inventory-list/physical-inventory-list.component';
import { ComisionesComponent } from './pages/operation/comisiones/comisiones.component';
import { ComisionComponent } from './pages/operation/comision/comision.component';
import { EgresosListComponent } from './pages/sales/egresos-list/egresos-list.component';
import { CatComponent } from './pages/catssales/mdl/cat/cat.component';
import { QuestionCancelPaymentComponent } from './pages/sales/mdl/question-cancel-payment/question-cancel-payment.component';
import { GenComisionComponent } from './pages/operation/gen-comision/gen-comision.component';
import { RepcomprasproveedorComponent } from './pages/reports/repcomprasproveedor/repcomprasproveedor.component';
import { VerificacionEntradasComponent } from './pages/operation/verificacion-entradas/verificacion-entradas.component';
import { RepMobDineoelectComponent } from './pages/reports/rep-mob-dineoelect/rep-mob-dineoelect.component';
import { MenupermisosComponent } from './pages/security/mdl/menupermisos/menupermisos.component';
import { EditTallerComponent } from './pages/sales/mdl/edit-taller/edit-taller.component';
import { SalesComponent } from './pages/reports/sales/sales.component';
import { DevoluInventarioComponent } from './pages/operation/devolu-inventario/devolu-inventario.component';
import { IngresosComponent } from './pages/sales/mdl/ingresos/ingresos.component';
import { IngresosListComponent } from './pages/sales/ingresos-list/ingresos-list.component';
import { PagosCanceladosComponent } from './pages/reports/pagos-cancelados/pagos-cancelados.component';
import { QuestionCancelSalePaymentsComponent } from './pages/sales/mdl/question-cancel-sale-payments/question-cancel-sale-payments.component';
import { ChangepwdsecretwordComponent } from './pages/security/mdl/changepwdsecretword/changepwdsecretword.component';
import { RepPaymentsComponent } from './pages/reports/rep-payments/rep-payments.component';

@NgModule({
    declarations: [
    MainComponent,
    DashboardComponent,
    UserListComponent,
    UserComponent,
    ProductListComponent,
    ProductComponent,
    CustomerListComponent,
    CustomerComponent,
    FxrateComponent,
    SaleListComponent,
    NsaleComponent,
    PaymentsComponent,
    ElectronicMoneyMDLComponent,
    InventaryComponent,
    SelectCajaComponent,
    CorteCajaComponent,
    EgresosComponent,
    SelectPrintComponent,
    ActionsComponent,
    CortesCajaComponent,
    RoleComponent,
    RoleListComponent,
    ActionAuthorizationComponent,
    CortecajadetailComponent,
    InventarylogComponent,
    UtilidadComponent,
    SuppliersComponent,
    ActionsconfComponent,
    PhysicalInventoryComponent,
    PhysicalInventoryListComponent,
    ComisionesComponent,
    ComisionComponent,
    EgresosListComponent,
    CatComponent,
    QuestionCancelPaymentComponent,
    GenComisionComponent,
    RepcomprasproveedorComponent,
    VerificacionEntradasComponent,
    RepMobDineoelectComponent,
    MenupermisosComponent,
    EditTallerComponent,
    SalesComponent,
    DevoluInventarioComponent,
    IngresosComponent,
    IngresosListComponent,
    PagosCanceladosComponent,
    QuestionCancelSalePaymentsComponent,
    ChangepwdsecretwordComponent,
    RepPaymentsComponent,
  ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        MaterialModule,
        ProtectedRoutingModule,
        ComponentsModule
    ]
})
export class ProtectedModule {}
