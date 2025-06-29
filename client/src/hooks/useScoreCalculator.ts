import { useState, useCallback } from 'react';

export interface ScoreData {
  strokes: number;
  mulligans: number;
  total: number;
}

export interface HoleScore {
  hole: number;
  strokes: number;
  mulligans: number;
  total: number;
}

export interface PlayerInfo {
  name: string;
  date: string;
  handicap: number;
}

export interface ScoreCardData {
  playerInfo: PlayerInfo;
  holes: HoleScore[];
  totalStrokes: number;
  totalMulligans: number;
  finalScore: number;
}

const TOTAL_MULLIGANS = 3; // Standard mulligan count

export const useScoreCalculator = (holes: number = 18) => {
  const [scoreCard, setScoreCard] = useState<ScoreCardData>({
    playerInfo: {
      name: '',
      date: new Date().toISOString().split('T')[0],
      handicap: 0
    },
    holes: Array.from({ length: holes }, (_, i) => ({
      hole: i + 1,
      strokes: 0,
      mulligans: 0,
      total: 0
    })),
    totalStrokes: 0,
    totalMulligans: 0,
    finalScore: 0
  });

  // Update player info
  const updatePlayerInfo = useCallback((field: keyof PlayerInfo, value: string | number) => {
    setScoreCard(prev => ({
      ...prev,
      playerInfo: {
        ...prev.playerInfo,
        [field]: value
      }
    }));
  }, []);

  // Update hole score
  const updateHoleScore = useCallback((holeNumber: number, field: 'strokes' | 'mulligans', value: number) => {
    setScoreCard(prev => {
      const updatedHoles = prev.holes.map(hole => {
        if (hole.hole === holeNumber) {
          const updatedHole = { ...hole, [field]: Math.max(0, value) };
          
          // Calculate total for this hole (strokes + mulligans)
          updatedHole.total = updatedHole.strokes + updatedHole.mulligans;
          
          return updatedHole;
        }
        return hole;
      });

      // Calculate totals
      const totalStrokes = updatedHoles.reduce((sum, hole) => sum + hole.strokes, 0);
      const totalMulligans = updatedHoles.reduce((sum, hole) => sum + hole.mulligans, 0);
      const finalScore = totalStrokes + totalMulligans;

      return {
        ...prev,
        holes: updatedHoles,
        totalStrokes,
        totalMulligans,
        finalScore
      };
    });
  }, []);

  // Apply mulligan on a hole
  const applyMulligan = useCallback((holeNumber: number) => {
    setScoreCard(prev => {
      const currentMulligans = prev.holes.reduce((sum, hole) => sum + hole.mulligans, 0);
      // Check if mulligans are available
      if (currentMulligans >= TOTAL_MULLIGANS) {
        return prev; // No mulligans left
      }
      const updatedHoles = prev.holes.map(hole => {
        if (hole.hole === holeNumber) {
          const updatedHole = { ...hole, mulligans: hole.mulligans + 1 };
          updatedHole.total = updatedHole.strokes + updatedHole.mulligans;
          return updatedHole;
        }
        return hole;
      });
      const totalStrokes = updatedHoles.reduce((sum, hole) => sum + hole.strokes, 0);
      const totalMulligans = updatedHoles.reduce((sum, hole) => sum + hole.mulligans, 0);
      const finalScore = totalStrokes + totalMulligans;
      return {
        ...prev,
        holes: updatedHoles,
        totalStrokes,
        totalMulligans,
        finalScore
      };
    });
  }, []);

  // Revoke mulligan from a hole
  const revokeMulligan = useCallback((holeNumber: number) => {
    setScoreCard(prev => {
      const currentMulligans = prev.holes.find(h => h.hole === holeNumber)?.mulligans || 0;
      if (currentMulligans <= 0) return prev;
      const updatedHoles = prev.holes.map(hole => {
        if (hole.hole === holeNumber) {
          const updatedHole = { ...hole, mulligans: hole.mulligans - 1 };
          updatedHole.total = updatedHole.strokes + updatedHole.mulligans;
          return updatedHole;
        }
        return hole;
      });
      const totalStrokes = updatedHoles.reduce((sum, hole) => sum + hole.strokes, 0);
      const totalMulligans = updatedHoles.reduce((sum, hole) => sum + hole.mulligans, 0);
      const finalScore = totalStrokes + totalMulligans;
      return {
        ...prev,
        holes: updatedHoles,
        totalStrokes,
        totalMulligans,
        finalScore
      };
    });
  }, []);

  // Get remaining mulligans
  const getRemainingMulligans = useCallback(() => {
    const usedMulligans = scoreCard.holes.reduce((sum, hole) => sum + hole.mulligans, 0);
    return TOTAL_MULLIGANS - usedMulligans;
  }, [scoreCard.holes]);

  // Validate scorecard
  const validateScoreCard = useCallback(() => {
    const errors: string[] = [];
    
    if (!scoreCard.playerInfo.name.trim()) {
      errors.push('Player name is required');
    }
    
    if (!scoreCard.playerInfo.date) {
      errors.push('Date is required');
    }
    
    const usedMulligans = scoreCard.holes.reduce((sum, hole) => sum + hole.mulligans, 0);
    if (usedMulligans > TOTAL_MULLIGANS) {
      errors.push(`Cannot use more than ${TOTAL_MULLIGANS} mulligans`);
    }
    
    const holesWithScores = scoreCard.holes.filter(hole => hole.strokes > 0).length;
    if (holesWithScores === 0) {
      errors.push('At least one hole must have a score');
    }
    
    return errors;
  }, [scoreCard]);

  // Reset scorecard
  const resetScoreCard = useCallback(() => {
    setScoreCard({
      playerInfo: {
        name: '',
        date: new Date().toISOString().split('T')[0],
        handicap: 0
      },
      holes: Array.from({ length: holes }, (_, i) => ({
        hole: i + 1,
        strokes: 0,
        mulligans: 0,
        total: 0
      })),
      totalStrokes: 0,
      totalMulligans: 0,
      finalScore: 0
    });
  }, [holes]);

  // Get score statistics
  const getScoreStats = useCallback(() => {
    const holesWithScores = scoreCard.holes.filter(hole => hole.strokes > 0);
    const totalHoles = holesWithScores.length;
    
    if (totalHoles === 0) return null;
    
    const averageScore = totalHoles > 0 ? scoreCard.totalStrokes / totalHoles : 0;
    const bestHole = holesWithScores.reduce((min, hole) => 
      hole.strokes < min.strokes ? hole : min
    );
    const worstHole = holesWithScores.reduce((max, hole) => 
      hole.strokes > max.strokes ? hole : max
    );
    
    return {
      totalHoles,
      averageScore: Math.round(averageScore * 10) / 10,
      bestHole,
      worstHole,
      mulliganEfficiency: scoreCard.totalMulligans > 0 ? 
        Math.round((scoreCard.totalMulligans / TOTAL_MULLIGANS) * 100) : 0
    };
  }, [scoreCard]);

  return {
    scoreCard,
    updatePlayerInfo,
    updateHoleScore,
    applyMulligan,
    revokeMulligan,
    getRemainingMulligans,
    validateScoreCard,
    resetScoreCard,
    getScoreStats,
    TOTAL_MULLIGANS,
    HOLES: holes
  };
}; 