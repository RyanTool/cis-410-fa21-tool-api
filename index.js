const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const db = require("./dbConnectExec.js");
const toolConfig = require("./config.js");

const app = express();
const auth = require("./middleware/authenticate.js");

app.use(express.json());

app.use(cors());

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`app is running on port ${PORT}`);
});

app.get("/", (req, res) => {
  res.send(`API is running on port ${PORT}`);
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

app.get("/events/:pk", (req, res) => {
  let pk = req.params.pk;
  let myQuery = `SELECT * FROM Event LEFT JOIN EventType ON EventType.TypePK = Event.TypeFK WHERE TypePK = ${pk}`;

  db.executeQuery(myQuery)
    .then((result) => {
      if (result[0]) {
        res.send(result[0]);
      } else {
        res.status(404).send(`bad request`);
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send();
    });
});

app.post("/attendees/login", async (req, res) => {
  //1. Data Validation
  let email = req.body.Email;
  let password = req.body.Password;

  if (!email || !password) {
    return res.status(400).send("Bad request");
  }

  //2. Check that user exists in database
  let query = `SELECT * FROM Attendee WHERE Email = '${email}'`;

  let result;

  try {
    result = await db.executeQuery(query);
  } catch (myError) {
    console.log("error in /attendees/login", myError);
    return res.status(500).send();
  }

  if (!result[0]) {
    return res.status(401).send("Invalid user credentials");
  }

  //3. Check password

  let user = result[0];

  if (!bcrypt.compareSync(password, user.Password)) {
    return res.status(401).send("Invalid user credentials");
  }

  //4. Generate token if u&p check out
  let token = jwt.sign({ pk: user.AttendeePK }, toolConfig.JWT, {
    expiresIn: "60 minutes",
  });
  //5. Save token in database and send response back

  let setTokenQuery = `UPDATE Attendee SET Token = '${token}' WHERE AttendeePK = ${user.AttendeePK}`;

  try {
    await db.executeQuery(setTokenQuery);

    res.status(200).send({
      Token: token,
      user: {
        FirstName: user.FirstName,
        LastName: user.LastName,
        Email: user.Email,
        AttendeePK: user.AttendeePK,
      },
    });
  } catch (myError) {
    res.status(500).send();
  }
});

app.post("/attendees", async (req, res) => {
  let FirstName = req.body.FirstName;
  let LastName = req.body.LastName;
  let Email = req.body.Email;
  let Password = req.body.Password;

  if (!FirstName || !LastName || !Email || !Password) {
    return res.status(400).send("Bad request");
  }

  FirstName = FirstName.replace("'", "''");
  LastName = LastName.replace("'", "''");

  let myQuery = `SELECT * FROM Attendee WHERE Email = '${Email}'`;
  let existingUser = await db.executeQuery(myQuery);

  if (existingUser[0]) {
    return res.status(409).send("Duplicate Email");
  }

  let hashedPassword = bcrypt.hashSync(Password);

  let insertQuery = `INSERT INTO Attendee(FirstName, LastName, Email, Password) VALUES('${FirstName}', '${LastName}', '${Email}', '${hashedPassword}')`;
  db.executeQuery(insertQuery)
    .then(() => {
      res.status(201).send();
    })
    .catch((err) => {
      console.log("error in post /attendee", err);
      res.status(500).send();
    });
});

app.get("/attendees/me", auth, (req, res) => {
  res.send(req.contact);
});

app.post("/attendees/logout", auth, (req, res) => {
  let query = `UPDATE Attendee SET Token = NULL WHERE AttendeePK = ${req.contact.AttendeePK}`;

  db.executeQuery(query)
    .then(() => {
      res.status(200).send();
    })
    .catch((err) => {
      console.log("error in POST /attendees/logout", err);
      res.status(500).send();
    });
});

app.post("/entry", auth, async (req, res) => {
  try {
    let EventFK = req.body.EventFK;
    let EntryTime = req.body.EntryTime;

    if (!EventFK || !EntryTime) {
      return res.status(400).send("bad request");
    }

    let insertQuery = `INSERT INTO Entry(EntryTime, AttendeeFK, EventFK) OUTPUT inserted.EntryTime, inserted.AttendeeFK, inserted.EventFK VALUES('${EntryTime}','${req.contact.AttendeePK}','${EventFK}')`;

    let insertedEntry = await db.executeQuery(insertQuery);

    res.status(201).send(insertedEntry[0]);
  } catch (err) {
    console.log("error in POST /entries", err);
    res.status(500).send();
  }
});

app.post("/entry/me", auth, async (req, res) => {
  try {
    let AttendeePK = req.contact.AttendeePK;

    let myQuery = `SELECT * FROM Entry WHERE AttendeeFK = ${AttendeePK}`;
    let returnedEntries = await db.executeQuery(myQuery);

    if (!returnedEntries[0]) {
      return res.status(400).send("no entires found for user");
    } else {
      return res.status(200).send(returnedEntries);
    }
  } catch (err) {
    console.log("error in POST /entry/me", err);
    res.status(500).send();
  }
});
