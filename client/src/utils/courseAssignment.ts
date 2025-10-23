// Utility functions for course assignment based on club

export type Platform = 'gspro' | 'trackman' | 'legacy';

export interface CourseAssignment {
  course: string;
  course_id: number;
  platform: Platform;
}

/**
 * Determines which course platform a user should use based on their club
 * @param userClub - The user's club (e.g., "No. 8", "No. 1", etc.)
 * @returns The platform preference for the user
 */
export function getUserCoursePreference(userClub: string): Platform {
  // Club No. 8 uses Trackman, all other clubs use GSPro
  return userClub === 'No. 8' ? 'trackman' : 'gspro';
}

/**
 * Gets the appropriate course for a user from tournament data
 * @param tournament - Tournament object with course information
 * @param userClub - The user's club
 * @returns Course assignment information
 */
export function getUserCourse(tournament: any, userClub: string): CourseAssignment {
  const preference = getUserCoursePreference(userClub);
  
  if (preference === 'trackman' && tournament.trackman_course_id) {
    return {
      course: tournament.trackman_course,
      course_id: tournament.trackman_course_id,
      platform: 'trackman'
    };
  } else if (preference === 'gspro' && tournament.gspro_course_id) {
    return {
      course: tournament.gspro_course,
      course_id: tournament.gspro_course_id,
      platform: 'gspro'
    };
  }
  
  // Fallback to legacy course if platform-specific course not available
  return {
    course: tournament.course,
    course_id: tournament.course_id,
    platform: 'legacy'
  };
}

/**
 * Gets the platform color class for styling
 * @param platform - The platform type
 * @returns Tailwind CSS class string
 */
export function getPlatformColorClass(platform: Platform): string {
  switch (platform) {
    case 'gspro':
      return 'bg-blue-100 text-blue-800';
    case 'trackman':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Gets the platform icon
 * @param platform - The platform type
 * @returns Icon emoji
 */
export function getPlatformIcon(platform: Platform): string {
  switch (platform) {
    case 'gspro':
      return '🎯';
    case 'trackman':
      return '📊';
    default:
      return '🏌️';
  }
}

/**
 * Gets a human-readable description of the course assignment rule
 * @param userClub - The user's club
 * @returns Description string
 */
export function getCourseAssignmentDescription(userClub: string): string {
  return userClub === 'No. 8' 
    ? 'Club No. 8 uses Trackman' 
    : 'All other clubs use GSPro';
}

