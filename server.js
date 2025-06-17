const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
const USERS_FILE = path.join(__dirname, 'users.json');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ secret: 'supersecret', resave: false, saveUninitialized: true }));
app.use('/static', express.static(path.join(__dirname, 'static')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));
app.engine('html', require('ejs').renderFile);

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({}));
  }
  const data = fs.readFileSync(USERS_FILE);
  return JSON.parse(data);
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users));
}

app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.render('login.ejs', { error: null });
});

app.post('/login', (req, res) => {
  const username = req.body.username;
  if (!username) {
    return res.render('login.ejs', { error: 'Username required' });
  }
  const users = loadUsers();
  const stage = users[username] || 1;
  req.session.username = username;
  req.session.stage = stage;
  res.redirect('/game');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.get('/game', (req, res) => {
  const stage = req.session.stage || 1;
  const loggedIn = !!req.session.username;
  res.render('game.ejs', { stage, logged_in: loggedIn });
});

app.post('/save_stage', (req, res) => {
  if (req.session.username) {
    const newStage = parseInt(req.body.stage || 1, 10);
    req.session.stage = newStage;
    const users = loadUsers();
    users[req.session.username] = newStage;
    saveUsers(users);
    return res.json({ status: 'saved' });
  }
  res.json({ status: 'ignored' });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
