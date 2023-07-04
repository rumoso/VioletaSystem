import { Component, OnInit, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {

  private _appMain: string = environment.appMain;
  
  @ViewChild('sidenav') sidenav!: MatSidenav;

  constructor(
    private authService: AuthService,
    private servicesGServ: ServicesGService
  ) { }

  get userLogin() {
    return this.authService.userLogin;
  }
  
  _userLogin: any;
  _menuList: any = []

  MenusList: any[] = [];

  async ngOnInit() {

    var idUserLogOn = await localStorage.getItem('idUser');

      if(!(idUserLogOn?.length! > 0)){
        this.servicesGServ.changeRoute( '/' );
      }

    await this.getMenuByPermissions( idUserLogOn );
  }

  changeRoute( route: string ): void {
    this.sidenav.toggle();
    this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
  }

  logout() {
    this.authService.logout();
  }

  getMenuByPermissions(idUser: any){
    
    this.authService.getMenuByPermissions( idUser )
    .subscribe( data =>{
      //console.log(data);
      if(data.status == 0){
        this._menuList = data.data;
      }
    })

  }
  
}
