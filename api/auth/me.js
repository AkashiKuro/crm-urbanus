import { me } from "../../server/handlers.js";
import { getAuthUser } from "../../server/auth.js";

export default async function handler(req, res) {
  try {
    const r = await me(getAuthUser(req));
    return res.status(r.status).json(r.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
