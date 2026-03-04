const express = require('express');
const router = express.Router();
const Reading = require('../models/reading');
const AnalyticsSummary = require('../models/AnalyticsSummary');
const AnalyticsForecast = require('../models/AnalyticsForecast');
const AnalyticsAnomaly = require('../models/AnalyticsAnomaly');

// Air Quality Index calculation
function calculateAQI(pm25) {
  if (pm25 <= 12) return Math.round((50 / 12) * pm25);
  if (pm25 <= 35.4) return Math.round(((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1) + 51);
  if (pm25 <= 55.4) return Math.round(((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5) + 101);
  if (pm25 <= 150.4) return Math.round(((200 - 151) / (150.4 - 55.5)) * (pm25 - 55.5) + 151);
  if (pm25 <= 250.4) return Math.round(((300 - 201) / (250.4 - 150.5)) * (pm25 - 150.5) + 201);
  return Math.round(((500 - 301) / (500.4 - 250.5)) * (pm25 - 250.5) + 301);
}

// Health recommendations based on AQI
function getHealthRecommendations(aqi) {
  if (aqi <= 50) {
    return {
      category: "Good",
      color: "#00e400",
      advice: "Air quality is excellent. Perfect for outdoor activities!",
      activities: ["Running", "Cycling", "Sports", "All outdoor activities"],
      precautions: []
    };
  } else if (aqi <= 100) {
    return {
      category: "Moderate",
      color: "#ffff00",
      advice: "Air quality is acceptable for most people.",
      activities: ["Light exercise", "Walking", "Short outdoor activities"],
      precautions: ["Unusually sensitive people should consider reducing prolonged outdoor exertion"]
    };
  } else if (aqi <= 150) {
    return {
      category: "Unhealthy for Sensitive Groups",
      color: "#ff7e00",
      advice: "Sensitive groups may experience health effects.",
      activities: ["Indoor activities", "Light indoor exercise"],
      precautions: ["People with respiratory/heart conditions should limit outdoor exertion", "Keep rescue inhaler handy if asthmatic"]
    };
  } else if (aqi <= 200) {
    return {
      category: "Unhealthy",
      color: "#ff0000",
      advice: "Everyone may begin to experience health effects.",
      activities: ["Indoor activities only"],
      precautions: ["Avoid prolonged outdoor activities", "Keep windows closed", "Use air purifiers if available"]
    };
  } else if (aqi <= 300) {
    return {
      category: "Very Unhealthy",
      color: "#8f3f97",
      advice: "Health alert: everyone may experience serious effects.",
      activities: ["Stay indoors"],
      precautions: ["Avoid all outdoor activities", "Keep windows/doors closed", "Run air purifiers", "Wear N95 masks if must go outside"]
    };
  } else {
    return {
      category: "Hazardous",
      color: "#7e0023",
      advice: "Health warnings of emergency conditions.",
      activities: ["Remain indoors"],
      precautions: ["Emergency conditions", "Avoid all outdoor exposure", "Seal windows/doors", "Consider evacuation if possible"]
    };
  }
}

// Process natural language query
async function processQuery(query) {
  const lowerQuery = query.toLowerCase();
  
  try {
    // Get latest reading
    const latestReading = await Reading.findOne().sort({ timestamp: -1 });
    
    if (!latestReading) {
      return {
        response: "I don't have any air quality data available yet. Please check back once sensor data starts coming in.",
        data: null
      };
    }

    const m = latestReading.metrics || {};
    const aqi = calculateAQI(m.pm25);
    const health = getHealthRecommendations(aqi);

    // Current conditions queries
    if (lowerQuery.includes('current') || lowerQuery.includes('now') || lowerQuery.includes('today')) {
      return {
        response: `Current air quality is ${health.category} (AQI: ${aqi}).\n\n` +
                 `📊 Measurements:\n` +
                 `• PM1.0: ${m.pm1 ?? 'N/A'} μg/m³\n` +
                 `• PM2.5: ${m.pm25} μg/m³\n` +
                 `• PM10: ${m.pm10} μg/m³\n` +
                 `• CO: ${m.co} ppm\n` +
                 `• CO₂: ${m.co2 ?? 'N/A'} ppm\n` +
                 `• Temperature: ${m.temperature}°C\n` +
                 `• Humidity: ${m.humidity}%\n\n` +
                 `💡 ${health.advice}`,
        data: { aqi, ...latestReading.toObject(), health }
      };
    }

    // Health/safety queries
    if (lowerQuery.includes('safe') || lowerQuery.includes('health') || lowerQuery.includes('recommend')) {
      return {
        response: `Air Quality: ${health.category} (AQI: ${aqi})\n\n` +
                 `${health.advice}\n\n` +
                 `✅ Recommended activities:\n${health.activities.map(a => `• ${a}`).join('\n')}\n\n` +
                 `⚠️ Precautions:\n${health.precautions.length > 0 ? health.precautions.map(p => `• ${p}`).join('\n') : '• None needed'}`,
        data: { aqi, health }
      };
    }

    // Outdoor activity queries
    if (lowerQuery.includes('outdoor') || lowerQuery.includes('exercise') || lowerQuery.includes('run') || lowerQuery.includes('walk')) {
      const safe = aqi <= 100;
      return {
        response: safe 
          ? `Yes, it's safe for outdoor activities! Current AQI is ${aqi} (${health.category}).\n\n${health.advice}`
          : `Not recommended. Current AQI is ${aqi} (${health.category}).\n\n${health.advice}\n\nConsider these instead:\n${health.activities.map(a => `• ${a}`).join('\n')}`,
        data: { safe, aqi, health }
      };
    }

    // PM2.5 specific queries
    if (lowerQuery.includes('pm2.5') || lowerQuery.includes('pm 2.5')) {
      const status = m.pm25 <= 12 ? 'excellent' : 
                    m.pm25 <= 35.4 ? 'good' : 
                    m.pm25 <= 55.4 ? 'moderate' : 'concerning';
      return {
        response: `PM2.5 level is ${m.pm25} μg/m³ (${status}).\n\n` +
                 `This contributes to an AQI of ${aqi}. ` +
                 `${m.pm25 > 35.4 ? 'This is above recommended levels.' : 'This is within safe limits.'}`,
        data: { pm25: m.pm25, aqi, status }
      };
    }

    // Temperature/humidity queries
    if (lowerQuery.includes('temperature') || lowerQuery.includes('temp') || lowerQuery.includes('hot') || lowerQuery.includes('cold')) {
      return {
        response: `Current temperature is ${m.temperature}°C with ${m.humidity}% humidity.\n\n` +
                 `${m.temperature > 30 ? '🌡️ It\'s quite warm. Stay hydrated!' : 
                    m.temperature < 15 ? '❄️ It\'s cool outside. Dress warmly!' : 
                    '🌤️ Temperature is comfortable.'}`,
        data: { temperature: m.temperature, humidity: m.humidity }
      };
    }

    // CO queries
    if (lowerQuery.includes('co') || lowerQuery.includes('carbon monoxide')) {
      const safe = m.co < 9;
      return {
        response: `Carbon monoxide level is ${m.co} ppm.\n\n` +
                 `${safe ? '✅ This is within safe limits (< 9 ppm).' : '⚠️ This exceeds safe limits! Ensure proper ventilation.'}`,
        data: { co: m.co, safe }
      };
    }

    // Trend queries
    if (lowerQuery.includes('trend') || lowerQuery.includes('getting better') || lowerQuery.includes('getting worse')) {
      const last24h = await Reading.find({
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).sort({ timestamp: 1 });

      if (last24h.length < 2) {
        return {
          response: "Not enough historical data to determine trends yet. Check back after more readings are collected.",
          data: null
        };
      }

      const firstAQI = calculateAQI(last24h[0].metrics?.pm25);
      const lastAQI = calculateAQI(last24h[last24h.length - 1].metrics?.pm25);
      const change = lastAQI - firstAQI;
      const trend = change > 5 ? 'worsening' : change < -5 ? 'improving' : 'stable';

      return {
        response: `Over the last 24 hours, air quality is ${trend}.\n\n` +
                 `• 24h ago: AQI ${firstAQI}\n` +
                 `• Now: AQI ${lastAQI}\n` +
                 `• Change: ${change > 0 ? '+' : ''}${change} points\n\n` +
                 `${trend === 'worsening' ? '📈 Consider reducing outdoor activities.' : 
                   trend === 'improving' ? '📉 Conditions are getting better!' : 
                   '➡️ Conditions are relatively stable.'}`,
        data: { trend, firstAQI, lastAQI, change }
      };
    }

    // Forecast/prediction queries
    if (lowerQuery.includes('forecast') || lowerQuery.includes('predict') || lowerQuery.includes('will it')) {
      const forecast = await AnalyticsForecast.findOne().sort({ timestamp: -1 });
      
      if (!forecast || !forecast.predictions || forecast.predictions.length === 0) {
        return {
          response: "Forecast data is not available yet. The AI model needs more historical data to make predictions.",
          data: null
        };
      }

      const nextPrediction = forecast.predictions[0];
      const predictedAQI = calculateAQI(nextPrediction.pm25);
      const predictedHealth = getHealthRecommendations(predictedAQI);

      return {
        response: `📊 Next hour forecast:\n\n` +
                 `Predicted AQI: ${predictedAQI} (${predictedHealth.category})\n` +
                 `• PM2.5: ${nextPrediction.pm25.toFixed(1)} μg/m³\n` +
                 `• PM10: ${nextPrediction.pm10.toFixed(1)} μg/m³\n\n` +
                 `${predictedHealth.advice}`,
        data: { forecast: nextPrediction, predictedAQI, health: predictedHealth }
      };
    }

    // Anomaly/alert queries
    if (lowerQuery.includes('alert') || lowerQuery.includes('anomaly') || lowerQuery.includes('unusual')) {
      const recentAnomalies = await AnalyticsAnomaly.find({
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).sort({ timestamp: -1 }).limit(5);

      if (recentAnomalies.length === 0) {
        return {
          response: "✅ No anomalies detected in the last 24 hours. Air quality readings are normal.",
          data: { anomalies: [] }
        };
      }

      return {
        response: `⚠️ ${recentAnomalies.length} anomal${recentAnomalies.length > 1 ? 'ies' : 'y'} detected in the last 24 hours:\n\n` +
                 recentAnomalies.map((a, i) => 
                   `${i + 1}. ${a.parameter}: ${a.value.toFixed(1)} (severity: ${a.severity})\n   ${new Date(a.timestamp).toLocaleString()}`
                 ).join('\n\n'),
        data: { anomalies: recentAnomalies }
      };
    }

    // Statistics queries
    if (lowerQuery.includes('average') || lowerQuery.includes('statistics') || lowerQuery.includes('stats')) {
      const summary = await AnalyticsSummary.findOne().sort({ timestamp: -1 });
      
      if (!summary) {
        return {
          response: "Statistical summary is not available yet. Check back after more data is collected.",
          data: null
        };
      }

      return {
        response: `📊 Air Quality Statistics:\n\n` +
                 `PM2.5:\n• Average: ${summary.pm25_avg?.toFixed(1) || 'N/A'} μg/m³\n• Min: ${summary.pm25_min?.toFixed(1) || 'N/A'}\n• Max: ${summary.pm25_max?.toFixed(1) || 'N/A'}\n\n` +
                 `PM10:\n• Average: ${summary.pm10_avg?.toFixed(1) || 'N/A'} μg/m³\n• Min: ${summary.pm10_min?.toFixed(1) || 'N/A'}\n• Max: ${summary.pm10_max?.toFixed(1) || 'N/A'}\n\n` +
                 `Temperature: ${summary.temperature_avg?.toFixed(1) || 'N/A'}°C\n` +
                 `Humidity: ${summary.humidity_avg?.toFixed(1) || 'N/A'}%`,
        data: summary
      };
    }

    // Default response - provide current conditions
    return {
      response: `I can help you with air quality information! Current AQI is ${aqi} (${health.category}).\n\n` +
               `Ask me about:\n` +
               `• Current conditions\n` +
               `• Health recommendations\n` +
               `• Outdoor activity safety\n` +
               `• Trends and forecasts\n` +
               `• Specific pollutants (PM2.5, PM10, CO)\n` +
               `• Recent alerts or anomalies`,
      data: { aqi, health }
    };

  } catch (error) {
    console.error('Chatbot query error:', error);
    return {
      response: "I encountered an error processing your request. Please try again or rephrase your question.",
      data: null,
      error: error.message
    };
  }
}

// POST /api/chatbot/query
router.post('/query', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Message is required' 
      });
    }

    const result = await processQuery(message);

    res.json({
      success: true,
      response: result.response,
      data: result.data,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Chatbot API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process query',
      message: error.message
    });
  }
});

module.exports = router;
