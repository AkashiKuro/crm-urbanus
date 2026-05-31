import { listUsers, createUser } from "../../server/handlers.js";
import { getAuthUser } from "../../server/auth.js";

export default async function handler(req, res) {
  const user = getAuthUser(req);
  try {
    if (req.method === "GET") {
      const r = await listUsers(user);
      return res.status(r.status).json(r.body);
    }
    if (req.method === "POST") {
      const r = await createUser(user, req.body);
      return res.status(r.status).json(r.body);
    }
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Metodo nao permitido" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
