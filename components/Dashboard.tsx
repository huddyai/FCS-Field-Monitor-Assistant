

import React from 'react';
import { JobState, CategoryId, CategoryState } from '../types';

interface DashboardProps {
  jobState: JobState;
  onSelectCategory: (id: CategoryId) => void;
  onFinishJob: () => void;
}

// Simple SVG Logo Component based on description
const FCSLogo = () => (
  <svg viewBox="0 0 120 40" className="h-10 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Text FCS */}
    <text x="0" y="32" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="32" fill="#0f172a" letterSpacing="-1">FCS</text>
    {/* Cyan Dots */}
    <circle cx="75" cy="8" r="4" fill="#06b6d4" />
    <circle cx="88" cy="14" r="4" fill="#06b6d4" />
    <circle cx="101" cy="20" r="4" fill="#06b6d4" />
  </svg>
);

const AmbientBackground = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
    <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-fcs-200/40 rounded-full blur-[100px] mix-blend-multiply opacity-70 animate-pulse"></div>
    <div className="absolute bottom-[-10%] left-[-20%] w-[600px] h-[600px] bg-blue-200/40 rounded-full blur-[120px] mix-blend-multiply opacity-70"></div>
    <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-cyan-100/30 rounded-full blur-[80px] mix-blend-overlay"></div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ jobState, onSelectCategory, onFinishJob }) => {
  const categories = Object.values(jobState.categories);
  
  // Exclude 'additional_notes' from the requirement check
  // Fix: Explicitly type 'c' as CategoryState
  const requiredCategories = categories.filter((c: CategoryState) => c.id !== 'additional_notes');
  // Fix: Explicitly type 'c' as CategoryState
  const allComplete = requiredCategories.every((c: CategoryState) => c.status === 'complete');

  const getStatusStyle = (status: string, isOptional: boolean = false) => {
    // 3D Base Styles: Bevel (border-b-4), Lift on hover, Mechanical click on active
    const base3D = "relative overflow-hidden transition-all duration-200 ease-out transform hover:-translate-y-1 hover:shadow-2xl active:translate-y-[2px] active:shadow-inner active:border-b-0 mb-1 backdrop-blur-md";
    
    if (status === 'complete') {
        return {
            wrapper: `${base3D} bg-gradient-to-br from-white via-fcs-50/80 to-fcs-100/50 border-t border-l border-r border-fcs-100 border-b-[4px] border-b-fcs-500 shadow-[0_4px_15px_-3px_rgba(20,184,166,0.25)] group`,
            title: "text-slate-900 font-bold",
            iconBg: "bg-fcs-500 shadow-lg shadow-fcs-500/40 text-white",
            indicator: "bg-fcs-400 animate-pulse shadow-[0_0_10px_rgba(20,184,166,0.6)]",
            statusText: "text-fcs-700",
            barColor: "bg-fcs-500",
            numberColor: "text-fcs-200"
        };
    }
    if (status === 'in_progress') {
        return {
            wrapper: `${base3D} bg-gradient-to-br from-white via-blue-50/80 to-blue-100/50 border-t border-l border-r border-blue-100 border-b-[4px] border-b-blue-500 shadow-[0_4px_15px_-3px_rgba(59,130,246,0.25)] group`,
            title: "text-slate-900 font-bold",
            iconBg: "bg-blue-500 shadow-lg shadow-blue-500/40 text-white",
            indicator: "bg-blue-400 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.6)]",
            statusText: "text-blue-700",
            barColor: "bg-blue-500",
            numberColor: "text-blue-200"
        };
    }
    // Default / Not Started
    return {
        wrapper: `${base3D} bg-gradient-to-br from-white via-white to-slate-50/50 border-t border-l border-r border-white/60 border-b-[4px] border-b-slate-200 shadow-sm hover:shadow-md hover:border-b-fcs-300 group ${isOptional ? 'opacity-90' : ''}`,
        title: "text-slate-600 font-semibold group-hover:text-fcs-800 transition-colors",
        iconBg: "bg-slate-100 text-slate-300 inner-shadow group-hover:bg-fcs-50 group-hover:text-fcs-400 transition-colors",
        indicator: "bg-slate-200",
        statusText: "text-slate-400 group-hover:text-fcs-600 transition-colors",
        barColor: "bg-slate-300 group-hover:bg-fcs-300 transition-colors",
        numberColor: "text-slate-200 group-hover:text-fcs-200 transition-colors"
    };
  };

  const getIcon = (status: string, styles: any) => {
    if (status === 'complete') return (
      <div className={`p-2 rounded-lg ${styles.iconBg} ring-1 ring-white/50 ring-inset transition-all duration-300`}>
         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      </div>
    );
    if (status === 'in_progress') return (
       <div className={`p-2 rounded-lg ${styles.iconBg} ring-1 ring-white/50 ring-inset transition-all duration-300`}>
         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
       </div>
    );
    return (
      <div className={`p-2 rounded-lg ${styles.iconBg} ring-1 ring-white/50 ring-inset transition-all duration-300`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30 relative">
      <AmbientBackground />

      {/* Brand Header - Centered & High Design */}
      <div className="bg-white/80 px-6 py-8 border-b border-white/50 shadow-[0_4px_30px_-10px_rgba(0,0,0,0.05)] sticky top-0 z-10 flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-xl">
        {/* Subtle top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-fcs-300 via-fcs-500 to-blue-500"></div>
        
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
        <div className="relative z-10 flex flex-col items-center">
            <div className="transform hover:scale-105 transition-transform duration-500 ease-out cursor-default drop-shadow-sm">
                <FCSLogo />
            </div>
            <div className="flex items-center gap-3 mt-4">
                <div className="h-px w-8 bg-gradient-to-l from-slate-400 to-transparent"></div>
                <h1 className="text-[10px] text-slate-500 font-mono font-bold tracking-[0.35em] uppercase select-none drop-shadow-[0_1px_0_rgba(255,255,255,1)]">
                    Field Monitor Assistant
                </h1>
                <div className="h-px w-8 bg-gradient-to-r from-slate-400 to-transparent"></div>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-8 pb-32 relative z-1">
        <div className="mb-8 flex items-end justify-between">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight drop-shadow-sm">Project Dashboard</h1>
                <p className="text-fcs-600/80 text-xs font-mono mt-1 font-medium">SESSION_ID: {new Date().getTime().toString().slice(-6)}</p>
            </div>
            <div className="text-right">
                 <div className="inline-flex items-center px-3 py-1 bg-white/60 backdrop-blur-sm rounded-full border border-white/60 shadow-sm">
                    <span className="relative flex h-2 w-2 mr-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">System Online</span>
                 </div>
            </div>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 gap-5">
            {/* Fix: Explicitly type 'cat' as CategoryState */}
            {categories.map((cat: CategoryState, idx) => {
            const isOptional = cat.id === 'additional_notes';
            const style = getStatusStyle(cat.status, isOptional);
            
            return (
                <button
                    key={cat.id}
                    onClick={() => onSelectCategory(cat.id)}
                    className={`rounded-xl flex items-stretch text-left ${style.wrapper}`}
                >
                    {/* Hover Glow Effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-fcs-400 to-blue-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                    
                    {/* Tech Bar Accent */}
                    <div className={`w-1.5 ${style.barColor} relative z-10 transition-colors duration-300`}></div>

                    <div className="flex-1 p-5 relative z-10 flex justify-between items-center">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[12px] font-mono font-bold ${style.numberColor}`}>0{idx + 1}</span>
                                {isOptional && <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Optional</span>}
                            </div>
                            
                            <span className={`text-lg tracking-tight ${style.title}`}>{cat.title}</span>
                            
                            <div className="flex items-center gap-2 mt-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${style.indicator}`}></div>
                                <span className={`text-[10px] uppercase font-bold tracking-wider ${style.statusText}`}>
                                    {cat.status.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                        
                        <div className="pl-4 transform group-hover:scale-110 transition-transform duration-300">
                            {getIcon(cat.status, style)}
                        </div>
                    </div>
                </button>
            )})}
        </div>
      </div>

      {/* Footer / Finish Button */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-white/80 backdrop-blur-xl border-t border-white/50 z-20 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)]">
        <div className="max-w-md mx-auto">
            <button
            onClick={onFinishJob}
            disabled={!allComplete}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl flex items-center justify-center space-x-3 transition-all transform active:scale-[0.98] border-b-4 ${
                allComplete 
                ? 'bg-gradient-to-r from-fcs-600 to-fcs-500 text-white border-fcs-800 shadow-fcs-500/30 hover:-translate-y-1 hover:shadow-fcs-500/50' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-300'
            }`}
            >
            <span className="tracking-tight drop-shadow-md">FINALIZE JOB & REPORT</span>
            {allComplete && (
                <svg className="w-6 h-6 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            )}
            </button>
        </div>
      </div>
    </div>
  );
};