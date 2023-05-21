import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Camera, CameraResultType, CameraSource} from "@capacitor/camera";
import {Component, OnInit} from "@angular/core";
import {GOOGLE_VISION_API_KEY, OPENAI_API_KEY, USER_PROJECT} from 'src/app/key';
import { trigger, transition, style, animate } from '@angular/animations';


const GOOGLE_VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const PROMPT = 'The following is a Google Vision OCR API result of an Estonian grocery store receipt. Format the input, and from it create a table with the names of items, their quantity, and the total price of the item. Also include the total price of the whole receipt. Output the result in a JSON format, where each item is an object in an array with the key "items". Each object has the table header as the key (in lowercase), and the value of the field as the value. The fields in objects in this array should only use these keys: "name", "cost", "sum", "quantity". The name field should be capitalized correctly, for example "Koorejäätis "Eriti Rammus" maasika". Also, if the name ends in the middle of a word, try your best to autocomplete the item name. For example: KONDENS -> Kondenspiima The total price, price without taxes / with taxes, and other relevant info should be in seperate key value pairs outside the "items" array. When you return an output, ONLY return the json, and do not add any other text. The JSON keys should be in english, and always from the following words: "items", "total_sum", "total_sum_no_taxes", "tax_20", "to_pay", \n \n';

const RESPONSE = {
  "items": [
    {
      "name": "KOOREJääTIS ERITI RAMMUS MAASIKA",
      "quantity": "1.000",
      "cost": "1.48",
      "sum": "1.48"
    },
    {
      "name": "KOOREJääTIS ERITI RAMMUS KONDENS",
      "quantity": "1.000",
      "cost": "1.48",
      "sum": "1.48"
    },
    {
      "name": "HOKOLAADI-VANILLIMAITSELINE KOOR",
      "quantity": "1.000",
      "cost": "3.58",
      "sum": "3.58"
    },
    {
      "name": "TUBAKAVABAD NIKOTIINIPADJAD GRAN",
      "quantity": "2.000",
      "cost": "5.88",
      "sum": "11.76"
    }
  ],
  "total_sum": "18.30",
  "total_sum_no_taxes": "15.25",
  "tax_20": "3.05",
  "to_pay": "18.30 EUR"
};

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  animations: [
    trigger('swipe', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('300ms', style({ transform: 'translateX(-100%)' }))
      ])
    ])
  ]
})

export class Tab1Page implements OnInit {

  public currentStatus = Status.WAITING;
  items = [{name: 'test', quantity: '0', cost: '0.00', sum: '0.00'}];
  total: string = '0.00';
  constructor(private http: HttpClient) {}

  async ngOnInit() {
    this.demo();
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
    this.currentStatus = Status.TAKING_PHOTO;
    const photo = (await this.takePhoto()).base64String;
    if (photo == undefined) {return;}
    this.currentStatus = Status.PROCESSING_IMAGE;
    const response = await this.processImage(photo);
    this.currentStatus = Status.PROCESSING_INPUTS;
    const json = JSON.parse(await this.sendOpenAIRequest(response));
    console.warn(json);
    this.items = json.items;
    this.total = this.getTotal();
    this.currentStatus = Status.ITEM_MENU;
  }

  demo() {
    this.currentStatus = Status.ITEM_MENU;
    this.items = RESPONSE.items;
    this.total = this.getTotal();
  }

  getTotal() {
    let sum = 0;
    for (let item of this.items) {
      sum += Number.parseFloat(item.sum);
    }
    return sum.toFixed(2);
  }

  formatQuantity(quantity: string) {
    return Number.parseInt(quantity).toFixed(0);
  }

  getTotalCost(cost: string, quantity: string) {
    return (Number.parseFloat(cost) * Number.parseInt(quantity)).toFixed(2) + '€';
  }

  removeQuantity(i: number) {
    let quantity = Number.parseInt(this.items[i].quantity);
    if (quantity >= 1) {
      this.items[i].quantity = (quantity - 1).toFixed(0);
      this.items[i].sum = this.getTotalCost(this.items[i].cost, this.items[i].quantity);
    }
  }

  addQuantity(i: number) {
    let quantity = Number.parseInt(this.items[i].quantity);
    this.items[i].quantity = (quantity + 1).toFixed(0);
    this.items[i].sum = this.getTotalCost(this.items[i].cost, this.items[i].quantity);
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


export enum Status {
  WAITING,
  TAKING_PHOTO,
  PROCESSING_IMAGE,
  PROCESSING_INPUTS,
  ITEM_MENU,
}
