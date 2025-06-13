// src/functions/addLocation.js
const { getPool } = require("../sqlClient");

module.exports = async function addLocation(request, context) {
  try {
    // Parse incoming JSON body
    const location = await request.json();
    context.log("Location data received:", location);

    const p = location.parameters || {};
    if (
      !location.id ||
      !location.name ||
      !location.address ||
      !location.googleMapsUrl ||
      !location.openingHours ||
      p.avgDevicesPerPerson == null ||
      p.avgSimsPerPerson == null ||
      p.wifiUsageRatio == null ||
      p.cellularUsageRatio == null ||
      p.updateInterval == null
    ) {
      return {
        status: 400,
        jsonBody: {
          error:
            "Missing required fields: id, name, address, googleMapsUrl, openingHours, parameters(avgDevicesPerPerson, avgSimsPerPerson, wifiUsageRatio, cellularUsageRatio, updateInterval)",
        },
      };
    }

    const pool = await getPool();
    const trx = pool.transaction();
    await trx.begin();

    try {
      await trx
        .request()
        .input("id", location.id)
        .input("name", location.name)
        .input("address", location.address)
        .input("googleMapsUrl", location.googleMapsUrl)
        .input("openingHours", location.openingHours).query(`
          INSERT INTO LOCATIONS (id, name, address, google_maps_url, opening_hours)
          VALUES (@id, @name, @address, @googleMapsUrl, @openingHours)
        `);

      await trx
        .request()
        .input("locationId", location.id)
        .input("avgDevicesPerPerson", p.avgDevicesPerPerson)
        .input("avgSimsPerPerson", p.avgSimsPerPerson)
        .input("wifiUsageRatio", p.wifiUsageRatio)
        .input("cellularUsageRatio", p.cellularUsageRatio)
        .input("updateInterval", p.updateInterval).query(`
          INSERT INTO LOCATION_PARAMETERS
            (location_id, avg_devices_per_person, avg_sims_per_person, wifi_usage_ratio, cellular_usage_ratio, update_interval)
          VALUES
            (@locationId, @avgDevicesPerPerson, @avgSimsPerPerson, @wifiUsageRatio, @cellularUsageRatio, @updateInterval)
        `);

      await trx.commit();

      return {
        status: 201,
        jsonBody: {
          message: "Location added successfully",
          locationId: location.id,
        },
      };
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  } catch (err) {
    context.log.error("[OMOWICE-API] Error:", err);
    if (err.number === 2627 || err.number === 2601) {
      return {
        status: 409,
        jsonBody: { error: "Location with this ID already exists" },
      };
    }
    if (err.number === 547) {
      return {
        status: 400,
        jsonBody: { error: "Invalid reference in the data provided" },
      };
    }
    if (err.code === "ETIMEOUT") {
      return {
        status: 500,
        jsonBody: { error: "Database connection timeout. Try again later." },
      };
    }
    return { status: 500, jsonBody: { error: "Internal server error" } };
  }
};
