const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Function to normalize course names for matching
function normalizeCourseName(name) {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .replace(/\b(golf club|country club|the|gc|cc)\b/g, '') // Remove common suffixes
    .trim();
}

// Function to calculate Levenshtein distance for fuzzy matching
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Function to calculate similarity percentage
function calculateSimilarity(str1, str2) {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength > 0 ? ((maxLength - distance) / maxLength) * 100 : 0;
}

async function createCombinedCoursesTable() {
  try {
    // Create the combined courses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS simulator_courses_combined (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        platforms TEXT[] NOT NULL,
        gspro_id INTEGER,
        trackman_id INTEGER,
        location TEXT,
        designer TEXT,
        elevation INTEGER,
        course_types TEXT[],
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for better performance
    await pool.query('CREATE INDEX IF NOT EXISTS idx_simulator_courses_combined_platforms ON simulator_courses_combined USING gin(platforms)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_simulator_courses_combined_name ON simulator_courses_combined(name)');

    console.log('Combined courses table created successfully');
  } catch (error) {
    console.error('Error creating combined courses table:', error);
    throw error;
  }
}

async function populateCombinedCourses() {
  const client = await pool.connect();
  
  try {
    console.log('Starting to populate combined courses table...');
    
    // Create table if it doesn't exist
    await createCombinedCoursesTable();
    
    // Clear existing data
    await client.query('DELETE FROM simulator_courses_combined');
    console.log('Cleared existing combined courses data');
    
    // Fetch all GSPro courses
    const gsproResult = await client.query(`
      SELECT id, name, location, designer, elevation,
             is_par3, is_beginner, is_coastal, is_desert, is_fantasy,
             is_heathland, is_historic, is_links, is_lowpoly, is_major_venue,
             is_mountain, is_parkland, is_tour_stop, is_training, is_tropical
      FROM gspro_courses
      ORDER BY name
    `);
    
    // Fetch all Trackman courses
    const trackmanResult = await client.query(`
      SELECT id, name
      FROM trackman_courses
      ORDER BY name
    `);
    
    console.log(`Found ${gsproResult.rows.length} GSPro courses and ${trackmanResult.rows.length} Trackman courses`);
    
    // Create normalized name maps for faster lookup
    const gsproMap = new Map();
    const trackmanMap = new Map();
    
    gsproResult.rows.forEach(course => {
      const normalized = normalizeCourseName(course.name);
      if (!gsproMap.has(normalized)) {
        gsproMap.set(normalized, []);
      }
      gsproMap.get(normalized).push(course);
    });
    
    trackmanResult.rows.forEach(course => {
      const normalized = normalizeCourseName(course.name);
      if (!trackmanMap.has(normalized)) {
        trackmanMap.set(normalized, []);
      }
      trackmanMap.get(normalized).push(course);
    });
    
    // Find matches and create combined entries
    const combinedCourses = [];
    const processedGsproIds = new Set();
    const processedTrackmanIds = new Set();
    
    // First pass: exact matches
    for (const [normalizedName, gsproCourses] of gsproMap) {
      if (trackmanMap.has(normalizedName)) {
        const trackmanCourses = trackmanMap.get(normalizedName);
        
        // Create combined entries for all combinations
        for (const gsproCourse of gsproCourses) {
          for (const trackmanCourse of trackmanCourses) {
            const courseTypes = [];
            if (gsproCourse.is_par3) courseTypes.push('Par 3');
            if (gsproCourse.is_beginner) courseTypes.push('Beginner');
            if (gsproCourse.is_coastal) courseTypes.push('Coastal');
            if (gsproCourse.is_desert) courseTypes.push('Desert');
            if (gsproCourse.is_fantasy) courseTypes.push('Fantasy');
            if (gsproCourse.is_heathland) courseTypes.push('Heathland');
            if (gsproCourse.is_historic) courseTypes.push('Historic');
            if (gsproCourse.is_links) courseTypes.push('Links');
            if (gsproCourse.is_lowpoly) courseTypes.push('Low Poly');
            if (gsproCourse.is_major_venue) courseTypes.push('Major Venue');
            if (gsproCourse.is_mountain) courseTypes.push('Mountain');
            if (gsproCourse.is_parkland) courseTypes.push('Parkland');
            if (gsproCourse.is_tour_stop) courseTypes.push('Tour Stop');
            if (gsproCourse.is_training) courseTypes.push('Training');
            if (gsproCourse.is_tropical) courseTypes.push('Tropical');
            
            combinedCourses.push({
              name: gsproCourse.name,
              platforms: ['GSPro', 'Trackman'],
              gspro_id: gsproCourse.id,
              trackman_id: trackmanCourse.id,
              location: gsproCourse.location,
              designer: gsproCourse.designer,
              elevation: gsproCourse.elevation,
              course_types: courseTypes
            });
            
            processedGsproIds.add(gsproCourse.id);
            processedTrackmanIds.add(trackmanCourse.id);
          }
        }
      }
    }
    
    // Second pass: fuzzy matching for remaining courses
    const remainingGspro = gsproResult.rows.filter(course => !processedGsproIds.has(course.id));
    const remainingTrackman = trackmanResult.rows.filter(course => !processedTrackmanIds.has(course.id));
    
    console.log(`Found ${combinedCourses.length} exact matches`);
    console.log(`Remaining: ${remainingGspro.length} GSPro courses, ${remainingTrackman.length} Trackman courses`);
    
    // Fuzzy matching with 80% similarity threshold
    for (const gsproCourse of remainingGspro) {
      const gsproNormalized = normalizeCourseName(gsproCourse.name);
      
      for (const trackmanCourse of remainingTrackman) {
        const trackmanNormalized = normalizeCourseName(trackmanCourse.name);
        
        const similarity = calculateSimilarity(gsproNormalized, trackmanNormalized);
        
        if (similarity >= 80) {
          const courseTypes = [];
          if (gsproCourse.is_par3) courseTypes.push('Par 3');
          if (gsproCourse.is_beginner) courseTypes.push('Beginner');
          if (gsproCourse.is_coastal) courseTypes.push('Coastal');
          if (gsproCourse.is_desert) courseTypes.push('Desert');
          if (gsproCourse.is_fantasy) courseTypes.push('Fantasy');
          if (gsproCourse.is_heathland) courseTypes.push('Heathland');
          if (gsproCourse.is_historic) courseTypes.push('Historic');
          if (gsproCourse.is_links) courseTypes.push('Links');
          if (gsproCourse.is_lowpoly) courseTypes.push('Low Poly');
          if (gsproCourse.is_major_venue) courseTypes.push('Major Venue');
          if (gsproCourse.is_mountain) courseTypes.push('Mountain');
          if (gsproCourse.is_parkland) courseTypes.push('Parkland');
          if (gsproCourse.is_tour_stop) courseTypes.push('Tour Stop');
          if (gsproCourse.is_training) courseTypes.push('Training');
          if (gsproCourse.is_tropical) courseTypes.push('Tropical');
          
          combinedCourses.push({
            name: gsproCourse.name,
            platforms: ['GSPro', 'Trackman'],
            gspro_id: gsproCourse.id,
            trackman_id: trackmanCourse.id,
            location: gsproCourse.location,
            designer: gsproCourse.designer,
            elevation: gsproCourse.elevation,
            course_types: courseTypes
          });
          
          processedGsproIds.add(gsproCourse.id);
          processedTrackmanIds.add(trackmanCourse.id);
          break; // Only match with the first high-similarity course
        }
      }
    }
    
    console.log(`Found ${combinedCourses.length - (combinedCourses.length - processedGsproIds.size)} fuzzy matches`);
    
    // Add GSPro-only courses
    const gsproOnly = gsproResult.rows.filter(course => !processedGsproIds.has(course.id));
    for (const course of gsproOnly) {
      const courseTypes = [];
      if (course.is_par3) courseTypes.push('Par 3');
      if (course.is_beginner) courseTypes.push('Beginner');
      if (course.is_coastal) courseTypes.push('Coastal');
      if (course.is_desert) courseTypes.push('Desert');
      if (course.is_fantasy) courseTypes.push('Fantasy');
      if (course.is_heathland) courseTypes.push('Heathland');
      if (course.is_historic) courseTypes.push('Historic');
      if (course.is_links) courseTypes.push('Links');
      if (course.is_lowpoly) courseTypes.push('Low Poly');
      if (course.is_major_venue) courseTypes.push('Major Venue');
      if (course.is_mountain) courseTypes.push('Mountain');
      if (course.is_parkland) courseTypes.push('Parkland');
      if (course.is_tour_stop) courseTypes.push('Tour Stop');
      if (course.is_training) courseTypes.push('Training');
      if (course.is_tropical) courseTypes.push('Tropical');
      
      combinedCourses.push({
        name: course.name,
        platforms: ['GSPro'],
        gspro_id: course.id,
        trackman_id: null,
        location: course.location,
        designer: course.designer,
        elevation: course.elevation,
        course_types: courseTypes
      });
    }
    
    // Add Trackman-only courses
    const trackmanOnly = trackmanResult.rows.filter(course => !processedTrackmanIds.has(course.id));
    for (const course of trackmanOnly) {
      combinedCourses.push({
        name: course.name,
        platforms: ['Trackman'],
        gspro_id: null,
        trackman_id: course.id,
        location: null,
        designer: null,
        elevation: null,
        course_types: []
      });
    }
    
    console.log(`Total combined courses: ${combinedCourses.length}`);
    console.log(`GSPro-only: ${gsproOnly.length}`);
    console.log(`Trackman-only: ${trackmanOnly.length}`);
    
    // Insert all combined courses
    for (const course of combinedCourses) {
      await client.query(`
        INSERT INTO simulator_courses_combined 
        (name, platforms, gspro_id, trackman_id, location, designer, elevation, course_types)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        course.name,
        course.platforms,
        course.gspro_id,
        course.trackman_id,
        course.location,
        course.designer,
        course.elevation,
        course.course_types
      ]);
    }
    
    console.log('Successfully populated combined courses table!');
    
  } catch (error) {
    console.error('Error populating combined courses:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the population script
populateCombinedCourses()
  .then(() => {
    console.log('Combined courses population completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to populate combined courses:', error);
    process.exit(1);
  }); 