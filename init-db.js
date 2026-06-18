import fs from 'fs';
import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initializeDatabase() {
  try {
    console.log('🚀 Initializing database...');

    // Read the schema file
    const schema = fs.readFileSync('./schema.sql', 'utf8');

    // Execute the schema
    await pool.query(schema);

    console.log('✅ Database initialized successfully!');
    console.log('📊 Created tables:');
    console.log('   - users');
    console.log('   - course_progress');
    console.log('   - course_feedback');
    console.log('   - course_access');
    console.log('   - pending_payments');

    // Verify tables exist
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('\n📋 All tables in database:');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

  } catch (err) {
    console.error('❌ Error initializing database:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initializeDatabase();
