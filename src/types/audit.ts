export interface TataPdfHeaderData {
  agency_name?: string;
  operating_address?: string;
  agency_type?: string;
  collection_manager?: string;
  agency_manager?: string;
  product?: string;
}

export interface ObservationItem {
  rating_category: string;
  short_segmentation: string;
  observation: string;
  pending_status: string;
  closure_remarks: string;
  timelines: string;
}

export interface ScoreRow {
  "S. No.": string;
  Particulars: string;
  "Key Points": string;
  Weightage: string;
  Actual: string;
  Percentage: string;
}

export interface ScoreSummary {
  total_key_points: string;
  total_weightage: string;
  total_actual: string;
  percentage: string;
  final_rating: string;
}

export interface ScoreData {
  rows: ScoreRow[];
  summary: ScoreSummary;
}

export interface ReportMetadata {
  agency_name: string;
  agency_code: string;
  location: string;
  report_type: string;
  product: string;
  auditor_name: string;
  audit_date: string;
  collection_manager: string;
  agency_manager: string;
  operating_address: string;
}

export interface GeneratedDownloads {
  zip: Blob;
  excel: Blob;
  evidence: Blob;
  final: Blob;
  excel_name: string;
  pdf_name: string;
  evidence_name: string;
  final_name: string;
}

export interface EmailAttachment {
  filename: string;
  content: Blob;
  sizeMb: number;
}

export interface EmailState {
  emailType: 'Report Email' | 'Closure Email';
  subject: string;
  to: string;
  cc: string;
  attachZip: boolean;
  attachPdf: boolean;
  additionalAttachments: File[];
  html: string;
  observations: ObservationItem[];
  scoreData?: ScoreData;
  reportMetadata?: ReportMetadata;
}

export interface AppSettings {
  gotenbergUrl: string;
  gotenbergApiKey: string;
  googleClientId: string;
  useMockFallback: boolean;
}
