import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent {
  
  constructor( private router: Router ) { }

  ngOnInit(): void {
    this.router.navigate( ['./auth/login'] )
  }

  logout() {
    localStorage.setItem('token', '')
    this.router.navigate( ['./auth'] );
  }
  
}
