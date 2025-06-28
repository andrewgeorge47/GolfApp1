// GolfAPI service for course data integration
class GolfAPI {
  private apiKey: string;
  private baseURL: string = 'https://www.golfapi.io/api/v2.3';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request(endpoint: string, params: Record<string, any> = {}) {
    const url = new URL(`${this.baseURL}${endpoint}`);
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`GolfAPI request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  // Search for golf clubs
  async searchClubs(params: {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    lat?: number;
    lng?: number;
    measureUnit?: 'km' | 'mi' | 'yd' | 'm';
    page?: number;
  }) {
    return this.request('/clubs', params);
  }

  // Get club details by ID
  async getClub(clubId: string) {
    return this.request(`/clubs/${clubId}`);
  }

  // Search for golf courses
  async searchCourses(params: {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    lat?: number;
    lng?: number;
    measureUnit?: 'km' | 'mi' | 'yd' | 'm';
    page?: number;
  }) {
    return this.request('/courses', params);
  }

  // Get course details by ID
  async getCourse(courseId: string, measureUnit?: 'm' | 'yd') {
    const params = measureUnit ? { measureUnit } : {};
    return this.request(`/courses/${courseId}`, params);
  }

  // Get course coordinates
  async getCourseCoordinates(courseId: string) {
    return this.request(`/coordinates/${courseId}`);
  }
}

// Course and club interfaces
export interface GolfClub {
  clubID: string;
  clubName: string;
  city: string;
  state: string;
  country: string;
  address: string;
  timestampUpdated: string;
  distance?: number;
  measureUnit?: string;
  courses: GolfCourse[];
}

export interface GolfCourse {
  courseID: string;
  courseName: string;
  numHoles: number;
  timestampUpdated: string;
  hasGPS: number;
}

export interface CourseDetails {
  clubID: string;
  clubName: string;
  address: string;
  postalCode: string;
  city: string;
  state: string;
  country: string;
  latitude: string;
  longitude: string;
  website: string;
  telephone: string;
  courseID: string;
  courseName: string;
  numHoles: string;
  timestampUpdated: string;
  hasGPS: string;
  measure: string;
  numCoordinates: number;
  parsMen: number[];
  indexesMen: number[];
  parsWomen: number[];
  indexesWomen: number[];
  numTees: number;
  tees: TeeInfo[];
  oldCourseIDs: string[];
}

export interface TeeInfo {
  teeID: string;
  teeName: string;
  teeColor: string;
  length1: number;
  length2: number;
  length3: number;
  length4: number;
  length5: number;
  length6: number;
  length7: number;
  length8: number;
  length9: number;
  length10: number;
  length11: number;
  length12: number;
  length13: number;
  length14: number;
  length15: number;
  length16: number;
  length17: number;
  length18: number;
  courseRatingMen: number;
  slopeMen: number;
  courseRatingWomen: string;
  slopeWomen: string;
  courseRatingMenFront9: number;
  courseRatingMenBack9: number;
  slopeMenFront9: number;
  slopeMenBack9: number;
  courseRatingWomenFront9: string;
  courseRatingWomenBack9: string;
  slopeWomenFront9: string;
  slopeWomenBack9: string;
}

export interface CourseCoordinate {
  poi: number;
  location: number;
  sideFW: number;
  hole: number;
  latitude: number;
  longitude: number;
}

export interface GolfAPIResponse<T> {
  apiRequestsLeft: string;
  [key: string]: any;
}

export default GolfAPI; 