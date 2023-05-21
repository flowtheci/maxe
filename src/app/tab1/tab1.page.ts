import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Camera, CameraResultType, CameraSource} from "@capacitor/camera";
import {Component} from "@angular/core";
import {DEMO_IMAGE, GOOGLE_VISION_API_KEY, OPENAI_API_KEY, USER_PROJECT} from 'src/app/key';

const GOOGLE_VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const PROMPT = 'The following is a Google Vision OCR API result of an Estonian grocery store receipt. Format the input, and from it create a table with the names of items, their quantity, and the total price of the item. Also include the total price of the whole receipt. Output the result in a JSON format, where each item is an object in an array with the key "items". Each object has the table header as the key (in lowercase), and the value of the field as the value. The fields in objects in this array should only use these keys: "name", "cost", "sum", "quantity". The cost of the item should be the cost of a single item in the JSON output. The total price, price without taxes / with taxes, and other relevant info should be in seperate key value pairs outside the "items" array. When you return an output, ONLY return the json, and do not add any other text. The JSON keys should be in english, and always from the following words: "items", "total_sum", "total_sum_no_taxes", "tax_20", "to_pay", \n \n';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})

export class Tab1Page {
  private loaded = true;
  items = [{name: 'test', quantity: 0, cost: '0.00', sum: '0.00'}];
  constructor(private http: HttpClient) {}

  getImage() {
    return DEMO_IMAGE;
  }


  async takePhoto() {
    console.log('takePhoto');
    return await Camera.getPhoto({
      quality: 100,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera
    });
  }


  async getReceipt() {
    this.loaded = false;
    const photo = await this.takePhoto();
    const response = await this.processImage(photo as unknown as string);
    const json = JSON.parse(await this.sendOpenAIRequest(response));
    this.items = json.items;
    this.loaded = true;

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
      return response.responses[0].fullTextAnnotation.text;
    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    }
  }

  // Method to send a string input to the OpenAI API and get a response
  async sendOpenAIRequest(input: string): Promise<string> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    });

    const requestBody = {
      model: 'gpt-3.5-turbo',
      messages: [{"role": "user", "content": PROMPT + input}],
      temperature: 0.7,
    };

    try {
      const response = await this.http
        .post<any>(OPENAI_API_URL, requestBody, { headers })
        .toPromise();

      // Extract the generated text from the response
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error sending request to OpenAI:', error);
      throw error;
    }
  }
}
