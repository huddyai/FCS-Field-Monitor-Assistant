import React, { useState } from 'react';
import { AppView, JobState, CategoryId, CategoryState, FieldReport } from './types';
import { Dashboard } from './components/Dashboard';
import { CategoryView } from './components/CategoryView';
import { ReportDisplay } from './components/ReportDisplay';
import { generateFinalJobReport } from './services/aiService';

const INITIAL_JOB_STATE: JobState = {
  isJobComplete: false,
  categories: {
    project_details: { id: 'project_details', title: 'Project & Location', status: 'not_started', notes: [], data: {}, missingInfo: [] },
    env_safety: { id: 'env_safety', title: 'Env & Safety Conditions', status: 'not_started', notes: [], data: {}, missingInfo: [] },
    survey_inventory: { id: 'survey_inventory', title: 'Survey & Inventory', status: 'not_started', notes: [], data: {}, missingInfo: [] },
    site_recording: { id: 'site_recording', title: 'Site Recording', status: 'not_started', notes: [], data: {}, missingInfo: [] },
    excavations: { id: 'excavations', title: 'Excavations', status: 'not_started', notes: [], data: {}, missingInfo: [] },
    finds: { id: 'finds', title: 'Finds & Materials', status: 'not_started', notes: [], data: {}, missingInfo: [] },
    condition_followup: { id: 'condition_followup', title: 'Condition & Follow-up', status: 'not_started', notes: [], data: {}, missingInfo: [] },
    additional_notes: { id: 'additional_notes', title: 'Additional Notes', status: 'not_started', notes: [], data: {}, missingInfo: [] },
  }
};

export default function App() {
  const [view, setView] = useState<AppView>('dashboard');
  const [jobState, setJobState] = useState<JobState>(INITIAL_JOB_STATE);
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
  const [finalReport, setFinalReport] = useState<FieldReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const handleSelectCategory = (id: CategoryId) => {
    setActiveCategory(id);
    setView('category');
  };

  const handleUpdateCategory = (id: CategoryId, updates: Partial<CategoryState>) => {
    console.log(`App: handleUpdateCategory called for ${id}. Updates:`, updates);
    setJobState(prev => {
      const newCategoryState: CategoryState = { ...prev.categories[id], ...updates };
      const newJobState = {
        ...prev,
        categories: {
          ...prev.categories,
          [id]: newCategoryState
        }
      };
      console.log(`App: JobState updated for ${id}. New notes length: ${newCategoryState.notes.length}`);
      return newJobState;
    });
  };

  const handleFinishJob = async () => {
    setIsGeneratingReport(true);
    try {
      const report = await generateFinalJobReport(jobState);
      setFinalReport(report);
      setView('report');
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to generate report. Please try again.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleReset = () => {
    setJobState(INITIAL_JOB_STATE);
    setFinalReport(null);
    setView('dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-100 max-w-md mx-auto relative shadow-2xl overflow-hidden font-sans border-x border-slate-200 print:max-w-none print:shadow-none print:border-none print:overflow-visible print:h-auto print:mx-0">
      {/* Brand Bar */}
      <div className="h-1.5 bg-fcs-700 w-full z-50 relative print:bg-fcs-700"></div>
      
      <main className="h-full relative flex flex-col print:h-auto print:block">
        {isGeneratingReport ? (
           <div className="absolute inset-0 z-50 bg-white/95 flex flex-col items-center justify-center backdrop-blur-sm print:hidden">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fcs-700 mb-4"></div>
              <p className="text-fcs-900 font-bold text-lg">Generating Final Reports...</p>
              <p className="text-slate-500 text-sm mt-2">Compiling data and formatting tables</p>
           </div>
        ) : null}

        {view === 'dashboard' && (
          <div className="print:hidden h-full">
            <Dashboard 
              jobState={jobState} 
              onSelectCategory={handleSelectCategory}
              onFinishJob={handleFinishJob}
            />
          </div>
        )}

        {view === 'category' && activeCategory && (
          <div className="print:hidden h-full">
            <CategoryView 
              category={jobState.categories[activeCategory]}
              onUpdate={handleUpdateCategory}
              onBack={() => setView('dashboard')}
            />
          </div>
        )}

        {view === 'report' && finalReport && (
          <ReportDisplay 
            report={finalReport} 
            onBack={handleReset}
          />
        )}
      </main>
    </div>
  );
}