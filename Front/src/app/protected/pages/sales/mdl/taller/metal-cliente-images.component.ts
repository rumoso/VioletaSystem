import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { SalesService } from 'src/app/protected/services/sales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { environment } from 'src/environments/environment';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';

@Component({
  selector: 'app-metal-cliente-images',
  templateUrl: './metal-cliente-images.component.html',
  styleUrls: ['./metal-cliente-images.component.css']
})
export class MetalClienteImagesComponent implements OnInit {

  metalClienteImages: any[] = [];
  currentImageIndex: number = 0;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  bShowSpinner: boolean = false;
  idUserLogON: number = 0;

  constructor(
    private dialogRef: MatDialogRef<MetalClienteImagesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private salesServ: SalesService,
    private servicesGServ: ServicesGService
  ) { }

  ngOnInit(): void {
    if (this.data && this.data.idMetalCliente) {
      this.getMetalClienteImages(this.data.idMetalCliente);
    }
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  uploadMetalClienteImage(): void {
    if (!this.selectedFile) {
      this.servicesGServ.showSnakbar('Debe seleccionar una imagen');
      return;
    }

    if (!this.data || this.data.idMetalCliente === 0) {
      this.servicesGServ.showSnakbar('Metal no válido');
      return;
    }

    this.bShowSpinner = true;
    this.salesServ.uploadMetalClienteImage(this.selectedFile, this.data.idMetalCliente)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.servicesGServ.showAlertIA(resp, false);
          if (resp.status === 0) {
            this.getMetalClienteImages(this.data.idMetalCliente);
            this.selectedFile = null;
            this.imagePreview = null;
            // Limpiar input file
            const fileInput = document.getElementById('metalClienteImageInput') as HTMLInputElement;
            if (fileInput) {
              fileInput.value = '';
            }
          }
          this.bShowSpinner = false;
        },
        error: (ex: HttpErrorResponse) => {
          this.servicesGServ.showSnakbar(ex.error.message || 'Error al subir imagen');
          this.bShowSpinner = false;
        }
      });
  }

  getMetalClienteImages(idMetalCliente: number): void {
    this.bShowSpinner = true;
    const oParams: any = {
      idMetalCliente: idMetalCliente
    };
    this.salesServ.getMetalClienteImages(oParams)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.bShowSpinner = false;
          if (resp.status === 0) {
            // Procesar imágenes y construir URLs completas con el baseUrl
            this.metalClienteImages = (resp.data.imagesDetail || []).map((img: any) => ({
              ...img,
              urlImg: `${environment.baseUrl}${img.urlImg}`
            }));
            this.currentImageIndex = 0;
          }
        },
        error: (ex: HttpErrorResponse) => {
          this.servicesGServ.showSnakbar(ex.error.message || 'Error al cargar imágenes');
          this.bShowSpinner = false;
        }
      });
  }

  nextImage(): void {
    if (this.metalClienteImages.length > 0) {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.metalClienteImages.length;
    }
  }

  prevImage(): void {
    if (this.metalClienteImages.length > 0) {
      this.currentImageIndex = (this.currentImageIndex - 1 + this.metalClienteImages.length) % this.metalClienteImages.length;
    }
  }

  deleteMetalClienteImage(keyX: number): void {
    this.servicesGServ.showDialog('¿Estás seguro?'
        , 'Está a punto de eliminar esta imagen'
        , '¿Desea continuar?'
        , 'Si', 'No')
        .afterClosed().subscribe({
          next: async( resp ) =>{
            if(resp){

              this.bShowSpinner = true;

              const oParams: any = {
                keyX: keyX,
                idUser: this.idUserLogON
              };

              this.salesServ.deleteMetalClienteImage(oParams)
                .subscribe({
                  next: (resp: ResponseDB_CRUD) => {
                    if (resp.status === 0) {
                      this.getMetalClienteImages(this.data.idMetalCliente);
                    }
                    this.servicesGServ.showAlertIA( resp );
                    this.bShowSpinner = false;
                  },
                  error: (ex: HttpErrorResponse) => {
                    this.servicesGServ.showSnakbar(ex.error.message || 'Error al eliminar imagen');
                    this.bShowSpinner = false;
                  }
                });

            }
          }
        });
  }

  fn_cancel() {
    this.dialogRef.close();
  }
}
