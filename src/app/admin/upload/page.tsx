"use client";

import { useState } from "react";
import { FileUp, FileText, Play, CheckCircle, AlertCircle, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { getCurrentSchoolId } from "@/lib/school-session";

export default function CertificateUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [results, setResults] = useState<{total: number, matched: number, unmatched: number} | null>(null);
  const [error, setError] = useState("");

  const [academicYear, setAcademicYear] = useState("1446/1447");
  const [term, setTerm] = useState("إشعار بدرجات الفصل الدراسي الثاني - أولى");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResults(null);
      setProgress(0);
      setError("");
    }
  };

  const extractTextFast = async (page: any): Promise<string | null> => {
    try {
      const textContent = await page.getTextContent();
      let text = textContent.items.map((item: any) => item.str).join(" ");
      
      // Convert Arabic-Indic numerals to standard English digits
      text = text.replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d: string) => String(d.charCodeAt(0) - 1632));
      
      // 1. Try finding a clean 10-digit number
      let match = text.match(/\b\d{10}\b/);
      
      // 2. Try removing all spaces (sometimes PDF items split digits like '1 0 4 5...')
      if (!match) {
        const noSpaceText = text.replace(/\s+/g, '');
        match = noSpaceText.match(/\d{10}/);
      }
      
      return match ? match[0] : null;
    } catch {
      return null;
    }
  };

  const extractTextOCR = async (page: any, worker: any): Promise<string | null> => {
    try {
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return null;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({ canvasContext: context, viewport: viewport }).promise;
      
      const { data: { text } } = await worker.recognize(canvas);
      const match = text.match(/\b\d{10}(?:-\d+)?\b/);
      return match ? match[0] : null;
    } catch {
      return null;
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setError("");
    setResults(null);
    setProgress(5);
    setStatusText("جاري تهيئة محركات الذكاء الاصطناعي وتقسيم الملف...");

    let ocrWorker: any = null;

    try {
      const schoolId = getCurrentSchoolId();

      if (!schoolId) {
        throw new Error("لم يتم العثور على جلسة مدرسة. الرجاء تسجيل الدخول مرة أخرى.");
      }

      const { PDFDocument } = await import('pdf-lib');
      const pdfBytes = await file.arrayBuffer();
      // Use a copy for pdf-lib to avoid detachment issues
      const pdfLibDoc = await PDFDocument.load(pdfBytes.slice(0));

      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      // Use a copy for pdf.js because it often detaches the buffer in its workers
      const pdfJsDoc = await pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise;
      const totalPages = pdfJsDoc.numPages;

      let matchedCount = 0;
      let unmatchedCount = 0;
      const getOcrWorker = async () => {
        if (!ocrWorker) {
          const Tesseract = (await import('tesseract.js')).default;
          setStatusText("جاري تهيئة محرك الرؤية (OCR) لأول مرة...");
          ocrWorker = await Tesseract.createWorker('eng');
        }
        return ocrWorker;
      };

      const processPage = async (i: number) => {
        const page = await pdfJsDoc.getPage(i);
        
        let nationalId = await extractTextFast(page);

        if (!nationalId) {
          const worker = await getOcrWorker();
          nationalId = await extractTextOCR(page, worker);
        }

        // Preserve all document-level objects (forms, fonts, images) by loading the original and deleting other pages
        // Create a fresh copy of the array buffer for each iteration to avoid the "Cannot perform Construct on a detached ArrayBuffer" error
        const subPdf = await PDFDocument.load(pdfBytes.slice(0));
        const pageCount = subPdf.getPageCount();
        // Remove from end to start to avoid index shifting
        for (let k = pageCount - 1; k >= 0; k--) {
          if (k !== i - 1) {
            subPdf.removePage(k);
          }
        }
        const subPdfBytes = await subPdf.save();

        const fileName = `${schoolId}/${crypto.randomUUID()}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from('certificates')
          .upload(fileName, subPdfBytes, { contentType: 'application/pdf', upsert: true });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage.from('certificates').getPublicUrl(fileName);
        const fileUrl = publicUrlData.publicUrl;

        let status = 'UNMATCHED';
        let studentId = null;

        if (nationalId) {
          const { data: student } = await supabase
            .from('students')
            .select('id')
            .eq('school_id', schoolId)
            .eq('national_id', nationalId)
            .maybeSingle();

          if (student) {
            status = 'MATCHED';
            studentId = student.id;
          } else {
            status = 'MANUAL_REVIEW_NEEDED';
          }
        }

        const { error: insertError } = await supabase.from('certificates').insert({
          school_id: schoolId,
          student_id: studentId,
          extracted_national_id: nationalId || null,
          status: status,
          file_url: fileUrl,
          page_number: i,
          academic_year: academicYear,
          term: term
        });

        if (insertError) {
          console.error("Database insert error:", insertError);
        }

        return { status, studentId };
      };

      const batchSize = 10;
      let processed = 0;

      for (let i = 1; i <= totalPages; i += batchSize) {
        setStatusText(`جاري تحليل وتدقيق الدفعة (${i} إلى ${Math.min(i + batchSize - 1, totalPages)}) من ${totalPages}...`);
        
        const promises = [];
        for (let j = 0; j < batchSize && (i + j) <= totalPages; j++) {
          promises.push(processPage(i + j));
        }

        const batchResults = await Promise.all(promises);
        
        batchResults.forEach(res => {
          if (res.status === 'MATCHED') matchedCount++;
          else unmatchedCount++;
        });

        processed += promises.length;
        setProgress(Math.round(5 + ((processed / totalPages) * 90)));
      }

      setStatusText("جاري حفظ النتائج وتحديث قواعد البيانات...");
      setProgress(98);
      
      setResults({ total: totalPages, matched: matchedCount, unmatched: unmatchedCount });
      setProgress(100);
      setStatusText("اكتملت العملية بنجاح وتم فصل ورفع الشهادات!");

    } catch (err: any) {
      console.error(err);
      setError(err.message || "فشلت عملية معالجة الملف.");
    } finally {
      if (ocrWorker) {
        await ocrWorker.terminate();
      }
      setTimeout(() => setProcessing(false), 500);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 800 }}>
      <h1 className="heading-2" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Sparkles size={28} style={{ color: 'var(--primary)' }} />
        معالجة الشهادات (PDF)
      </h1>
      <p className="text-muted" style={{ marginBottom: '2rem' }}>
        قم برفع ملف PDF المجمع للشهادات. سيقوم النظام آلياً بتقسيم الصفحات، واستخراج رقم الهوية الوطنية باستخدام OCR (الذكاء الاصطناعي)، ومطابقتها مع بيانات الطلاب فوراً.
      </p>

      {error && (
        <div className="glass-card animate-fade-in" style={{ borderRight: '4px solid var(--destructive)', background: 'rgba(239, 68, 68, 0.05)', display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
          <AlertTriangle size={24} style={{ color: 'var(--destructive)' }} />
          <div>
            <h4 style={{ fontWeight: 700, color: 'var(--destructive)', marginBottom: '0.25rem' }}>خطأ في المعالجة</h4>
            <p className="text-muted">{error}</p>
          </div>
        </div>
      )}

      <div className="glass-card" style={{ marginBottom: '2rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle, rgba(37, 99, 235, 0.03) 0%, transparent 60%)', zIndex: -1, animation: 'spin 20s linear infinite' }} />
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div>
            <label className="label">العام الدراسي</label>
            <input 
              type="text" 
              className="input" 
              value={academicYear} 
              onChange={e => setAcademicYear(e.target.value)} 
              disabled={processing}
            />
          </div>
          <div>
            <label className="label">اسم الفترة / الفصل</label>
            <input 
              type="text" 
              className="input" 
              value={term} 
              onChange={e => setTerm(e.target.value)} 
              disabled={processing}
            />
          </div>
        </div>

        <div 
          style={{ 
            border: '2px dashed', 
            borderRadius: 'var(--radius)', 
            padding: '3rem 2rem', 
            textAlign: 'center',
            cursor: processing ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            background: file ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
            borderColor: file ? 'var(--accent)' : 'var(--secondary)'
          }}
          onClick={() => !processing && document.getElementById('pdf-upload')?.click()}
        >
          <input 
            type="file" 
            id="pdf-upload" 
            accept=".pdf" 
            style={{ display: 'none' }} 
            onChange={handleFileChange}
            disabled={processing}
          />
          {file ? (
            <div className="flex-center" style={{ flexDirection: 'column', gap: '1rem', transform: processing ? 'scale(0.95)' : 'scale(1)', transition: 'transform 0.3s' }}>
              <FileText size={56} style={{ color: 'var(--accent)', filter: 'drop-shadow(0 4px 6px rgba(16, 185, 129, 0.2))' }} />
              <div>
                <p style={{ fontWeight: 700, fontSize: '1.25rem' }}>{file.name}</p>
                <p className="text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          ) : (
            <div className="flex-center" style={{ flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1.25rem', background: 'var(--secondary)', borderRadius: '50%', color: 'var(--secondary-foreground)', transition: 'transform 0.2s', ':hover': { transform: 'scale(1.1)' } } as any}>
                <FileUp size={36} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.25rem' }}>اسحب الملف أو انقر للاختيار</p>
                <p className="text-muted">ارفع ملف الشهادات المجمع (PDF فقط)</p>
              </div>
            </div>
          )}
        </div>

        {processing && (
          <div className="animate-fade-in" style={{ marginTop: '2.5rem', padding: '1rem', background: 'var(--background)', borderRadius: 'var(--radius)', border: '1px solid var(--secondary)' }}>
            <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Loader2 size={16} className="animate-spin" style={{ color: 'var(--primary)' }} />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{statusText}</span>
              </div>
              <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{progress}%</span>
            </div>
            <div style={{ height: 10, background: 'var(--secondary)', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--primary), #60a5fa)', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 0 10px rgba(37, 99, 235, 0.5)' }} />
            </div>
          </div>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            className="btn btn-primary" 
            disabled={!file || processing} 
            onClick={handleProcess}
            style={{ minWidth: 180, fontSize: '1.1rem', padding: '0.875rem 2rem' }}
          >
            {processing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                المعالجة مستمرة...
              </>
            ) : (
              <>
                <Play size={20} />
                بدء المعالجة الذكية
              </>
            )}
          </button>
        </div>
      </div>

      {results && (
        <div className="grid-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="glass-card flex-center" style={{ flexDirection: 'column', gap: '0.75rem', textAlign: 'center', padding: '2rem', transform: 'translateY(0)' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--foreground)' }}>{results.total}</span>
            <span className="text-muted" style={{ fontWeight: 600, fontSize: '1.1rem' }}>إجمالي الصفحات المكتشفة</span>
          </div>
          <div className="glass-card flex-center" style={{ flexDirection: 'column', gap: '0.75rem', textAlign: 'center', padding: '2rem', borderBottom: '6px solid var(--accent)', background: 'linear-gradient(to bottom, transparent, rgba(16, 185, 129, 0.05))' }}>
            <CheckCircle size={32} style={{ color: 'var(--accent)', marginBottom: '-0.5rem' }} />
            <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent)' }}>{results.matched}</span>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent)' }}>تمت المطابقة آلياً</span>
          </div>
          <div className="glass-card flex-center" style={{ flexDirection: 'column', gap: '0.75rem', textAlign: 'center', padding: '2rem', borderBottom: '6px solid var(--destructive)', background: 'linear-gradient(to bottom, transparent, rgba(239, 68, 68, 0.05))' }}>
            <AlertCircle size={32} style={{ color: 'var(--destructive)', marginBottom: '-0.5rem' }} />
            <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--destructive)' }}>{results.unmatched}</span>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--destructive)' }}>بحاجة للمراجعة اليدوية</span>
          </div>
        </div>
      )}
    </div>
  );
}
