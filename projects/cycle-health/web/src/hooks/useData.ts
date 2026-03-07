import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type {
  Period,
  Prediction,
  Partnership,
  PartnerData,
  Symptom,
} from "../lib/types";
import { useAuth } from "../context/AuthContext";

export function usePeriods() {
  const { user } = useAuth();
  return useQuery<Period[]>({
    queryKey: ["periods"],
    queryFn: () => api.getPeriods() as Promise<Period[]>,
    enabled: !!user,
  });
}

export function usePrediction() {
  const { user } = useAuth();
  return useQuery<Prediction | null>({
    queryKey: ["prediction"],
    queryFn: async () => {
      const res = await api.getPredictions();
      return res.prediction ?? null;
    },
    enabled: !!user,
  });
}

export function useSymptoms(from?: string, to?: string) {
  const { user } = useAuth();
  return useQuery<Symptom[]>({
    queryKey: ["symptoms", from, to],
    queryFn: () => api.getSymptoms(from, to) as Promise<Symptom[]>,
    enabled: !!user,
  });
}

export function usePartnership() {
  const { user } = useAuth();
  return useQuery<Partnership | null>({
    queryKey: ["partnership"],
    queryFn: async () => {
      const res = await api.getPartnership();
      return (res.partnership as Partnership) ?? null;
    },
    enabled: !!user,
  });
}

export function usePartnerData() {
  const { user } = useAuth();
  const partnership = usePartnership();
  return useQuery<PartnerData | null>({
    queryKey: ["partnerData"],
    queryFn: async () => {
      try {
        return (await api.getPartnerData()) as PartnerData;
      } catch {
        return null;
      }
    },
    enabled: !!user && partnership.data?.status === "accepted",
  });
}

export function useCreatePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (startDate: string) => api.createPeriod(startDate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["periods"] });
      qc.invalidateQueries({ queryKey: ["prediction"] });
    },
  });
}

export function useLogPeriodDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { periodId: string; date: string; flow: string }) =>
      api.logPeriodDay(args.periodId, args.date, args.flow),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["periods"] });
      qc.invalidateQueries({ queryKey: ["prediction"] });
    },
  });
}

export function useDeletePeriodDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { periodId: string; date: string }) =>
      api.deletePeriodDay(args.periodId, args.date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["periods"] });
      qc.invalidateQueries({ queryKey: ["prediction"] });
    },
  });
}

export function useCreateSymptom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      date: string;
      type: string;
      severity: number;
      notes?: string;
    }) => api.createSymptom(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["symptoms"] });
    },
  });
}

export function useDeleteSymptom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteSymptom(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["symptoms"] });
    },
  });
}

export function useInvitePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => api.invitePartner(email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partnership"] });
    },
  });
}

export function useAcceptPartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.acceptPartner(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partnership"] });
      qc.invalidateQueries({ queryKey: ["partnerData"] });
    },
  });
}

export function useRemovePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.removePartner(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partnership"] });
      qc.invalidateQueries({ queryKey: ["partnerData"] });
    },
  });
}

export function useTrainingToday(dayOfWeek: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["training", "today", dayOfWeek],
    queryFn: () => api.getTrainingToday(dayOfWeek),
    enabled: !!user,
  });
}

export function useTrainingPlans() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["training", "plans"],
    queryFn: () => api.getTrainingPlans(),
    enabled: !!user,
  });
}

export function useTrainingPlan(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["training", "plan", id],
    queryFn: () => api.getTrainingPlan(id!),
    enabled: !!user && !!id,
  });
}
