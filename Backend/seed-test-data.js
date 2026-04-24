/**
 * Seed test data for report generation
 * Generates 30 days of hourly readings with realistic air quality values
 */
const mongoose = require('mongoose');
const Reading = require('./models/reading');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/air-quality-db';

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

db.once('open', async () => {
  console.log('✅ Connected to MongoDB');
  try {
    // Clear existing readings to avoid duplicates
    await Reading.deleteMany({});
    console.log('🧹 Cleared existing readings');

    // Generate 30 days of hourly readings
    const readings = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (let i = 0; i < 30 * 24; i++) {
      const timestamp = new Date(thirtyDaysAgo.getTime() + i * 60 * 60 * 1000);

      // Simulate realistic air quality data with some variation
      const hour = timestamp.getHours();
      const dayOfWeek = timestamp.getDay();

      // Higher pollution during work hours and weekdays
      const pollutionMultiplier = (hour >= 8 && hour <= 18 && dayOfWeek !== 0 && dayOfWeek !== 6) ? 1.3 : 0.8;

      readings.push({
        timestamp,
        location: 'Lab Sensor A',
        metrics: {
          pm1: (8 + Math.random() * 15) * pollutionMultiplier,
          pm25: (15 + Math.random() * 25) * pollutionMultiplier,
          pm10: (35 + Math.random() * 40) * pollutionMultiplier,
          co: (1.5 + Math.random() * 2) * pollutionMultiplier,
          co2: (390 + Math.random() * 150),
          o3: (20 + Math.random() * 30),
          no2: (10 + Math.random() * 25) * pollutionMultiplier,
          temperature: 20 + Math.random() * 15 + Math.sin(i / 12) * 5,
          humidity: 40 + Math.random() * 40,
          pressure: 1013 + Math.random() * 5,
          light: Math.max(0, 300 * Math.sin(Math.PI * hour / 24)),
          voc_index: (100 + Math.random() * 100) * pollutionMultiplier,
          nox_index: (40 + Math.random() * 80) * pollutionMultiplier,
        },
      });
    }

    // Insert all readings
    await Reading.insertMany(readings);
    console.log(`✅ Inserted ${readings.length} test readings`);

    // Show summary
    const count = await Reading.countDocuments();
    const oldest = await Reading.findOne().sort({ timestamp: 1 });
    const newest = await Reading.findOne().sort({ timestamp: -1 });

    console.log('\n📊 Data Summary:');
    console.log(`  Total readings: ${count}`);
    console.log(`  Date range: ${oldest?.timestamp?.toDateString()} to ${newest?.timestamp?.toDateString()}`);
    console.log(`  Location: ${oldest?.location || 'Lab Sensor A'}`);

    console.log('\n✅ Test data seeded successfully!');
    console.log('\nNow try generating a report with:');
    console.log(`  Start Date: ${oldest?.timestamp?.toISOString().slice(0, 10)}`);
    console.log(`  End Date: ${newest?.timestamp?.toISOString().slice(0, 10)}`);
    console.log(`  Granularity: daily`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding data:', err);
    process.exit(1);
  }
});
