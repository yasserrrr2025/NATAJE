"use client";

import { useState } from "react";
import { FileUp, FileText, Play, CheckCircle, AlertCircle, Loader2, Sparkles, AlertTriangle, Users } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { getCurrentSchoolId } from "@/lib/school-session";

export default function CertificateUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [results, setResults] = useState<{total: number, matched: number, unmatched: number} | null>(null);
  const [missingStudents, setMissingStudents] = useState<{national_id: string, name: string, nationality: string}[]>([]);
  const [error, setError] = useState("");

  const [academicYear, setAcademicYear] = useState("1446/1447");
  const [term, setTerm] = useState("إشعار بدرجات الفصل الدراسي الثاني - أولى");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResults(null);
      setMissingStudents([]);
      setProgress(0);
      setError("");
    }
  };

  const isValidSaudiID = (id: string): boolean => {
    if (!id || id.length !== 10) return false;
    if (!id.startsWith('1') && !id.startsWith('2')) return false;
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      let digit = parseInt(id[i]);
      if (i % 2 === 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    return sum % 10 === 0;
  };

  const compactValue = (value: string) => {
    return value.replace(/[^\p{L}\p{N}]/gu, '').trim();
  };

  const extractIdentityFromText = (text: string): string | null => {
    const patterns = [
        /Identity\s*No\.?\s*([A-Z0-9\/_\- ]{6,})/i,
        /Passport\s*No\.?\s*([A-Z0-9\/_\- ]{6,})/i,
        /رقم\s*الهوية\s*([A-Z0-9\/_\- ]{6,})/i,
        /رقم\s*جواز\s*السفر\s*([A-Z0-9\/_\- ]{6,})/i
    ];
    for (const pattern of patterns) {
        const m = text.match(pattern);
        if (m) {
            const value = compactValue(m[1]);
            if (value) return value;
        }
    }
    const candidates = text.match(/[A-Z]?\d[\d\/_\- ]{5,}[A-Z0-9]?/gi) || [];
    for (const c of candidates) {
        const value = compactValue(c);
        if (/^(?:\d{8,20}|[A-Z]\d{6,20})$/i.test(value)) return value;
    }
    return null;
  };

  const nationalityToArabic = (value = '') => {
    const v = value.trim().toLowerCase();
    const map: Record<string, string> = {
        saudi: 'السعودية', yemeni: 'اليمن', sudanese: 'السودان', egyptian: 'مصر',
        syrian: 'سوريا', jordanian: 'الأردن', pakistani: 'باكستان', indian: 'الهند',
        bangladeshi: 'بنجلاديش', somali: 'الصومال', eritrean: 'إريتريا'
    };
    return map[v] || value;
  };

  const extractNationality = (text: string) => {
    let m = text.match(/Nationality\s*([A-Za-z]+)/i);
    if (m) return nationalityToArabic(m[1]);
    m = text.match(/الجنسية\s*([\u0600-\u06FF]{2,})/);
    if (m) return m[1].trim();
    const pairs: [RegExp, string][] = [
        [/\bSaudi\b/i, 'السعودية'], [/\bYemeni\b/i, 'اليمن'], [/\bSudanese\b/i, 'السودان'],
        [/\bEgyptian\b/i, 'مصر'], [/\bSyrian\b/i, 'سوريا'], [/\bJordanian\b/i, 'الأردن']
    ];
    for (const [pattern, value] of pairs) if (pattern.test(text)) return value;
    return '';
  };

  const isArabicText = (s = '') => /[\u0600-\u06FF]/.test(s);
  const getRowItems = (items: any[], targetY: number, tolerance = 4) => items.filter(it => Math.abs(it.y - targetY) <= tolerance);
  const joinArabicByX = (items: any[]) => items.sort((a, b) => b.x - a.x).map(it => it.str).join(' ').replace(/\s+/g, ' ').trim();
  const normalizeArabicName = (name = '') => name.replace(/\s+/g, ' ').replace(/[\u0640]/g, '').replace(/[|]/g, ' ').trim();

  const extractArabicNameFromItems = (items: any[]) => {
    const normalizedItems = items.map(it => ({
        str: (it.str || '').trim(),
        x: it.transform[4],
        y: Math.round(it.transform[5] * 10) / 10
    })).filter(it => it.str);

    const englishLabel = normalizedItems.find(it => /Student'?s\s*Name/i.test(it.str));
    const arabicLabel = normalizedItems.find(it => /اسم\s*الطالب/.test(it.str));
    const label = arabicLabel || englishLabel;
    if (!label) return '';

    const row = getRowItems(normalizedItems, label.y, 3.5);
    const arabicParts = row
        .filter(it => isArabicText(it.str))
        .filter(it => !/اسم\s*الطالب|الفصل|الجنسية|تاريخ\s*الميلاد|رقم\s*الهوية|رقم\s*جواز\s*السفر/.test(it.str));

    const name = normalizeArabicName(joinArabicByX(arabicParts));
    if (name && name.split(' ').length >= 3) return name;
    return '';
  };

  const extractTextFast = async (page: any): Promise<{identity: string | null, name: string | null, nationality: string | null, rank_class: number | null, rank_grade: number | null} | null> => {
    try {
      const textContent = await page.getTextContent();
      const rawText = textContent.items.map((item: any) => item.str).join(' ');
      const text = rawText.replace(/[\u200E\u200F\u202A-\u202E]/g, ' ').replace(/\s+/g, ' ').trim();
      
      const identity = extractIdentityFromText(text);
      const name = extractArabicNameFromItems(textContent.items) || text.match(/Student'?s\s*Name\s*:?\s*([^\n:]{4,140}?)(?:\s+Class\s*:|\s+Date\s+of\s+Birth|\s+Nationality|\s+Identity\s+No)/i)?.[1]?.trim() || '';
      const nationality = extractNationality(text);

      let rank_class = null;
      let rank_grade = null;
      const classMatch = text.match(/(?:ترتيب\s*الفصل|Sort\s*By\s*Class)\s*[:\s]*(\d+)/i);
      if (classMatch) rank_class = parseInt(classMatch[1], 10);
      const gradeMatch = text.match(/(?:ترتيب\s*المرحلة|Sort\s*By\s*Grade|الترتيب\s*على\s*الصف)\s*[:\s]*(\d+)/i);
      if (gradeMatch) rank_grade = parseInt(gradeMatch[1], 10);

      if (identity) return { identity, name, nationality, rank_class, rank_grade };
      
      // Ultimate Fallback: Sliding window with Luhn checksum!
      const digitsOnly = text.replace(/[^\d]/g, '');
      for (let k = 0; k <= digitsOnly.length - 10; k++) {
        const sub = digitsOnly.substring(k, k + 10);
        if (isValidSaudiID(sub)) {
          return { identity: sub, name, nationality, rank_class, rank_grade };
        }
      }
      
      return null;
    } catch {
      return null;
    }
  };

  const extractTextOCR = async (page: any, worker: any): Promise<string | null> => {
    try {
      // Use a smaller scale to speed up OCR dramatically
      const viewport = page.getViewport({ scale: 1.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return null;
      
      // Only render the top 45% of the page where the National ID is usually located
      canvas.height = viewport.height * 0.45;
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
          await ocrWorker.setParameters({
            tessedit_char_whitelist: '0123456789',
          });
        }
        return ocrWorker;
      };

      const processPage = async (i: number) => {
        const page = await pdfJsDoc.getPage(i);
        
        const extractedData = await extractTextFast(page);
        let identity = extractedData?.identity;

        if (!identity) {
          const worker = await getOcrWorker();
          identity = await extractTextOCR(page, worker);
        }

        // Create a new PDF and copy only the specific page instantly
        const subPdf = await PDFDocument.create();
        const [copiedPage] = await subPdf.copyPages(pdfLibDoc, [i - 1]);
        subPdf.addPage(copiedPage);

        // Preserve the background forms from the Noor certificate catalog
        const { PDFName } = await import('pdf-lib');
        const acroForm = pdfLibDoc.catalog.get(PDFName.of('AcroForm'));
        if (acroForm) {
          subPdf.catalog.set(PDFName.of('AcroForm'), acroForm);
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

        if (identity) {
          const { data: student } = await supabase
            .from('students')
            .select('id, name')
            .eq('school_id', schoolId)
            .eq('national_id', identity)
            .maybeSingle();

          if (student) {
            status = 'MATCHED';
            studentId = student.id;
            matchedCount++;
          } else {
            status = 'MANUAL_REVIEW_NEEDED';
            unmatchedCount++;
            setMissingStudents(prev => {
              if (prev.some(s => s.national_id === identity)) return prev;
              return [...prev, { national_id: identity, name: extractedData?.name || '', nationality: extractedData?.nationality || '' }];
            });
          }
        } else {
          status = 'MANUAL_REVIEW_NEEDED';
          unmatchedCount++;
        }

        const { error: insertError } = await supabase.from('certificates').insert({
          school_id: schoolId,
          student_id: studentId,
          extracted_national_id: identity || null,
          status: status,
          file_url: fileUrl,
          page_number: i,
          academic_year: academicYear,
          term: term,
          rank_class: extractedData?.rank_class || null,
          rank_grade: extractedData?.rank_grade || null
        });

        if (insertError) {
          console.error("Database insert error:", insertError);
        }

        return { 
          status, 
          studentId, 
          missingData: (status === 'MANUAL_REVIEW_NEEDED' && identity) ? {
            national_id: identity,
            name: extractedData?.name || '',
            nationality: extractedData?.nationality || ''
          } : null
        };
      };

      const batchSize = 10;
      let processed = 0;
      const discoveredMissing: {national_id: string, name: string, nationality: string}[] = [];

      for (let i = 1; i <= totalPages; i += batchSize) {
        setStatusText(`جاري التحليل والرفع (دفعة ${i} إلى ${Math.min(i + batchSize - 1, totalPages)}) من ${totalPages}...`);
        
        const promises = [];
        for (let j = 0; j < batchSize && (i + j) <= totalPages; j++) {
          promises.push(processPage(i + j));
        }

        const batchResults = await Promise.all(promises);
        
        batchResults.forEach(res => {
          if (res.status === 'MATCHED') matchedCount++;
          else {
            unmatchedCount++;
            if (res.missingData && !discoveredMissing.find(m => m.national_id === res.missingData?.national_id)) {
              discoveredMissing.push(res.missingData);
            }
          }
        });

        processed += promises.length;
        setProgress(Math.round(5 + ((processed / totalPages) * 90)));
      }

      setMissingStudents(discoveredMissing);

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

  const handleAddMissingStudents = async () => {
    setProcessing(true);
    try {
      const schoolId = getCurrentSchoolId();
      const studentsToInsert = missingStudents.map(m => ({
        school_id: schoolId,
        national_id: m.national_id,
        name: m.name || `طالب (${m.national_id})`,
        nationality: m.nationality || '',
        grade_level: "غير محدد",
        classroom: "غير محدد"
      }));

      const { error } = await supabase.from('students').upsert(studentsToInsert, { onConflict: 'school_id,national_id' });
      if (error) throw error;
      
      alert(`تم إضافة ${missingStudents.length} طالب جديد بنجاح! سيتم ربط شهاداتهم تلقائياً في صفحة المراجعة.`);
      setMissingStudents([]);
    } catch (err: any) {
      console.error(err);
      alert("حدث خطأ أثناء إضافة الطلاب: " + err.message);
    } finally {
      setProcessing(false);
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
        <>
          <div className="grid-3 animate-fade-in" style={{ animationDelay: '0.2s', marginBottom: '2rem' }}>
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

          {missingStudents.length > 0 && (
            <div className="glass-card animate-fade-in" style={{ padding: '2rem', background: 'var(--secondary)' }}>
              <div className="flex items-start gap-4 mb-4">
                <div style={{ padding: '1rem', background: 'var(--accent)', borderRadius: '50%', color: 'white' }}>
                  <Users size={32} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>اكتشاف طلاب جدد</h3>
                  <p className="text-muted" style={{ lineHeight: 1.6 }}>
                    وجدنا <strong style={{ color: 'var(--foreground)' }}>{missingStudents.length} طلاب</strong> في الشهادات غير مسجلين في قاعدة البيانات. 
                    هل ترغب في إضافتهم تلقائياً ليتم ربط شهاداتهم بهم؟
                  </p>
                </div>
              </div>
              <button 
                className="btn btn-primary w-full" 
                onClick={handleAddMissingStudents}
                disabled={processing}
                style={{ marginTop: '1rem' }}
              >
                {processing ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                إضافة {missingStudents.length} طلاب إلى قاعدة البيانات
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
