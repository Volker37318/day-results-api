import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: "1mb" }));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post("/day-results", async (req, res) => {
  try {
    const payload = {
      participant_id: req.body.participant_id ?? "unknown",
      lesson_id: req.body.lesson_id,
      completed_at: req.body.completed_at,
      results: req.body.results
    };

    const { data, error } = await supabase
      .from("daily_results")
      .insert(payload)
      .select();

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({
        ok: false,
        supabase_error: error.message,
        details: error
      });
    }

    return res.status(200).json({ ok: true, data });

  } catch (err) {
    console.error("❌ Server crash:", err);
    return res.status(500).json({
      ok: false,
      server_error: err.message
    });
  }
});

app.get("/", (_req, res) => {
  res.send("day-results-api running");
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log("🚀 Server listening on port", PORT);
});

