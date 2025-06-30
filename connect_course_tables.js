require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in your .env file. Please add it.');
}

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Helper function to normalize course names for better matching
function normalizeCourseName(name) {
  if (!name) return '';
  
  return name
    .toLowerCase()
    // Remove common suffixes and prefixes
    .replace(/\s+(golf club|country club|the|gc|cc|golf course|course)$/gi, '')
    // Remove special characters but keep spaces
    .replace(/[^\w\s]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper function to calculate similarity between two strings
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1;
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    return Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
  }
  
  // Simple Levenshtein-like similarity
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1;
  
  const distance = longer.length - shorter.length;
  const maxDistance = Math.floor(longer.length * 0.3); // Allow 30% difference
  
  if (distance > maxDistance) return 0;
  
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) {
      matches++;
    }
  }
  
  return matches / longer.length;
}

async function connectCourseTables() {
  const client = await pool.connect();
  
  try {
    console.log('Starting course table connection migration...');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Step 1: Add course_id column to scorecards table
    console.log('Adding course_id column to scorecards table...');
    await client.query(`
      ALTER TABLE scorecards 
      ADD COLUMN IF NOT EXISTS course_id INTEGER
    `);
    
    // Step 2: Create foreign key constraint
    console.log('Creating foreign key constraint...');
    try {
      await client.query(`
        ALTER TABLE scorecards 
        ADD CONSTRAINT fk_scorecards_course_id 
        FOREIGN KEY (course_id) 
        REFERENCES simulator_courses_combined(id) 
        ON DELETE SET NULL
      `);
    } catch (err) {
      if (err.code === '42710') { // duplicate_object
        console.log('Foreign key constraint already exists, skipping.');
      } else {
        throw err;
      }
    }
    
    // Step 3: Create index on course_id for better performance
    console.log('Creating index on course_id...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_scorecards_course_id 
      ON scorecards(course_id)
    `);
    
    // Step 4: Update existing scorecards to link with simulator courses
    console.log('Updating existing scorecards to link with simulator courses...');
    
    // Get all scorecards with course_name but no course_id
    const { rows: scorecards } = await client.query(`
      SELECT id, course_name 
      FROM scorecards 
      WHERE course_name IS NOT NULL 
      AND course_id IS NULL
    `);
    
    console.log(`Found ${scorecards.length} scorecards to update...`);
    
    // Get all available courses for matching
    const { rows: allCourses } = await client.query(`
      SELECT id, name, platforms 
      FROM simulator_courses_combined 
      ORDER BY name
    `);
    
    console.log(`Found ${allCourses.length} courses in simulator_courses_combined table...`);
    
    let updatedCount = 0;
    let notFoundCount = 0;
    let exactMatches = 0;
    let fuzzyMatches = 0;
    
    for (const scorecard of scorecards) {
      if (!scorecard.course_name) continue;
      
      const userCourseName = scorecard.course_name.trim();
      const normalizedUserCourseName = normalizeCourseName(userCourseName);
      
      let bestMatch = null;
      let bestScore = 0;
      let matchType = 'none';
      
      // Strategy 1: Exact match (case insensitive)
      for (const course of allCourses) {
        if (course.name.toLowerCase() === userCourseName.toLowerCase()) {
          bestMatch = course;
          bestScore = 1.0;
          matchType = 'exact';
          break;
        }
      }
      
      // Strategy 2: Normalized exact match
      if (!bestMatch) {
        for (const course of allCourses) {
          const normalizedCourseName = normalizeCourseName(course.name);
          if (normalizedCourseName === normalizedUserCourseName) {
            bestMatch = course;
            bestScore = 0.95;
            matchType = 'normalized';
            break;
          }
        }
      }
      
      // Strategy 3: Contains match (one contains the other)
      if (!bestMatch) {
        for (const course of allCourses) {
          const courseLower = course.name.toLowerCase();
          const userLower = userCourseName.toLowerCase();
          
          if (courseLower.includes(userLower) || userLower.includes(courseLower)) {
            const similarity = calculateSimilarity(courseLower, userLower);
            if (similarity > bestScore && similarity > 0.7) {
              bestMatch = course;
              bestScore = similarity;
              matchType = 'contains';
            }
          }
        }
      }
      
      // Strategy 4: Fuzzy matching with similarity threshold
      if (!bestMatch) {
        for (const course of allCourses) {
          const similarity = calculateSimilarity(course.name, userCourseName);
          if (similarity > bestScore && similarity > 0.6) {
            bestMatch = course;
            bestScore = similarity;
            matchType = 'fuzzy';
          }
        }
      }
      
      // Strategy 5: Word-based matching (check if most words match)
      if (!bestMatch) {
        const userWords = normalizedUserCourseName.split(' ').filter(word => word.length > 2);
        const userWordSet = new Set(userWords);
        
        for (const course of allCourses) {
          const courseWords = normalizeCourseName(course.name).split(' ').filter(word => word.length > 2);
          const courseWordSet = new Set(courseWords);
          
          const intersection = new Set([...userWordSet].filter(x => courseWordSet.has(x)));
          const union = new Set([...userWordSet, ...courseWordSet]);
          
          if (union.size > 0) {
            const jaccardSimilarity = intersection.size / union.size;
            if (jaccardSimilarity > bestScore && jaccardSimilarity > 0.5) {
              bestMatch = course;
              bestScore = jaccardSimilarity;
              matchType = 'word-based';
            }
          }
        }
      }
      
      if (bestMatch && bestScore > 0.5) {
        // Update scorecard with course_id
        await client.query(`
          UPDATE scorecards 
          SET course_id = $1 
          WHERE id = $2
        `, [bestMatch.id, scorecard.id]);
        
        updatedCount++;
        
        if (matchType === 'exact') exactMatches++;
        else if (matchType === 'normalized') fuzzyMatches++;
        else fuzzyMatches++;
        
        console.log(`✅ ${matchType.toUpperCase()}: "${userCourseName}" -> "${bestMatch.name}" (${bestMatch.platforms.join(', ')}) [Score: ${bestScore.toFixed(2)}]`);
      } else {
        notFoundCount++;
        console.log(`❌ No match: "${userCourseName}"`);
      }
    }
    
    // Step 5: Create a view for easier querying
    console.log('Creating view for scorecards with course information...');
    await client.query(`
      CREATE OR REPLACE VIEW scorecards_with_courses AS
      SELECT 
        s.*,
        c.name as course_full_name,
        c.platforms as course_platforms,
        c.location as course_location,
        c.designer as course_designer,
        c.elevation as course_elevation,
        c.course_types as course_types
      FROM scorecards s
      LEFT JOIN simulator_courses_combined c ON s.course_id = c.id
      ORDER BY s.date_played DESC, s.created_at DESC
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\n=== Migration Summary ===');
    console.log(`✅ Added course_id column to scorecards table`);
    console.log(`✅ Created foreign key constraint`);
    console.log(`✅ Created index on course_id`);
    console.log(`✅ Updated ${updatedCount} scorecards with course links`);
    console.log(`   - Exact matches: ${exactMatches}`);
    console.log(`   - Fuzzy matches: ${fuzzyMatches}`);
    console.log(`❌ ${notFoundCount} scorecards could not be matched`);
    console.log(`✅ Created scorecards_with_courses view`);
    
    // Show some statistics
    const { rows: stats } = await client.query(`
      SELECT 
        COUNT(*) as total_scorecards,
        COUNT(course_id) as linked_scorecards,
        COUNT(*) - COUNT(course_id) as unlinked_scorecards
      FROM scorecards
    `);
    
    console.log('\n=== Current Statistics ===');
    console.log(`Total scorecards: ${stats[0].total_scorecards}`);
    console.log(`Linked scorecards: ${stats[0].linked_scorecards}`);
    console.log(`Unlinked scorecards: ${stats[0].unlinked_scorecards}`);
    console.log(`Link rate: ${((stats[0].linked_scorecards / stats[0].total_scorecards) * 100).toFixed(1)}%`);
    
    // Show some examples of linked courses
    const { rows: examples } = await client.query(`
      SELECT 
        s.course_name,
        c.name as matched_course,
        c.platforms
      FROM scorecards s
      JOIN simulator_courses_combined c ON s.course_id = c.id
      LIMIT 10
    `);
    
    if (examples.length > 0) {
      console.log('\n=== Example Matches ===');
      examples.forEach(example => {
        console.log(`"${example.course_name}" -> "${example.matched_course}" (${example.platforms.join(', ')})`);
      });
    }
    
    // Show unmatched courses for manual review
    if (notFoundCount > 0) {
      const { rows: unmatched } = await client.query(`
        SELECT DISTINCT course_name, COUNT(*) as count
        FROM scorecards 
        WHERE course_name IS NOT NULL 
        AND course_id IS NULL
        GROUP BY course_name
        ORDER BY count DESC
        LIMIT 10
      `);
      
      console.log('\n=== Top Unmatched Course Names (for manual review) ===');
      unmatched.forEach(unmatched => {
        console.log(`"${unmatched.course_name}" (${unmatched.count} scorecards)`);
      });
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration
connectCourseTables()
  .then(() => {
    console.log('\n✅ Course table connection migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }); 