
import React, { useState } from 'react';
import { FieldReport } from '../types';

interface ReportDisplayProps {
  report: FieldReport;
  onBack: () => void;
}

const FCSHeader = () => (
  <div className="flex justify-between items-center mb-8 border-b-2 border-fcs-500 pb-4">
    <div className="flex flex-col">
       <div className="flex items-center gap-3">
            <svg viewBox="0 0 120 40" className="h-10 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                <text x="0" y="32" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="32" fill="#0f172a" letterSpacing="-1">FCS</text>
                <circle cx="75" cy="8" r="4" fill="#06b6d4" />
                <circle cx="88" cy="14" r="4" fill="#06b6d4" />
                <circle cx="101" cy="20" r="4" fill="#06b6d4" />
            </svg>
            <div className="h-8 w-px bg-slate-300"></div>
            <div className="flex flex-col justify-center">
                <span className="text-sm font-bold text-slate-900 tracking-tight leading-none">FirstCarbon</span>
                <span className="text-sm font-light text-slate-600 tracking-tight leading-none">Solutions</span>
            </div>
       </div>
    </div>
    <div className="text-right">
       <h1 className="text-2xl font-bold text-slate-800">Final Field Report</h1>
       <p className="text-xs text-slate-500 font-medium">{new Date().toLocaleDateString()}</p>
    </div>
  </div>
);

export const ReportDisplay: React.FC<ReportDisplayProps> = ({ report, onBack }) => {
  const [isExporting, setIsExporting] = useState(false);

  if (!report) return null;

  const handleExportPDF = () => {
    setIsExporting(true);
    const element = document.getElementById('report-container');
    
    // Check if html2pdf is loaded
    // @ts-ignore
    if (typeof html2pdf === 'undefined') {
        alert("PDF generator not loaded. Please try printing via browser menu.");
        setIsExporting(false);
        return;
    }

    const opt = {
      margin: [10, 10, 10, 10], // top, left, bottom, right
      filename: `FCS_Field_Report_${report.project_meta?.project_number || 'Draft'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // @ts-ignore
    html2pdf().set(opt).from(element).save().then(() => {
        setIsExporting(false);
    }).catch((err: any) => {
        console.error(err);
        alert("Export failed. Please try again.");
        setIsExporting(false);
    });
  };

  const sections = [
    { title: "Project Overview", content: report.project_meta, type: 'meta' },
    { title: "Environment & Safety", content: report.env_safety, type: 'text' },
    { title: "Inventory", content: report.survey_inventory, type: 'table' },
    { title: "Site Recording", content: report.site_recording, type: 'text' },
    { title: "Excavations", content: report.excavations, type: 'text' },
    { title: "Finds & Materials", content: report.finds, type: 'text' },
    { title: "Condition & Assessment", content: report.condition_assessment, type: 'mixed' },
    { title: "Daily Log", content: report.daily_log, type: 'text' }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-100 relative">
      {/* UI Control Bar (Not in PDF) */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 shadow-sm flex justify-between items-center sticky top-0 z-50 print:hidden" data-html2canvas-ignore="true">
        <button onClick={onBack} className="text-slate-500 hover:text-fcs-700 font-medium text-sm flex items-center">
             <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
             New Session
        </button>
        <button 
            onClick={handleExportPDF} 
            disabled={isExporting}
            className={`text-white font-medium text-sm px-4 py-2 rounded shadow-sm transition-colors flex items-center ${isExporting ? 'bg-slate-400 cursor-wait' : 'bg-fcs-700 hover:bg-fcs-800'}`}
        >
            {isExporting ? 'Exporting...' : 'Download PDF'}
        </button>
      </div>

      {/* Printable Report Document */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div 
          id="report-container" 
          className="bg-white shadow-lg mx-auto max-w-2xl min-h-[29.7cm] p-8 md:p-12 print:shadow-none print:m-0 print:p-0"
        >
          <FCSHeader />

          <div className="space-y-8">
            {sections.map((section, idx) => (
                <div key={idx} className="break-inside-avoid">
                    <h3 className="text-fcs-800 font-bold text-sm uppercase tracking-wide border-b border-slate-200 pb-2 mb-3">
                        {section.title}
                    </h3>
                    
                    <div className="text-slate-800 text-sm leading-relaxed">
                        {section.type === 'meta' && (
                            <div className="grid grid-cols-2 gap-y-3 gap-x-8">
                                {Object.entries(section.content || {}).map(([k, v]) => (
                                    <div key={k}>
                                        <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">{k.replace('_', ' ')}</span>
                                        <span className="font-medium text-black">{String(v)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {section.type === 'text' && (
                            <p className="whitespace-pre-line text-justify">
                                {typeof section.content === 'string' ? section.content : JSON.stringify(section.content)}
                            </p>
                        )}

                        {section.type === 'table' && Array.isArray(section.content) && (
                            <div className="border rounded border-slate-200 overflow-hidden">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-semibold text-slate-600 text-xs uppercase">Item</th>
                                            <th className="px-4 py-2 text-left font-semibold text-slate-600 text-xs uppercase">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 bg-white">
                                        {section.content.map((row: any, i: number) => (
                                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                                <td className="px-4 py-2 font-medium">{row.item || '-'}</td>
                                                <td className="px-4 py-2 text-slate-600">{row.description || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {section.content.length === 0 && <p className="text-slate-400 italic text-xs p-3 text-center">No items recorded.</p>}
                            </div>
                        )}

                        {section.type === 'mixed' && (
                            <div className="grid grid-cols-1 gap-3">
                                {Object.entries(section.content || {}).map(([k, v]) => (
                                    <div key={k}>
                                        <span className="block font-semibold text-slate-700 text-xs uppercase mb-1">{k.replace('_', ' ')}</span>
                                        <p className="text-slate-800 bg-slate-50 p-3 rounded border border-slate-100">
                                            {Array.isArray(v) ? v.join(', ') : String(v)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ))}
          </div>
          
          <div className="mt-12 pt-8 border-t border-slate-200 text-center text-xs text-slate-400">
             <p>Generated by FCS Field Monitor Assistant • FirstCarbon Solutions</p>
          </div>
        </div>
      </div>
    </div>
  );
};
