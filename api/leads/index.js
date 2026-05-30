// Vercel Serverless Function: /api/leads  (GET lista, POST cria)
import { listLeads, createLead } from "../../server/handlers.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const r = await listLeads();
      return res.status(r.status).json(r.body);
    }
    if (req.method === "POST") {
      const r = await createLead(req.body);
      return res.status(r.status).json(r.body);
    }
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Metodo nao permitido" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
