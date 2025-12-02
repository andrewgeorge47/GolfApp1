# Golf Simulator Recommendation Algorithm

## Overview
The core algorithm filters golf simulator equipment based on room constraints and budget, then generates optimal combinations ranked by total rating.

## Algorithm Steps

### 1. Filter Equipment by Constraints

#### Launch Monitors
Filter by ALL of:
- `price <= budget`
- `min_ceiling_height <= actual_ceiling_height`
- `min_room_width <= actual_room_width`
- `min_room_depth <= actual_room_depth`

**Rationale:** Launch monitors have physical space requirements. If the room doesn't meet minimums, the equipment won't function properly.

#### Projectors
Filter by:
- `price <= budget`

**Rationale:** Projectors are more flexible; main constraint is budget.

#### Hitting Mats
Filter by:
- `price <= budget`

**Rationale:** Hitting mats are the most flexible equipment; only budget matters.

---

### 2. Generate Valid Combinations

```
FOR each filtered launch_monitor:
    FOR each filtered projector:
        FOR each filtered hitting_mat:
            total_price = launch_monitor.price + projector.price + hitting_mat.price

            IF total_price <= budget:
                total_rating = launch_monitor.score + projector.score + hitting_mat.rating

                ADD to valid_combinations:
                    - launch_monitor (name, price, technology, placement, purchase_url)
                    - projector (name, price, throw_ratio, max_image_size, purchase_url)
                    - hitting_mat (name, price, rating, purchase_url)
                    - total_price
                    - total_rating
```

**Time Complexity:** O(L × P × H) where:
- L = number of filtered launch monitors
- P = number of filtered projectors
- H = number of filtered hitting mats

**Typical Performance:** ~36 × 7 × 12 = 3,024 iterations (milliseconds)

---

### 3. Rank and Return Top Results

```
SORT valid_combinations BY total_rating DESCENDING
RETURN top 5 combinations
```

**Rationale:** Users want the best-rated equipment within their constraints. Limiting to 5 prevents decision paralysis.

---

## Room Width Analysis

Provide guidance based on room width:

| Width (feet) | Guidance |
|--------------|----------|
| < 11 | **Insufficient** - Minimum width is 11 feet for safe use |
| 11-13 | **Offset hitting required** - Too narrow for both left/right-handed players |
| 13-16 | **Flexible** - Both handed players can be accommodated with offset positions |
| > 16 | **Optimal** - Central hitting for both left and right-handed players |

---

## Data Quality Notes

### Scores vs Ratings
- **Launch Monitors:** Use `Score` field (0-10 scale)
- **Projectors:** Use `Score` field (0-10 scale)
- **Hitting Mats:** Use `Rating` field (0-10 scale)

### Hardcoded Pros/Cons (TODO)
The original implementation has generic hardcoded pros/cons:
- Launch Monitor: "High accuracy, portable." / "Expensive, requires proper setup."
- Projector: "Bright display, wide throw ratio." / "Bulky, requires a dark room."
- Hitting Mat: "Something." / "Nothing"

**Recommendation:** Store product-specific pros/cons in the database or remove entirely.

---

## Example Query (SQL)

```sql
-- Step 1: Filter Launch Monitors
SELECT name, price, technology, placement, purchase_url, score
FROM simulator_launch_monitors
WHERE price <= :budget
  AND min_ceiling_height <= :ceiling
  AND min_room_width <= :width
  AND min_room_depth <= :depth;

-- Step 2: Filter Projectors
SELECT name, price, throw_ratio, max_image_size, purchase_url, score
FROM simulator_projectors
WHERE price <= :budget;

-- Step 3: Filter Hitting Mats
SELECT name, price, rating, purchase_url
FROM simulator_hitting_mats
WHERE price <= :budget;

-- Step 4-5: Generate combinations and rank (done in application code)
```

---

## Edge Cases

### No Valid Combinations
**Scenario:** Budget too low or room dimensions too restrictive.
**Response:** Return empty `valid_combinations` array with explanation message.

### Single Equipment Type Missing
**Scenario:** No projectors under budget but launch monitors available.
**Response:** Cannot form complete combinations; return empty results.

### Identical Ratings
**Scenario:** Multiple combinations have same total_rating.
**Behavior:** SQL/database order determines ranking (non-deterministic).
**Improvement:** Add secondary sort by `total_price ASC` (cheaper wins ties).

---

## Optimization Opportunities

### 1. Pre-filter by Budget Distribution
Instead of filtering each category independently, allocate budget:
- Launch Monitor: 50-70% of budget
- Projector: 20-30% of budget
- Hitting Mat: 10-20% of budget

This reduces combination space from 3,024 to ~500 iterations.

### 2. Pagination
For large result sets, paginate combinations instead of showing only top 5.

### 3. Caching
Cache filtered equipment by common room sizes:
- Small (10×15)
- Medium (15×20)
- Large (20×25)

### 4. Weighted Scoring
Allow users to prioritize certain equipment:
- "I care most about launch monitor quality" → weight LM score 2x
- "I want the best overall value" → use current algorithm

---

## Implementation Checklist

- [ ] Create database tables with schema
- [ ] Import equipment data (36 launch monitors, 7 projectors, 12 hitting mats)
- [ ] Implement filtering queries
- [ ] Implement combination generation loop
- [ ] Sort by total_rating descending
- [ ] Return top 5 results
- [ ] Add room width analysis function
- [ ] Handle edge cases (no results, partial results)
- [ ] Add input validation (positive numbers, realistic dimensions)
- [ ] Consider optimization strategies
