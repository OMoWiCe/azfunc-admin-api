const { getPool } = require("../sqlClient");

module.exports = async function (context, req) {
  try {
    // Check if the required locationId is provided in the route parameters
    const locationId = req.params.locationId;
    if (!locationId) {
      return {
        status: 400,
        jsonBody: { error: "Location ID is required in the URL parameter" }
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

    try {      // Delete from ACTIVE_DEVICES table
      await transaction.request()
        .input('locationId', locationId)
        .query('DELETE FROM ACTIVE_DEVICES WHERE location_id = @locationId');

      // Delete from PENDING_DEACTIVATIONS table
      await transaction.request()
        .input('locationId', locationId)
        .query('DELETE FROM PENDING_DEACTIVATIONS WHERE location_id = @locationId');

      // Delete from LOCATION_PARAMETERS table
      await transaction.request()
        .input('locationId', locationId)
        .query('DELETE FROM LOCATION_PARAMETERS WHERE location_id = @locationId');
      
      // Check if there are any related MAIN_METRICS records before proceeding
      const metricsCheck = await transaction.request()
        .input('locationId', locationId)
        .query('SELECT COUNT(1) as count FROM MAIN_METRICS WHERE location_id = @locationId');
      
      // If metrics records exist for this location, delete them
      if (metricsCheck.recordset[0].count > 0) {
        await transaction.request()
          .input('locationId', locationId)
          .query('DELETE FROM MAIN_METRICS WHERE location_id = @locationId');
      }

      // Then delete from LOCATIONS table (parent table)
      await transaction.request()
        .input('id', locationId)
        .query('DELETE FROM LOCATIONS WHERE id = @id');

      // Commit the transaction
      await transaction.commit();

      return {
        status: 200,
        jsonBody: { message: "Location and associated data deleted successfully" }
      };
    } catch (err) {
      // Rollback the transaction if any error occurs
      await transaction.rollback();
      throw err; // Re-throw to be caught by the outer catch block
    }
  } catch (err) {
    console.error("[OMOWICE-API] DB error:", err);
    
    // Handle foreign key constraint errors
    if (err.number === 547) {
      return {
        status: 409, // Conflict
        jsonBody: { error: "Cannot delete this location because it has related records. Delete those records first." }
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
