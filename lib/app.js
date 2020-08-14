const express = require('express');
const cors = require('cors');
const client = require('./client.js');
const app = express();
const ensureAuth = require('./auth/ensure-auth');
const createAuthRoutes = require('./auth/create-auth-routes');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const authRoutes = createAuthRoutes();

// setup authentication routes to give user an auth token
// creates a /auth/signin and a /auth/signup POST route. 
// each requires a POST body with a .email and a .password
app.use('/auth', authRoutes);

// everything that starts with "/api" below here requires an auth token!
app.use('/api', ensureAuth);

// and now every request that has a token in the Authorization header will have a `req.userId` property for us to see who's talking
app.get('/api/test', (req, res) => {
  res.json({
    message: `in this proctected route, we get the user's id like so: ${req.userId}`
  });
});

const fakeUser = {
  id: 1,
  email: 'jermainesqueeze@rcr.org',
  hash: '54321',
};

app.get('/derby_players', async(req, res) => {
  const data = await client.query('SELECT derby_players.id, derby_name, jersey_number, is_retired, positions.position AS player_position FROM derby_players JOIN positions ON derby_players.position_id = positions.id');

  res.json(data.rows);
});

app.get('/positions', async(req, res) => {
  const data = await client.query(`
    SELECT * FROM positions`);

  res.json(data.rows);
});

app.get('/derby_players/:id', async(req, res) => {
  const derby_playerId = req.params.id;
  const data = await client.query(`
    SELECT derby_players.id, derby_name, jersey_number, is_retired, positions.position AS player_position
      FROM derby_players
      JOIN positions
      ON derby_players.position_id = positions.id
      WHERE derby_players.id=$1
  `, [derby_playerId]);

  res.json(data.rows[0]);
});

app.delete('/derby_players/:id', async(req, res) => {
  const derby_playerId = req.params.id;

  const data = await client.query('DELETE FROM derby_players WHERE derby_players.id=$1', [derby_playerId]);

  res.json(data.rows[0]);
});

app.put('/derby_players/:id', async(req, res) => {
  const derby_playerId = req.params.id;

  try {
    const updatedDerbyPlayer = {
      derby_name: req.body.derby_name,
      jersey_number: req.body.jersey_number,
      is_retired: req.body.is_retired,
      position_id: req.body.position_id
    };

    const data = await client.query(`
      UPDATE derby_players
        SET derby_name=$1, jersey_number=$2, is_retired=$3, position_id=$4
        WHERE derby_players.id = $5
        RETURNING *
    `, [updatedDerbyPlayer.derby_name, updatedDerbyPlayer.jersey_number, updatedDerbyPlayer.is_retired, updatedDerbyPlayer.position_id, derby_playerId]);

    res.json(data.rows[0]);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/derby_players', async(req, res) => {
  try {
    const newDerbyPlayer = {
      derby_name: req.body.derby_name,
      jersey_number: req.body.jersey_number,
      is_retired: req.body.is_retired,
      position_id: req.body.position_id,
      user_id: 1
    };

    const data = await client.query(`
    INSERT INTO derby_players(derby_name, jersey_number, is_retired, position_id, user_id)
    VALUES($1, $2, $3, $4, $5)
    RETURNING *
  `, [newDerbyPlayer.derby_name, newDerbyPlayer.jersey_number, newDerbyPlayer.is_retired, newDerbyPlayer.position_id, fakeUser.id]);

    res.json(data.rows[0]);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.use(require('./middleware/error'));

module.exports = app;
