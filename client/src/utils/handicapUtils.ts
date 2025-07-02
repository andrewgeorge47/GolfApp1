/**
 * Utility functions for handicap calculations
 */

/**
 * Calculate handicap differential using USGA formula
 * @param totalStrokes - Total strokes for the round
 * @param courseRating - Course rating from the teebox
 * @param courseSlope - Course slope from the teebox
 * @returns Handicap differential rounded to 6 decimal places, or null if calculation not possible
 */
export const calculateHandicapDifferential = (
  totalStrokes: number,
  courseRating: number,
  courseSlope: number
): number | null => {
  // Validate inputs
  if (
    totalStrokes <= 0 ||
    !courseRating ||
    !courseSlope ||
    courseSlope <= 0 ||
    isNaN(totalStrokes) ||
    isNaN(courseRating) ||
    isNaN(courseSlope)
  ) {
    return null;
  }

  // USGA formula: ((Score - Course Rating) × 113) ÷ Slope Rating
  const differential = ((totalStrokes - courseRating) * 113) / courseSlope;
  
  // Round to 6 decimal places for consistency with server calculations
  return Math.round(differential * 1000000) / 1000000;
};

/**
 * Calculate handicap index from differentials using USGA rules
 * @param differentials - Array of handicap differentials (best first)
 * @returns Handicap index rounded to 1 decimal place
 */
export const calculateHandicapIndex = (differentials: number[]): number => {
  if (differentials.length === 0) return 0;

  // Filter out invalid differentials
  const validDifferentials = differentials.filter(diff => 
    !isNaN(diff) && isFinite(diff) && diff > 0
  );

  if (validDifferentials.length === 0) return 0;

  let handicapIndex: number;

  if (validDifferentials.length >= 20) {
    // Use best 8 out of last 20
    const best8 = validDifferentials.slice(0, 8);
    const average = best8.reduce((sum, diff) => sum + diff, 0) / 8;
    handicapIndex = average * 0.96; // USGA formula
  } else if (validDifferentials.length >= 10) {
    // Use best 3 out of last 10
    const best3 = validDifferentials.slice(0, 3);
    const average = best3.reduce((sum, diff) => sum + diff, 0) / 3;
    handicapIndex = average * 0.96;
  } else if (validDifferentials.length >= 5) {
    // Use best 1 out of last 5
    handicapIndex = validDifferentials[0] * 0.96;
  } else {
    // Use the best differential available
    handicapIndex = validDifferentials[0] * 0.96;
  }

  // Round to 1 decimal place
  return Math.round(handicapIndex * 10) / 10;
}; 