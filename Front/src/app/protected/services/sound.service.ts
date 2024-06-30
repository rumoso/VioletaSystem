import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SoundService {

  private successSoundPath = 'assets/sounds/SuccessSound.mp3';
  private errorSoundPath = 'assets/sounds/ErrorSound.mp3';

  constructor() {}

  playSuccessSound(): void {
    const successAudio = new Audio(this.successSoundPath);
    successAudio.play();
  }

  playErrorSound(): void {
    const errorAudio = new Audio(this.errorSoundPath);
    errorAudio.play();
  }

}
