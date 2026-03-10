import { Component, Inject, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { SalesService } from 'src/app/protected/services/sales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { environment } from 'src/environments/environment';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { AuthService } from 'src/app/auth/services/auth.service';

@Component({
  selector: 'app-taller-header-images',
  templateUrl: './taller-header-images.component.html',
  styleUrls: ['./taller-header-images.component.css']
})
export class TallerHeaderImagesComponent implements OnInit, OnDestroy {

  tallerHeaderImages: any[] = [];
  currentImageIndex: number = 0;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  bShowSpinner: boolean = false;
  idUserLogON: number = 0;

  // Cámara
  showCamera: boolean = false;
  cameraStream: MediaStream | null = null;
  capturedPhotos: { file: File, preview: string }[] = [];
  uploadingIndex: number = 0;
  availableCameras: MediaDeviceInfo[] = [];
  currentCameraIndex: number = 0;
  videoReady: boolean = false;

  @ViewChild('videoElement') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasRef!: ElementRef<HTMLCanvasElement>;

  constructor(
    private dialogRef: MatDialogRef<TallerHeaderImagesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private salesServ: SalesService,
    private servicesGServ: ServicesGService,
    private authServ: AuthService,
    private cdr: ChangeDetectorRef
  ) { }

  async ngOnInit() {
    this.idUserLogON = await this.authServ.getIdUserSession();
    if (this.data && this.data.idTaller) {
      this.getTallerHeaderImages(this.data.idTaller);
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

  uploadTallerHeaderImage(): void {
    if (!this.selectedFile) {
      this.servicesGServ.showSnakbar('Debe seleccionar una imagen');
      return;
    }

    if (!this.data || this.data.idTaller === 0) {
      this.servicesGServ.showSnakbar('Taller no válido');
      return;
    }

    this.bShowSpinner = true;
    this.salesServ.uploadTallerHeaderImage(this.selectedFile, this.data.idTaller)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.servicesGServ.showAlertIA(resp, false);
          if (resp.status === 0) {
            this.getTallerHeaderImages(this.data.idTaller);
            this.selectedFile = null;
            this.imagePreview = null;
            // Limpiar input file
            const fileInput = document.getElementById('tallerHeaderImageInput') as HTMLInputElement;
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

  getTallerHeaderImages(idTaller: number): void {
    this.bShowSpinner = true;
    const oParams: any = {
      idTaller: idTaller
    };
    this.salesServ.getMetalClienteImages(oParams)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.bShowSpinner = false;
          if (resp.status === 0) {
            // Procesar imágenes y construir URLs completas con el baseUrl
            this.tallerHeaderImages = (resp.data.imagesDetail || []).map((img: any) => ({
              ...img,
              keyX: img.keyX || img.keyx || 0,
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
    if (this.tallerHeaderImages.length > 0) {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.tallerHeaderImages.length;
    }
  }

  prevImage(): void {
    if (this.tallerHeaderImages.length > 0) {
      this.currentImageIndex = (this.currentImageIndex - 1 + this.tallerHeaderImages.length) % this.tallerHeaderImages.length;
    }
  }

  deleteTallerHeaderImage(keyX: number): void {

    if (!keyX) {
      this.servicesGServ.showSnakbar('No se pudo obtener el ID de la imagen');
      return;
    }

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
                      this.getTallerHeaderImages(this.data.idTaller);
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
    this.fn_closeCamera();
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    this.fn_closeCamera();
  }

  fn_openCamera(): void {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.servicesGServ.showSnakbar('Su navegador no soporta acceso a la cámara');
      return;
    }
    // Enumerar cámaras disponibles primero
    navigator.mediaDevices.enumerateDevices()
      .then((devices: MediaDeviceInfo[]) => {
        this.availableCameras = devices.filter(d => d.kind === 'videoinput');
        if (this.availableCameras.length === 0) {
          this.servicesGServ.showSnakbar('No se encontró ninguna cámara');
          return;
        }
        // Intentar iniciar con la cámara trasera si existe, si no la primera
        const backIndex = this.availableCameras.findIndex(c =>
          c.label.toLowerCase().includes('back') ||
          c.label.toLowerCase().includes('trasera') ||
          c.label.toLowerCase().includes('rear')
        );
        this.currentCameraIndex = backIndex >= 0 ? backIndex : 0;
        this.fn_startStream();
      });
  }

  private fn_startStream(): void {
    // Detener stream previo si existe
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    const deviceId = this.availableCameras[this.currentCameraIndex]?.deviceId;
    const constraints: MediaStreamConstraints = {
      video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' },
      audio: false
    };
    navigator.mediaDevices.getUserMedia(constraints)
      .then((stream: MediaStream) => {
        this.cameraStream = stream;
        this.videoReady = false;
        this.showCamera = true;
        setTimeout(() => {
          if (this.videoRef && this.videoRef.nativeElement) {
            const video = this.videoRef.nativeElement;
            video.srcObject = stream;
            video.onloadedmetadata = () => {
              video.play();
              this.videoReady = true;
            };
          }
        }, 0);
      })
      .catch(() => {
        this.servicesGServ.showSnakbar('No se pudo acceder a la cámara. Verifique los permisos.');
      });
  }

  fn_switchCamera(): void {
    if (this.availableCameras.length <= 1) return;
    this.currentCameraIndex = (this.currentCameraIndex + 1) % this.availableCameras.length;
    this.fn_startStream();
  }

  fn_capturePhoto(): void {
    const video = this.videoRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;
    if (!video || !canvas) return;

    if (!this.videoReady || video.videoWidth === 0 || video.videoHeight === 0) {
      this.servicesGServ.showSnakbar('La cámara aún no está lista, espere un momento');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob: Blob | null) => {
      if (!blob) return;
      const timestamp = new Date().getTime();
      const file = new File([blob], `foto_${timestamp}.jpg`, { type: 'image/jpeg' });
      const preview = canvas.toDataURL('image/jpeg');
      this.capturedPhotos.push({ file, preview });
      this.cdr.detectChanges();
    }, 'image/jpeg', 0.9);
  }

  fn_removeCapturedPhoto(index: number): void {
    this.capturedPhotos.splice(index, 1);
  }

  fn_closeCamera(): void {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    this.videoReady = false;
    this.showCamera = false;
  }

  fn_uploadCapturedPhotos(): void {
    if (this.capturedPhotos.length === 0) {
      this.servicesGServ.showSnakbar('No hay fotos capturadas para subir');
      return;
    }
    if (!this.data || this.data.idTaller === 0) {
      this.servicesGServ.showSnakbar('Taller no válido');
      return;
    }
    this.fn_closeCamera();
    this.bShowSpinner = true;
    this.uploadingIndex = 0;
    this.fn_uploadNext();
  }

  private fn_uploadNext(): void {
    if (this.uploadingIndex >= this.capturedPhotos.length) {
      this.capturedPhotos = [];
      this.bShowSpinner = false;
      setTimeout(() => this.cdr.detectChanges(), 1000);
      this.getTallerHeaderImages(this.data.idTaller);
      this.servicesGServ.showAlertIA({ status: 0, message: 'Fotos subidas correctamente' }, false);
      return;
    }
    const photo = this.capturedPhotos[this.uploadingIndex];
    this.salesServ.uploadTallerHeaderImage(photo.file, this.data.idTaller)
      .subscribe({
        next: () => {
          this.uploadingIndex++;
          setTimeout(() => this.cdr.detectChanges(), 1000);
          this.fn_uploadNext();
        },
        error: () => {
          this.uploadingIndex++;
          setTimeout(() => this.cdr.detectChanges(), 1000);
          this.fn_uploadNext();
        }
      });
  }}
