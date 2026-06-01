// Vercel Serverless Function: /api/leads/:id/outcome
// Unifica as acoes de desfecho do lead (venda, perda, reativacao) numa funcao so,
// para respeitar o limite de 12 funcoes serverless do plano Hobby da Vercel.
// A acao vai no corpo: { action: "won" | "lost" | "reactivate", ...campos }
import { markWon, markLost, reactivateLead } from "../../../server/handlers.js";
import { getAuthUser } from "../../../server/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo nao permitido" });
  }
  const user = getAuthUser(req);
  const id = Number(req.query.id);
  const action = req.body?.action;
  try {
    let r;
    if (action === "won") r = await markWon(user, id, req.body);
    else if (action === "lost") r = await markLost(user, id, req.body);
    else if (action === "reactivate") r = await reactivateLead(user, id, req.body);
    else return res.status(400).json({ error: "Acao invalida" });
    return res.status(r.status).json(r.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
