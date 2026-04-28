// Backend/utils/emailScheduler.js
// Cron jobs: daily digest at 07:00 EAT, alert cooldown tracking
'use strict';

const cron = require('node-cron');
const { sendDailyDigest, sendAQIAlert, calculateAQI } = require('./emailService');

// ── In-memory cooldown: prevent alert spam (1 alert per metric per 30 min per user)
const alertCooldowns = new Map(); // key: `${email}:${metric}`

function isOnCooldown(email, metric) {
  const key = `${email}:${metric}`;
  const last = alertCooldowns.get(key);
  if (!last) return false;
  return (Date.now() - last) < 30 * 60 * 1000; // 30-minute cooldown
}

function setCooldown(email, metric) {
  alertCooldowns.set(`${email}:${metric}`, Date.now());
}

// ── Compute 24h stats from readings array
function computeDailyStats(readings) {
  if (!readings.length) return null;

  const pm25s = readings.map(r => Number(r.metrics?.pm25 || 0)).filter(v => v > 0);
  const pm10s = readings.map(r => Number(r.metrics?.pm10 || 0)).filter(v => v > 0);
  const temps = readings.map(r => Number(r.metrics?.temperature || 0)).filter(v => v > 0);
  const humids = readings.map(r => Number(r.metrics?.humidity || 0)).filter(v => v > 0);

  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  // Build 4-hour period buckets for the table
  const buckets = {};
  readings.forEach(r => {
    const h = new Date(r.timestamp).getHours();
    const period = Math.floor(h / 4) * 4;
    const label = `${String(period).padStart(2, '0')}:00–${String(period + 4).padStart(2, '0')}:00`;
    if (!buckets[label]) buckets[label] = [];
    const pm25 = Number(r.metrics?.pm25 || 0);
    if (pm25 > 0) buckets[label].push(pm25);
  });

  const hourlyBreakdown = Object.entries(buckets).map(([period, vals]) => ({
    period,
    pm25: vals.length ? avg(vals) : 0,
  })).filter(b => b.pm25 > 0);

  return {
    avgPM25: avg(pm25s),
    maxPM25: pm25s.length ? Math.max(...pm25s) : 0,
    minPM25: pm25s.length ? Math.min(...pm25s) : 0,
    avgPM10: avg(pm10s),
    avgTemp: avg(temps),
    avgHumidity: avg(humids),
    hourlyBreakdown,
  };
}

// ── Start all scheduled jobs
function startEmailScheduler(Reading, User) {
  // ── Daily digest — every day at 07:00 Africa/Nairobi (EAT = UTC+3 → 04:00 UTC)
  cron.schedule('0 4 * * *', async () => {
    console.log('[Scheduler] Running daily digest job…');
    try {
      const users = await User.find({}, 'name email').lean();
      if (!users.length) return console.log('[Scheduler] No users to email.');

      const since = new Date(Date.now() - 24 * 3600 * 1000);
      const readings = await Reading.find({ timestamp: { $gte: since } }).lean();
      const stats = computeDailyStats(readings);

      if (!stats) return console.log('[Scheduler] No readings for digest.');

      // Compute previous-day average for trend comparison
      const prevSince = new Date(Date.now() - 48 * 3600 * 1000);
      const prevEnd = new Date(Date.now() - 24 * 3600 * 1000);
      const prevReadings = await Reading.find({ timestamp: { $gte: prevSince, $lte: prevEnd } }).lean();
      const prevPM25s = prevReadings.map(r => Number(r.metrics?.pm25 || 0)).filter(v => v > 0);
      stats.prevAvgPM25 = prevPM25s.length
        ? prevPM25s.reduce((a, b) => a + b, 0) / prevPM25s.length
        : stats.avgPM25;

      let sent = 0;
      for (const user of users) {
        try {
          await sendDailyDigest({
            to: user.email,
            name: user.name,
            stats,
            todayReadings: readings.length,
          });
          sent++;
        } catch (e) {
          console.error(`[Scheduler] Failed digest to ${user.email}:`, e.message);
        }
      }
      console.log(`[Scheduler]  Daily digest sent to ${sent}/${users.length} users.`);
    } catch (err) {
      console.error('[Scheduler] Daily digest error:', err.message);
    }
  }, { timezone: 'UTC' });

  console.log('[Scheduler]  Daily digest scheduled at 07:00 EAT (04:00 UTC)');
}

// ── Called from processAlerts() in server.js 
async function handleAlertEmails(User, normalizedReading, triggeredAlerts) {
  if (!triggeredAlerts.length) return;
  if (!process.env.EMAIL_USER) return; // emails disabled

  try {
    const users = await User.find({}, 'name email').lean();
    if (!users.length) return;

    const m = normalizedReading.metrics || {};
    const aqi = calculateAQI(m.pm25);

    for (const user of users) {
      // Check if at least one triggered metric is not on cooldown for this user
      const newTriggers = triggeredAlerts.filter(a => !isOnCooldown(user.email, a.metric));
      if (!newTriggers.length) continue;

      try {
        await sendAQIAlert({
          to: user.email,
          name: user.name,
          metrics: m,
          aqi,
          triggeredMetrics: newTriggers.map(a => ({
            metric: a.metric,
            value: a.value,
            threshold: a.threshold,
            unit: { pm25: 'µg/m³', pm10: 'µg/m³', co: 'ppm', o3: 'ppb', no2: 'ppb' }[a.metric] || '',
          })),
        });

        // Set cooldown for each metric that was alerted
        newTriggers.forEach(a => setCooldown(user.email, a.metric));
        console.log(`[Alert Email]  Sent to ${user.email} (AQI ${aqi})`);
      } catch (e) {
        console.error(`[Alert Email] Failed for ${user.email}:`, e.message);
      }
    }
  } catch (err) {
    console.error('[Alert Email] Error fetching users:', err.message);
  }
}

module.exports = { startEmailScheduler, handleAlertEmails };
