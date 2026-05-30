export type Id = string;

export type SchoolRecord = {
  id: Id;
  name: string;
  slug?: string | null;
  ministerial_number?: string | null;
  contact_email?: string | null;
  password?: string | null;
  password_hash?: string | null;
  password_changed_at?: string | null;
  auth_user_id?: string | null;
  is_active?: boolean | null;
  is_portal_active?: boolean | null;
  logo_url?: string | null;
  subscription_plan?: string | null;
  subscription_end_date?: string | null;
  created_at?: string | null;
};

export type StudentRecord = {
  id: Id;
  school_id?: Id;
  national_id: string;
  name: string;
  grade_level?: string | null;
  classroom?: string | null;
  certificates?: Array<{ id: Id }>;
};

export type CertificateStatus = "MATCHED" | "UNMATCHED" | "MANUAL_REVIEW_NEEDED";

export type CertificateRecord = {
  id: Id;
  school_id?: Id;
  student_id?: Id | null;
  extracted_national_id?: string | null;
  file_url?: string | null;
  page_number?: number | null;
  status: CertificateStatus;
  ocr_confidence?: number | null;
  academic_year?: string | null;
  term?: string | null;
  created_at?: string | null;
};

export type SubscriptionPackageRecord = {
  id: Id;
  name: string;
  description?: string | null;
  price: number;
  duration_months: number;
  is_popular?: boolean | null;
  is_active?: boolean | null;
  features?: string[] | null;
};

export type CouponRecord = {
  id: Id;
  code: string;
  discount_percentage: number;
  max_uses?: number | null;
  used_count?: number | null;
  expires_at?: string | null;
  is_active?: boolean | null;
};

export type PaymentRecord = {
  id: Id;
  school_id: Id;
  package_id: Id;
  amount_paid: number;
  payment_status: string;
  payment_method: string;
  reference_number?: string | null;
  created_at?: string | null;
  schools?: Pick<SchoolRecord, "name" | "ministerial_number"> | null;
  subscription_packages?: Pick<SubscriptionPackageRecord, "name"> | null;
};

export type SupportTicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_SCHOOL"
  | "RESOLVED"
  | "CLOSED";

export type SupportTicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type SupportTicketRecord = {
  id: Id;
  school_id: Id;
  subject: string;
  category: "GENERAL" | "TECHNICAL" | "BILLING" | "DATA" | "CERTIFICATES";
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  message: string;
  admin_reply?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  resolved_at?: string | null;
  schools?: Pick<SchoolRecord, "name" | "ministerial_number" | "contact_email"> | null;
};

export type PdfTextItem = {
  str?: string;
};

export type PdfTextContent = {
  items: PdfTextItem[];
};

export type PdfPage = {
  getTextContent: () => Promise<PdfTextContent>;
  getViewport: (options: { scale: number }) => unknown;
  render: (options: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => {
    promise: Promise<void>;
  };
};

export type OcrWorker = {
  recognize: (input: HTMLCanvasElement) => Promise<{ data: { text: string } }>;
  terminate: () => Promise<void>;
};
