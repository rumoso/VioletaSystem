import { NgModule } from "@angular/core";
import { Routes, RouterModule } from '@angular/router';
import { DashboardComponent } from "./pages/dashboard/dashboard.component";
import { MainComponent } from './pages/main/main.component';
import { UserComponent } from "./pages/security/users/user/user.component";
import { UserListComponent } from "./pages/security/users/user-list/user-list.component";
import { ProductListComponent } from "./pages/catssales/product-list/product-list.component";
import { ProductComponent } from "./pages/catssales/product/product.component";
import { CustomerListComponent } from "./pages/catssales/customer-list/customer-list.component";
import { FxrateComponent } from "./pages/settings/fxrate/fxrate.component";
import { SaleListComponent } from "./pages/sales/sale-list/sale-list.component";
import { InventaryComponent } from "./pages/reports/inventary/inventary.component";
import { CortesCajaComponent } from "./pages/sales/cortes-caja/cortes-caja.component";
import { UtilidadComponent } from "./pages/reports/utilidad/utilidad.component";
import { RoleListComponent } from "./pages/security/roles/role-list/role-list.component";
import { RoleComponent } from "./pages/security/roles/role/role.component";
import { PhysicalInventoryListComponent } from "./pages/reports/physical-inventory-list/physical-inventory-list.component";
import { ComisionesComponent } from "./pages/operation/comisiones/comisiones.component";
import { EgresosListComponent } from "./pages/sales/egresos-list/egresos-list.component";
import { RepcomprasproveedorComponent } from "./pages/reports/repcomprasproveedor/repcomprasproveedor.component";
import { VerificacionEntradasComponent } from "./pages/operation/verificacion-entradas/verificacion-entradas.component";
import { RepMobDineoelectComponent } from "./pages/reports/rep-mob-dineoelect/rep-mob-dineoelect.component";
import { SalesComponent } from "./pages/reports/sales/sales.component";
import { DevoluInventarioComponent } from "./pages/operation/devolu-inventario/devolu-inventario.component";
import { IngresosListComponent } from "./pages/sales/ingresos-list/ingresos-list.component";
import { PagosCanceladosComponent } from "./pages/reports/pagos-cancelados/pagos-cancelados.component";
import { RepPaymentsComponent } from "./pages/reports/rep-payments/rep-payments.component";

const routes: Routes = [
    {
      path: '',
      component: MainComponent,
      children: [
        {
          path: 'dashboard',
          component: DashboardComponent
        },
        {
          path: 'users',
          component: UserComponent
        },
        {
          path: 'editUser/:id',
          component: UserComponent
        },
        {
          path: 'userList',
          component: UserListComponent
        },
        {
          path: 'rol',
          component: RoleComponent
        },
        {
          path: 'editRol/:id',
          component: RoleComponent
        },
        {
          path: 'roleList',
          component: RoleListComponent
        },
        {
          path: 'product',
          component: ProductComponent
        },
        {
          path: 'editProduct/:id',
          component: ProductComponent
        },
        {
          path: 'productList',
          component: ProductListComponent
        },
        {
          path: 'customerList',
          component: CustomerListComponent
        },
        {
          path: 'saleList',
          component: SaleListComponent
        },
        {
          path: 'tiposDeCambio',
          component: FxrateComponent
        },
        {
          path: 'repinventario',
          component: InventaryComponent
        },
        {
          path: 'cortesCaja',
          component: CortesCajaComponent
        },
        {
          path: 'rep_utilidad',
          component: UtilidadComponent
        },
        {
          path: 'inventarioFisicoList',
          component: PhysicalInventoryListComponent
        },
        {
          path: 'comisiones',
          component: ComisionesComponent
        },
        {
          path: 'egresosList',
          component: EgresosListComponent
        },
        {
          path: 'rep_compras_proveedor',
          component: RepcomprasproveedorComponent
        },
        {
          path: 'verifi_entradas',
          component: VerificacionEntradasComponent
        },
        {
          path: 'rep_mod_dineroelect',
          component: RepMobDineoelectComponent
        },
        {
          path: 'rep_sales',
          component: SalesComponent
        },
        {
          path: 'devolu_inv',
          component: DevoluInventarioComponent
        },
        {
          path: 'ingresosList',
          component: IngresosListComponent
        },
        {
          path: 'rep_pagoscancelados',
          component: PagosCanceladosComponent
        },
        {
          path: 'rep_pagos',
          component: RepPaymentsComponent
        },

      ]
    }
  ]

@NgModule({
    imports: [
        RouterModule.forChild( routes )
    ],
    exports: [
        RouterModule
    ]
})
export class ProtectedRoutingModule {}
