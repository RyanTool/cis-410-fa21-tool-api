const sql = require("mssql");
const toolConfig = require("./config.js");
const config = {
  user: toolConfig.DB.user,
  password: toolConfig.DB.password,
  server: toolConfig.DB.server,
  database: toolConfig.DB.database,
};

async function executeQuery(aQuery) {
  let connection = await sql.connect(config);
  let result = await connection.query(aQuery);
  return result.recordset;
}

module.exports = { executeQuery: executeQuery };
