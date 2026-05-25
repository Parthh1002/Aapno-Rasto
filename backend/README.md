# Gujarat Connect - Python Backend

This directory contains the Python FastAPI backend for advanced coordinate mapping, grouping algorithms, and analytical logic for the Gujarat Connect platform.

## Setup Instructions

1. **Install Python**
   Ensure you have Python 3.9+ installed on your system.

2. **Create a Virtual Environment** (Optional but recommended)
   ```bash
   python -m venv venv
   # On Windows
   venv\Scripts\activate
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Server**
   ```bash
   python main.py
   # Or using uvicorn directly:
   # uvicorn main:app --reload
   ```
   The backend will run on `http://localhost:8000`. You can view the interactive API documentation at `http://localhost:8000/docs`.

## Available Endpoints

### `GET /health`
Returns the status of the backend server.

### `POST /api/complaints/group`
Takes a list of complaints and groups them based on their physical proximity (using Haversine distance) and their complaint category. This is useful for identifying duplicate reports from different citizens.

**Request Body Example:**
```json
{
  "complaints": [
    {
      "id": "1",
      "category": "garbage",
      "location": { "lat": 23.0225, "lng": 72.5714 }
    },
    {
      "id": "2",
      "category": "garbage",
      "location": { "lat": 23.0226, "lng": 72.5715 }
    }
  ],
  "radius_meters": 50.0
}
```

## Connecting Frontend to Backend

In your React frontend, you can call these endpoints using `fetch` or `axios`.
Example:
```typescript
const response = await fetch('http://localhost:8000/api/complaints/group', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    complaints: allComplaints,
    radius_meters: 50.0
  })
});
const { groups } = await response.json();
```
