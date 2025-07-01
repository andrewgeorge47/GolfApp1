const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Official course/teebox data from images
const officialTeeboxes = {
  'Tobacco Road': {
    Black: { rating: 71.7, slope: 144 },
    White: { rating: 70.3, slope: 135 },
    Green: { rating: 68.6, slope: 129 },
    Blue: { rating: 69.8, slope: 126 },
    Junior: { rating: 80.0, slope: 155 },
    PAR3: { rating: 54.0, slope: 120 },
  },
  'Pinehurst 2': {
    Black: { rating: 76.5, slope: 138 },
    Blue: { rating: 73.9, slope: 133 },
    White: { rating: 70.7, slope: 126 },
    Green: { rating: 68.5, slope: 123 },
    Red: { rating: 65.5, slope: 117 },
    Junior: { rating: 72.0, slope: 120 },
    PAR3: { rating: 54.0, slope: 120 },
  },
  'Sedgefield': {
    Black: { rating: 75.2, slope: 140 },
    Blue: { rating: 73.6, slope: 136 },
    White: { rating: 71.7, slope: 134 },
    Yellow: { rating: 69.8, slope: 128 },
    Red: { rating: 66.9, slope: 122 },
    Junior: { rating: 71.0, slope: 120 },
    PAR3: { rating: 54.0, slope: 120 },
  },
  'DPC Pebble': {
    Black: { rating: 75.5, slope: 144 },
    Blue: { rating: 74.9, slope: 144 },
    Yellow: { rating: 73.4, slope: 137 },
    White: { rating: 71.7, slope: 135 },
    Red: { rating: 67.3, slope: 124 },
    Junior: { rating: 80.0, slope: 120 },
    PAR3: { rating: 54.0, slope: 120 },
  },
  'Quail Hollow Club': {
    Black: { rating: 77.2, slope: 148 },
    White: { rating: 74.5, slope: 140 },
    Green: { rating: 72.2, slope: 134 },
    Blue: { rating: 70.5, slope: 130 },
    Yellow: { rating: 68.0, slope: 121 },
    Junior: { rating: 72.0, slope: 120 },
    PAR3: { rating: 54.0, slope: 120 },
  },
  'Bandon Dunes': {
    Black: { rating: 74.8, slope: 143 },
    Blue: { rating: 72.6, slope: 135 },
    White: { rating: 70.4, slope: 133 },
    Red: { rating: 68.1, slope: 126 },
    Junior: { rating: 72.0, slope: 120 },
    PAR3: { rating: 54.0, slope: 120 },
  },
};

async function fixTeeboxRatings() {
  let totalUpdated = 0;
  for (const [course, teeboxes] of Object.entries(officialTeeboxes)) {
    for (const [teebox, { rating, slope }] of Object.entries(teeboxes)) {
      const res = await pool.query(
        `UPDATE scorecards
         SET course_rating = $1, course_slope = $2
         WHERE course_name = $3 AND teebox = $4
           AND (course_rating IS DISTINCT FROM $1 OR course_slope IS DISTINCT FROM $2)`,
        [rating, slope, course, teebox]
      );
      if (res.rowCount > 0) {
        console.log(`Updated ${res.rowCount} scorecards for ${course} - ${teebox} to ${rating}/${slope}`);
        totalUpdated += res.rowCount;
      }
    }
  }
  console.log(`\n✅ Done! Total scorecards updated: ${totalUpdated}`);
  await pool.end();
}

fixTeeboxRatings().catch(err => {
  console.error('Error fixing teebox ratings:', err);
  pool.end();
}); 