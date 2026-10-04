import { getStore } from "@netlify/blobs";

const J = (o, s = 200) => Response.json(o, { status: s });
const norm = (e) => String(e || "").trim().toLowerCase();
const okEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

export default async (req) => {
  const p = new URL(req.url).pathname;
  const users = getStore("users"), sess = getStore("sessions"), data = getStore("userdata");
  const cid = Netlify.env.get("GOOGLE_CLIENT_ID") || "";

  if (p === "/api/config") return J({ googleClientId: cid });

  if (p === "/api/auth" && req.method === "POST") {
    const b = await req.json().catch(() => ({}));
    let email;
    if (b.credential) {
      // Google sign-in: token is verified by Google
      const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(b.credential));
      const t = await r.json().catch(() => ({}));
      if (!r.ok || !cid || t.aud !== cid || String(t.email_verified) !== "true")
        return J({ error: "Google sign-in failed. Please try again." }, 401);
      email = norm(t.email);
      const u = (await users.get(encodeURIComponent(email), { type: "json" })) || {};
      if (!u.google) await users.setJSON(encodeURIComponent(email), { ...u, google: true });
    } else {
      email = norm(b.email);
      if (!okEmail(email)) return J({ error: "Please enter a valid email." }, 400);
      const u = await users.get(encodeURIComponent(email), { type: "json" });
      if (b.mode === "signup") {
        if (u) return J({ error: "This email is already registered. Please log in." }, 409);
        await users.setJSON(encodeURIComponent(email), { google: false, at: Date.now() });
      } else {
        if (!u) return J({ error: "No account found. Please sign up first." }, 404);
        if (u.google) return J({ error: "This account uses Google. Please continue with Google." }, 403);
      }
    }
    const token = crypto.randomUUID() + crypto.randomUUID();
    await sess.set(token, email);
    return J({ token, email });
  }

  if (p === "/api/data") {
    const tok = (req.headers.get("authorization") || "").replace("Bearer ", "");
    const email = tok && (await sess.get(tok));
    if (!email) return J({ error: "unauthorized" }, 401);
    const k = encodeURIComponent(email);
    if (req.method === "PUT") {
      await data.setJSON(k, await req.json());
      return J({ ok: true });
    }
    return J((await data.get(k, { type: "json" })) || { done: {}, tasks: {} });
  }
  return J({ error: "not found" }, 404);
};

export const config = { path: "/api/*" };
