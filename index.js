const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const host = process.env.HOST;

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// Creating "User" Schema
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
  },
});

const ExerciseSchema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
  },
});

// Creating User Model from User Schema
const UserModel = mongoose.model("user", UserSchema);
const ExerciseModel = mongoose.model("exercise", ExerciseSchema);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/users", (req, res) => {
  UserModel.find({}).then((users) => {
    res.json(users);
  });
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const user_id = req.params._id;
  const { from, to, limit } = req.query;
  try {
    const user = await UserModel.findById(user_id);

    if (!user) {
      res.send("User not found");
      return;
    }
    let queryFilter = {
      user_id: user_id,
    };
    let dateQuery = {};

    if (from || to) {
      if (from) {
        dateQuery["$gte"] = new Date(from);
      }
      if (to) {
        dateQuery["$lte"] = new Date(to);
      }
      queryFilter.date = dateQuery;
    }

    const exercise = await ExerciseModel.find(queryFilter).limit(
      parseInt(limit) ?? 10
    );
    const log = exercise.map((data) => ({
      description: data.description,
      duration: data.duration,
      date: data.date.toDateString(),
    }));

    res.json({
      username: user.username,
      count: exercise.length,
      _id: user._id,
      log,
    });
  } catch (err) {
    console.error(err);
  }
});

app.post("/api/users", async (req, res) => {
  const username = req.body.username;
  const user = new UserModel({ username: username });
  try {
    await user.save();
    const resData = {
      username: user.username,
      _id: user._id,
    };
    res.json(resData);
  } catch (err) {
    console.error(err);
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const user_id = req.params._id;
  const { description, duration, date } = req.body;
  try {
    const user = await UserModel.findById(user_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    } else {
      const exercise = new ExerciseModel({
        user_id: user_id,
        description: description,
        duration: duration,
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
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const listener = app.listen(process.env.PORT || 3000, host, () => {
  console.log(
    `Your app is listening on http://${host}:${listener.address().port}`
  );
});
