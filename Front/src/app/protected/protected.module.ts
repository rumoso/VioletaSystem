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