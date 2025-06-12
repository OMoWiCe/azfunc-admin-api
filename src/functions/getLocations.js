const { getPool } = require("../sqlClient");

module.exports = async function (context, req) {
  try {
    // Getting details of all the locations
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id AS locationId, name, address, google_maps_url AS googleMapsUrl, opening_hours AS openingHours FROM LOCATIONS
    `);

    return {
      status: 200,
      jsonBody: result.recordset,
    };
  } catch (err) {
    console.error("[OMOWICE-API] DB error:", err);
    // Handle Timeout error specifically
    if (err.code === "ETIMEOUT") {
      return {
        status: 500,
        jsonBody: {
          error: "Database connection timeout. Try again in few seconds!",
        },
      };
    }
    // Handle other errors
    return {
      status: 500,
      jsonBody: { error: "Internal server error" },
    };
  }
};
