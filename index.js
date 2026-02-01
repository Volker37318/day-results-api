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

/* ======================================================
   STUFE 1 REAL
   - id
   - payload (ECHTE ÜBUNGSDATEN)
   - received_at
====================================================== */

app.post("/day-results", async (req, res) => {
  try {
    const body = req.body;

    // 🔒 Minimal-Validierung
    if (!body || typeof body !== "object") {
      return res.status(400).json({
        ok: false,
        reason: "INVALID_BODY"
      });
    }

    // 🔒 Server erzeugt Pflichtwerte
    const row = {
      id: crypto.randomUUID(),                 // Pflicht 1
      payload: body,                           // Pflicht 2 (ECHTE Daten)
      received_at: new Date().toISOString(),   // Pflicht 3
      source: "frontend",
      schema_version: 1
    };

    const { error } = await supabase
      .from("day_results")
      .insert(row);

    if (error) {
      console.error("SUPABASE ERROR:", error);
      console.error("ROW:", row);
      return res.status(500).json({
        ok: false,
        reason: "DB_INSERT_FAILED",
        details: error.message
      });
    }

    return res.json({ ok: true });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ ok: false });
  }
});

app.get("/", (_, res) => res.send("OK"));
app.listen(process.env.PORT || 8000);
