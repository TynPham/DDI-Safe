import axios from "axios";

const api = axios.create({
  // baseURL: "http://localhost:8000",
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export interface DrugInteraction {
  drug: string;
  condition: string;
}

export interface QueryResponse {
  answer: string;
  timestamp: string;
}

export interface StatsResponse {
  drugs: number;
  interactions: number;
  sessions: number;
}

export interface DrugNamesFromImageResponse {
  result: string[];
  timestamp: string;
}

export interface ChatRequest {
  question: string;
  session_id?: string;
}

export interface ChatResponse {
  answer: string;
  session_id: string;
  timestamp: string;
}

// Medicine Cabinet APIs
export interface AddDrugRequest {
  drug_name: string;
  user_id: string;
}

export interface AddDrugResponse {
  message: string;
}

export interface DrugInCabinet {
  drug_name: string;
  interactions: string;
}

export interface MedicineCabinetListResponse {
  user_id: string;
  drugs: DrugInCabinet[];
  count: number;
  timestamp: string;
}

export interface DrugInteraction {
  drug1: string;
  drug2: string;
}

export interface DrugInteractionsResponse {
  drug_name: string;
  user_id: string;
  interactions: DrugInteraction[];
}

export const drugInteractionAPI = {
  // Query for drug interactions
  query: async (question: string): Promise<QueryResponse> => {
    const response = await api.post<QueryResponse>("/query", { question });
    return response.data;
  },

  // Get statistics
  getStats: async (): Promise<StatsResponse> => {
    const response = await api.get<StatsResponse>("/stats");
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await api.get("/health");
    return response.data;
  },

  // Extract drug names from image
  extractDrugNamesFromImage: async (file: File): Promise<DrugNamesFromImageResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post<DrugNamesFromImageResponse>("/drug-name-extract/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Chat with session
  chat: async (question: string, sessionId?: string): Promise<ChatResponse> => {
    const response = await api.post<ChatResponse>("/chat", {
      question,
      session_id: sessionId,
    });
    return response.data;
  },

  // Medicine Cabinet APIs
  addDrugToCabinet: async (drugName: string, userId: string): Promise<AddDrugResponse> => {
    const response = await api.post<AddDrugResponse>("/medicine-cabinet/add", {
      drug_name: drugName,
      user_id: userId,
    });
    return response.data;
  },

  getMedicineCabinet: async (userId: string): Promise<MedicineCabinetListResponse> => {
    const response = await api.get<MedicineCabinetListResponse>("/medicine-cabinet/list", {
      params: { user_id: userId },
    });
    return response.data;
  },

  removeDrugFromCabinet: async (drugName: string, userId: string): Promise<string> => {
    const response = await api.delete<string>(`/medicine-cabinet/remove/${drugName}`, {
      params: { user_id: userId },
    });
    return response.data;
  },

  getDrugInteractions: async (drugName: string, userId: string): Promise<DrugInteractionsResponse> => {
    const response = await api.get<DrugInteractionsResponse>(`/medicine-cabinet/interactions/${drugName}`, {
      params: { user_id: userId },
    });
    return response.data;
  },

  clearMedicineCabinet: async (userId: string): Promise<string> => {
    const response = await api.delete<string>("/medicine-cabinet/clear", {
      params: { user_id: userId },
    });
    return response.data;
  },
};

export default api;
