const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./dbConnectExec.js");
const toolConfig = require("./config.js");

const app = express();
app.use(express.json());

app.listen(5000, () => {
  console.log("app is running on port 5000");
});

app.get("/", (req, res) => {
  res.send("API is running");
});

app.get("/events", (req, res) => {
  db.executeQuery(
    `SELECT * FROM event LEFT JOIN EventType ON eventtype.TypePK = event.typeFK`
  )
    .then((theResults) => {
      res.status(200).send(theResults);
    })
    .catch((myError) => {
      console.log(myError);
      res.status(500).send();
    });
});
