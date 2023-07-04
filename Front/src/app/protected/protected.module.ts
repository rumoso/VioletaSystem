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

@NgModule({
    declarations: [
    MainComponent,
    DashboardComponent,
    UserListComponent,
    UserComponent,
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