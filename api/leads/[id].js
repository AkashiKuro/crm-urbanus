// Vercel Serverless Function: /api/leads/:id  (PUT atualiza, DELETE remove)
import { updateLead, deleteLead } from "../../server/handlers.js";

export default async function handler(req, res) {
  const id = Number(req.query.id);
  try {
    if (req.method === "PUT") {
      const r = await updateLead(id, req.body);
      return res.status(r.status).json(r.body);
    }
    if (req.method === "DELETE") {
      const r = await deleteLead(id);
      if (r.status === 204) return res.status(204).end();
      return res.status(r.status).json(r.body);
    }
    res.setHeader("Allow", "PUT, DELETE");
    return res.status(405).json({ error: "Metodo nao permitido" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
