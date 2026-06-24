const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const indexRoutes = require("./routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Serve static assets from 'public' directory
app.use(express.static(path.join(__dirname, "public")));

app.use("/api", indexRoutes);

module.exports = app;
