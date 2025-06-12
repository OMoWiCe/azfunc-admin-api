// Importing Individual Functions handlers
const { app } = require("@azure/functions");
const getLocations = require("./src/functions/getLocations");

// Getting details of all the locations
app.http("getLocations", {
  route: "v1/locations",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: getLocations,
});
