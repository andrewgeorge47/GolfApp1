import React, { useState, useEffect } from 'react';
import { getUserCourse } from '../services/api';
import { getPlatformColorClass, getPlatformIcon, getCourseAssignmentDescription } from '../utils/courseAssignment';

interface User {
  member_id: number;
  first_name: string;
  last_name: string;
  club: string;
}

interface TournamentCourseAssignmentsProps {
  tournamentId: number;
  users: User[];
  className?: string;
}

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

const TournamentCourseAssignments: React.FC<TournamentCourseAssignmentsProps> = ({
  tournamentId,
  users,
  className = ''
}) => {
  const [courseAssignments, setCourseAssignments] = useState<Map<number, UserCourseData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllCourseAssignments = async () => {
      try {
        setLoading(true);
        const assignments = new Map<number, UserCourseData>();
        
        // Fetch course assignments for all users
        const promises = users.map(async (user) => {
          try {
            const response = await getUserCourse(tournamentId, user.member_id);
            assignments.set(user.member_id, response.data);
          } catch (err) {
            console.error(`Error fetching course for user ${user.member_id}:`, err);
          }
        });
        
        await Promise.all(promises);
        setCourseAssignments(assignments);
        setError(null);
      } catch (err) {
        console.error('Error fetching course assignments:', err);
        setError('Failed to load course assignments');
      } finally {
        setLoading(false);
      }
    };

    if (users.length > 0) {
      fetchAllCourseAssignments();
    }
  }, [tournamentId, users]);

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="text-sm text-gray-500">Loading course assignments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="text-sm text-red-500">{error}</div>
      </div>
    );
  }

  // Group users by club for better organization
  const usersByClub = users.reduce((acc, user) => {
    if (!acc[user.club]) {
      acc[user.club] = [];
    }
    acc[user.club].push(user);
    return acc;
  }, {} as Record<string, User[]>);

  return (
    <div className={`${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Course Assignments by Club</h3>
      
      {Object.entries(usersByClub).map(([club, clubUsers]) => {
        const firstUser = clubUsers[0];
        const courseData = courseAssignments.get(firstUser.member_id);
        const platform = courseData?.platform || 'legacy';
        
        return (
          <div key={club} className="mb-6 p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-md font-medium text-gray-700">{club}</h4>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPlatformColorClass(platform)}`}>
                  <span className="mr-1">{getPlatformIcon(platform)}</span>
                  {platform.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500">
                  {courseData?.course || 'No course assigned'}
                </span>
              </div>
            </div>
            
            <div className="text-xs text-gray-500 mb-2">
              {getCourseAssignmentDescription(club)}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {clubUsers.map((user) => (
                <div key={user.member_id} className="text-sm text-gray-600">
                  {user.first_name} {user.last_name}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TournamentCourseAssignments;

