require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Note = require("./models/Note");
const uploadRoute = require("./routes/uploadRoute");
const analyzeRoute = require("./routes/analyzeRoute");
const authRoute = require("./routes/authRoute");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(uploadRoute);
app.use(analyzeRoute);
app.use(authRoute);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB successfully"))
  .catch((err) => console.error("MongoDB connection error:", err.message));

app.get("/", (req, res) => {
  res.send("Hello World — your backend server is running!");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is healthy" });
});

app.post("/notes", async (req, res) => {
  try {
    const newNote = await Note.create({ text: req.body.text });
    res.status(201).json(newNote);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/notes", async (req, res) => {
  try {
    const notes = await Note.find();
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});