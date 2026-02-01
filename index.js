import express from "express";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const app = express();
app.use(express.json({ limit: "2mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post("/day-results", async (req, res) => {
  try {
    const { klassencode, participant_id, day_results } = req.body || {};

    if (!klassencode || !participant_id || !day_results) {
      return res.status(400).json({ ok: false });
    }

    // 👉 genau eine Übung
    const code = Object.keys(day_results)[0];
    const data = day_results[code];

    const started = new Date(data.started_at || Date.now()).toISOString();
    const finished = new Date().toISOString();

    const payload = {
      "Klassencode": klassencode,
      "Teilnehmer-ID": participant_id,
      "set_id": crypto.randomUUID(),
      "Übungscode": code,
      "begann_am": started,
      "abgeschlossen am": finished,
      "Dauer_ms": data.duration_ms ?? null,
      "Ergebnis": data
    };

    const { error } = await supabase
      .from("exercise_results")
      .insert(payload);

    if (error) {
      console.error(error);
      return res.status(500).json({ ok: false });
    }

    return res.json({ ok: true });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false });
  }
});

app.get("/", (_, res) => res.send("OK"));

app.listen(process.env.PORT || 8000);
