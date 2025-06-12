const sql = require("mssql");

// Configuration for SQL Server connection
const config = {
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    enableArithAbort: true,
  },
  connectionTimeout: 60000, // 60 seconds to connect
  requestTimeout: 120000, // 2 minutes for queries
};

let pool;

// Connecting to SQL Server and creating a connection pool
async function getPool() {
  if (!pool) {
    console.log("[OMOWICE-API] Connecting to SQL Server...");
    try {
      pool = await sql.connect(config);
      console.log("[OMOWICE-API] Connected to SQL Server");
    } catch (err) {
      console.error("[OMOWICE-API] SQL connection error:", err);
      throw err;
    }
  }
  return pool;
}

module.exports = { getPool };
