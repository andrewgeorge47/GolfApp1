import { calculateHandicapDifferential, calculateHandicapIndex } from './handicapUtils';

describe('Handicap Utilities', () => {
  describe('calculateHandicapDifferential', () => {
    it('should calculate differential correctly for valid inputs', () => {
      const result = calculateHandicapDifferential(85, 72.0, 130);
      // Expected: ((85 - 72.0) * 113) / 130 = (13 * 113) / 130 = 1469 / 130 = 11.3
      expect(result).toBe(11.3);
    });

    it('should return null for invalid inputs', () => {
      expect(calculateHandicapDifferential(0, 72.0, 130)).toBeNull();
      expect(calculateHandicapDifferential(85, 0, 130)).toBeNull();
      expect(calculateHandicapDifferential(85, 72.0, 0)).toBeNull();
      expect(calculateHandicapDifferential(-1, 72.0, 130)).toBeNull();
      expect(calculateHandicapDifferential(85, NaN, 130)).toBeNull();
      expect(calculateHandicapDifferential(85, 72.0, NaN)).toBeNull();
    });

    it('should handle edge cases', () => {
      // Very low score (good round)
      const lowScore = calculateHandicapDifferential(65, 72.0, 130);
      // ((65 - 72.0) * 113) / 130 = (-7 * 113) / 130 = -791 / 130 = -6.084615...
      expect(lowScore).toBe(-6.084615); // Negative differential for good round

      // Very high score (bad round)
      const highScore = calculateHandicapDifferential(95, 72.0, 130);
      // ((95 - 72.0) * 113) / 130 = (23 * 113) / 130 = 2599 / 130 = 19.992307...
      expect(highScore).toBe(19.992308); // High positive differential for bad round

      // Par round
      const parRound = calculateHandicapDifferential(72, 72.0, 130);
      expect(parRound).toBe(0); // Zero differential for par round
    });

    it('should round to 6 decimal places', () => {
      const result = calculateHandicapDifferential(83, 72.0, 130);
      // ((83 - 72.0) * 113) / 130 = (11 * 113) / 130 = 1243 / 130 = 9.561538...
      expect(result).toBe(9.561538);
    });
  });

  describe('calculateHandicapIndex', () => {
    it('should calculate handicap index for 20+ differentials', () => {
      const differentials = [5.2, 6.1, 7.3, 8.0, 9.1, 10.2, 11.0, 12.1, 13.0, 14.1, 15.0, 16.1, 17.0, 18.1, 19.0, 20.1, 21.0, 22.1, 23.0, 24.1];
      const result = calculateHandicapIndex(differentials);
      // Best 8: [5.2, 6.1, 7.3, 8.0, 9.1, 10.2, 11.0, 12.1]
      // Average: (5.2 + 6.1 + 7.3 + 8.0 + 9.1 + 10.2 + 11.0 + 12.1) / 8 = 8.625
      // Handicap: 8.625 * 0.96 = 8.28
      expect(result).toBe(8.3);
    });

    it('should calculate handicap index for 15-19 differentials', () => {
      const differentials = [5.2, 6.1, 7.3, 8.0, 9.1, 10.2, 11.0, 12.1, 13.0, 14.1, 15.0, 16.1, 17.0, 18.1, 19.0];
      const result = calculateHandicapIndex(differentials);
      // Best 7: [5.2, 6.1, 7.3, 8.0, 9.1, 10.2, 11.0]
      // Average: (5.2 + 6.1 + 7.3 + 8.0 + 9.1 + 10.2 + 11.0) / 7 = 8.128571...
      // Handicap: 8.128571... * 0.96 = 7.803428...
      expect(result).toBe(7.8);
    });

    it('should calculate handicap index for 10-14 differentials', () => {
      const differentials = [5.2, 6.1, 7.3, 8.0, 9.1, 10.2, 11.0, 12.1, 13.0, 14.1];
      const result = calculateHandicapIndex(differentials);
      // Best 6: [5.2, 6.1, 7.3, 8.0, 9.1, 10.2]
      // Average: (5.2 + 6.1 + 7.3 + 8.0 + 9.1 + 10.2) / 6 = 7.65
      // Handicap: 7.65 * 0.96 = 7.344
      expect(result).toBe(7.3);
    });

    it('should calculate handicap index for 5-9 differentials', () => {
      const differentials = [5.2, 6.1, 7.3, 8.0, 9.1];
      const result = calculateHandicapIndex(differentials);
      // Best 5: [5.2, 6.1, 7.3, 8.0, 9.1]
      // Average: (5.2 + 6.1 + 7.3 + 8.0 + 9.1) / 5 = 7.14
      // Handicap: 7.14 * 0.96 = 6.8544
      expect(result).toBe(6.9);
    });

    it('should calculate handicap index for 3-4 differentials', () => {
      const differentials = [5.2, 6.1, 7.3];
      const result = calculateHandicapIndex(differentials);
      // Best 3: [5.2, 6.1, 7.3]
      // Average: (5.2 + 6.1 + 7.3) / 3 = 6.2
      // Handicap: 6.2 * 0.96 = 5.952
      expect(result).toBe(6.0);
    });

    it('should calculate handicap index for 1-2 differentials', () => {
      const differentials = [5.2, 6.1];
      const result = calculateHandicapIndex(differentials);
      // Best 1: [5.2]
      // Handicap: 5.2 * 0.96 = 4.992
      expect(result).toBe(5.0);
    });

    it('should return 0 for empty array', () => {
      expect(calculateHandicapIndex([])).toBe(0);
    });

    it('should filter out invalid differentials', () => {
      const differentials = [5.2, NaN, 6.1, Infinity, 7.3, -1, 8.0];
      const result = calculateHandicapIndex(differentials);
      // Valid differentials: [5.2, 6.1, 7.3, 8.0]
      // Best 3 of 3: [5.2, 6.1, 7.3]
      // Average: (5.2 + 6.1 + 7.3) / 3 = 6.2
      // Handicap: 6.2 * 0.96 = 5.952
      expect(result).toBe(6.0);
    });
  });
}); 