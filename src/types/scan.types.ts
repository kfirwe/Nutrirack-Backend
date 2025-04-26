
export interface OCRResult {
  text: string;
}

export interface OCRImage {
  path: string;
}

export interface OCRImage {
  buffer: Buffer;
  originalname: string;
}

export interface TesseractResult {
  data: {
    text: string;
  };
}