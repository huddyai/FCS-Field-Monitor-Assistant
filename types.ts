
export type CategoryId = 
  | 'project_details' 
  | 'env_safety' 
  | 'survey_inventory' 
  | 'site_recording' 
  | 'excavations' 
  | 'finds' 
  | 'condition_followup'
  | 'additional_notes';

export type CategoryStatus = 'not_started' | 'in_progress' | 'complete';

export interface Note {
  id: string;
  text: string;
  timestamp: number;
}

export interface CategoryState {
  id: CategoryId;
  title: string;
  status: CategoryStatus;
  notes: Note[];
  data: any; // Structured data specific to this category
  missingInfo: string[];
}

export interface JobState {
  categories: Record<CategoryId, CategoryState>;
  isJobComplete: boolean;
}

// Final Report Structure (Aggregated)
export interface FieldReport {
  project_meta: any;
  env_safety: any;
  survey_inventory: any;
  site_recording: any;
  excavations: any;
  finds: any;
  condition_assessment: any;
  daily_log: any;
}

export type AppView = 'dashboard' | 'category' | 'report';
