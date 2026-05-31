import { getLead, updateLead, deleteLead } from "../../../server/handlers.js";
import { getAuthUser } from "../../../server/auth.js";

export default async function handler(req, res) {
  const user = getAuthUser(req);
  const id = Number(req.query.id);
  try {
    if (req.method === "GET") {
      const r = await getLead(user, id);
      return res.status(r.status).json(r.body);
    }
    if (req.method === "PUT") {
      const r = await updateLead(user, id, req.body);
      return res.status(r.status).json(r.body);
    }
    if (req.method === "DELETE") {
      const r = await deleteLead(user, id);
      if (r.status === 204) return res.status(204).end();
      return res.status(r.status).json(r.body);
    }
    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).json({ error: "Metodo nao permitido" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
