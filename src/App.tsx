import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import LeadDetail from "./pages/LeadDetail";
import Agenda from "./pages/Agenda";
import LostLeads from "./pages/LostLeads";
import Users from "./pages/Users";
import Login from "./pages/Login";
import Placeholder from "./pages/Placeholder";
import { useAuth } from "./auth";

export default function App() {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-full place-items-center text-sm text-slate-400">
        Carregando...
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/leads/:id" element={<LeadDetail />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/perdidos" element={<LostLeads />} />
        <Route
          path="/vendedores"
          element={isAdmin ? <Users /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Placeholder title="Página não encontrada" />} />
      </Routes>
    </Layout>
  );
}
