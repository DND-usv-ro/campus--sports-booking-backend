const express = require("express");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");

const app = express();
const PORT = 5000;
const USERS_FILE = path.join(__dirname, "users.json");

app.use(cors());
app.use(express.json());

const readUsers = async () => {
  const data = await fs.readFile(USERS_FILE, "utf8");
  return JSON.parse(data);
};

const writeUsers = async (users) => {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
};

// GET: Listă utilizatori
app.get("/api/users", async (req, res) => {
  try {
    const users = await readUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Eroare la citirea utilizatorilor." });
  }
});

// POST: Autentificare (Login)
app.post("/api/login", async (req, res) => {
  try {
    const { email, parola } = req.body;
    const users = await readUsers();

    const user = users.find(
      (u) =>
        u.email.toLowerCase() === email.toLowerCase() && u.parola === parola,
    );

    if (!user) {
      return res.status(401).json({ error: "Email sau parolă incorectă." });
    }

    const { parola: _, ...userFaraParola } = user;
    res.json({ message: "Autentificare reușită!", user: userFaraParola });
  } catch (err) {
    res.status(500).json({ error: "Eroare la autentificare." });
  }
});

// POST: Înregistrare (Sign Up)
app.post("/api/register", async (req, res) => {
  try {
    const { nume, email, parola, rol } = req.body;

    if (!nume || !email || !parola) {
      return res
        .status(400)
        .json({ error: "Toate câmpurile sunt obligatorii." });
    }

    if (!email.endsWith(".ro")) {
      return res
        .status(400)
        .json({ error: "Folosește un email instituțional (.ro)." });
    }

    const users = await readUsers();
    const exists = users.some(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );

    if (exists) {
      return res
        .status(400)
        .json({ error: "Există deja un cont cu acest email." });
    }

    const newUser = {
      userId:
        users.length > 0 ? Math.max(...users.map((u) => u.userId)) + 1 : 1,
      nume,
      email,
      parola,
      rol: rol || "Student",
      rezervariSaptamana: 0,
    };

    users.push(newUser);
    await writeUsers(users);

    const { parola: _, ...userFaraParola } = newUser;
    res
      .status(201)
      .json({ message: "Cont creat cu succes!", user: userFaraParola });
  } catch (err) {
    res.status(500).json({ error: "Eroare la crearea contului." });
  }
});

app.listen(PORT, () => {
  console.log(`Backend-ul rulează pe http://localhost:${PORT}`);
});
