import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import NewWeeklyScoring from './NewWeeklyScoring';
import { useAuth } from '../AuthContext';
import { submitWeeklyScorecard, getWeeklyLeaderboard, getWeeklyFieldStats } from '../services/api';

// Mock the dependencies
jest.mock('react-toastify');
jest.mock('../AuthContext');
jest.mock('../services/api');
jest.mock('../hooks/useRealTimeUpdates', () => ({
  useRealTimeUpdates: jest.fn(() => ({
    isConnected: true,
    lastUpdateTime: new Date(),
    error: null,
    manualRefresh: jest.fn(),
    connectionStatus: 'connected'
  }))
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockSubmitWeeklyScorecard = submitWeeklyScorecard as jest.MockedFunction<typeof submitWeeklyScorecard>;
const mockGetWeeklyLeaderboard = getWeeklyLeaderboard as jest.MockedFunction<typeof getWeeklyLeaderboard>;
const mockGetWeeklyFieldStats = getWeeklyFieldStats as jest.MockedFunction<typeof getWeeklyFieldStats>;

describe('NewWeeklyScoring', () => {
  const defaultProps = {
    tournamentId: 1,
    tournamentName: 'Test Tournament',
    onScoreSubmitted: jest.fn()
  };

  const mockUser = {
    user_id: 123,
    member_id: 123,
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    club: 'Test Club',
    role: 'Member'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ 
      user: mockUser,
      token: 'mock-token',
      login: jest.fn(),
      logout: jest.fn(),
      loading: false,
      refreshUser: jest.fn(),
      viewAsMode: {
        isActive: false,
        originalUser: null,
        viewAsPermissions: [],
        viewAsRoles: [],
        viewAsPrimaryRole: '',
        viewAsClub: ''
      },
      enterViewAsMode: jest.fn(),
      exitViewAsMode: jest.fn(),
      isAdmin: false
    });
    
    // Mock API responses
    mockGetWeeklyLeaderboard.mockResolvedValue({
      data: [
        {
          user_id: 123,
          first_name: 'John',
          last_name: 'Doe',
          club: 'Test Club',
          total_score: 15.5,
          total_hole_points: 10,
          total_round_points: 3,

          matches_played: 3,
          matches_won: 2,
          matches_tied: 0,
          matches_lost: 1,
          live_matches_played: 1,
          // Add hole_scores as an extended property for testing
          hole_scores: [3, 4, 3, 4, 3, 4, 3, 4, 3]
        } as any // Type assertion to allow hole_scores
      ],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any
    });

    mockGetWeeklyFieldStats.mockResolvedValue({
      data: [
        { hole: 1, averageScore: 3.5, totalPlayers: 10, bestScore: 2 },
        { hole: 2, averageScore: 4.2, totalPlayers: 10, bestScore: 3 }
      ],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any
    });

    mockSubmitWeeklyScorecard.mockResolvedValue({
      data: { 
        id: 1, 
        user_id: 123, 
        tournament_id: 1, 
        week_start_date: '2025-01-20',
        hole_scores: [3, 4, 0, 0, 0, 0, 0, 0, 0],
        total_score: 7,
        is_live: false,
        submitted_at: '2025-01-20T10:00:00Z',
        created_at: '2025-01-20T10:00:00Z'
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any
    });
  });

  it('renders without crashing', () => {
    render(<NewWeeklyScoring {...defaultProps} />);
    expect(screen.getByText('Test Tournament')).toBeInTheDocument();
  });

  it('shows live status indicator', () => {
    render(<NewWeeklyScoring {...defaultProps} />);
    expect(screen.getByText('Live Updates')).toBeInTheDocument();
  });

  it('allows manual refresh', async () => {
    render(<NewWeeklyScoring {...defaultProps} />);
    
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith('Refreshing live data...');
    });
  });

  it('shows connection status', () => {
    render(<NewWeeklyScoring {...defaultProps} />);
    expect(screen.getByText('connected')).toBeInTheDocument();
  });

  it('allows changing refresh interval', () => {
    render(<NewWeeklyScoring {...defaultProps} />);
    
    const intervalSelect = screen.getByDisplayValue('10');
    fireEvent.change(intervalSelect, { target: { value: '30' } });
    
    expect(intervalSelect).toHaveValue('30');
  });

  it('toggles auto refresh mode', () => {
    render(<NewWeeklyScoring {...defaultProps} />);
    
    const autoButton = screen.getByText('Auto');
    fireEvent.click(autoButton);
    
    expect(screen.getByText('Manual')).toBeInTheDocument();
  });

  it('shows round selection buttons', () => {
    render(<NewWeeklyScoring {...defaultProps} />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('allows changing rounds', () => {
    render(<NewWeeklyScoring {...defaultProps} />);
    
    const round2Button = screen.getByText('2');
    fireEvent.click(round2Button);
    
    // The round 2 button should now be highlighted
    expect(round2Button.closest('button')).toHaveClass('bg-blue-600');
  });

  it('shows hole input fields', () => {
    render(<NewWeeklyScoring {...defaultProps} />);
    
    // Should show 3 holes for the current round
    const holeInputs = screen.getAllByPlaceholderText('0');
    expect(holeInputs).toHaveLength(3);
  });

  it('allows entering hole scores', () => {
    render(<NewWeeklyScoring {...defaultProps} />);
    
    const firstHoleInput = screen.getAllByPlaceholderText('0')[0];
    fireEvent.change(firstHoleInput, { target: { value: '4' } });
    
    expect(firstHoleInput).toHaveValue(4);
  });

  it('submits hole scores successfully', async () => {
    render(<NewWeeklyScoring {...defaultProps} />);
    
    const firstHoleInput = screen.getAllByPlaceholderText('0')[0];
    fireEvent.change(firstHoleInput, { target: { value: '4' } });
    
    const submitButton = screen.getAllByText('→')[0];
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockSubmitWeeklyScorecard).toHaveBeenCalledWith(1, {
        hole_scores: [4, 0, 0, 0, 0, 0, 0, 0, 0],
        is_live: false,
        group_id: undefined
      });
    });
  });

  it('shows leaderboard with player data', async () => {
    render(<NewWeeklyScoring {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Test Club')).toBeInTheDocument();
    });
  });

  it('shows field statistics', async () => {
    render(<NewWeeklyScoring {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('3.5')).toBeInTheDocument(); // Field average
    });
  });

  it('handles API errors gracefully', async () => {
    mockGetWeeklyLeaderboard.mockRejectedValue(new Error('Network error'));
    
    render(<NewWeeklyScoring {...defaultProps} />);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Connection error: Network error');
    });
  });

  it('shows last update time', () => {
    render(<NewWeeklyScoring {...defaultProps} />);
    
    const lastUpdateText = screen.getByText(/Last update:/);
    expect(lastUpdateText).toBeInTheDocument();
  });

  it('displays player count in leaderboard', async () => {
    render(<NewWeeklyScoring {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('1 players')).toBeInTheDocument();
    });
  });
}); 