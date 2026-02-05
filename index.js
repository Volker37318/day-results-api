import express from "express";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const app = express();
app.use(express.json({ limit: "2mb" }));

// --------------------------------------------------
// CORS
// --------------------------------------------------
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// --------------------------------------------------
// Supabase
// --------------------------------------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --------------------------------------------------
// Helper
// --------------------------------------------------
function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

const ALLOWED_EXERCISES = ["A", "B", "C", "D", "E"];

// --------------------------------------------------
// POST /day-results  (bestehend, unverändert)
// --------------------------------------------------
app.post("/day-results", async (req, res) => {
  try {
    const body = req.body;

    if (!isPlainObject(body)) {
      return res.status(400).json({ ok: false, reason: "INVALID_BODY" });
    }

    if (!isNonEmptyString(body.lesson_id)) {
      return res.status(400).json({ ok: false, reason: "MISSING_LESSON_ID" });
    }

    const klassencode = isNonEmptyString(body.klassencode)
      ? body.klassencode.trim()
      : "UNDEFINED_CLASS";

    const participant_id = isNonEmptyString(body.participant_id)
      ? body.participant_id.trim()
      : "UNDEFINED_PARTICIPANT";

    if (!isPlainObject(body.day_results)) {
      return res.status(400).json({ ok: false, reason: "INVALID_DAY_RESULTS" });
    }

    const exerciseKeys = Object.keys(body.day_results);
    if (
      exerciseKeys.length === 0 ||
      !exerciseKeys.every(k => ALLOWED_EXERCISES.includes(k))
    ) {
      return res.status(400).json({
        ok: false,
        reason: "INVALID_EXERCISE_KEYS",
        keys: exerciseKeys
      });
    }

    const nowIso = new Date().toISOString();

    const payload = {
      lesson_id: body.lesson_id,
      klassencode,
      participant_id,
      completed_at: isNonEmptyString(body.completed_at)
        ? body.completed_at
        : nowIso,
      day_results: body.day_results,
      summary: isPlainObject(body.summary) ? body.summary : null
    };

    const row = {
      id: crypto.randomUUID(),
      payload,
      received_at: nowIso,
      source: "frontend",
      schema_version: 1
    };

    const { error } = await supabase
      .from("day_results")
      .insert(row);

    if (error) {
      console.error("SUPABASE ERROR:", error);
      return res.status(500).json({ ok: false, reason: "DB_INSERT_FAILED" });
    }

    return res.json({ ok: true });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ ok: false });
  }
});

// --------------------------------------------------
// GET /day-results  (NEU – für Dashboard)
// --------------------------------------------------
app.get("/day-results", async (req, res) => {
  try {
    const mode = String(req.query.mode || "classes").toLowerCase();

    const { data, error } = await supabase
      .from("day_results")
      .select("payload, received_at")
      .order("received_at", { ascending: false })
      .limit(1000);

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    // ---------- MODE: classes ----------
    if (mode === "classes") {
      const map = {};

      for (const r of data) {
        const klassencode = r.payload?.klassencode;
        if (!klassencode || !r.received_at) continue;

        if (!map[klassencode]) {
          map[klassencode] = {
            class_code: klassencode,
            last_seen: r.received_at,
            count: 1
          };
        } else {
          map[klassencode].count += 1;
          if (r.received_at > map[klassencode].last_seen) {
            map[klassencode].last_seen = r.received_at;
          }
        }
      }

      return res.json({
        ok: true,
        classes: Object.values(map).sort(
          (a, b) => new Date(b.last_seen) - new Date(a.last_seen)
        )
      });
    }

    // ---------- MODE: sessions ----------
    if (mode === "sessions") {
      const classCode = String(req.query.class || "").trim();

      const rows = data
        .filter(r => r.payload?.klassencode === classCode)
        .map(r => ({
          received_at: r.received_at,
          payload: r.payload
        }));

      return res.json({ ok: true, rows });
    }

    return res.status(400).json({ ok: false, error: "unknown mode" });

  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// --------------------------------------------------
app.get("/", (_, res) => res.send("OK"));
app.listen(process.env.PORT || 8000);
