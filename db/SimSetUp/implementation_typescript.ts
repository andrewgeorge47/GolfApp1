/**
 * Golf Simulator Recommendation Engine - TypeScript Implementation
 *
 * This is a framework-agnostic implementation that can be adapted for:
 * - Next.js API routes
 * - Express.js endpoints
 * - tRPC procedures
 * - GraphQL resolvers
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SimulatorInput {
  ceiling: number;  // feet
  width: number;    // feet
  depth: number;    // feet
  budget: number;   // dollars
}

export interface LaunchMonitor {
  id: number;
  name: string;
  price: number;
  technology: string;
  placement: string;
  min_ceiling_height: number;
  min_room_width: number;
  min_room_depth: number;
  distance_from_screen: number;
  purchase_url: string;
  rating: number;
  score: number;
}

export interface Projector {
  id: number;
  name: string;
  price: number;
  throw_ratio: number;
  max_image_size: number;
  brightness: number;
  purchase_url: string;
  light_source: string;
  resolution: string;
  lumens: string;
  achievable_aspect_ratio: string;
  rating: number;
  score: number;
}

export interface HittingMat {
  id: number;
  name: string;
  price: number;
  dimensions: string;
  features: string;
  realistic_feel: number;
  shock_absorption: number;
  durability: number;
  sliding: number;
  use_on_concrete: number;
  quality_metric: number;
  rating: number;
  purchase_url: string;
}

export interface SimulatorCombination {
  launch_monitor: {
    name: string;
    price: number;
    technology: string;
    placement: string;
    purchase_url: string;
  };
  projector: {
    name: string;
    price: number;
    throw_ratio: number;
    max_image_size: number;
    purchase_url: string;
  };
  hitting_mat: {
    name: string;
    price: number;
    rating: number;
    purchase_url: string;
  };
  total_price: number;
  total_rating: number;
}

export interface SimulatorRecommendation {
  launch_monitors: Partial<LaunchMonitor>[];
  projectors: Partial<Projector>[];
  hitting_mats: Partial<HittingMat>[];
  valid_combinations: SimulatorCombination[];
  room_width_note: string;
}

// ============================================================================
// ROOM WIDTH ANALYSIS
// ============================================================================

export function getRoomWidthNote(roomWidth: number): string {
  if (roomWidth < 11) {
    return "<b>ROOM WIDTH NOTE</b>: Your room width is insufficient for safe use. Minimum width is 11 feet.";
  } else if (roomWidth >= 11 && roomWidth <= 13) {
    return "ROOM WIDTH NOTE: Your setup will require offset hitting for proper alignment to the center of the impact screen. Too narrow to accommodate left and right-handed players comfortably.";
  } else if (roomWidth > 13 && roomWidth <= 16) {
    return "<b>ROOM WIDTH NOTE</b>: Both left- and right-handed players can be accommodated by offsetting one or both of the hitting locations.";
  } else {
    return "Your setup supports central hitting for both left- and right-handed players.";
  }
}

// ============================================================================
// DATABASE QUERY FUNCTIONS (Adapt to your ORM/query builder)
// ============================================================================

/**
 * Example using Prisma ORM
 */
export async function getFilteredLaunchMonitors(
  db: any, // Replace with your DB client
  input: SimulatorInput
): Promise<LaunchMonitor[]> {
  // Prisma example:
  // return db.simulator_launch_monitors.findMany({
  //   where: {
  //     price: { lte: input.budget },
  //     min_ceiling_height: { lte: input.ceiling },
  //     min_room_width: { lte: input.width },
  //     min_room_depth: { lte: input.depth },
  //   },
  //   select: {
  //     name: true,
  //     price: true,
  //     technology: true,
  //     placement: true,
  //     purchase_url: true,
  //     score: true,
  //   },
  // });

  // Raw SQL example:
  const query = `
    SELECT name, price, technology, placement, purchase_url, score
    FROM simulator_launch_monitors
    WHERE price <= $1
      AND min_ceiling_height <= $2
      AND min_room_width <= $3
      AND min_room_depth <= $4
  `;

  return db.query(query, [input.budget, input.ceiling, input.width, input.depth]);
}

/**
 * Example using Prisma ORM
 */
export async function getFilteredProjectors(
  db: any,
  budget: number
): Promise<Projector[]> {
  const query = `
    SELECT name, price, throw_ratio, max_image_size, purchase_url, score
    FROM simulator_projectors
    WHERE price <= $1
  `;

  return db.query(query, [budget]);
}

/**
 * Example using Prisma ORM
 */
export async function getFilteredHittingMats(
  db: any,
  budget: number
): Promise<HittingMat[]> {
  const query = `
    SELECT name, price, rating, purchase_url
    FROM simulator_hitting_mats
    WHERE price <= $1
  `;

  return db.query(query, [budget]);
}

// ============================================================================
// RECOMMENDATION ENGINE
// ============================================================================

export function generateSimulatorCombinations(
  launchMonitors: LaunchMonitor[],
  projectors: Projector[],
  hittingMats: HittingMat[],
  budget: number
): SimulatorCombination[] {
  const validCombinations: SimulatorCombination[] = [];

  for (const monitor of launchMonitors) {
    for (const projector of projectors) {
      for (const mat of hittingMats) {
        const totalPrice = monitor.price + projector.price + mat.price;

        if (totalPrice <= budget) {
          const totalRating = monitor.score + projector.score + mat.rating;

          validCombinations.push({
            launch_monitor: {
              name: monitor.name,
              price: monitor.price,
              technology: monitor.technology,
              placement: monitor.placement,
              purchase_url: monitor.purchase_url,
            },
            projector: {
              name: projector.name,
              price: projector.price,
              throw_ratio: projector.throw_ratio,
              max_image_size: projector.max_image_size,
              purchase_url: projector.purchase_url,
            },
            hitting_mat: {
              name: mat.name,
              price: mat.price,
              rating: mat.rating,
              purchase_url: mat.purchase_url,
            },
            total_price: totalPrice,
            total_rating: totalRating,
          });
        }
      }
    }
  }

  // Sort by rating (descending), then by price (ascending) for ties
  validCombinations.sort((a, b) => {
    if (b.total_rating !== a.total_rating) {
      return b.total_rating - a.total_rating;
    }
    return a.total_price - b.total_price;
  });

  return validCombinations;
}

// ============================================================================
// MAIN RECOMMENDATION FUNCTION
// ============================================================================

export async function getSimulatorRecommendations(
  db: any,
  input: SimulatorInput
): Promise<SimulatorRecommendation> {
  // Validate input
  if (input.ceiling <= 0 || input.width <= 0 || input.depth <= 0 || input.budget <= 0) {
    throw new Error("All dimensions and budget must be positive numbers");
  }

  // Fetch filtered equipment in parallel
  const [launchMonitors, projectors, hittingMats] = await Promise.all([
    getFilteredLaunchMonitors(db, input),
    getFilteredProjectors(db, input.budget),
    getFilteredHittingMats(db, input.budget),
  ]);

  // Generate combinations
  const allCombinations = generateSimulatorCombinations(
    launchMonitors,
    projectors,
    hittingMats,
    input.budget
  );

  // Get top 5
  const topCombinations = allCombinations.slice(0, 5);

  // Get room width guidance
  const roomWidthNote = getRoomWidthNote(input.width);

  return {
    launch_monitors: launchMonitors.map(lm => ({
      name: lm.name,
      price: lm.price,
      technology: lm.technology,
      placement: lm.placement,
      purchase_url: lm.purchase_url,
    })),
    projectors: projectors.map(p => ({
      name: p.name,
      price: p.price,
      throw_ratio: p.throw_ratio,
      max_image_size: p.max_image_size,
      purchase_url: p.purchase_url,
    })),
    hitting_mats: hittingMats.map(hm => ({
      name: hm.name,
      price: hm.price,
      rating: hm.rating,
      purchase_url: hm.purchase_url,
    })),
    valid_combinations: topCombinations,
    room_width_note: roomWidthNote,
  };
}

// ============================================================================
// EXAMPLE USAGE - Next.js API Route
// ============================================================================

/**
 * Example Next.js API route handler
 * File: /app/api/simulator/recommendations/route.ts
 */
/*
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db'; // Your database client

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const input: SimulatorInput = {
      ceiling: parseFloat(body.ceiling),
      width: parseFloat(body.width),
      depth: parseFloat(body.depth),
      budget: parseFloat(body.budget),
    };

    const recommendations = await getSimulatorRecommendations(db, input);

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('Simulator recommendation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
*/

// ============================================================================
// EXAMPLE USAGE - Express.js
// ============================================================================

/**
 * Example Express.js route handler
 */
/*
import express from 'express';
import { db } from './db';

const router = express.Router();

router.post('/api/simulator/recommendations', async (req, res) => {
  try {
    const input: SimulatorInput = {
      ceiling: parseFloat(req.body.ceiling),
      width: parseFloat(req.body.width),
      depth: parseFloat(req.body.depth),
      budget: parseFloat(req.body.budget),
    };

    const recommendations = await getSimulatorRecommendations(db, input);

    res.json(recommendations);
  } catch (error) {
    console.error('Simulator recommendation error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

export default router;
*/
