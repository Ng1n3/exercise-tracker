const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Define schemas
const userSchema = new mongoose.Schema({
  username: String,
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: String,
  duration: Number,
  date: Date,
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Create a new user
app.post('/api/users', async (req, res) => {
  const newUser = new User({ username: req.body.username });
  try {
    const user = await newUser.save();
    res.json({ username: user.username, _id: user._id });
  } catch (err) {
    res.status(500).json({ error: 'Error creating new user' });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).select('username _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// Add an exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  try {
    const user = await User.findById(req.params._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const exercise = new Exercise({
      userId: user._id,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date(),
    });
    await exercise.save();
    res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Error adding exercise' });
  }
});

// Get user's exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const user = await User.findById(req.params._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    let query = Exercise.find({ userId: user._id });

    if (req.query.from) {
      query = query.where('date').gte(new Date(req.query.from));
    }
    if (req.query.to) {
      query = query.where('date').lte(new Date(req.query.to));
    }
    if (req.query.limit) {
      query = query.limit(parseInt(req.query.limit));
    }

    const exercises = await query.exec();

    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString(),
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching exercise log' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
