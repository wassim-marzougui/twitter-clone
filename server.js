const express = require('express');
const crypto  = require('crypto');
const bcrypt  = require('bcrypt');
const db      = require('./db');

const app = express();
app.use(express.json());
app.use(express.static('pub'));

// POST /signin
app.post('/signin', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Champs manquants' });
  try {
    const hash = await bcrypt.hash(password, 10);
    db.prepare('INSERT INTO users (username, password) VALUES (?, ?)')
      .run(username, hash);
    res.json({ ok: true });
  } catch (e) {
    res.status(409).json({ error: 'Nom d\'utilisateur déjà pris' });
  }
});

// POST /login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?')
                 .get(username);
  if (!user) return res.status(401).json({ error: 'Identifiants incorrects' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Identifiants incorrects' });

  const sessionId = crypto.randomUUID();
  db.prepare('INSERT INTO sessions (id, username, created) VALUES (?, ?, ?)')
    .run(sessionId, username, new Date().toISOString());
  res.json({ ok: true, sessionId, username });
});

// GET /messages
app.get('/messages', (req, res) => {
  const limit  = parseInt(req.query.limit)  || 20;
  const offset = parseInt(req.query.offset) || 0;
  const rows = db.prepare(
    'SELECT * FROM messages ORDER BY id DESC LIMIT ? OFFSET ?'
  ).all(limit, offset);
  res.json(rows);
});

// POST /post
app.post('/post', (req, res) => {
  const { sessionId, content } = req.body;
  if (!sessionId || !content)
    return res.status(400).json({ error: 'Champs manquants' });
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?')
                    .get(sessionId);
  if (!session) return res.status(401).json({ error: 'Session invalide' });
  db.prepare('INSERT INTO messages (author, content, date) VALUES (?, ?, ?)')
    .run(session.username, content, new Date().toISOString());
  res.json({ ok: true });
});

// Port dynamique fourni par Render (ou 3000 en local)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur lancé sur le port ${PORT}`));