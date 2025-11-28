const express = require('express');
const Anomaly = require('../models/AnalyticsAnomaly');
const Summary = require('../models/AnalyticsSummary');
const Forecast = require('../models/AnalyticsForecast');

const router = express.Router();

router.get('/anomalies', async (req, res) => {
  const limit = Number(req.query.limit || 50);
  const docs = await Anomaly.find().sort({ detected_at: -1 }).limit(limit).lean();
  res.json(docs);
});

router.get('/summary/latest', async (req, res) => {
  const doc = await Summary.findOne().sort({ generated_at: -1 }).lean();
  res.json(doc || {});
});

router.get('/forecast/latest', async (req, res) => {
  const doc = await Forecast.findOne().sort({ generated_at: -1 }).lean();
  res.json(doc || {});
});

module.exports = router;