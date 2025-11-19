const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Known major venue courses (PGA Tour, Major Championships, etc.)
const MAJOR_VENUES = [
  'augusta', 'pebble beach', 'st andrews', 'royal melbourne', 'pinehurst',
  'bethpage', 'oakmont', 'merion', 'winged foot', 'shinnecock', 'baltusrol',
  'olympic club', 'torrey pines', 'muirfield', 'carnoustie', 'royal birkdale',
  'royal troon', 'royal portrush', 'royal lytham', 'royal st george',
  'kiawah', 'whistling straits', 'hazeltine', 'medinah', 'valhalla',
  'tpc sawgrass', 'tpc scottsdale', 'bay hill', 'quail hollow', 'east lake',
  'riviera', 'congressional', 'firestone', 'colonial', 'harbour town'
];

// Countries to extract from location strings
const COUNTRIES = [
  'United States', 'United Kingdom', 'Australia', 'Sweden', 'Germany',
  'France', 'Japan', 'Korea', 'Denmark', 'Italy', 'Spain', 'Portugal',
  'Ireland', 'Scotland', 'Canada', 'New Zealand', 'Netherlands', 'Belgium',
  'Austria', 'Switzerland', 'Norway', 'Finland', 'Mexico', 'South Africa',
  'Thailand', 'Singapore', 'Malaysia', 'China', 'Czech Republic', 'Poland'
];

/**
 * Parse the TrackMan HTML file and extract course data
 */
function parseTrackmanHTML(htmlContent) {
  const courses = [];
  let currentPlatform = null;
  let currentReleaseMonth = null;

  // Split by lines for processing
  const lines = htmlContent.split('\n');

  for (const line of lines) {
    // Detect platform version sections
    if (line.includes('Virtual Golf 2') && line.includes('<h2')) {
      currentPlatform = 'Virtual Golf 2';
      continue;
    }
    if (line.includes('Virtual Golf 3') && line.includes('<h2')) {
      currentPlatform = 'Virtual Golf 3';
      continue;
    }

    // Detect release month sections
    const releaseMatch = line.match(/New Releases\s*\(([^)]+)\)/i);
    if (releaseMatch) {
      currentReleaseMonth = releaseMatch[1];
      continue;
    }

    // Also check for just "New Releases" header
    if (line.match(/<h3[^>]*>.*New Releases.*<\/h3>/i) && !releaseMatch) {
      currentReleaseMonth = 'General';
    }

    // Extract course from <li> tags
    const courseMatch = line.match(/<li[^>]*>([^<]+)<\/li>/);
    if (courseMatch) {
      const courseName = courseMatch[1]
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .trim();

      if (courseName && courseName.length > 2) {
        const courseData = parseCourseEntry(courseName, currentPlatform, currentReleaseMonth);
        if (courseData) {
          courses.push(courseData);
        }
      }
    }
  }

  return courses;
}

/**
 * Parse a single course entry and extract metadata
 */
function parseCourseEntry(rawName, platform, releaseMonth) {
  // Split by " - " to separate name and location
  const parts = rawName.split(' - ');

  let name, location, country;

  if (parts.length >= 2) {
    name = parts.slice(0, -1).join(' - ').trim();
    const locationPart = parts[parts.length - 1].trim();

    // Check if location contains a state (e.g., "New Jersey, United States")
    if (locationPart.includes(',')) {
      const locParts = locationPart.split(',').map(p => p.trim());
      location = locationPart;
      country = locParts[locParts.length - 1];
    } else {
      location = locationPart;
      country = locationPart;
    }
  } else {
    name = rawName;
    location = null;
    country = null;
  }

  // Apply intelligent tagging
  const tags = applyIntelligentTags(name);

  return {
    name,
    location,
    country,
    platform_version: platform,
    release_month: releaseMonth,
    ...tags
  };
}

/**
 * Apply intelligent tagging based on course name patterns
 */
function applyIntelligentTags(name) {
  const nameLower = name.toLowerCase();

  return {
    is_championship: nameLower.includes('championship') || nameLower.includes('champ course'),
    is_links: nameLower.includes('links') ||
              (nameLower.includes('royal') && !nameLower.includes('resort')),
    is_par3: nameLower.includes('par 3') || nameLower.includes('par3') ||
             nameLower.includes('9 hole') || nameLower.includes('9-hole') ||
             /\b9\s*holes?\b/i.test(name),
    is_resort: nameLower.includes('resort') || nameLower.includes('spa'),
    is_country_club: nameLower.includes('country club') || nameLower.includes('cc') ||
                     nameLower.includes('c.c.') || nameLower.includes('golf club'),
    is_major_venue: MAJOR_VENUES.some(venue => nameLower.includes(venue)),
    holes: extractHoleCount(name)
  };
}

/**
 * Extract hole count from course name if mentioned
 */
function extractHoleCount(name) {
  // Match patterns like "(18 Holes)", "18-Hole", "9 Hole", etc.
  const match = name.match(/(\d+)\s*(?:holes?|-hole)/i);
  if (match) {
    return parseInt(match[1]);
  }

  // Default assumption for standard courses
  return null;
}

/**
 * Ensure the trackman_courses table has all required columns
 */
async function ensureTableSchema() {
  const checkColumns = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'trackman_courses'
    AND table_schema = 'public'
  `);

  const existingColumns = checkColumns.rows.map(r => r.column_name);

  if (!existingColumns.includes('location')) {
    console.log('Running migration to enhance trackman_courses table...');
    const migrationPath = path.join(__dirname, 'db/migrations/010_enhance_trackman_courses.sql');

    if (fs.existsSync(migrationPath)) {
      const migration = fs.readFileSync(migrationPath, 'utf8');
      await pool.query(migration);
      console.log('Migration completed successfully');
    } else {
      console.error('Migration file not found:', migrationPath);
      throw new Error('Migration file missing');
    }
  }
}

/**
 * Sync courses to database using upsert
 */
async function syncCoursesToDatabase(courses) {
  console.log(`Syncing ${courses.length} courses to database...`);

  let insertedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  for (const course of courses) {
    try {
      const result = await pool.query(`
        INSERT INTO trackman_courses (
          name, location, country, platform_version, release_month,
          is_championship, is_links, is_par3, is_resort, is_country_club,
          is_major_venue, holes, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
        ON CONFLICT (name) DO UPDATE SET
          location = EXCLUDED.location,
          country = EXCLUDED.country,
          platform_version = COALESCE(EXCLUDED.platform_version, trackman_courses.platform_version),
          release_month = COALESCE(EXCLUDED.release_month, trackman_courses.release_month),
          is_championship = EXCLUDED.is_championship,
          is_links = EXCLUDED.is_links,
          is_par3 = EXCLUDED.is_par3,
          is_resort = EXCLUDED.is_resort,
          is_country_club = EXCLUDED.is_country_club,
          is_major_venue = EXCLUDED.is_major_venue,
          holes = COALESCE(EXCLUDED.holes, trackman_courses.holes),
          updated_at = CURRENT_TIMESTAMP
        RETURNING (xmax = 0) AS inserted
      `, [
        course.name,
        course.location,
        course.country,
        course.platform_version,
        course.release_month,
        course.is_championship,
        course.is_links,
        course.is_par3,
        course.is_resort,
        course.is_country_club,
        course.is_major_venue,
        course.holes
      ]);

      if (result.rows[0].inserted) {
        insertedCount++;
      } else {
        updatedCount++;
      }

    } catch (error) {
      console.error(`Error syncing course "${course.name}":`, error.message);
      errorCount++;
    }
  }

  return { insertedCount, updatedCount, errorCount };
}

/**
 * Generate sync report
 */
async function generateReport() {
  const stats = await pool.query(`
    SELECT
      COUNT(*) as total_courses,
      COUNT(DISTINCT country) as countries,
      COUNT(*) FILTER (WHERE platform_version = 'Virtual Golf 2') as vg2_courses,
      COUNT(*) FILTER (WHERE platform_version = 'Virtual Golf 3') as vg3_courses,
      COUNT(*) FILTER (WHERE is_championship) as championship_courses,
      COUNT(*) FILTER (WHERE is_links) as links_courses,
      COUNT(*) FILTER (WHERE is_major_venue) as major_venues,
      COUNT(*) FILTER (WHERE is_par3) as par3_courses
    FROM trackman_courses
  `);

  const countryBreakdown = await pool.query(`
    SELECT country, COUNT(*) as count
    FROM trackman_courses
    WHERE country IS NOT NULL
    GROUP BY country
    ORDER BY count DESC
    LIMIT 10
  `);

  console.log('\n=== TrackMan Courses Sync Report ===');
  console.log(`Total Courses: ${stats.rows[0].total_courses}`);
  console.log(`Countries: ${stats.rows[0].countries}`);
  console.log(`Virtual Golf 2: ${stats.rows[0].vg2_courses}`);
  console.log(`Virtual Golf 3: ${stats.rows[0].vg3_courses}`);
  console.log(`Championship Courses: ${stats.rows[0].championship_courses}`);
  console.log(`Links Courses: ${stats.rows[0].links_courses}`);
  console.log(`Major Venues: ${stats.rows[0].major_venues}`);
  console.log(`Par 3 / Short Courses: ${stats.rows[0].par3_courses}`);

  console.log('\nTop Countries:');
  countryBreakdown.rows.forEach(row => {
    console.log(`  ${row.country}: ${row.count}`);
  });
}

/**
 * Main sync function
 */
async function main() {
  try {
    console.log('TrackMan Course Sync - Starting...\n');

    // Find the HTML file
    const htmlPath = path.join(__dirname, 'db/trackman course/___ Release Notes _ Courses in TPS – Trackman Help Center.html');

    if (!fs.existsSync(htmlPath)) {
      console.error('HTML file not found:', htmlPath);
      console.log('\nTo update courses:');
      console.log('1. Visit https://support.trackmangolf.com/hc/en-us/articles/39913906600219--Release-Notes-Courses-in-TPS');
      console.log('2. Save the page as HTML to:', htmlPath);
      console.log('3. Run this script again');
      process.exit(1);
    }

    // Ensure table schema is up to date
    await ensureTableSchema();

    // Parse HTML file
    console.log('Parsing HTML file...');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const courses = parseTrackmanHTML(htmlContent);
    console.log(`Found ${courses.length} courses in HTML file`);

    // Sync to database
    const { insertedCount, updatedCount, errorCount } = await syncCoursesToDatabase(courses);

    console.log('\n=== Sync Results ===');
    console.log(`New courses added: ${insertedCount}`);
    console.log(`Existing courses updated: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);

    // Generate report
    await generateReport();

    console.log('\nSync completed successfully!');

  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
TrackMan Course Sync Tool
=========================

Usage: node sync_trackman_courses.js [options]

Options:
  --help, -h     Show this help message
  --dry-run      Parse courses without writing to database
  --report       Generate report only (no sync)

To update the course list:
1. Download the latest HTML from TrackMan support
2. Save to: db/trackman course/___ Release Notes _ Courses in TPS – Trackman Help Center.html
3. Run: node sync_trackman_courses.js
    `);
    process.exit(0);
  }

  if (args.includes('--dry-run')) {
    // Dry run - just parse and show results
    const htmlPath = path.join(__dirname, 'db/trackman course/___ Release Notes _ Courses in TPS – Trackman Help Center.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const courses = parseTrackmanHTML(htmlContent);

    console.log(`Found ${courses.length} courses:\n`);
    courses.slice(0, 20).forEach(c => {
      console.log(`- ${c.name} (${c.country || 'Unknown'})`);
      const tags = [];
      if (c.is_championship) tags.push('Championship');
      if (c.is_links) tags.push('Links');
      if (c.is_major_venue) tags.push('Major');
      if (c.is_par3) tags.push('Par 3');
      if (tags.length) console.log(`  Tags: ${tags.join(', ')}`);
    });

    if (courses.length > 20) {
      console.log(`\n... and ${courses.length - 20} more courses`);
    }

    process.exit(0);
  }

  main();
}

module.exports = { parseTrackmanHTML, parseCourseEntry, applyIntelligentTags, syncCoursesToDatabase };
