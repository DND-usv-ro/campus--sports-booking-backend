const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;

// Middleware (permite comunicarea între frontend și backend)
app.use(cors());
app.use(express.json());

// Endpoint-ul care CITESTE din users.json si trimite lista spre front
app.get("/api/users", (req, res) => {
  const filePath = path.join(__dirname, "users.json");

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Eroare la citirea fișierului de utilizatori." });
    }
    // Trimite date format JSON SPRE cine le cere (frontend-ul)
    res.json(JSON.parse(data));
  });
});

// Pornirea serverului
app.listen(PORT, () => {
  console.log(`Backend-ul rulează pe http://localhost:${PORT}`);
});
