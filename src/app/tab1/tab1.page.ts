import { Component } from '@angular/core';
import {Camera, CameraResultType, CameraSource} from '@capacitor/camera';


@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {
  
  constructor() {}

  async takePhoto() {
    console.log('takePhoto');
    const image = await Camera.getPhoto({
      quality: 100,
      allowEditing: true,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera
    });
    console.log('image', image);
  }
}
