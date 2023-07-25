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
import { SaleComponent } from './pages/sales/sale/sale.component';
import { ClosesaleComponent } from './pages/sales/mdl/closesale/closesale.component';
import { AbonosComponent } from './pages/sales/abonos/abonos.component';
import { AbonoComponent } from './pages/sales/mdl/abono/abono.component';
import { FxrateComponent } from './pages/settings/fxrate/fxrate.component';
import { SaleListComponent } from './pages/sales/sale-list/sale-list.component';

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
    SaleComponent,
    ClosesaleComponent,
    AbonosComponent,
    AbonoComponent,
    FxrateComponent,
    SaleListComponent,
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