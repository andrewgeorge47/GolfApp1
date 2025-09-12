import React, { useState, useEffect } from 'react';
import { getUserCourse } from '../services/api';
import { getPlatformColorClass, getPlatformIcon, getCourseAssignmentDescription } from '../utils/courseAssignment';

interface CourseAssignmentInfoProps {
  tournamentId: number;
  userId: number;
  userClub: string;
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

const CourseAssignmentInfo: React.FC<CourseAssignmentInfoProps> = ({
  tournamentId,
  userId,
  userClub,
  className = ''
}) => {
  const [courseData, setCourseData] = useState<UserCourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserCourse = async () => {
      try {
        setLoading(true);
        const response = await getUserCourse(tournamentId, userId);
        setCourseData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching user course:', err);
        setError('Failed to load course information');
      } finally {
        setLoading(false);
      }
    };

    fetchUserCourse();
  }, [tournamentId, userId]);

  if (loading) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        Loading course assignment...
      </div>
    );
  }

  if (error || !courseData) {
    return (
      <div className={`text-sm text-red-500 ${className}`}>
        {error || 'Course information unavailable'}
      </div>
    );
  }


  return (
    <div className={`${className}`}>
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700">
          Course Assignment:
        </span>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPlatformColorClass(courseData.platform)}`}>
          <span className="mr-1">{getPlatformIcon(courseData.platform)}</span>
          {courseData.course || 'No course assigned'}
        </span>
        <span className="text-xs text-gray-500">
          ({courseData.platform.toUpperCase()})
        </span>
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {getCourseAssignmentDescription(userClub)}
      </div>
    </div>
  );
};

export default CourseAssignmentInfo;
