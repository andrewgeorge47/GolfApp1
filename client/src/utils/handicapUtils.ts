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
  courseSlope: number,
  holesPlayed: number = 18
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

  let usedRating = courseRating;
  let usedSlope = courseSlope;
  let differential: number;
  if (holesPlayed === 9) {
    usedRating = usedRating / 2;
    usedSlope = usedSlope / 2;
    differential = ((totalStrokes - usedRating) * 113) / usedSlope;
    differential = differential * 2; // Double for USGA 9-hole rule
  } else {
    differential = ((totalStrokes - usedRating) * 113) / usedSlope;
  }

  // Round to 6 decimal places for consistency with server calculations
  return Math.round(differential * 1000000) / 1000000;
};

/**
 * Calculate handicap index from differentials using USGA 2020+ rules
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
  } else if (validDifferentials.length >= 15) {
    // Use best 7 out of last 15
    const best7 = validDifferentials.slice(0, 7);
    const average = best7.reduce((sum, diff) => sum + diff, 0) / 7;
    handicapIndex = average * 0.96;
  } else if (validDifferentials.length >= 10) {
    // Use best 6 out of last 10
    const best6 = validDifferentials.slice(0, 6);
    const average = best6.reduce((sum, diff) => sum + diff, 0) / 6;
    handicapIndex = average * 0.96;
  } else if (validDifferentials.length >= 5) {
    // Use best 5 out of last 5
    const best5 = validDifferentials.slice(0, 5);
    const average = best5.reduce((sum, diff) => sum + diff, 0) / 5;
    handicapIndex = average * 0.96;
  } else if (validDifferentials.length >= 3) {
    // Use best 3 out of last 3
    const best3 = validDifferentials.slice(0, 3);
    const average = best3.reduce((sum, diff) => sum + diff, 0) / 3;
    handicapIndex = average * 0.96;
  } else if (validDifferentials.length >= 1) {
    // Use best 1 out of last 1
    handicapIndex = validDifferentials[0] * 0.96;
  } else {
    // No valid differentials
    return 0;
  }

  // Round to 1 decimal place
  return Math.round(handicapIndex * 10) / 10;
}; 