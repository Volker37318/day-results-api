import express from "express";

const app = express();
app.use(express.json({ limit: "1mb" }));

app.post("/day-results", (req, res) => {
  console.log("Received day results:");
  console.log(JSON.stringify(req.body, null, 2));

  // später: Supabase-Insert
  res.status(200).json({ ok: true });
});

app.get("/", (_req, res) => {
  res.send("day-results-api running");
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log("Server listening on port", PORT);
});
