// src/functions/deleteLocation.js
const { getPool } = require("../sqlClient");

module.exports = async function deleteLocation(request, context) {
  try {
    const locationId = request.params.locationId;
    if (!locationId) {
      return {
        status: 400,
        jsonBody: { error: "Location ID is required in the URL parameter" },
      };
    }

    const pool = await getPool();

    // Ensure the location exists
    const checkResult = await pool
      .request()
      .input("id", locationId)
      .query("SELECT COUNT(1) AS count FROM LOCATIONS WHERE id = @id");

    if (checkResult.recordset[0].count === 0) {
      return {
        status: 404,
        jsonBody: { error: "Location not found" },
      };
    }

    const trx = pool.transaction();
    await trx.begin();

    try {
      // Delete dependent records in one transaction
      const t = trx.request().input("locationId", locationId);

      await t.query(
        "DELETE FROM ACTIVE_DEVICES WHERE location_id = @locationId"
      );
      await t.query(
        "DELETE FROM PENDING_DEACTIVATIONS WHERE location_id = @locationId"
      );
      await t.query(
        "DELETE FROM LOCATION_PARAMETERS WHERE location_id = @locationId"
      );

      const metricsCheck = await t.query(
        "SELECT COUNT(1) AS count FROM MAIN_METRICS WHERE location_id = @locationId"
      );

      if (metricsCheck.recordset[0].count > 0) {
        await t.query(
          "DELETE FROM MAIN_METRICS WHERE location_id = @locationId"
        );
      }

      await trx
        .request()
        .input("id", locationId)
        .query("DELETE FROM LOCATIONS WHERE id = @id");

      await trx.commit();

      return {
        status: 200,
        jsonBody: {
          message: "Location and associated data deleted successfully",
        },
      };
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  } catch (err) {
    context.log.error("[OMOWICE-API] DB error on deleteLocation:", err);

    if (err.number === 547) {
      return {
        status: 409,
        jsonBody: {
          error:
            "Cannot delete this location due to existing related records. Please remove them first.",
        },
      };
    }
    if (err.code === "ETIMEOUT") {
      return {
        status: 500,
        jsonBody: {
          error: "Database connection timeout. Please try again later.",
        },
      };
    }

    return {
      status: 500,
      jsonBody: { error: "Internal server error" },
    };
  }
};
