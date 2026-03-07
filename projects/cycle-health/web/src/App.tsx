import { Routes, Route, Navigate } from "react-router";
import { useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { CalendarPage } from "./pages/CalendarPage";
import { DayDetailPage } from "./pages/DayDetailPage";
import { FitPage } from "./pages/FitPage";
import { PlanPage } from "./pages/PlanPage";
import { PartnerPage } from "./pages/PartnerPage";
import { SettingsPage } from "./pages/SettingsPage";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<FitPage />} />
        <Route path="plan" element={<PlanPage />} />
        <Route path="home" element={<HomePage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="partner" element={<PartnerPage />} />
      </Route>
      <Route
        path="day/:date"
        element={
          <RequireAuth>
            <DayDetailPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
