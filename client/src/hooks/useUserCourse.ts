import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { getUserCourse } from '../services/api';
import { getUserCourse as getUserCourseUtil } from '../utils/courseAssignment';

interface UserCourseData {
  tournament_id: number;
  tournament_name: string;
  user_id: number;
  user_name: string;
  user_club: string;
  course_preference: 'gspro' | 'trackman';
  course: string;
  course_id: number;
  platform: 'gspro' | 'trackman' | 'legacy';
}

interface UseUserCourseResult {
  courseData: UserCourseData | null;
  loading: boolean;
  error: string | null;
  courseId: number | null;
}

/**
 * Hook to get the appropriate course for a user based on their club
 * @param tournamentId - The tournament ID
 * @param tournament - Tournament object with course information
 * @returns Course data and loading state
 */
export const useUserCourse = (tournamentId: number, tournament: any): UseUserCourseResult => {
  const { user } = useAuth();
  const [courseData, setCourseData] = useState<UserCourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserCourse = async () => {
      if (!user || !tournament) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // First try to get course assignment from the API
        try {
          const response = await getUserCourse(tournamentId, user.member_id);
          setCourseData(response.data);
        } catch (apiError) {
          console.warn('API course assignment failed, falling back to local logic:', apiError);
          
          // Fallback to local logic if API fails
          const localCourse = getUserCourseUtil(tournament, user.club);
          setCourseData({
            tournament_id: tournamentId,
            tournament_name: tournament.name,
            user_id: user.member_id,
            user_name: `${user.first_name} ${user.last_name}`,
            user_club: user.club,
            course_preference: user.club === 'No. 8' ? 'trackman' : 'gspro',
            course: localCourse.course,
            course_id: localCourse.course_id,
            platform: localCourse.platform
          });
        }
      } catch (err) {
        console.error('Error fetching user course:', err);
        setError('Failed to load course assignment');
      } finally {
        setLoading(false);
      }
    };

    fetchUserCourse();
  }, [tournamentId, tournament, user]);

  return {
    courseData,
    loading,
    error,
    courseId: courseData?.course_id || null
  };
};
