// src/functions/updateLocation.js
const { getPool } = require("../sqlClient");

module.exports = async function updateLocation(request, context) {
  try {
    const locationId = request.params.locationId;
    context.log("Location ID received:", locationId);
    if (!locationId) {
      return {
        status: 400,
        jsonBody: { error: "Location ID is required in the URL parameter" },
      };
    }

    const updateData = await request.json();
    context.log("Update data received:", updateData);
    if (!updateData) {
      return {
        status: 400,
        jsonBody: { error: "Request body is empty" },
      };
    }

    const pool = await getPool();

    const checkResult = await pool
      .request()
      .input("id", locationId)
      .query("SELECT COUNT(1) AS count FROM LOCATIONS WHERE id = @id");

    if (checkResult.recordset[0].count === 0) {
      return { status: 404, jsonBody: { error: "Location not found" } };
    }

    const trx = pool.transaction();
    await trx.begin();

    try {
      const d = updateData;
      if (!d.name || !d.address || !d.googleMapsUrl || !d.openingHours) {
        return {
          status: 400,
          jsonBody: {
            error:
              "Required location fields are missing (name, address, googleMapsUrl, openingHours)",
          },
        };
      }

      await trx
        .request()
        .input("id", locationId)
        .input("name", d.name)
        .input("address", d.address)
        .input("googleMapsUrl", d.googleMapsUrl)
        .input("openingHours", d.openingHours).query(`
          UPDATE LOCATIONS SET
            name = @name,
            address = @address,
            google_maps_url = @googleMapsUrl,
            opening_hours = @openingHours
          WHERE id = @id
        `);

      const p = d.parameters;
      if (!p) {
        return {
          status: 400,
          jsonBody: { error: "Location parameters are required" },
        };
      }

      const missing = [
        p.avgDevicesPerPerson,
        p.avgSimsPerPerson,
        p.wifiUsageRatio,
        p.cellularUsageRatio,
        p.updateInterval,
      ].some((v) => v === undefined);

      if (missing) {
        return {
          status: 400,
          jsonBody: {
            error:
              "All parameter fields are required (avgDevicesPerPerson, avgSimsPerPerson, wifiUsageRatio, cellularUsageRatio, updateInterval)",
          },
        };
      }

      const paramExists =
        (
          await trx
            .request()
            .input("locationId", locationId)
            .query(
              "SELECT COUNT(1) AS count FROM LOCATION_PARAMETERS WHERE location_id = @locationId"
            )
        ).recordset[0].count > 0;

      if (paramExists) {
        await trx
          .request()
          .input("locationId", locationId)
          .input("avgDevicesPerPerson", p.avgDevicesPerPerson)
          .input("avgSimsPerPerson", p.avgSimsPerPerson)
          .input("wifiUsageRatio", p.wifiUsageRatio)
          .input("cellularUsageRatio", p.cellularUsageRatio)
          .input("updateInterval", p.updateInterval).query(`
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
        await trx
          .request()
          .input("locationId", locationId)
          .input("avgDevicesPerPerson", p.avgDevicesPerPerson)
          .input("avgSimsPerPerson", p.avgSimsPerPerson)
          .input("wifiUsageRatio", p.wifiUsageRatio)
          .input("cellularUsageRatio", p.cellularUsageRatio)
          .input("updateInterval", p.updateInterval).query(`
            INSERT INTO LOCATION_PARAMETERS
              (location_id, avg_devices_per_person, avg_sims_per_person, wifi_usage_ratio, cellular_usage_ratio, update_interval)
            VALUES (@locationId, @avgDevicesPerPerson, @avgSimsPerPerson, @wifiUsageRatio, @cellularUsageRatio, @updateInterval)
          `);
      }

      await trx.commit();

      return {
        status: 200,
        jsonBody: {
          message: "Location updated successfully",
          locationId,
        },
      };
    } catch (e) {
      await trx.rollback();
      throw e;
    }
  } catch (err) {
    context.log.error("[OMOWICE-API] DB error in updateLocation:", err);

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
    return {
      status: 500,
      jsonBody: { error: "Internal server error" },
    };
  }
};
