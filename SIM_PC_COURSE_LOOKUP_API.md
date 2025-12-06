# Course Lookup API - Quick Reference

## Purpose
Find course IDs in the cloud database by course name (from .gspcrse filenames).

## Endpoint

```
GET /api/sim/courses/lookup?name={courseName}
```

## Authentication

```
X-Sim-API-Key: nn-sim-nn-no5-3a11134c18c31b06c9d73277fcf4a9af
```

## Request

**URL:** `https://golfapp1.onrender.com/api/sim/courses/lookup?name=Pebble Beach Golf Links`

**Headers:**
```
X-Sim-API-Key: nn-sim-nn-no5-3a11134c18c31b06c9d73277fcf4a9af
```

**Query Parameters:**
- `name` (required) - Course name (strip `.gspcrse` extension from filename)

## Responses

### Exact Match (200 OK)
```json
{
  "found": true,
  "exact": true,
  "course": {
    "id": 123,
    "name": "Pebble Beach Golf Links",
    "location": "Pebble Beach, CA",
    "designer": "Jack Neville, Douglas Grant",
    "holes": 18
  }
}
```

**Usage:** Use `course.id` for subsequent API calls.

### Multiple Matches (200 OK)
```json
{
  "found": true,
  "exact": false,
  "matches": [
    {
      "id": 123,
      "name": "Pebble Beach Golf Links",
      "location": "Pebble Beach, CA",
      "designer": "Jack Neville, Douglas Grant",
      "holes": 18,
      "similarity": 0.95
    },
    {
      "id": 456,
      "name": "Pebble Beach - The Links",
      "location": "Pebble Beach, CA",
      "designer": "Jack Neville",
      "holes": 18,
      "similarity": 0.85
    }
  ],
  "message": "Multiple courses found. Please use the most appropriate course ID."
}
```

**Usage:**
- Review all matches
- Use the one with highest similarity score or best match
- Log ambiguous matches for manual review

### Not Found (404 Not Found)
```json
{
  "error": "Course not found",
  "searchedName": "Unknown Course",
  "suggestion": "Try searching with partial name or check spelling"
}
```

**Usage:** Log error and skip this course, or alert admin.

## Example Code

### TypeScript/Node.js

```typescript
async function lookupCourseId(courseName: string): Promise<number | null> {
  const url = new URL('https://golfapp1.onrender.com/api/sim/courses/lookup');
  url.searchParams.set('name', courseName);

  const response = await fetch(url.toString(), {
    headers: {
      'X-Sim-API-Key': 'nn-sim-nn-no5-3a11134c18c31b06c9d73277fcf4a9af'
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      console.error(`Course not found in database: ${courseName}`);
      return null;
    }
    throw new Error(`Lookup failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.exact) {
    console.log(`Found exact match: ${data.course.name} (ID: ${data.course.id})`);
    return data.course.id;
  } else {
    // Multiple matches - take the first (highest similarity)
    const bestMatch = data.matches[0];
    console.warn(`Multiple matches for "${courseName}". Using: ${bestMatch.name} (ID: ${bestMatch.id})`);
    return bestMatch.id;
  }
}

// Usage:
const courseId = await lookupCourseId('Pebble Beach Golf Links');
if (courseId) {
  // Use courseId for syncing hole details
  await syncCourseHoleDetails(courseId, 'Pebble Beach Golf Links.gspcrse', holeDetails);
}
```

### Python

```python
import requests

def lookup_course_id(course_name: str) -> int | None:
    url = 'https://golfapp1.onrender.com/api/sim/courses/lookup'
    headers = {
        'X-Sim-API-Key': 'nn-sim-nn-no5-3a11134c18c31b06c9d73277fcf4a9af'
    }
    params = {'name': course_name}

    response = requests.get(url, headers=headers, params=params)

    if response.status_code == 404:
        print(f"Course not found: {course_name}")
        return None

    response.raise_for_status()
    data = response.json()

    if data['exact']:
        print(f"Found exact match: {data['course']['name']} (ID: {data['course']['id']})")
        return data['course']['id']
    else:
        best_match = data['matches'][0]
        print(f"Multiple matches. Using: {best_match['name']} (ID: {best_match['id']})")
        return best_match['id']

# Usage:
course_id = lookup_course_id('Pebble Beach Golf Links')
if course_id:
    sync_course_hole_details(course_id, 'Pebble Beach Golf Links.gspcrse', hole_details)
```

### C#

```csharp
using System.Net.Http;
using System.Text.Json;

public async Task<int?> LookupCourseId(string courseName)
{
    var httpClient = new HttpClient();
    httpClient.DefaultRequestHeaders.Add("X-Sim-API-Key", "nn-sim-nn-no5-3a11134c18c31b06c9d73277fcf4a9af");

    var url = $"https://golfapp1.onrender.com/api/sim/courses/lookup?name={Uri.EscapeDataString(courseName)}";

    var response = await httpClient.GetAsync(url);

    if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
    {
        Console.WriteLine($"Course not found: {courseName}");
        return null;
    }

    response.EnsureSuccessStatusCode();
    var json = await response.Content.ReadAsStringAsync();
    var data = JsonSerializer.Deserialize<JsonElement>(json);

    if (data.GetProperty("exact").GetBoolean())
    {
        var course = data.GetProperty("course");
        var id = course.GetProperty("id").GetInt32();
        Console.WriteLine($"Found exact match: {course.GetProperty("name").GetString()} (ID: {id})");
        return id;
    }
    else
    {
        var matches = data.GetProperty("matches");
        var bestMatch = matches[0];
        var id = bestMatch.GetProperty("id").GetInt32();
        Console.WriteLine($"Multiple matches. Using: {bestMatch.GetProperty("name").GetString()} (ID: {id})");
        return id;
    }
}

// Usage:
var courseId = await LookupCourseId("Pebble Beach Golf Links");
if (courseId.HasValue)
{
    await SyncCourseHoleDetails(courseId.Value, "Pebble Beach Golf Links.gspcrse", holeDetails);
}
```

## Workflow

1. **Scan GSPro courses directory:** `E:\Core\GSP\Courses\`
2. **For each .gspcrse file:**
   - Extract course name (remove `.gspcrse` extension)
   - Call lookup API to get course ID
   - If found, sync hole details using the course ID
   - If not found, log error and skip

## Tips

- **Strip extension:** Always remove `.gspcrse` from filename before lookup
- **Handle fuzzy matches:** When multiple courses match, log for manual review
- **Cache results:** Store course name → ID mapping to avoid repeated lookups
- **Error handling:** Gracefully handle 404s (course not in database yet)

## Related Endpoints

After looking up course ID, use these endpoints:

1. **Report availability:** `POST /api/sim/courses/report-available`
2. **Sync hole details:** `POST /api/sim/courses/:courseId/hole-details`

See `SIM_PC_CTP_INTEGRATION_GUIDE.md` for full integration details.
