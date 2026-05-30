import fs from 'fs';
import pdfParse from 'pdf-parse';

async function debugPDF() {
  const dataBuffer = fs.readFileSync('C:\\Users\\Azzam\\Desktop\\NTAJE\\2.pdf');
  
  const data = await pdfParse(dataBuffer);
  
  const text = data.text.replace(/[\u200E\u200F\u202A-\u202E]/g, ' ').replace(/\s+/g, ' ').trim();
  
  console.log("=== REGEX TEST ===");
  const classMatch = text.match(/ترتيب\s*الفصل\s*[:\s]*(\d+)/i);
  console.log("Class Match:", classMatch ? classMatch[1] : "None");
  
  const gradeMatch = text.match(/ترتيب\s*المرحلة\s*[:\s]*(\d+)/i);
  console.log("Grade Match:", gradeMatch ? gradeMatch[1] : "None");

  console.log("\n=== RAW TEXT ===");
  console.log(text);
}

debugPDF().catch(console.error);
