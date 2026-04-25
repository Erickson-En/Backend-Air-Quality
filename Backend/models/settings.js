// backend/models/settings.js
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  thresholds: {
    pm1: Number, pm25: Number, pm10: Number,
    co: Number, co2: Number, o3: Number, no2: Number,
    temperature: Number, humidity: Number,
    voc_index: Number, nox_index: Number,
  },
  notifications: {
    alertEmails: { type: Boolean, default: true },
    dailyDigest: { type: Boolean, default: true },
    digestTime:  { type: String,  default: '07:00' },
  },
  sensor: {
    location:       { type: String, default: 'Nairobi' },
    retentionDays:  { type: Number, default: 30 },
    pollInterval:   { type: Number, default: 60 },
  },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Setting', settingsSchema);

