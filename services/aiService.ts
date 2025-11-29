

import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { CategoryId, CategoryState, FieldReport, JobState } from "../types";

// Read API key from Vite env (Netlify/browser)
const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;

if (!apiKey) {
  console.error("❌ Missing VITE_GEMINI_API_KEY environment variable");
}

const ai = new GoogleGenAI({ apiKey });

const MODEL_NAME = "gemini-2.5-flash";

// Specific validation criteria for each category to prevent hallucinated requirements
const VALIDATION_CRITERIA: Record<CategoryId, string> = {
  project_details: "CRITICAL: The 'Monitor Name' MUST be present. Project Name, Project Number, Date, and Specific Location are also required.",
  env_safety: "Weather conditions, Visibility, Safety hazards (or 'none'), PPE used.",
  survey_inventory: "Survey methodology (e.g., transects), Area surveyed, General observations (or 'negative findings').",
  site_recording: "Description of features (if any), Dimensions, Colors/Materials. If nothing found, explicit statement of no features.",
  excavations: "Excavation method, Depth reached, Soil type/color, Stratigraphy layers. If no excavation, explicit statement.",
  finds: "Item type (e.g., lithic, historic glass), Material, Quantity, Description. If no finds, explicit statement of 'no cultural resources observed'.",
  condition_followup: "Overall site condition (e.g., stable, eroding), Disturbances, Actions taken, Recommendations.",
  additional_notes: "Optional section. Always mark 'isComplete' as true unless the user asks a specific question requiring a response."
};

// Helper to handle AI errors gracefully
function handleAIError(error: any): never {
  console.error("AI Service Error:", error);
  
  // Robust error message extraction to handle { error: { code: 429, ... } }
  let msg = "";
  if (error?.error?.message) {
      msg = error.error.message;
  } else if (error?.message) {
      msg = error.message;
  } else {
      msg = JSON.stringify(error);
  }
  msg = msg.toLowerCase();
  
  // Check for Quota/Rate Limit codes
  const isQuota = msg.includes("quota") || 
                  msg.includes("429") || 
                  msg.includes("resource_exhausted") || 
                  msg.includes("resource has been exhausted") ||
                  error?.error?.code === 429;
  
  if (isQuota) {
    throw new Error("⚠️ System Busy (Quota Exceeded). We are retrying, but if this persists, please wait 60 seconds.");
  }
  
  if (msg.includes("network") || msg.includes("fetch")) {
    throw new Error("⚠️ Network Error. Please check your internet connection.");
  }

  throw new Error("⚠️ AI Processing Failed. Please try again.");
}

// Wrapper to retry API calls on 429/Quota errors
async function callWithRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            // Check if it's a quota/rate limit error
            let msg = error?.error?.message || error?.message || "";
            msg = msg.toLowerCase();
            const isRateLimit = msg.includes("429") || msg.includes("quota") || error?.error?.code === 429;
            
            if (isRateLimit && i < retries - 1) {
                // Exponential backoff: 1s, 2s, 4s...
                const delay = 1000 * Math.pow(2, i);
                console.warn(`Hit rate limit. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            throw error;
        }
    }
    throw new Error("Max retries exceeded");
}

// Helper to get schema based on category
function getSchemaForCategory(categoryId: CategoryId): any {
  // Define strict schemas for each category to ensure structured data extraction
  switch (categoryId) {
    case 'project_details':
      return {
        type: Type.OBJECT,
        properties: {
          project_name: { type: Type.STRING },
          project_number: { type: Type.STRING },
          date: { type: Type.STRING },
          monitor_name: { type: Type.STRING },
          location: { type: Type.STRING },
        }
      };
    case 'env_safety':
      return {
        type: Type.OBJECT,
        properties: {
          weather: { type: Type.STRING },
          temperature: { type: Type.STRING },
          visibility: { type: Type.STRING },
          safety_hazards: { type: Type.ARRAY, items: { type: Type.STRING } },
          ppe_used: { type: Type.STRING },
          ground_disturbances: { type: Type.STRING }
        }
      };
    case 'survey_inventory':
      return {
        type: Type.OBJECT,
        properties: {
          survey_method: { type: Type.STRING },
          area_surveyed: { type: Type.STRING },
          items_observed: { type: Type.ARRAY, items: { type: Type.STRING } },
          nothing_found: { type: Type.BOOLEAN }
        }
      };
    case 'site_recording':
      return {
        type: Type.OBJECT,
        properties: {
          features_observed: { type: Type.STRING },
          dimensions: { type: Type.STRING },
          colors_materials: { type: Type.STRING },
          association: { type: Type.STRING }
        }
      };
    case 'excavations':
      return {
        type: Type.OBJECT,
        properties: {
          excavation_method: { type: Type.STRING },
          depth: { type: Type.STRING },
          soil_type: { type: Type.STRING },
          stratigraphy: { type: Type.STRING }
        }
      };
    case 'finds':
      return {
        type: Type.OBJECT,
        properties: {
          item_type: { type: Type.STRING },
          material: { type: Type.STRING },
          quantity: { type: Type.STRING },
          description: { type: Type.STRING }
        }
      };
    case 'condition_followup':
      return {
        type: Type.OBJECT,
        properties: {
          site_condition: { type: Type.STRING },
          disturbances: { type: Type.STRING },
          actions_taken: { type: Type.STRING },
          recommendations: { type: Type.STRING }
        }
      };
    case 'additional_notes':
      return {
        type: Type.OBJECT,
        properties: {
          notes_summary: { type: Type.STRING },
          context_points: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      };
    default:
      return { type: Type.OBJECT, properties: { summary: { type: Type.STRING } } };
  }
}

export async function processVoiceNote(
  audioBase64: string, 
  mimeType: string,
  categoryId: CategoryId, 
  currentNotes: string[],
  currentData: any
): Promise<{ transcript: string; updatedData: any }> {
  
  const prompt = `
    You are an AI assistant for a Cultural Resources Field Monitor.
    
    TASK:
    1. Listen to the audio clip provided.
    2. Transcribe the audio EXACTLY as spoken. 
    3. If the audio is silent, just background noise, or unintelligible, return the string "NO_SPEECH_DETECTED" for the transcript property and do NOT change the data.
    4. DO NOT hallucinate. DO NOT invent information like "Sarah Chen" or "North Creek" if it is not in the audio.
    5. Extract relevant technical data for the category: "${categoryId}".
    6. Merge this new data with the EXISTING data provided below.
    
    EXISTING DATA: ${JSON.stringify(currentData)}
    
    Return a JSON object containing the 'transcript' and the 'updatedData'.
  `;

  try {
    // Fix: Explicitly type response as GenerateContentResponse
    const response: GenerateContentResponse = await callWithRetry(() => ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        role: 'user',
        parts: [
          { inlineData: { mimeType: mimeType, data: audioBase64 } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: { type: Type.STRING },
            updatedData: getSchemaForCategory(categoryId)
          }
        }
      }
    }));

    if (!response.text) throw new Error("No response from AI");
    return JSON.parse(response.text);
  } catch (error) {
    handleAIError(error);
  }
}

export async function processTextNote(
  text: string,
  categoryId: CategoryId,
  currentNotes: string[],
  currentData: any
): Promise<{ transcript: string; updatedData: any }> {

  const prompt = `
    You are an AI assistant for a Cultural Resources Field Monitor.
    
    TASK:
    1. Analyze the text note provided below.
    2. Extract relevant technical data for the category: "${categoryId}".
    3. Merge this new data with the EXISTING data provided below.
    
    NEW TEXT NOTE: "${text}"
    
    EXISTING DATA: ${JSON.stringify(currentData)}
    
    Return a JSON object containing the 'transcript' (which is just the input text) and the 'updatedData'.
  `;

  try {
    // Fix: Explicitly type response as GenerateContentResponse
    const response: GenerateContentResponse = await callWithRetry(() => ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: { type: Type.STRING },
            updatedData: getSchemaForCategory(categoryId)
          }
        }
      }
    }));

    if (!response.text) throw new Error("No response from AI");
    return JSON.parse(response.text);
  } catch (error) {
    handleAIError(error);
  }
}

export async function validateCategory(
  categoryId: CategoryId, 
  data: any
): Promise<{ isComplete: boolean; missingInfo: string[] }> {
  
  const specificRequirements = VALIDATION_CRITERIA[categoryId] || "General summary of observations.";

  const prompt = `
    Review the following data collected for the category: "${categoryId}" by an FCS Field Monitor.
    
    DATA: ${JSON.stringify(data)}

    Your Goal: Determine if the user has provided enough information to mark this SPECIFIC section as complete.

    CRITERIA FOR COMPLETION (Use ONLY these criteria):
    ${specificRequirements}

    INSTRUCTIONS:
    1. Check if the DATA satisfies the criteria above.
    2. If satisfied, 'isComplete' is true.
    3. If NOT satisfied, 'isComplete' is false, and list missing items in 'missingInfo'.
    4. IMPORTANT: DO NOT ask for information that belongs in other sections. For example, if checking 'Finds', do NOT ask for 'Project Name' or 'Weather'. Only ask for missing info relevant to '${categoryId}'.

    Return JSON with 'isComplete' (boolean) and 'missingInfo' (array of strings).
  `;

  try {
    // Fix: Explicitly type response as GenerateContentResponse
    const response: GenerateContentResponse = await callWithRetry(() => ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isComplete: { type: Type.BOOLEAN },
            missingInfo: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    }));

    if (!response.text) throw new Error("Validation failed");
    return JSON.parse(response.text);
  } catch (error) {
    handleAIError(error);
  }
}

export async function generateFinalJobReport(jobState: JobState): Promise<FieldReport> {
  const additionalNotes = jobState.categories.additional_notes?.notes.map(n => n.text).join('\n') || "None";

  const prompt = `
    Generate a final set of Cultural Resources Field Reports based on the following job data.
    Structure the output to map exactly to the required JSON schema.
    Use formal, professional FCS tone.

    JOB DATA: ${JSON.stringify(jobState.categories)}

    SUPPLEMENTAL CONTEXT (Use this to refine all sections):
    ${additionalNotes}

    INSTRUCTIONS:
    - If "Additional Notes" contains relevant details for survey, finds, or safety, INCORPORATE them into those respective sections automatically.
    - Ensure the "daily_log" is chronological and detailed.
  `;

  try {
    // Fix: Explicitly type response as GenerateContentResponse
    const response: GenerateContentResponse = await callWithRetry(() => ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
              project_meta: { type: Type.OBJECT, properties: { project_name: { type: Type.STRING }, date: { type: Type.STRING }, location: { type: Type.STRING }, monitor_name: { type: Type.STRING } } },
              env_safety: { type: Type.STRING, description: "Full paragraph summary" },
              survey_inventory: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { item: { type: Type.STRING }, description: { type: Type.STRING } } } },
              site_recording: { type: Type.STRING, description: "Summary of features" },
              excavations: { type: Type.STRING, description: "Summary of excavation work" },
              finds: { type: Type.STRING, description: "Summary of cultural finds" },
              condition_assessment: { type: Type.OBJECT, properties: { condition: { type: Type.STRING }, recommendations: { type: Type.ARRAY, items: { type: Type.STRING } } } },
              daily_log: { type: Type.STRING, description: "Chronological log" }
          }
        }
      }
    }));

    if (!response.text) throw new Error("Report generation failed");
    return JSON.parse(response.text);
  } catch (error) {
    handleAIError(error);
  }
}
