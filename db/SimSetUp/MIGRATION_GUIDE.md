# Golf Simulator MVP → GolfApp1 Migration Guide

## Overview

This guide walks you through migrating the valuable assets from the golf_simulator_mvp prototype into your GolfApp1 application. The valuable assets are:

1. **Equipment Database** (55+ products across 3 categories)
2. **Recommendation Algorithm** (filtering + combination ranking logic)

---

## What's in This Migration Package

```
migration/
├── MIGRATION_GUIDE.md              ← You are here
├── RECOMMENDATION_ALGORITHM.md     ← Algorithm documentation
├── schema_postgresql.sql           ← PostgreSQL database schema
├── implementation_typescript.ts    ← TypeScript/Node.js implementation
├── launch_monitors.json            ← 36 launch monitors (JSON)
├── projectors.json                 ← 7 projectors (JSON)
├── hitting_mats.json               ← 12 hitting mats (JSON)
├── launch_monitors.sql             ← Launch monitors (SQL INSERT statements)
├── projectors.sql                  ← Projectors (SQL INSERT statements)
└── hitting_mats.sql                ← Hitting mats (SQL INSERT statements)
```

---

## Migration Steps

### Step 1: Create Database Tables

**For PostgreSQL (recommended):**

```bash
# Run the schema file against your database
psql -U your_user -d golfapp1_db -f migration/schema_postgresql.sql
```

**For Prisma users:**

```prisma
// Add to your schema.prisma file

model SimulatorLaunchMonitor {
  id                   Int      @id @default(autoincrement())
  name                 String   @db.VarChar(255)
  price                Decimal  @db.Decimal(10, 2)
  technology           String?  @db.VarChar(50)
  placement            String?  @db.VarChar(50)
  minCeilingHeight     Decimal? @db.Decimal(4, 2) @map("min_ceiling_height")
  minRoomWidth         Decimal? @db.Decimal(4, 2) @map("min_room_width")
  minRoomDepth         Decimal? @db.Decimal(4, 2) @map("min_room_depth")
  distanceFromScreen   Decimal? @db.Decimal(4, 2) @map("distance_from_screen")
  purchaseUrl          String?  @map("purchase_url")
  rating               Decimal? @db.Decimal(4, 2)
  score                Decimal? @db.Decimal(10, 2)
  createdAt            DateTime @default(now()) @map("created_at")
  updatedAt            DateTime @updatedAt @map("updated_at")

  @@index([price])
  @@index([minCeilingHeight])
  @@index([minRoomWidth, minRoomDepth])
  @@map("simulator_launch_monitors")
}

model SimulatorProjector {
  id                      Int      @id @default(autoincrement())
  name                    String   @db.VarChar(255)
  price                   Decimal  @db.Decimal(10, 2)
  throwRatio              Decimal? @db.Decimal(4, 2) @map("throw_ratio")
  maxImageSize            Int?     @map("max_image_size")
  brightness              Int?
  purchaseUrl             String?  @map("purchase_url")
  lightSource             String?  @db.VarChar(100) @map("light_source")
  resolution              String?  @db.VarChar(50)
  lumens                  String?  @db.VarChar(50)
  achievableAspectRatio   String?  @db.VarChar(50) @map("achievable_aspect_ratio")
  rating                  Decimal? @db.Decimal(4, 2)
  score                   Decimal? @db.Decimal(10, 2)
  createdAt               DateTime @default(now()) @map("created_at")
  updatedAt               DateTime @updatedAt @map("updated_at")

  @@index([price])
  @@map("simulator_projectors")
}

model SimulatorHittingMat {
  id               Int      @id @default(autoincrement())
  name             String   @db.VarChar(255)
  price            Decimal  @db.Decimal(10, 2)
  dimensions       String?  @db.VarChar(100)
  features         String?
  realisticFeel    Decimal? @db.Decimal(4, 2) @map("realistic_feel")
  shockAbsorption  Decimal? @db.Decimal(4, 2) @map("shock_absorption")
  durability       Decimal? @db.Decimal(4, 2)
  sliding          Decimal? @db.Decimal(4, 2)
  useOnConcrete    Decimal? @db.Decimal(4, 2) @map("use_on_concrete")
  qualityMetric    Decimal? @db.Decimal(4, 2) @map("quality_metric")
  rating           Decimal? @db.Decimal(4, 2)
  purchaseUrl      String?  @map("purchase_url")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  @@index([price])
  @@index([rating])
  @@map("simulator_hitting_mats")
}
```

Then run:
```bash
npx prisma db push
# or
npx prisma migrate dev --name add_simulator_tables
```

---

### Step 2: Import Equipment Data

#### Option A: Import JSON Data (Recommended for Node.js/TypeScript)

```typescript
// scripts/seed-simulator-data.ts
import fs from 'fs';
import { db } from '@/lib/db'; // Your database client

async function seedSimulatorData() {
  // Read JSON files
  const launchMonitors = JSON.parse(
    fs.readFileSync('migration/launch_monitors.json', 'utf-8')
  );
  const projectors = JSON.parse(
    fs.readFileSync('migration/projectors.json', 'utf-8')
  );
  const hittingMats = JSON.parse(
    fs.readFileSync('migration/hitting_mats.json', 'utf-8')
  );

  // Insert Launch Monitors
  await db.simulator_launch_monitors.createMany({
    data: launchMonitors.map((lm: any) => ({
      name: lm.name,
      price: lm.price,
      technology: lm.technology,
      placement: lm.placement,
      minCeilingHeight: lm.min_ceiling_height,
      minRoomWidth: lm.min_room_width,
      minRoomDepth: lm.min_room_depth,
      distanceFromScreen: lm.distance_from_screen,
      purchaseUrl: lm.purchase,
      rating: parseFloat(lm.Rating) || null,
      score: lm.Score,
    })),
  });

  // Insert Projectors
  await db.simulator_projectors.createMany({
    data: projectors.map((p: any) => ({
      name: p.name,
      price: p.price,
      throwRatio: p.throw_ratio,
      maxImageSize: p.max_image_size,
      brightness: p.brightness,
      purchaseUrl: p.purchase,
      lightSource: p.light_source,
      resolution: p.resolution,
      lumens: p.lumens,
      achievableAspectRatio: p.achievable_aspect_ratio,
      rating: parseFloat(p.Rating) || null,
      score: p.Score,
    })),
  });

  // Insert Hitting Mats
  await db.simulator_hitting_mats.createMany({
    data: hittingMats.map((hm: any) => ({
      name: hm.name,
      price: hm.price,
      dimensions: hm.dimensions,
      features: hm.features,
      realisticFeel: hm['Realistic Feel'],
      shockAbsorption: hm['Shock Absorption'],
      durability: hm.Durability,
      sliding: hm.Sliding,
      useOnConcrete: hm['Use on Concrete'],
      qualityMetric: hm.quality_metric,
      rating: hm.Rating,
      purchaseUrl: hm.purchase,
    })),
  });

  console.log('✅ Simulator data seeded successfully!');
}

seedSimulatorData();
```

Run the seed script:
```bash
npx tsx scripts/seed-simulator-data.ts
```

#### Option B: Import SQL Data

```bash
# For PostgreSQL
psql -U your_user -d golfapp1_db -f migration/launch_monitors.sql
psql -U your_user -d golfapp1_db -f migration/projectors.sql
psql -U your_user -d golfapp1_db -f migration/hitting_mats.sql
```

**Note:** You may need to adjust the INSERT statements if your table names or column names differ.

---

### Step 3: Implement Recommendation Logic

Copy the recommendation functions from `implementation_typescript.ts` into your codebase.

**Suggested file structure:**

```
GolfApp1/
├── lib/
│   └── simulator/
│       ├── recommendations.ts        ← Core algorithm
│       └── types.ts                  ← Type definitions
├── app/
│   └── api/
│       └── simulator/
│           └── recommendations/
│               └── route.ts          ← API endpoint
└── components/
    └── simulator/
        ├── SimulatorBuilder.tsx      ← UI form
        └── SimulatorResults.tsx      ← Results display
```

**Example integration:**

```typescript
// lib/simulator/recommendations.ts
import { db } from '@/lib/db';
import { SimulatorInput, SimulatorRecommendation } from './types';

export async function getSimulatorRecommendations(
  input: SimulatorInput
): Promise<SimulatorRecommendation> {
  // ... implementation from implementation_typescript.ts
}
```

```typescript
// app/api/simulator/recommendations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSimulatorRecommendations } from '@/lib/simulator/recommendations';

export async function POST(request: NextRequest) {
  const input = await request.json();
  const recommendations = await getSimulatorRecommendations(input);
  return NextResponse.json(recommendations);
}
```

---

### Step 4: Create Frontend UI

Build a user interface using your GolfApp1 component library.

**Required form inputs:**
- Ceiling Height (number, feet)
- Room Width (number, feet)
- Room Depth (number, feet)
- Budget (number, dollars)

**Display outputs:**
- Room width guidance message
- Top 5 recommended combinations:
  - Launch Monitor (name, price, technology, placement)
  - Projector (name, price, throw ratio, max image size)
  - Hitting Mat (name, price, rating)
  - Total Price
  - Total Rating
- Purchase links for each product

**Example using your component library:**

```tsx
// components/simulator/SimulatorBuilder.tsx
'use client';

import { useState } from 'react';
import { Button, Input, Card } from '@/components/ui'; // Your component library
import { SimulatorResults } from './SimulatorResults';

export function SimulatorBuilder() {
  const [ceiling, setCeiling] = useState('10');
  const [width, setWidth] = useState('15');
  const [depth, setDepth] = useState('20');
  const [budget, setBudget] = useState('5000');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const response = await fetch('/api/simulator/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ceiling: parseFloat(ceiling),
        width: parseFloat(width),
        depth: parseFloat(depth),
        budget: parseFloat(budget),
      }),
    });

    const data = await response.json();
    setResults(data);
    setLoading(false);
  }

  return (
    <div>
      <Card>
        <form onSubmit={handleSubmit}>
          <Input
            label="Ceiling Height (feet)"
            type="number"
            value={ceiling}
            onChange={(e) => setCeiling(e.target.value)}
          />
          <Input
            label="Room Width (feet)"
            type="number"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
          />
          <Input
            label="Room Depth (feet)"
            type="number"
            value={depth}
            onChange={(e) => setDepth(e.target.value)}
          />
          <Input
            label="Budget ($)"
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
          <Button type="submit" loading={loading}>
            Get Recommendations
          </Button>
        </form>
      </Card>

      {results && <SimulatorResults data={results} />}
    </div>
  );
}
```

---

### Step 5: Add Navigation & Routes

Add a new route in GolfApp1 to access the simulator builder:

```
/tools/simulator-builder
/equipment/simulator
/pro-shop/simulator
```

Update your navigation menu to include a link to the new feature.

---

## Data Summary

### Launch Monitors (36 products)
- Price range: $500 - $25,000
- Technologies: Camera-based, Radar-based
- Placement: Side, Behind
- Key constraints: Ceiling height, room width/depth

**Sample products:**
- SkyTrak+ ($2,995)
- FlightScope Mevo+ ($2,299)
- TrackMan 4 ($24,995)
- Garmin Approach R10 ($599)

### Projectors (7 products)
- Price range: $899 - $2,499
- Key specs: Throw ratio, max image size, lumens

**Sample products:**
- BenQ LW600ST ($899)
- Optoma GT1080HDR ($899)
- Epson LS300 ($2,499)

### Hitting Mats (12 products)
- Price range: $90 - $900
- Key ratings: Realistic feel, shock absorption, durability

**Sample products:**
- Carl's Place ($535)
- Fiberbuilt ($699)
- Country Club Elite ($800)

---

## Testing Checklist

- [ ] Database tables created successfully
- [ ] All 55 products imported (36 + 7 + 12)
- [ ] API endpoint returns recommendations
- [ ] Input validation works (positive numbers only)
- [ ] Room width guidance displays correctly
- [ ] Top 5 combinations sorted by rating
- [ ] Total price doesn't exceed budget
- [ ] Purchase links work correctly
- [ ] Mobile responsive UI
- [ ] Error handling for no results

---

## Example Test Cases

### Test Case 1: Generous Budget
```json
{
  "ceiling": 10,
  "width": 15,
  "depth": 20,
  "budget": 10000
}
```
**Expected:** 5 high-rated combinations returned

### Test Case 2: Tight Budget
```json
{
  "ceiling": 10,
  "width": 15,
  "depth": 20,
  "budget": 2000
}
```
**Expected:** Fewer combinations, budget-friendly equipment only

### Test Case 3: Small Room
```json
{
  "ceiling": 8,
  "width": 10,
  "depth": 12,
  "budget": 5000
}
```
**Expected:** Warning about room width, limited launch monitor options

### Test Case 4: Unrealistic Constraints
```json
{
  "ceiling": 7,
  "width": 8,
  "depth": 10,
  "budget": 500
}
```
**Expected:** No valid combinations or very limited results

---

## Optimization Tips

### 1. Add Caching
Cache common room sizes/budgets to reduce database queries:

```typescript
import { cache } from 'react';

export const getCachedRecommendations = cache(getSimulatorRecommendations);
```

### 2. Add Loading States
Show skeleton loaders while fetching recommendations.

### 3. Add Comparison Feature
Let users save multiple configurations and compare side-by-side.

### 4. Add Wishlist
Allow users to bookmark their favorite setups.

### 5. Track Analytics
Monitor which equipment combinations are most popular.

---

## Future Enhancements

1. **User Preferences:** Allow weighting (e.g., prioritize launch monitor quality)
2. **Impact Screens:** Add the ImpactScreen table to recommendations
3. **Software & Computers:** Include simulation software and PC requirements
4. **Installation Guides:** Link to setup tutorials for each combination
5. **Affiliate Tracking:** Track which products users purchase
6. **Admin Panel:** Let admins update equipment data without SQL
7. **Product Reviews:** Add user reviews and ratings
8. **AI Recommendations:** Use LLM to explain why certain combos are recommended

---

## Troubleshooting

### Issue: No combinations returned
- Check that budget is realistic (minimum ~$2,000)
- Verify room dimensions meet minimum requirements
- Check database has been seeded with all products

### Issue: Performance is slow
- Add database indexes (already in schema)
- Consider caching filtered equipment
- Limit combinations generated (add early termination)

### Issue: Incorrect total prices
- Verify price columns are numeric (not strings)
- Check currency formatting is correct

---

## Support Files Reference

| File | Purpose | Use When |
|------|---------|----------|
| `schema_postgresql.sql` | Database schema | Creating tables in PostgreSQL |
| `*.json` files | Product data | Importing data with Node.js/TypeScript |
| `*.sql` files | Product data | Importing data with SQL directly |
| `implementation_typescript.ts` | Code reference | Implementing recommendation logic |
| `RECOMMENDATION_ALGORITHM.md` | Algorithm docs | Understanding the logic |

---

## Summary

**What you're migrating:**
- ✅ 55 equipment products with specs and ratings
- ✅ Room constraint filtering logic
- ✅ Combination ranking algorithm
- ✅ Room width guidance system

**What you're NOT migrating:**
- ❌ Flask backend (replace with GolfApp1's backend)
- ❌ Vanilla JS frontend (rebuild with GolfApp1's components)
- ❌ SQLite database (migrate to PostgreSQL/MySQL)
- ❌ Hardcoded pros/cons (improve or remove)

**Estimated effort:**
- Database setup: 30 minutes
- Data import: 30 minutes
- API implementation: 1-2 hours
- UI build: 2-4 hours
- Testing & polish: 1-2 hours

**Total:** 5-9 hours for full integration

---

## Questions?

If you need help with:
- Specific ORM/database setup
- Component library integration
- Adding advanced features
- Optimizing performance

Refer to the algorithm documentation in `RECOMMENDATION_ALGORITHM.md` or the TypeScript implementation in `implementation_typescript.ts`.
