import React, { useState, useRef, useEffect } from 'react';
import { CategoryId, CategoryState } from '../types';
import { blobToBase64 } from '../utils/audioUtils';
import { processVoiceNote, processTextNote, validateCategory } from '../services/aiService';

interface CategoryViewProps {
  category: CategoryState;
  onUpdate: (id: CategoryId, data: Partial<CategoryState>) => void;
  onBack: () => void;
}

const CATEGORY_GUIDES: Record<CategoryId, string[]> = {
  project_details: ["Project Name & Number", "Date", "Specific Location / GPS", "Monitor Name"],
  env_safety: ["Weather (Sun, Cloud, Rain)", "Temperature", "Visibility Conditions", "Safety Hazards / PPE Used"],
  survey_inventory: ["Survey Methodology (e.g., transects)", "Transect Spacing", "Area Covered", "General Observations"],
  site_recording: ["Feature Descriptions", "Dimensions (L x W x H)", "Colors & Materials", "Association with other finds"],
  excavations: ["Excavation Method", "Depth Reached", "Soil Type / Texture / Color", "Stratigraphy Layers"],
  finds: ["Item Type (e.g., Lithic, Historic)", "Material", "Quantity", "Description / Diagnostics"],
  condition_followup: ["Overall Site Condition", "New Disturbances", "Action Taken", "Future Recommendations"],
  additional_notes: ["Clarifications", "Context for other sections", "Notes to Project Manager", "Misc Observations"]
};

const CATEGORY_EXAMPLES: Record<CategoryId, string> = {
  project_details: "\"My name is Sarah Chen. I am monitoring the Riverside Levee Improvement, project number 2023-45. Today's date is October 24th. I'm currently at the north access gate.\"",
  env_safety: "\"Weather is clear and sunny, about 75 degrees. Visibility is excellent. PPE includes hard hat, vest, and boots. No immediate hazards observed.\"",
  survey_inventory: "\"Conducted a pedestrian survey using 15-meter transects across the staging area. Ground visibility is about 50% due to grass. No cultural resources observed.\"",
  site_recording: "\"Observed a historic refuse scatter, approx 5 by 5 meters. Contains amethyst glass shards and white ceramic fragments. No diagnostic markings found.\"",
  excavations: "\"Monitoring excavator trenching for the new pipeline. Depth is currently 4 feet. Soil is dark brown silty clay loam. No stratigraphy changes yet.\"",
  finds: "\"Found one obsidian flake, secondary debitage. Located near the oak tree at the field edge. Collected for analysis.\"",
  condition_followup: "\"Site CA-SBR-123 appears stable with no new disturbances. Recommendation is to continue monitoring during grading activities tomorrow.\"",
  additional_notes: "\"Please note that access to the southern gate was blocked by construction equipment today. We hadt to hike in from the east road. Also, the foreman mentioned they will be grading the north sector tomorrow.\""
};

export const CategoryView: React.FC<CategoryViewProps> = ({ category, onUpdate, onBack }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [textInput, setTextInput] = useState("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('');

  // Diagnostic useEffect to see if category.notes is actually updating
  useEffect(() => {
    console.log(`CategoryView: Category ${category.id} notes updated. New count: ${category.notes.length}`);
    console.log("Current notes array in prop:", category.notes);
  }, [category.notes, category.id]);


  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg'
      ].find(type => MediaRecorder.isTypeSupported(type));

      if (!mimeType) {
        alert("No supported audio recorder found in this browser.");
        return;
      }
      
      mimeTypeRef.current = mimeType;
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied", err);
      alert("Microphone access is required.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current });
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
        await handleAudioProcess(audioBlob, mimeTypeRef.current);
      };
    }
  };

  const handleAudioProcess = async (audioBlob: Blob, mimeType: string) => {
    try {
      const base64 = await blobToBase64(audioBlob);
      const currentNotesText = category.notes.map(n => n.text);
      
      const result = await processVoiceNote(base64, mimeType, category.id, currentNotesText, category.data);

      if (result.transcript === "NO_SPEECH_DETECTED") {
        alert("No speech detected. Please try again.");
        return;
      }

      addNote(result.transcript, result.updatedData);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Error processing audio. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    
    setShowTextModal(false);
    setIsProcessing(true);
    
    try {
      const currentNotesText = category.notes.map(n => n.text);
      const result = await processTextNote(textInput, category.id, currentNotesText, category.data);
      addNote(result.transcript, result.updatedData);
      setTextInput("");
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Error processing note.");
    } finally {
      setIsProcessing(false);
    }
  };

  const addNote = (text: string, updatedData: any) => {
    const newNote = {
      id: Date.now().toString(),
      text: text,
      timestamp: Date.now()
    };

    onUpdate(category.id, {
      notes: [...category.notes, newNote],
      data: updatedData,
      status: 'in_progress'
    });
  };

  const handleDeleteNote = (noteId: string) => {
    if (window.confirm("Delete this note?")) {
      const updatedNotes = category.notes.filter(note => note.id !== noteId);
      console.log(`handleDeleteNote: Deleting note ${noteId}. Old count: ${category.notes.length}, New count: ${updatedNotes.length}`);
      
      onUpdate(category.id, { 
        // Crucial change: Spread existing category properties AND override 'notes' and 'status'.
        // This ensures a new object reference is passed to the parent for this category,
        // which forces React to detect the prop change and re-render.
        ...category, 
        notes: updatedNotes, 
        status: updatedNotes.length === 0 && category.status !== 'complete' ? 'not_started' : category.status 
      });
    }
  };

  const handleFinalize = async () => {
    setIsValidating(true);
    try {
      const result = await validateCategory(category.id, category.data);
      
      if (result.isComplete) {
        onUpdate(category.id, { 
            status: 'complete',
            missingInfo: [] 
        });
        onBack();
      } else {
        onUpdate(category.id, { 
            missingInfo: result.missingInfo 
        });
      }
    } catch (e: any) {
      alert(e.message || "Validation failed.");
    } finally {
      setIsValidating(false);
    }
  };

  const guideItems = CATEGORY_GUIDES[category.id] || [];
  const exampleText = CATEGORY_EXAMPLES[category.id] || "Provide details for this section.";
  const isAdditionalNotes = category.id === 'additional_notes';

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Professional Header */}
      <div className="bg-white px-4 py-4 shadow-sm border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
        <button onClick={onBack} className="text-slate-500 hover:text-fcs-700 flex items-center transition-colors">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          <span className="text-sm font-medium">Back</span>
        </button>
        <h2 className="font-bold text-lg text-slate-800 tracking-tight">{category.title}</h2>
        <div className="w-12"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-52">
        
        {/* Helper Guide Panel */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 mb-6">
            <div className="flex items-center mb-3">
                <span className="bg-fcs-50 text-fcs-700 p-1 rounded mr-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </span>
                <h4 className="text-slate-700 font-bold text-xs uppercase tracking-wider">
                  {isAdditionalNotes ? "Optional Details" : "Required Data Points"}
                </h4>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
                {guideItems.map((item, i) => (
                    <span key={i} className="inline-flex items-center px-2.5 py-1.5 rounded text-xs font-medium bg-slate-50 text-slate-600 border border-slate-100">
                        {item}
                    </span>
                ))}
            </div>
            
            <div className="bg-fcs-50 rounded border border-fcs-100 p-3">
                <h4 className="text-fcs-800 font-bold text-[10px] uppercase tracking-wider mb-1">Sample Voice Note</h4>
                <p className="text-fcs-900 text-sm italic opacity-80 leading-relaxed">
                    {exampleText}
                </p>
            </div>
        </div>

        {/* Missing Info Alert */}
        {category.missingInfo && category.missingInfo.length > 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r shadow-sm animate-in fade-in slide-in-from-top-1">
            <h3 className="text-amber-900 font-bold text-sm mb-2 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              Review Required
            </h3>
            <ul className="list-disc pl-5 text-sm text-amber-800 space-y-1">
              {category.missingInfo.map((info, idx) => (
                <li key={idx}>{info}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Empty State */}
        {category.notes.length === 0 && (
            <div className="text-center py-12 px-6 border-2 border-dashed border-slate-200 rounded-lg">
                <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                {isAdditionalNotes ? (
                   <div className="space-y-2">
                       <p className="text-slate-500 font-medium text-sm">Tap Record or Keyboard to add details</p>
                       <p className="text-slate-400 text-xs">Use this for any context to improve the final report.</p>
                       <p className="text-slate-400 text-xs font-semibold uppercase mt-2">This section is optional</p>
                   </div>
                ) : (
                  <p className="text-slate-400 font-medium text-sm">Tap Record or Keyboard to begin</p>
                )}
            </div>
        )}

        {/* Notes List */}
        <div className="space-y-4">
          {category.notes.map((note) => (
            <div key={note.id} className="bg-white p-5 rounded-lg shadow-card border border-slate-100 flex flex-col relative group">
              <p className="text-slate-800 text-base leading-relaxed mb-3 whitespace-pre-wrap">{note.text}</p>
              
              <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-auto">
                 <span className="text-xs font-medium text-slate-400">
                    {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                 </span>
                 <button 
                   onClick={() => handleDeleteNote(note.id)}
                   className="text-slate-300 hover:text-red-600 hover:bg-red-50 p-2 rounded transition-colors"
                   title="Delete Note"
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                 </button>
              </div>
            </div>
          ))}
          {isProcessing && (
              <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-100 animate-pulse">
                  <div className="h-4 bg-slate-100 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-slate-100 rounded w-1/2"></div>
              </div>
          )}
        </div>
      </div>

      {/* Text Modal */}
      {showTextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Add Text Note</h3>
              <button onClick={() => setShowTextModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 flex-1">
              <textarea 
                className="w-full h-48 border border-slate-200 rounded-lg p-3 bg-slate-800 text-white placeholder-slate-400 focus:ring-2 focus:ring-fcs-500 focus:border-fcs-500 outline-none resize-none"
                placeholder="Type your observations here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                autoFocus
              />
            </div>
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setShowTextModal(false)}
                className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 font-semibold rounded hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleTextSubmit}
                disabled={!textInput.trim()}
                className={`flex-1 py-2.5 font-bold text-white rounded shadow-sm transition-colors ${
                  !textInput.trim() ? 'bg-slate-300 cursor-not-allowed' : 'bg-fcs-600 hover:bg-fcs-700'
                }`}
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Control Deck */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-6 flex flex-col items-center space-y-5 max-w-md mx-auto shadow-[0_-8px_30px_rgba(0,0,0,0.04)] z-30">
        
        {/* Input Controls Row */}
        <div className="flex items-center justify-center gap-6 w-full relative">
          
          {/* Keyboard Button (Left of Record) */}
          <button 
             onClick={() => setShowTextModal(true)}
             disabled={isProcessing}
             className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 hover:text-fcs-700 hover:bg-fcs-50 border border-slate-200 flex items-center justify-center transition-colors shadow-sm"
             title="Type Note"
          >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>

          {/* Record Button (Center) */}
          <div className="flex flex-col items-center">
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              disabled={isProcessing}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all transform active:scale-95 border-4 ${
                isRecording 
                  ? 'bg-red-600 border-red-200 shadow-red-200 scale-105' 
                  : isProcessing 
                    ? 'bg-slate-100 border-slate-200 cursor-wait' 
                    : 'bg-fcs-700 border-fcs-100 hover:bg-fcs-800 text-white shadow-fcs-200'
              }`}
            >
              {isProcessing ? (
                <svg className="animate-spin h-8 w-8 text-fcs-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              )}
            </button>
          </div>

          {/* Spacer to balance layout (Right) */}
          <div className="w-12"></div>
        </div>

        <p className="text-[11px] uppercase tracking-widest font-bold text-slate-400">
            {isRecording ? "Recording..." : "Hold to Record"}
        </p>

        {/* Action Button */}
        <div className="w-full">
            <button
                onClick={handleFinalize}
                disabled={!isAdditionalNotes && category.notes.length === 0 || isProcessing || isValidating}
                className={`w-full py-3.5 rounded-lg text-sm font-bold border transition-colors ${
                    category.status === 'complete' 
                    ? 'bg-fcs-50 text-fcs-800 border-fcs-200 hover:bg-fcs-100'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
            >
                {isValidating ? 'Validating...' : category.status === 'complete' ? `✓ ${isAdditionalNotes ? 'Notes Finalized' : 'Category Complete'}` : `Finalize ${isAdditionalNotes ? 'Additional Notes' : 'Category'}`}
            </button>
        </div>
      </div>
    </div>
  );
};