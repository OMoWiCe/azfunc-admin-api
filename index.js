// Importing Individual Functions handlers
const { app } = require("@azure/functions");
const getLocations = require("./src/functions/getLocations");
const addLocation = require("./src/functions/addLocation");
const updateLocation = require("./src/functions/updateLocation");
const deleteLocation = require("./src/functions/deleteLocation");

// Enable streaming bodies (large-JSON support)
app.setup({ enableHttpStream: true });

// Getting details of all the locations
app.http("getLocations", {
  route: "v1/locations",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: getLocations,
});

// Adding a new location
app.http("addLocation", {
  route: "v1/locations/add",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: addLocation,
});

// Updating an existing location
app.http("updateLocation", {
  route: "v1/locations/update/{locationId}",
  methods: ["PUT"],
  authLevel: "anonymous",
  handler: updateLocation,
});

// Deleting a location
app.http("deleteLocation", {
  route: "v1/locations/remove/{locationId}",
  methods: ["DELETE"],
  authLevel: "anonymous",
  handler: deleteLocation,
});
