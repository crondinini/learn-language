const BASE_URL = "/api";

function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

export function setToken(token: string) {
  localStorage.setItem("auth_token", token);
}

export function clearToken() {
  localStorage.removeItem("auth_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

// Auth
export const api = {
  googleSignIn: (idToken: string) =>
    request<{ token: string; user: { id: string; email: string; name: string } }>(
      "/auth/google",
      { method: "POST", body: JSON.stringify({ idToken }) }
    ),

  devLogin: () =>
    request<{ token: string; user: { id: string; email: string; name: string } }>(
      "/auth/dev-login",
      { method: "POST" }
    ),

  getMe: () =>
    request<{ id: string; email: string; name: string }>("/auth/me"),

  // Periods
  getPeriods: () =>
    request<Array<{
      id: string; userId: string; startDate: string; endDate: string | null;
      source: string; periodDays: Array<{ id: string; periodId: string; date: string; flow: string }>;
    }>>("/periods"),

  createPeriod: (startDate: string, endDate?: string) =>
    request("/periods", {
      method: "POST",
      body: JSON.stringify({ startDate, endDate }),
    }),

  updatePeriod: (id: string, data: { startDate?: string; endDate?: string | null }) =>
    request(`/periods/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deletePeriod: (id: string) =>
    request(`/periods/${id}`, { method: "DELETE" }),

  logPeriodDay: (periodId: string, date: string, flow: string) =>
    request(`/periods/${periodId}/days`, {
      method: "POST",
      body: JSON.stringify({ date, flow }),
    }),

  deletePeriodDay: (periodId: string, date: string) =>
    request(`/periods/${periodId}/days/${date}`, { method: "DELETE" }),

  // Symptoms
  getSymptoms: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    return request<Array<{
      id: string; userId: string; date: string; type: string; severity: number; notes: string | null;
    }>>(`/symptoms${qs ? `?${qs}` : ""}`);
  },

  createSymptom: (data: { date: string; type: string; severity: number; notes?: string }) =>
    request("/symptoms", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteSymptom: (id: string) =>
    request(`/symptoms/${id}`, { method: "DELETE" }),

  // Predictions
  getPredictions: () =>
    request<{ prediction: {
      predictedStart: string; predictedEnd: string;
      avgCycleLength: number; avgPeriodDuration: number; confidence: number;
    } | null; message?: string }>("/predictions"),

  // Partners
  getPartnership: () =>
    request<{ partnership: {
      id: string; partnerEmail: string; status: string;
      partner: { id: string; name: string; email: string } | null;
    } | null }>("/partners"),

  invitePartner: (email: string) =>
    request("/partners/invite", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  acceptPartner: () =>
    request("/partners/accept", { method: "POST" }),

  removePartner: () =>
    request("/partners/remove", { method: "DELETE" }),

  getPartnerData: () =>
    request<{
      partner: { id: string; name: string; email: string };
      periods: Array<{
        id: string; userId: string; startDate: string; endDate: string | null;
        source: string; periodDays: Array<{ id: string; periodId: string; date: string; flow: string }>;
      }>;
      prediction: {
        predictedStart: string; predictedEnd: string;
        avgCycleLength: number; avgPeriodDuration: number; confidence: number;
      } | null;
    }>("/partners/data"),

  // Training
  getTrainingPlans: () =>
    request<Array<{ id: string; name: string; description: string | null; daysPerWeek: number }>>("/training/plans"),

  getTrainingPlan: (id: string) =>
    request<{
      id: string; name: string; description: string | null; daysPerWeek: number;
      days: Array<{
        id: string; dayNumber: number; name: string; emphasis: string | null;
        exercises: Array<{
          id: string; orderIndex: number; label: string; name: string;
          setsReps: string | null; rest: string | null; notes: string | null;
          isWarmup: boolean; isFinisher: boolean;
        }>;
      }>;
      cycleTips: Array<{ id: string; phase: string; tip: string; orderIndex: number }>;
    }>(`/training/plans/${id}`),

  getTrainingToday: (dayOfWeek: number) =>
    request<{
      plan: { id: string; name: string } | null;
      today: {
        id: string; dayNumber: number; name: string; emphasis: string | null;
        exercises: Array<{
          id: string; orderIndex: number; label: string; name: string;
          setsReps: string | null; rest: string | null; notes: string | null;
          isWarmup: boolean; isFinisher: boolean;
        }>;
      } | null;
      isRestDay?: boolean;
      message?: string;
      cycleTips?: Array<{ id: string; phase: string; tip: string; orderIndex: number }>;
    }>(`/training/today?dayOfWeek=${dayOfWeek}`),
};
