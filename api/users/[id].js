import { updateUser } from "../../server/handlers.js";
import { getAuthUser } from "../../server/auth.js";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", "PUT");
    return res.status(405).json({ error: "Metodo nao permitido" });
  }
  try {
    const r = await updateUser(getAuthUser(req), Number(req.query.id), req.body);
    return res.status(r.status).json(r.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
