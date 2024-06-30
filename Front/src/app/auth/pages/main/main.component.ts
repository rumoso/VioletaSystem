import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent {

  public _IconApp: string = environment.iconApp;

  constructor( private router: Router ) { }

  ngOnInit(): void {
    this.router.navigate( ['./auth/login'] )
  }

  logout() {
    localStorage.setItem('token', '')
    localStorage.setItem('user', '')
    localStorage.setItem('idUser', '')
    this.router.navigate( ['./auth'] );
  }

}
