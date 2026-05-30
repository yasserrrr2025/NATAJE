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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">إدارة الشهادات</h1>
          <p className="text-muted">التحكم في شهادات الطلاب، الحذف، والتحديث الفردي.</p>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={20} />
            <input 
              type="text" 
              placeholder="ابحث باسم الطالب أو رقم الهوية..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
          <div className="text-sm font-medium text-muted bg-secondary px-4 py-2 rounded-lg">
            العدد الإجمالي: {filteredCertificates.length}
          </div>
        </div>

        {loading ? (
          <div className="flex-center py-12">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="p-4 font-bold rounded-tr-lg">الطالب</th>
                  <th className="p-4 font-bold">رقم الهوية</th>
                  <th className="p-4 font-bold">الفصل/المرحلة</th>
                  <th className="p-4 font-bold">الحالة</th>
                  <th className="p-4 font-bold text-center rounded-tl-lg">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredCertificates.map((cert) => (
                  <tr key={cert.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                    <td className="p-4 font-medium">
                      {cert.students?.name || <span className="text-muted italic">غير مسجل بالبيانات</span>}
                    </td>
                    <td className="p-4">
                      {cert.students?.national_id || cert.extracted_national_id}
                    </td>
                    <td className="p-4 text-muted">
                      {cert.students?.grade_level || '-'} / {cert.students?.classroom || '-'}
                    </td>
                    <td className="p-4">
                      {cert.status === 'MATCHED' ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-xs font-bold w-fit">
                          <CheckCircle size={14} /> مطابق
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-xs font-bold w-fit">
                          <AlertTriangle size={14} /> يحتاج مراجعة
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        {cert.file_url && (
                          <a 
                            href={cert.file_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="معاينة الشهادة"
                          >
                            <Eye size={18} />
                          </a>
                        )}
                        
                        <label className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer" title="تحديث ملف الشهادة">
                          {uploadingFor === cert.id ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                          <input 
                            type="file" 
                            accept=".pdf" 
                            className="hidden" 
                            onChange={(e) => handleUploadSingle(e, cert.student_id, cert.id)}
                            disabled={uploadingFor === cert.id}
                          />
                        </label>

                        <button 
                          onClick={() => handleDelete(cert.id, cert.file_url)}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          title="حذف الشهادة"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {filteredCertificates.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted">
                      لا توجد شهادات مطابقة للبحث
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
