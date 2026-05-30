// Vercel Serverless Function: /api/stats  (GET indicadores do dashboard)
import { getStats } from "../server/handlers.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Metodo nao permitido" });
    }
    const r = await getStats();
    return res.status(r.status).json(r.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
