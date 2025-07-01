const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Official course data from images (fill in par_values and teeboxes for each course)
const officialCourses = [
  {
    name: 'Georgia Golf Club',
    par_values: [4,5,4,3,4,3,4,5,4,4,5,3,5,4,5,3,4,4],
    teeboxes: {
      Black: { rating: 76.5, slope: 151 },
      Blue: { rating: 74.2, slope: 145 },
      White: { rating: 72.5, slope: 131 },
      Yellow: { rating: 72.8, slope: 135 },
      Green: { rating: 69.8, slope: 122 },
      Red: { rating: 66.6, slope: 115 },
      Junior: { rating: 72.0, slope: 120 },
      PAR3: { rating: 54.0, slope: 120 },
    },
  },
  {
    name: 'Valhalla',
    par_values: [4,5,3,4,4,5,4,3,4,5,4,3,4,4,5,3,4,4],
    teeboxes: {
      Black: { rating: 74.9, slope: 145 },
      Blue: { rating: 72.9, slope: 141 },
      White: { rating: 70.8, slope: 137 },
      Green: { rating: 69.2, slope: 133 },
      Red: { rating: 65.2, slope: 121 },
      Junior: { rating: 72.0, slope: 120 },
      PAR3: { rating: 54.0, slope: 120 },
    },
  },
  {
    name: 'Muirfield Village Golf Club',
    par_values: [4,4,4,3,5,4,5,3,4,4,5,3,4,4,5,3,4,4],
    teeboxes: {
      Black: { rating: 76.1, slope: 154 },
      Blue: { rating: 73.7, slope: 150 },
      White: { rating: 71.6, slope: 144 },
      Green: { rating: 69.4, slope: 137 },
      Red: { rating: 66.5, slope: 131 },
      Junior: { rating: 72.0, slope: 120 },
      PAR3: { rating: 54.0, slope: 120 },
    },
  },
  {
    name: 'Paynes Valley',
    par_values: [4,3,4,5,3,4,4,5,4,3,4,3,5,4,4,3,4,5],
    teeboxes: {
      Black: { rating: 75.6, slope: 132 },
      Green: { rating: 73.1, slope: 125 },
      Blue: { rating: 69.8, slope: 120 },
      Red: { rating: 64.8, slope: 103 },
      PAR3: { rating: 54.0, slope: 120 },
      Junior: { rating: 72.0, slope: 120 },
    },
  },
  {
    name: 'Pine Needles GC',
    par_values: [5,4,3,4,3,4,4,3,4,5,4,4,4,4,3,5,3,4],
    teeboxes: {
      Black: { rating: 73.3, slope: 133 },
      Blue: { rating: 70.8, slope: 129 },
      Yellow: { rating: 68.5, slope: 126 },
      White: { rating: 66.4, slope: 115 },
      Red: { rating: 64.3, slope: 110 },
      PAR3: { rating: 54.0, slope: 120 },
      Junior: { rating: 71.0, slope: 120 },
    },
  },
  {
    name: 'Wynn Golf Club',
    par_values: [4,3,5,4,4,3,4,4,3,5,4,3,4,4,5,3,4,4],
    teeboxes: {
      Black: { rating: 71.1, slope: 119 },
      Blue: { rating: 80.0, slope: 155 },
      Yellow: { rating: 68.7, slope: 117 },
      Red: { rating: 80.0, slope: 155 },
      PAR3: { rating: 54.0, slope: 120 },
      Junior: { rating: 80.0, slope: 155 },
    },
  },
  {
    name: 'Forsyth Country Club',
    par_values: [4,4,3,4,5,4,4,5,3,5,4,4,4,4,3,5,4,4],
    teeboxes: {
      Red: { rating: 72.4, slope: 136 },
      Black: { rating: 71.3, slope: 134 },
      Blue: { rating: 69.8, slope: 128 },
      White: { rating: 67.5, slope: 123 },
      Green: { rating: 64.6, slope: 109 },
      Junior: { rating: 71.0, slope: 120 },
      PAR3: { rating: 54.0, slope: 120 },
    },
  },
  {
    name: 'DPC Scottsdale',
    par_values: [4,4,5,3,4,4,4,4,5,4,4,3,4,5,4,4,3,4],
    teeboxes: {
      Black: { rating: 74.7, slope: 142 },
      Blue: { rating: 71.5, slope: 131 },
      White: { rating: 68.9, slope: 123 },
      Red: { rating: 66.2, slope: 114 },
      PAR3: { rating: 54.0, slope: 120 },
      Junior: { rating: 80.0, slope: 120 },
    },
  },
  {
    name: 'Fossil Trace Golf Club',
    par_values: [5,4,3,4,3,4,4,4,5,4,3,5,4,4,5,3,4,4],
    teeboxes: {
      Black: { rating: 72.0, slope: 141 },
      Blue: { rating: 68.9, slope: 130 },
      White: { rating: 66.2, slope: 114 },
      Yellow: { rating: 62.9, slope: 109 },
      Junior: { rating: 72.0, slope: 120 },
      PAR3: { rating: 54.0, slope: 120 },
    },
  },
  {
    name: 'East Lake Golf Club',
    par_values: [5,3,4,4,4,5,4,4,3,5,4,3,4,4,5,3,4,4],
    teeboxes: {
      Black: { rating: 76.2, slope: 144 },
      Green: { rating: 74.0, slope: 137 },
      Blue: { rating: 72.2, slope: 132 },
      Yellow: { rating: 71.0, slope: 127 },
      Red: { rating: 66.9, slope: 122 },
      Junior: { rating: 72.0, slope: 120 },
      PAR3: { rating: 54.0, slope: 120 },
    },
  },
  {
    name: 'Bay Hill',
    par_values: [4,3,4,5,4,4,4,4,4,5,4,3,4,3,5,4,4,4],
    teeboxes: {
      Green: { rating: 75.2, slope: 137 },
      Blue: { rating: 73.6, slope: 133 },
      Yellow: { rating: 71.3, slope: 129 },
      Red: { rating: 68.4, slope: 123 },
      White: { rating: 65.5, slope: 115 },
      Junior: { rating: 72.0, slope: 120 },
      PAR3: { rating: 54.0, slope: 120 },
    },
  },
];

async function renameBrandonDunes() {
  // Rename in scorecards
  const res1 = await pool.query(`UPDATE scorecards SET course_name = 'Bandon Dunes' WHERE course_name = 'Brandon Dunes'`);
  // Rename in simulator_courses_combined
  const res2 = await pool.query(`UPDATE simulator_courses_combined SET name = 'Bandon Dunes' WHERE name = 'Brandon Dunes'`);
  console.log(`Renamed Brandon Dunes to Bandon Dunes in scorecards (${res1.rowCount}) and simulator_courses_combined (${res2.rowCount})`);
}

async function ensureTeeboxDataColumn() {
  // Add teebox_data column if it doesn't exist
  const { rows } = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'simulator_courses_combined' AND column_name = 'teebox_data'
  `);
  if (rows.length === 0) {
    await pool.query(`ALTER TABLE simulator_courses_combined ADD COLUMN teebox_data JSONB`);
    console.log('Added teebox_data column to simulator_courses_combined table.');
  }
}

async function updateCourses() {
  await ensureTeeboxDataColumn();
  let updated = 0;
  for (const course of officialCourses) {
    // Only update GSPro courses
    const { rows } = await pool.query(
      `SELECT id, name, platforms FROM simulator_courses_combined WHERE name = $1 AND 'GSPro'=ANY(platforms)`,
      [course.name]
    );
    if (rows.length === 0) {
      console.log(`Course not found or not GSPro: ${course.name}`);
      continue;
    }
    const id = rows[0].id;
    await pool.query(
      `UPDATE simulator_courses_combined SET par_values = $1, teebox_data = $2, updated_at = NOW() WHERE id = $3`,
      [JSON.stringify(course.par_values), JSON.stringify(course.teeboxes), id]
    );
    console.log(`Updated ${course.name} (id=${id}) with par values and teeboxes.`);
    updated++;
  }
  console.log(`\n✅ Done! Updated ${updated} courses.`);
  await pool.end();
}

async function main() {
  await renameBrandonDunes();
  await updateCourses();
}

main().catch(err => {
  console.error('Error updating and renaming courses:', err);
  pool.end();
}); 