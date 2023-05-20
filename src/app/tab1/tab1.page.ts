import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Camera, CameraResultType, CameraSource} from "@capacitor/camera";
import {Component} from "@angular/core";
import {GOOGLE_VISION_API_KEY, USER_PROJECT} from 'src/app/key';

const GOOGLE_VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';


@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {


  constructor(private http: HttpClient) {}

  async takePhoto() {
    console.log('takePhoto');
    const image = await Camera.getPhoto({
      quality: 100,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera
    });
    console.log('image', image);
  }

  // Method to send the base64 image to Google Cloud Vision API and extract the description
  async processImage(base64Image: string): Promise<string> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-goog-user-project': USER_PROJECT,
      Authorization: `Bearer ${GOOGLE_VISION_API_KEY}`,
    });

    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [
            {
              type: 'DOCUMENT_TEXT_DETECTION',
            },
          ],
        },
      ],
    };

    try {
      const response = await this.http
        .post<any>(GOOGLE_VISION_API_URL, requestBody, { headers })
        .toPromise();

      // Extract the description from the response
      return response.responses[0].textAnnotations[0].description;
    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    }
  }
}
