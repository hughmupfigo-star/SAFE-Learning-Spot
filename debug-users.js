import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function debugUsers() {
  try {
    console.log('📋 Checking users in database...\n');

    const result = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name, created_at FROM users;'
    );

    if (result.rows.length === 0) {
      console.log('❌ No users found in database');
      return;
    }

    console.log(`✅ Found ${result.rows.length} user(s):\n`);

    result.rows.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  First Name: ${user.first_name}`);
      console.log(`  Last Name: ${user.last_name}`);
      console.log(`  Password Hash: ${user.password_hash.substring(0, 20)}...`);
      console.log(`  Hash Length: ${user.password_hash.length} characters`);
      console.log(`  Created: ${user.created_at}`);
      console.log('');
    });

    // Check if passwords look hashed
    const firstUser = result.rows[0];
    if (firstUser.password_hash.length > 50 && firstUser.password_hash.startsWith('$2')) {
      console.log('✅ Passwords appear to be hashed with bcrypt (length > 50, starts with $2)');
    } else {
      console.log('⚠️  WARNING: Passwords might not be hashed! They look like plaintext.');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

debugUsers();
