// Check if your MongoDB connection string has a database name
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

console.log('🔍 Checking your MongoDB connection string...');
console.log('Connection string:', connectionString ? 'Found' : 'Not found');

if (connectionString) {
  // Check if it ends with a database name
  const hasDatabaseName =
    connectionString.includes('/') &&
    connectionString.split('/').length > 3 &&
    connectionString.split('/')[3].length > 0;

  if (hasDatabaseName) {
    console.log('✅ Database name found in connection string');
    const dbName = connectionString.split('/')[3].split('?')[0];
    console.log('📋 Database name:', dbName);
  } else {
    console.log('❌ No database name found in connection string');
    console.log(
      '💡 Your connection string should end with: /your_database_name'
    );
    console.log(
      '📝 Example: mongodb+srv://user:pass@cluster.mongodb.net/ttphotos'
    );
  }
} else {
  console.log('❌ DATABASE_URL not found in environment variables');
  console.log('💡 Make sure you have a .env file with DATABASE_URL');
}
