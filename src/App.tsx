import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Placeholder from "./pages/Placeholder";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/accounts" element={<Placeholder title="Accounts" />} />
        <Route path="/contacts" element={<Placeholder title="Contacts" />} />
        <Route path="/calendar" element={<Placeholder title="Calendar" />} />
        <Route path="/activities" element={<Placeholder title="Activities" />} />
        <Route path="/reports" element={<Placeholder title="Reports" />} />
        <Route path="*" element={<Placeholder title="Página não encontrada" />} />
      </Routes>
    </Layout>
  );
}
