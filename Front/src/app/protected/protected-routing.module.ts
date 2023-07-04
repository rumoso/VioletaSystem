import { NgModule } from "@angular/core";
import { Routes, RouterModule } from '@angular/router';
import { DashboardComponent } from "./pages/dashboard/dashboard.component";
import { MainComponent } from './pages/main/main.component';
import { UserComponent } from "./pages/security/users/user/user.component";
import { UserListComponent } from "./pages/security/users/user-list/user-list.component";

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