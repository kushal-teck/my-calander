import { getStore } from "@netlify/blobs";
import webpush from "web-push";

const HOURS = [9, 15, 20]; // local reminder hours

export default async () => {
  const pub = Netlify.env.get("VAPID_PUBLIC_KEY"), prv = Netlify.env.get("VAPID_PRIVATE_KEY");
  if (!pub || !prv) return;
  webpush.setVapidDetails(Netlify.env.get("VAPID_SUBJECT") || "mailto:admin@example.com", pub, prv);
  const ps = getStore("push"), data = getStore("userdata");
  const { blobs } = await ps.list();
  for (const { key } of blobs) {
    const rec = await ps.get(key, { type: "json" });
    if (!rec) continue;
    let st;
    const keep = [];
    for (const s of rec.subs) {
      const f = new Intl.DateTimeFormat("en-CA", { timeZone: s.tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" });
      const p = Object.fromEntries(f.formatToParts(new Date()).map((x) => [x.type, x.value]));
      if (!HOURS.includes(+p.hour)) { keep.push(s); continue; }
      st ??= (await data.get(key, { type: "json" })) || {};
      const n = ((st.tasks || {})[`${p.year}-${p.month}-${p.day}`] || []).filter((t) => t.s !== 1).length;
      if (!n) { keep.push(s); continue; }
      try {
        await webpush.sendNotification(s.sub, JSON.stringify({ title: "Complete your tasks", body: `You have ${n} task${n > 1 ? "s" : ""} pending today.` }));
        keep.push(s);
      } catch (e) {
        if (e.statusCode !== 404 && e.statusCode !== 410) keep.push(s);
      }
    }
    if (keep.length !== rec.subs.length) keep.length ? await ps.setJSON(key, { subs: keep }) : await ps.delete(key);
  }
};

export const config = { schedule: "0 * * * *" };
