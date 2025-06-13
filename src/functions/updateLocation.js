const { getPool } = require("../sqlClient");

module.exports = async function (context, req) {
  try {
    // Check if the required locationId is provided in the route parameters
    const locationId = context.params.locationId;
    console.log("Location ID received:", locationId);
    if (!locationId) {
      return {
        status: 400,
        jsonBody: { error: "Location ID is required in the URL parameter" }
      };
    }

    // Get the update data from the request body
    const updateData = context.params.body;
    console.log("Update data received:", updateData);
    if (!updateData) {
      return {
        status: 400,
        jsonBody: { error: "Request body is empty" }
      };
    }

    // Connect to the database
    const pool = await getPool();

    // First check if the location exists
    const checkResult = await pool.request()
      .input('id', locationId)
      .query('SELECT COUNT(1) AS count FROM LOCATIONS WHERE id = @id');

    if (checkResult.recordset[0].count === 0) {
      return {
        status: 404,
        jsonBody: { error: "Location not found" }
      };
    }

    // Start a transaction
    const transaction = pool.transaction();
    await transaction.begin();

    try {      // Validate required fields for location update
      if (!updateData.name || !updateData.address || !updateData.googleMapsUrl || !updateData.openingHours) {
        return {
          status: 400,
          jsonBody: { error: "Required location fields are missing (name, address, googleMapsUrl, openingHours)" }
        };
      }

      // Update LOCATIONS table with all fields
      await transaction.request()
        .input('id', locationId)
        .input('name', updateData.name)
        .input('address', updateData.address)
        .input('googleMapsUrl', updateData.googleMapsUrl)
        .input('openingHours', updateData.openingHours)
        .query(`
          UPDATE LOCATIONS SET 
            name = @name,
            address = @address,
            google_maps_url = @googleMapsUrl,
            opening_hours = @openingHours
          WHERE id = @id
        `);
          // Make sure location parameters are provided
      if (!updateData.parameters) {
        return {
          status: 400,
          jsonBody: { error: "Location parameters are required" }
        };
      }
      
      const params = updateData.parameters;
      
      // Validate required fields for parameters
      if (params.avgDevicesPerPerson === undefined || 
          params.avgSimsPerPerson === undefined || 
          params.wifiUsageRatio === undefined || 
          params.cellularUsageRatio === undefined || 
          params.updateInterval === undefined) {
        return {
          status: 400,
          jsonBody: { 
            error: "All parameter fields are required (avgDevicesPerPerson, avgSimsPerPerson, wifiUsageRatio, cellularUsageRatio, updateInterval)" 
          }
        };
      }
      
      // Check if the parameters record exists first
      const paramCheckResult = await transaction.request()
        .input('locationId', locationId)
        .query('SELECT COUNT(1) AS count FROM LOCATION_PARAMETERS WHERE location_id = @locationId');
      
      const paramExists = paramCheckResult.recordset[0].count > 0;
      
      if (paramExists) {
        // Update existing parameters with all fields
        await transaction.request()
          .input('locationId', locationId)
          .input('avgDevicesPerPerson', params.avgDevicesPerPerson)
          .input('avgSimsPerPerson', params.avgSimsPerPerson)
          .input('wifiUsageRatio', params.wifiUsageRatio)
          .input('cellularUsageRatio', params.cellularUsageRatio)
          .input('updateInterval', params.updateInterval)
          .query(`
            UPDATE LOCATION_PARAMETERS SET 
              avg_devices_per_person = @avgDevicesPerPerson,
              avg_sims_per_person = @avgSimsPerPerson,
              wifi_usage_ratio = @wifiUsageRatio,
              cellular_usage_ratio = @cellularUsageRatio,
              update_interval = @updateInterval,
              last_updated = CURRENT_TIMESTAMP
            WHERE location_id = @locationId
          `);
      } else {
        // Insert new parameter record with all required fields
        await transaction.request()
          .input('locationId', locationId)
          .input('avgDevicesPerPerson', params.avgDevicesPerPerson)
          .input('avgSimsPerPerson', params.avgSimsPerPerson)
          .input('wifiUsageRatio', params.wifiUsageRatio)
          .input('cellularUsageRatio', params.cellularUsageRatio)
          .input('updateInterval', params.updateInterval)
          .query(`
            INSERT INTO LOCATION_PARAMETERS 
              (location_id, avg_devices_per_person, avg_sims_per_person, wifi_usage_ratio, cellular_usage_ratio, update_interval)
            VALUES 
              (@locationId, @avgDevicesPerPerson, @avgSimsPerPerson, @wifiUsageRatio, @cellularUsageRatio, @updateInterval)
          `);
      }

      // Commit the transaction
      await transaction.commit();

      return {
        status: 200,
        jsonBody: { 
          message: "Location updated successfully",
          locationId: locationId 
        }
      };
    } catch (err) {
      // Rollback the transaction if any error occurs
      await transaction.rollback();
      throw err; // Re-throw to be caught by the outer catch block
    }
  } catch (err) {
    console.error("[OMOWICE-API] DB error:", err);
    
    // Handle foreign key error
    if (err.number === 547) {
      return {
        status: 400,
        jsonBody: { error: "Invalid reference in the data provided" }
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
