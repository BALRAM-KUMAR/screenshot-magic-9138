const API_BASE = "http://127.0.0.1:8000/api/v1";

export async function getAnalysisHistory() {
  const res = await fetch(`${API_BASE}/analysis/`);
  if (!res.ok) throw new Error("Could not load analysis history");
  return res.json();
}

export async function getAnalysisDetails(analysisId: string) {
  const res = await fetch(`${API_BASE}/analysis/${analysisId}`);
  if (!res.ok) throw new Error("Could not load this analysis");
  return res.json();
}

export const getAudioFileUrl = (audioId: string) => `${API_BASE}/audio/${audioId}/file`;

export async function uploadAudio(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/audio/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    let message = `Failed to upload audio (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") message = body.detail;
    } catch {
      // Keep the status-based message if the response is not JSON.
    }
    throw new Error(message);
  }
  return res.json();
}

export async function getModels() {
  const res = await fetch(`${API_BASE}/models`);
  if (!res.ok) throw new Error("Failed to fetch models");
  return res.json();
}

export async function runAnalysis(
  audioId: string,
  modelIds: string[],
  options: { hybridMode?: boolean } = {},
) {
  const res = await fetch(`${API_BASE}/analysis`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audio_id: audioId,
      model_ids: modelIds,
      hybrid_mode: options.hybridMode ?? false,
    }),
  });
  if (!res.ok) {
    let message = "Failed to run analysis";
    try {
      const body = await res.json();
      if (typeof body.detail === "string") message = body.detail;
    } catch {
      // Keep the fallback message for non-JSON responses.
    }
    throw new Error(message);
  }
  return res.json();
}
