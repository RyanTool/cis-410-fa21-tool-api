const jwt = require("jsonwebtoken");
const toolConfig = require("../config.js");
const db = require("../dbConnectExec");

const auth = async (req, res, next) => {
  try {
    //1. Decode token

    let myToken = req.header("Authorization").replace("Bearer ", "");

    let decoded = jwt.verify(myToken, toolConfig.JWT);

    console.log("attendeePK: ", decoded.pk);

    let attendeePK = decoded.pk;

    //2. Compare token with database
    let query = `SELECT AttendeePK, FirstName, LastName, Email FROM Attendee WHERE AttendeePK=${attendeePK} and Token='${myToken}'`;

    let returnedUser = await db.executeQuery(query);

    //3. Save user information in the request
    if (returnedUser[0]) {
      req.contact = returnedUser[0];
      next();
    } else {
      return res.status(401).send("invalid credentials");
    }
  } catch (error) {
    return res.status(401).send("invalid credentials/error");
  }
};

module.exports = auth;
