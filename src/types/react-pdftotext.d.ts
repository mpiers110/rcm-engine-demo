declare module 'react-pdftotext' {
  export default function pdfToText(file: File): Promise<string>;
}
