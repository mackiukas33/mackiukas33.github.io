// Test database connection
const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient();

  try {
    console.log('Testing database connection...');

    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful!');

    // Test a simple query (MongoDB)
    const result = await prisma.$runCommandRaw({ ping: 1 });
    console.log('✅ Database query successful:', result);

    // Check if collections exist (MongoDB)
    const collections = await prisma.$runCommandRaw({ listCollections: 1 });
    console.log('📋 Existing collections:', collections);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Make sure your DATABASE_URL is correct in your .env file');
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
