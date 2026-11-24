const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 5000;
const USERS_FILE = path.join(__dirname, 'users.json');
const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');

app.use(cors());
app.use(express.json());

const readJsonFile = async (filePath) => {
  const data = await fs.readFile(filePath, 'utf8');
  return JSON.parse(data);
};

const writeJsonFile = async (filePath, content) => {
  await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf8');
};

// GET: Listă utilizatori
app.get('/api/users', async (req, res) => {
  try {
    const users = await readJsonFile(USERS_FILE);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Eroare la citirea utilizatorilor.' });
  }
});

// POST: Autentificare (Login)
app.post('/api/login', async (req, res) => {
  try {
    const { email, parola } = req.body;
    const users = await readJsonFile(USERS_FILE);

    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.parola === parola
    );

    if (!user) {
      return res.status(401).json({ error: 'Email sau parolă incorectă.' });
    }

    const { parola: _, ...userFaraParola } = user;
    res.json({ message: 'Autentificare reușită!', user: userFaraParola });
  } catch (err) {
    res.status(500).json({ error: 'Eroare la autentificare.' });
  }
});

// POST: Înregistrare (Sign Up)
app.post('/api/register', async (req, res) => {
  try {
    const { nume, email, parola, rol } = req.body;

    if (!nume || !email || !parola) {
      return res.status(400).json({ error: 'Toate câmpurile sunt obligatorii.' });
    }

    if (!email.endsWith('.ro')) {
      return res.status(400).json({ error: 'Folosește un email instituțional (.ro).' });
    }

    const users = await readJsonFile(USERS_FILE);
    const exists = users.some((u) => u.email.toLowerCase() === email.toLowerCase());

    if (exists) {
      return res.status(400).json({ error: 'Există deja un cont cu acest email.' });
    }

    const newUser = {
      userId: users.length > 0 ? Math.max(...users.map((u) => u.userId)) + 1 : 1,
      nume,
      email,
      parola,
      rol: rol || 'Student',
      rezervariSaptamana: 0,
    };

    users.push(newUser);
    await writeJsonFile(USERS_FILE, users);

    const { parola: _, ...userFaraParola } = newUser;
    res.status(201).json({ message: 'Cont creat cu succes!', user: userFaraParola });
  } catch (err) {
    res.status(500).json({ error: 'Eroare la crearea contului.' });
  }
});

// GET: Toate rezervările (pentru Panoul de Administrare)
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await readJsonFile(BOOKINGS_FILE);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Eroare la citirea rezervărilor.' });
  }
});

// PATCH: Anulare rezervare de către Admin
app.patch('/api/bookings/:id/cancel', async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const bookings = await readJsonFile(BOOKINGS_FILE);
    const bookingIndex = bookings.findIndex((b) => b.bookingId === bookingId);

    if (bookingIndex === -1) {
      return res.status(404).json({ error: 'Rezervarea nu a fost găsită.' });
    }

    bookings[bookingIndex].status = 'Anulata';
    await writeJsonFile(BOOKINGS_FILE, bookings);

    res.json({
      message: 'Rezervarea a fost anulată cu succes.',
      booking: bookings[bookingIndex],
    });
  } catch (err) {
    res.status(500).json({ error: 'Eroare la anularea rezervării.' });
  }
});


// POST: Creare rezervare nouă (Student / Profesor)
app.post('/api/bookings', async (req, res) => {
  try {
    const {
      userId,
      numeUtilizator,
      emailUtilizator,
      facilityId,
      numeFacilitate,
      locatie,
      data,
      intervalOrar,
    } = req.body;

    if (!userId || !facilityId || !data || !intervalOrar) {
      return res.status(400).json({ error: 'Toate câmpurile rezervării sunt obligatorii.' });
    }

    const bookings = await readJsonFile(BOOKINGS_FILE);

    // 1. Verificăm dacă intervalul este deja ocupat la acea facilitate și dată
    const isOccupied = bookings.some(
      (b) =>
        b.facilityId === facilityId &&
        b.data === data &&
        b.intervalOrar === intervalOrar &&
        b.status === 'Activa'
    );

    if (isOccupied) {
      return res.status(409).json({ error: 'Acest interval orar este deja ocupat.' });
    }

    // 2. Verificăm limita de maxim 3 rezervări active pe săptămână pentru utilizator
    const getWeekBounds = (dateString) => {
      const d = new Date(dateString + 'T00:00:00');
      const day = d.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(d);
      monday.setDate(d.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0],
      };
    };

    const { start, end } = getWeekBounds(data);
    const weeklyActiveBookings = bookings.filter(
      (b) =>
        b.userId === userId &&
        b.status === 'Activa' &&
        b.data >= start &&
        b.data <= end
    );

    if (weeklyActiveBookings.length >= 3) {
      return res.status(400).json({
        error: 'Ai atins limita de maxim 3 rezervări active pe săptămână.',
      });
    }

    // 3. Salvăm rezervarea nouă în bookings.json
    const newBooking = {
      bookingId: bookings.length > 0 ? Math.max(...bookings.map((b) => b.bookingId)) + 1 : 1,
      userId,
      numeUtilizator,
      emailUtilizator,
      facilityId,
      numeFacilitate,
      locatie,
      data,
      intervalOrar,
      status: 'Activa',
    };

    bookings.push(newBooking);
    await writeJsonFile(BOOKINGS_FILE, bookings);

    res.status(201).json({
      message: 'Rezervarea a fost confirmată!',
      booking: newBooking,
    });
  } catch (err) {
    res.status(500).json({ error: 'Eroare la salvarea rezervării.' });
  }
});
app.listen(PORT, () => {
  console.log(`Backend-ul rulează pe http://localhost:${PORT}`);
});