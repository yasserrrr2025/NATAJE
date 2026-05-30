const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function debugPDF() {
  const data = new Uint8Array(fs.readFileSync('C:\\Users\\Azzam\\Desktop\\NTAJE\\2.pdf'));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const page = await doc.getPage(1);
  const textContent = await page.getTextContent();
  
  const rawText = textContent.items.map((item) => item.str).join(' ');
  const text = rawText.replace(/[\u200E\u200F\u202A-\u202E]/g, ' ').replace(/\s+/g, ' ').trim();
  
  console.log("=== RAW TEXT ===");
  console.log(text);
  
  console.log("\n=== REGEX TEST ===");
  const classMatch = text.match(/ترتيب\s*الفصل\s*[:\s]*(\d+)/i);
  console.log("Class Match:", classMatch ? classMatch[1] : "None");
  
  const gradeMatch = text.match(/ترتيب\s*المرحلة\s*[:\s]*(\d+)/i);
  console.log("Grade Match:", gradeMatch ? gradeMatch[1] : "None");

  // Let's print out all items to see how they are positioned
  console.log("\n=== ITEMS ===");
  const items = textContent.items.filter(it => it.str.trim().length > 0);
  for (let i = 0; i < Math.min(items.length, 100); i++) {
    const it = items[i];
    if (it.str.includes("ترتيب") || it.str.includes("الفصل") || it.str.includes("المرحلة")) {
      console.log(`[${i}] '${it.str}' at y=${it.transform[5]}`);
    }
  }
}

debugPDF().catch(console.error);
