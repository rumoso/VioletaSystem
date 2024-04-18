import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmComponent } from './confirm/confirm.component';
import { PaginationComponent } from './pagination/pagination.component';
import { SpinnerComponent } from './spinner/spinner.component';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../material/material.module';
import { AlertComponent } from './alert/alert.component';
import { DecimalNumberDirective } from './directives/decimal-number.directive';
import { DecimalNumberNegDirective } from './directives/decimal-number-neg.directive';



@NgModule({
  declarations: [
    ConfirmComponent,
    PaginationComponent,
    SpinnerComponent,
    AlertComponent,
    DecimalNumberDirective,
    DecimalNumberNegDirective
  ],
  exports:[
    SpinnerComponent,
    PaginationComponent,
    DecimalNumberDirective,
    DecimalNumberNegDirective
  ],
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule
  ]
})
export class ComponentsModule { }
