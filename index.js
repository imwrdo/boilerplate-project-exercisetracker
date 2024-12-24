const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
require('dotenv').config()
app.use(cors())

const mongoose = require('mongoose');
mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'))

// Schemas
const userSchema = new mongoose.Schema({
  username: String
})

const exerciseSchema = new mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: String
})

const logSchema = new mongoose.Schema({
  username: String,
  count: Number,
  log: [
    {
      description: String,
      duration: Number,
      date: String
    }
  ]
})

// Models
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);
const Log = mongoose.model('Log', logSchema);

app.use(express.static('public'))
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', async (req, res)=> {
  const users = await User.find();
  res.json([...users])
});

app.post('/api/users', async (req, res) => {
  const user = await User.create({username: req.body.username});
  await Log.create({ _id: new mongoose.Types.ObjectId(user._id), username: req.body.username, count: 0, log: [] })
  res.json({ username: req.body.username, _id: user._id })

});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const user = await User.findById(req.params._id);

  if (!user) {
    throw new Error('User not found');
  }

  if(!req.body.date){
    req.body.date = new Date().toDateString();
  } 
    
  const exercise = await Exercise.create({
     username: user.username, 
     description: req.body.description, 
     duration: req.body.duration, 
     date: req.body.date 
    });
    await Log.findOneAndUpdate(
      { _id: user._id }, 
      { $inc: { count: 1 }, $push: { log: exercise } })
  res.status(200).json({
    _id: user._id, 
    username: user.username, 
    description: exercise.description, 
    duration: exercise.duration, 
    date: exercise.date 
  });
});

app.get("/api/users/:id/logs", async (req, res) => {
  const { from, to, limit } = req.query;

  if (from && to) {
    const logs = await Log.findOne({ _id: req.params.id }).then((data) => {
      data.log = data.log.filter((log) => {
        if (log.date > from && log.date < to) {
          log.date = new Date(log.date).toDateString()
          return log
        }
      }).slice(0, limit ? limit : data.log.length)
      return data
    })

    return res.status(200).json(logs)
  }

  const logs = await Log.findOne({ _id: req.params.id }).then((logs) => {
    logs.log = logs.log.map((log) => {
      log.date = new Date(log.date).toDateString()
      return log
    }).slice(0, limit ? limit : logs.log.length)
    return logs;
  })

  res.status(200).json(logs)
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
