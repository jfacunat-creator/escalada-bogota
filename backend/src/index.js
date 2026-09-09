require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Escalada Bogotá API",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    fix: "cohorte→grupo corregido",
  });
});

// Rutas
app.use("/api/auth", require("./routes/auth"));
app.use("/api/catalogos", require("./routes/catalogos"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/grupos", require("./routes/grupos"));
app.use("/api/escaladores", require("./routes/escaladores"));
app.use("/api/entrenadores", require("./routes/entrenadores"));
app.use("/api/inscripciones", require("./routes/inscripciones"));
app.use("/api/pagos", require("./routes/pagos"));
app.use("/api/sesiones", require("./routes/sesiones"));
app.use("/api/asistencia", require("./routes/asistencia"));

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

app.listen(PORT, () => {
  console.log(`\n  Escalada Bogotá API v2.0.0 · Puerto ${PORT}`);
  console.log(`  Fix aplicado: cohorte → grupo en todas las queries\n`);
});
