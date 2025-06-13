# Overview

This project contains an Azure Function-based API that provides real-time metrics and location details. The API integrates with a Microsoft SQL Server database to retrieve and serve data.

# API Endpoints Summary

| Endpoint                               | Method | Description                               |
| -------------------------------------- | ------ | ----------------------------------------- |
| `/v1/locations`                        | GET    | Retrieve all locations                    |
| `/v1/locations/add`                    | POST   | Add a new location                        |
| `/v1/locations/update/{locationId}`    | PUT    | Update an existing location               |
| `/v1/locations/remove/{locationId}`    | DELETE | Delete a location and its associated data |

# Features

- Retrieve all locations with their parameters
- Add a new location with parameters
- Update an existing location and its parameters
- Delete a location and its associated data

# API Documentation

## Base URL

All endpoints are relative to the base URL: `https://api.omowice.live/admin`

## Endpoints

### 1. Get All Locations

**Endpoint:**  
`GET /v1/locations`

**Description:**  
Returns a list of all available locations with their parameters.

**Response:**

- **Status Code:** `200 OK`
- **Content-Type:** `application/json`

**Example Response:**

```json
[
  {
    "locationId": "fot",
    "name": "Faculty of Technology",
    "address": "123 Main St",
    "googleMapsUrl": "https://maps.google.com/?q=123+Main+St",
    "openingHours": "9:00 AM - 5:00 PM",
    "createdAt": "2023-10-01T12:00:00Z",
    "avgDevicesPerPerson": 1.5,
    "avgSimsPerPerson": 1.2,
    "wifiUsageRatio": 0.7,
    "cellularUsageRatio": 0.3,
    "updateInterval": 60,
    "lastRecordUpdated": "2023-10-01T12:00:00Z",
    "lastMetricUpdated": "2023-10-02T15:30:00Z"
  }
]
```

**Error Responses:**

- `500 Internal Server Error`: Database connection or query error.

---

### 3. Add New Location

**Endpoint:**  
`POST /v1/locations/add`

**Description:**  
Adds a new location with associated parameters.

**Request Body:**

```json
{
  "id": "fot",
  "name": "Faculty of Technology",
  "address": "123 Main St",
  "googleMapsUrl": "https://maps.google.com/?q=123+Main+St",
  "openingHours": "9:00 AM - 5:00 PM",
  "parameters": {
    "avgDevicesPerPerson": 1.5,
    "avgSimsPerPerson": 1.2,
    "wifiUsageRatio": 0.7,
    "cellularUsageRatio": 0.3,
    "updateInterval": 60
  }
}
```

**Response:**

- **Status Code:** `201 Created`
- **Content-Type:** `application/json`

**Example Response:**

```json
{
  "message": "Location added successfully",
  "locationId": "fot"
}
```

**Error Responses:**

- `400 Bad Request`: Missing required fields.
- `409 Conflict`: Location with the provided ID already exists.
- `500 Internal Server Error`: Database connection or query error.

---

### 4. Update Location

**Endpoint:**  
`PUT /v1/locations/update/{locationId}`

**Description:**  
Updates an existing location and its parameters.

**Parameters:**

- `locationId` (required): The unique identifier of the location.

**Request Body:**

```json
{
  "name": "Updated Faculty of Technology",
  "address": "456 New St",
  "googleMapsUrl": "https://maps.google.com/?q=456+New+St",
  "openingHours": "8:00 AM - 6:00 PM",
  "parameters": {
    "avgDevicesPerPerson": 1.8,
    "avgSimsPerPerson": 1.5,
    "wifiUsageRatio": 0.8,
    "cellularUsageRatio": 0.2,
    "updateInterval": 30
  }
}
```

**Response:**

- **Status Code:** `200 OK`
- **Content-Type:** `application/json`

**Example Response:**

```json
{
  "message": "Location updated successfully",
  "locationId": "fot"
}
```

**Error Responses:**

- `400 Bad Request`: Missing required fields.
- `404 Not Found`: Location not found.
- `500 Internal Server Error`: Database connection or query error.

---

### 5. Delete Location

**Endpoint:**  
`DELETE /v1/locations/remove/{locationId}`

**Description:**  
Deletes a location and all its associated data.

**Parameters:**

- `locationId` (required): The unique identifier of the location.

**Response:**

- **Status Code:** `200 OK`
- **Content-Type:** `application/json`

**Example Response:**

```json
{
  "message": "Location and associated data deleted successfully"
}
```

**Error Responses:**

- `400 Bad Request`: Missing `locationId` parameter.
- `404 Not Found`: Location not found.
- `409 Conflict`: Cannot delete location due to related records.
- `500 Internal Server Error`: Database connection or query error.

---

## Common Error Responses

All endpoints may return the following errors:

- **500 Internal Server Error**:

  ```json
  {
    "error": "Internal server error"
  }
  ```

- **Database Timeout Error:**
  ```json
  {
    "error": "Database connection timeout. Try again in a few seconds!"
  }
  ```

# Usage Examples

### Using cURL

```bash
# Get all locations
curl -X GET https://api.omowice.live/admin/v1/locations

# Add a new location
curl -X POST https://api.omowice.live/admin/v1/locations/add \
  -H "Content-Type: application/json" \
  -d '{"id":"fot","name":"Faculty of Technology","address":"123 Main St","googleMapsUrl":"https://maps.google.com/?q=123+Main+St","openingHours":"9:00 AM - 5:00 PM","parameters":{"avgDevicesPerPerson":1.5,"avgSimsPerPerson":1.2,"wifiUsageRatio":0.7,"cellularUsageRatio":0.3,"updateInterval":60}}'

# Update a location
curl -X PUT https://api.omowice.live/admin/v1/locations/update/fot \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Faculty of Technology","address":"456 New St","googleMapsUrl":"https://maps.google.com/?q=456+New+St","openingHours":"8:00 AM - 6:00 PM","parameters":{"avgDevicesPerPerson":1.8,"avgSimsPerPerson":1.5,"wifiUsageRatio":0.8,"cellularUsageRatio":0.2,"updateInterval":30}}'

# Delete a location
curl -X DELETE https://api.omowice.live/admin/v1/locations/remove/fot
```

### Using JavaScript (Fetch API)

```javascript
// Get all locations
fetch("https://api.omowice.live/admin/v1/locations")
  .then((response) => response.json())
  .then((data) => console.log(data))
  .catch((error) => console.error("Error:", error));

// Add a new location
fetch("https://api.omowice.live/admin/v1/locations/add", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    id: "fot",
    name: "Faculty of Technology",
    address: "123 Main St",
    googleMapsUrl: "https://maps.google.com/?q=123+Main+St",
    openingHours: "9:00 AM - 5:00 PM",
    parameters: {
      avgDevicesPerPerson: 1.5,
      avgSimsPerPerson: 1.2,
      wifiUsageRatio: 0.7,
      cellularUsageRatio: 0.3,
      updateInterval: 60
    }
  }),
})
  .then((response) => response.json())
  .then((data) => console.log(data))
  .catch((error) => console.error("Error:", error));
```

# Environment Variables

The following environment variables are required for the API to function:

- `DB_SERVER`: SQL Server hostname.
- `DB_USERNAME`: SQL Server username.
- `DB_PASSWORD`: SQL Server password.
- `DB_NAME`: SQL Server database name.

# License

This project is licensed under the MIT License.
