const { getPool } = require("../sqlClient");

module.exports = async function (context, req) {
  try {
    // Check if required fields are provided in the request body
    const location = req.body;
    console.log("Location data received:", location);

    if (
      !location ||
      !location.id ||
      !location.name ||
      !location.address ||
      !location.googleMapsUrl ||
      !location.openingHours ||
      !location.parameters ||
      !location.parameters.avgDevicesPerPerson ||
      !location.parameters.avgSimsPerPerson ||
      !location.parameters.wifiUsageRatio ||
      !location.parameters.cellularUsageRatio ||
      !location.parameters.updateInterval
    ) {
      return {
        status: 400,
        jsonBody: {
          error:
            "Missing required fields. Please provide id, name, address, googleMapsUrl, openingHours, and parameters (avgDevicesPerPerson, avgSimsPerPerson, wifiUsageRatio, cellularUsageRatio, updateInterval)",
        },
      };
    }

    // Connect to the database
    const pool = await getPool();

    // Start a transaction to ensure both tables are updated consistently
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Insert into LOCATIONS table
      await transaction
        .request()
        .input("id", location.id)
        .input("name", location.name)
        .input("address", location.address)
        .input("googleMapsUrl", location.googleMapsUrl)
        .input("openingHours", location.openingHours).query(`
          INSERT INTO LOCATIONS (id, name, address, google_maps_url, opening_hours)
          VALUES (@id, @name, @address, @googleMapsUrl, @openingHours)
        `);

      // Insert into LOCATION_PARAMETERS table
      await transaction
        .request()
        .input("locationId", location.id)
        .input("avgDevicesPerPerson", location.parameters.avgDevicesPerPerson)
        .input("avgSimsPerPerson", location.parameters.avgSimsPerPerson)
        .input("wifiUsageRatio", location.parameters.wifiUsageRatio)
        .input("cellularUsageRatio", location.parameters.cellularUsageRatio)
        .input("updateInterval", location.parameters.updateInterval).query(`
          INSERT INTO LOCATION_PARAMETERS 
            (location_id, avg_devices_per_person, avg_sims_per_person, wifi_usage_ratio, cellular_usage_ratio, update_interval)
          VALUES 
            (@locationId, @avgDevicesPerPerson, @avgSimsPerPerson, @wifiUsageRatio, @cellularUsageRatio, @updateInterval)
        `);

      // Commit the transaction
      await transaction.commit();

      return {
        status: 201, // Created
        jsonBody: {
          message: "Location added successfully",
          locationId: location.id,
        },
      };
    } catch (err) {
      // Rollback the transaction if any error occurs
      await transaction.rollback();
      throw err; // Re-throw to be caught by the outer catch block
    }
  } catch (err) {
    console.error("[OMOWICE-API] DB error:", err);

    // Handle duplicate key error
    if (err.number === 2627 || err.number === 2601) {
      return {
        status: 409, // Conflict
        jsonBody: { error: "Location with this ID already exists" },
      };
    }

    // Handle foreign key error
    if (err.number === 547) {
      return {
        status: 400,
        jsonBody: { error: "Invalid reference in the data provided" },
      };
    }

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
