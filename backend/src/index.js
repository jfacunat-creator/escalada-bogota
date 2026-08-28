require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const app     = express();
const PORT    = process.env.PORT || 3001;

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(u => u.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o)) || origin.includes('vercel.app')) {
      cb(null, true);
    } else {
      cb(null, true);
    }
  },
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "Escalada Bogotá API", version: "1.4.0", timestamp: new Date().toISOString() });
});

app.use("/api/auth",          require("./routes/auth"));
app.use("/api/catalogos",     require("./routes/catalogos"));
app.use("/api/grupos",        require("./routes/grupos"));        // antes: /api/cohortes
app.use("/api/sesiones",      require("./routes/sesiones"));
app.use("/api/asistencia",    require("./routes/asistencia"));
app.use("/api/contenido",     require("./routes/contenido"));
app.use("/api/evaluaciones",  require("./routes/evaluaciones"));
app.use("/api/inscripciones", require("./routes/inscripciones"));
app.use("/api/pagos",         require("./routes/pagos"));
app.use("/api/rrhh",          require("./routes/rrhh"));
app.use("/api/dashboard",     require("./routes/dashboard"));
app.use("/api/contabilidad",  require("./routes/contabilidad"));
app.use("/api/plan",          require("./routes/plan"));

const webhooks = require("./routes/webhooks");
app.use("/api/webhooks", webhooks);
app.use("/api/pagos",    webhooks);

app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

app.listen(PORT, () => {
  console.log(`\n  Escalada Bogotá API v1.4.0 · Puerto ${PORT}\n`);
});
