// src/pages/Settings.js
import React, { useEffect, useState } from 'react';
import { api } from '../config/api';

const defaults = { 
  pm1: 50,
  pm25: 35, 
  pm10: 150, 
  co: 9, 
  co2: 1000,
  temperature: 40,
  humidity: 80,
  voc_index: 250,
  nox_index: 250
};

export default function Settings(){
  const [thresholds, setThresholds] = useState(defaults);
  const userId = 'admin';

  useEffect(()=>{
    (async()=>{
      try{
        const { data } = await api.get(`/api/settings/${userId}`);
        if(data?.thresholds) setThresholds(data.thresholds);
      }catch(e){}
    })();
  },[]);

  const save = async () => {
    await api.post('/api/settings', { userId, thresholds });
    alert('Saved');
  };

  const unitMap = {
    pm1: 'µg/m³', pm25: 'µg/m³', pm10: 'µg/m³',
    co: 'ppm', co2: 'ppm',
    temperature: '°C', humidity: '%',
    voc_index: 'index', nox_index: 'index'
  };

  const labelMap = {
    pm1: 'PM1.0', pm25: 'PM2.5', pm10: 'PM10',
    co: 'CO', co2: 'CO₂',
    temperature: 'Temperature', humidity: 'Humidity',
    voc_index: 'VOC Index', nox_index: 'NOx Index'
  };

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: 28, fontWeight: 'bold' }}>⚙️ Settings</h2>
        <p style={{ margin: 0, opacity: 0.6, fontSize: 14 }}>
          Configure custom alert thresholds for each sensor parameter
        </p>
      </div>

      <div style={{
        background: 'var(--card-bg)',
        padding: 20,
        borderRadius: 'var(--card-radius)',
        boxShadow: 'var(--glass-shadow)',
        border: '1px solid var(--glass-border)',
        marginBottom: 20
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>🔔 Alert Thresholds</h3>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap: 16}}>
          {Object.keys(thresholds).map(k=>(
            <div key={k} style={{
              background: 'rgba(255,255,255,0.03)',
              padding: 16,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.06)',
              transition: 'all 0.2s'
            }}>
              <label style={{
                display:'block',
                marginBottom: 10,
                fontSize: 13,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.85)',
                letterSpacing: '0.5px'
              }}>
                {labelMap[k] || k.toUpperCase()}
                <span style={{ fontWeight: 400, opacity: 0.5, marginLeft: 6, fontSize: 11 }}>
                  ({unitMap[k] || ''})
                </span>
              </label>
              <input
                type="number"
                value={thresholds[k]}
                onChange={e=>setThresholds(s=>({...s,[k]:Number(e.target.value)}))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 600,
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <button className="btn primary" onClick={save} style={{
        padding: '12px 28px',
        fontSize: 15,
        fontWeight: 700,
        borderRadius: 10,
        cursor: 'pointer'
      }}>
        💾 Save Settings
      </button>
    </div>
  );
}
