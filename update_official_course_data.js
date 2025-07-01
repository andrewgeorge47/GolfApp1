const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Official course data: par values and teeboxes
const officialCourses = [
  {
    name: 'Tobacco Road',
    par_values: [5, 4, 3, 5, 4, 3, 4, 3, 4, 4, 5, 4, 5, 3, 4, 4, 3, 4],
    teeboxes: {
      Black: { rating: 71.7, slope: 144 },
      White: { rating: 70.3, slope: 135 },
      Green: { rating: 68.6, slope: 129 },
      Blue: { rating: 69.8, slope: 126 },
      Junior: { rating: 80.0, slope: 155 },
      PAR3: { rating: 54.0, slope: 120 },
    },
  },
  {
    name: 'Pinehurst 2',
    par_values: [4, 4, 4, 4, 5, 4, 4, 5, 3, 5, 4, 4, 4, 4, 3, 5, 4, 4],
    teeboxes: {
      Black: { rating: 76.5, slope: 138 },
      Blue: { rating: 73.9, slope: 133 },
      White: { rating: 70.7, slope: 126 },
      Green: { rating: 68.5, slope: 123 },
      Red: { rating: 65.5, slope: 117 },
      Junior: { rating: 72.0, slope: 120 },
      PAR3: { rating: 54.0, slope: 120 },
    },
  },
  {
    name: 'Sedgefield',
    par_values: [4, 4, 3, 4, 5, 4, 4, 5, 3, 5, 4, 4, 4, 4, 3, 5, 4, 4],
    teeboxes: {
      Black: { rating: 75.2, slope: 140 },
      Blue: { rating: 73.6, slope: 136 },
      White: { rating: 71.7, slope: 134 },
      Yellow: { rating: 69.8, slope: 128 },
      Red: { rating: 66.9, slope: 122 },
      Junior: { rating: 71.0, slope: 120 },
      PAR3: { rating: 54.0, slope: 120 },
    },
  },
  {
    name: 'DPC Pebble',
    par_values: [4, 5, 4, 4, 3, 5, 3, 4, 4, 5, 4, 3, 4, 5, 4, 4, 3, 5],
    teeboxes: {
      Black: { rating: 75.5, slope: 144 },
      Blue: { rating: 74.9, slope: 144 },
      Yellow: { rating: 73.4, slope: 137 },
      White: { rating: 71.7, slope: 135 },
      Red: { rating: 67.3, slope: 124 },
      Junior: { rating: 80.0, slope: 120 },
      PAR3: { rating: 54.0, slope: 120 },
    },
  },
  {
    name: 'Quail Hollow Club',
    par_values: [5, 4, 4, 3, 4, 5, 4, 4, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4],
    teeboxes: {
      Black: { rating: 77.2, slope: 148 },
      White: { rating: 74.5, slope: 140 },
      Green: { rating: 72.2, slope: 134 },
      Blue: { rating: 70.5, slope: 130 },
      Yellow: { rating: 68.0, slope: 121 },
      Junior: { rating: 72.0, slope: 120 },
      PAR3: { rating: 54.0, slope: 120 },
    },
  },
  {
    name: 'Bandon Dunes',
    par_values: [4, 4, 5, 4, 4, 3, 4, 4, 3, 5, 4, 3, 4, 4, 3, 4, 4, 5],
    teeboxes: {
      Black: { rating: 74.8, slope: 143 },
      Blue: { rating: 72.6, slope: 135 },
      White: { rating: 70.4, slope: 133 },
      Red: { rating: 68.1, slope: 126 },
      Junior: { rating: 72.0, slope: 120 },
      PAR3: { rating: 54.0, slope: 120 },
    },
  },
];

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

updateCourses().catch(err => {
  console.error('Error updating courses:', err);
  pool.end();
}); 