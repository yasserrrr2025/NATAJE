import { NextResponse } from 'next/server';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';

export async function GET() {
  try {
    const data = new Uint8Array(fs.readFileSync('C:\\Users\\Azzam\\Desktop\\NTAJE\\2.pdf'));
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    
    const doc = await pdfjsLib.getDocument({ data, standardFontDataUrl: 'node_modules/pdfjs-dist/standard_fonts/' }).promise;
    const page = await doc.getPage(1);
    const textContent = await page.getTextContent();
    
    const items = textContent.items.map((it: any) => ({ str: it.str, x: it.transform[4], y: it.transform[5] }));
    
    return NextResponse.json({
      items
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
