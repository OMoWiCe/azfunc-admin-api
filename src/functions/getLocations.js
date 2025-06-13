// src/functions/getLocations.js
const { getPool } = require("../sqlClient");

module.exports = async function getLocations(request, context) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        L.id AS locationId, 
        L.name, 
        L.address, 
        L.google_maps_url AS googleMapsUrl, 
        L.opening_hours AS openingHours,
        L.created_at AS createdAt,
        LP.avg_devices_per_person AS avgDevicesPerPerson,
        LP.avg_sims_per_person AS avgSimsPerPerson,
        LP.wifi_usage_ratio AS wifiUsageRatio,
        LP.cellular_usage_ratio AS cellularUsageRatio,
        LP.update_interval AS updateInterval,
        LP.last_updated AS lastRecordUpdated,
        (SELECT MAX(date) FROM MAIN_METRICS MM WHERE MM.location_id = L.id) AS lastMetricUpdated
      FROM LOCATIONS L
      LEFT JOIN LOCATION_PARAMETERS LP ON L.id = LP.location_id
    `);

    return {
      status: 200,
      jsonBody: result.recordset,
    };
  } catch (err) {
    context.log.error("[OMOWICE-API] DB error in getLocations:", err);

    if (err.code === "ETIMEOUT") {
      return {
        status: 500,
        jsonBody: {
          error: "Database connection timeout. Try again in a few seconds!",
        },
      };
    }

    return {
      status: 500,
      jsonBody: { error: "Internal server error" },
    };
  }
};
