"use client";

import { useState, useEffect } from "react";
import { FileText, Trash2, Upload, Search, Loader2, CheckCircle, AlertTriangle, Eye } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { getCurrentSchoolId } from "@/lib/school-session";

export default function CertificatesManagementPage() {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const loadCertificates = async () => {
    setLoading(true);
    try {
      const schoolId = getCurrentSchoolId();
      if (!schoolId) return;

      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          students ( name, national_id, grade_level, classroom )
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCertificates(data || []);
    } catch (err) {
      console.error("Error loading certificates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCertificates();
  }, []);

  const handleDelete = async (certId: string, fileUrl: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الشهادة؟ لا يمكن التراجع عن هذا الإجراء.")) return;

    try {
      // 1. Delete from storage if it exists
      if (fileUrl) {
        const filePath = fileUrl.split('/certificates/')[1];
        if (filePath) {
          await supabase.storage.from('certificates').remove([filePath]);
        }
      }

      // 2. Delete from database
      const { error } = await supabase.from('certificates').delete().eq('id', certId);
      if (error) throw error;

      // Update state
      setCertificates(certificates.filter(c => c.id !== certId));
      alert("تم الحذف بنجاح");
    } catch (err) {
      console.error("Delete error:", err);
      alert("حدث خطأ أثناء الحذف");
    }
  };

  const handleUploadSingle = async (e: React.ChangeEvent<HTMLInputElement>, studentId: string, certId: string | null) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFor(certId || studentId);
    try {
      const schoolId = getCurrentSchoolId();
      
      // Upload to storage
      const fileName = `${schoolId}/${crypto.randomUUID()}_single.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(fileName, file, { contentType: 'application/pdf', upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('certificates').getPublicUrl(fileName);
      const fileUrl = publicUrlData.publicUrl;

      if (certId) {
        // Update existing certificate
        const { error } = await supabase.from('certificates').update({
          file_url: fileUrl,
          status: 'MATCHED'
        }).eq('id', certId);
        if (error) throw error;
      } else {
        // This is tricky: if we don't have a certId, we might be uploading a completely new one for a student.
        // But this page lists *certificates*. If a student has no certificate, they wouldn't appear here unless we list students instead!
        // To keep it simple, we only allow updating existing listed certificates.
      }

      alert("تم رفع الشهادة بنجاح وتحديثها للطالب!");
      loadCertificates();
    } catch (err) {
      console.error("Upload error:", err);
      alert("حدث خطأ أثناء الرفع");
    } finally {
      setUploadingFor(null);
    }
  };

  const filteredCertificates = certificates.filter(c => {
    const term = searchTerm.toLowerCase();
    const name = c.students?.name || '';
    const id = c.students?.national_id || c.extracted_national_id || '';
    return name.includes(term) || id.includes(term);
  });

  const groupedByStudent = filteredCertificates.reduce((acc, cert) => {
    const studentId = cert.students?.national_id || cert.extracted_national_id || cert.id;
    if (!acc[studentId]) {
      acc[studentId] = {
        name: cert.students?.name || 'غير مسجل بالبيانات',
        national_id: cert.students?.national_id || cert.extracted_national_id,
        grade: cert.students?.grade_level || '-',
        classroom: cert.students?.classroom || '-',
        certs: []
      };
    }
    acc[studentId].certs.push(cert);
    return acc;
  }, {} as Record<string, any>);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">إدارة الشهادات</h1>
          <p className="text-muted">التحكم في شهادات الطلاب، الحذف، والتحديث الفردي.</p>
        </div>
      </div>

      <div className="glass-card p-6 mb-8">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={20} />
            <input 
              type="text" 
              placeholder="ابحث باسم الطالب أو رقم الهوية..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
          <div className="text-sm font-medium text-muted bg-secondary px-6 py-3 rounded-xl whitespace-nowrap">
            الطلاب: {Object.keys(groupedByStudent).length} | الشهادات: {filteredCertificates.length}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-center py-12">
          <Loader2 className="animate-spin text-primary" size={40} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.values(groupedByStudent).map((student: any, i) => (
            <div key={i} className="glass-card flex flex-col p-6" style={{ padding: '1.5rem' }}>
              <div className="border-b border-border pb-4 mb-4 flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--primary)' }}>{student.name}</h3>
                  <div className="text-sm text-muted space-y-1">
                    <p>هوية: {student.national_id}</p>
                    <p>الصف: {student.grade} / الفصل: {student.classroom}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 space-y-3">
                <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-muted" />
                  الشهادات المرفوعة ({student.certs.length})
                </h4>
                
                {student.certs.map((cert: any, idx: number) => (
                  <div key={cert.id} className="bg-background/50 p-3 rounded-xl flex items-center justify-between border border-border hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${cert.status === 'MATCHED' ? 'bg-emerald-500' : 'bg-amber-500'}`} title={cert.status === 'MATCHED' ? 'مطابق' : 'يحتاج مراجعة'} />
                      <span className="text-sm font-bold">شهادة {idx + 1}</span>
                    </div>
                    
                    <div className="flex items-center gap-1 bg-card p-1 rounded-lg border border-border">
                      {cert.file_url && (
                        <a 
                          href={cert.file_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors" 
                          title="معاينة الشهادة"
                        >
                          <Eye size={16} />
                        </a>
                      )}
                      
                      <label className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer" title="تحديث الشهادة">
                        {uploadingFor === cert.id ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        <input 
                          type="file" 
                          accept=".pdf" 
                          style={{ display: 'none' }}
                          onChange={(e) => handleUploadSingle(e, cert.student_id, cert.id)}
                          disabled={uploadingFor === cert.id}
                        />
                      </label>

                      <button 
                        onClick={() => handleDelete(cert.id, cert.file_url)}
                        className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        title="حذف الشهادة"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(groupedByStudent).length === 0 && (
            <div className="col-span-full glass-card flex-center flex-col py-16 text-center border-dashed border-2">
              <FileText size={48} className="text-muted mb-4 opacity-50" />
              <p className="text-xl font-bold text-muted">لا توجد شهادات مطابقة للبحث</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
