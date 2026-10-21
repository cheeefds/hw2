'use client';

import React, { useState, useMemo } from 'react';
import modelData from '@/model/sales_model_data.json';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const imagePath = (fileName: string) => `${basePath}/images/sales/${fileName}`;

export default function SalesDashboard() {
  // Preset scenarios
  const presets = modelData.presets;
  const [selectedPreset, setSelectedPreset] = useState<string>('average');

  // Interactive slider/feature state
  const [unitsSold, setUnitsSold] = useState<number>(88.8);
  const [unitsOrdered, setUnitsOrdered] = useState<number>(89.1);
  const [inventoryLevel, setInventoryLevel] = useState<number>(301.1);
  const [discount, setDiscount] = useState<number>(9.1);
  const [promotion, setPromotion] = useState<number>(0);
  const [epidemic, setEpidemic] = useState<number>(0);
  const [category, setCategory] = useState<string>('Clothing');
  const [weather, setWeather] = useState<string>('Cloudy');
  const [seasonality, setSeasonality] = useState<string>('Autumn');
  const [productId, setProductId] = useState<string>('P0001');

  // Active gallery tab
  const [activeTab, setActiveTab] = useState<'actual_pred' | 'interval' | 'residuals' | 'features' | 'comparison'>('actual_pred');

  // Crisp-DM Active Step
  const [activeCrispStep, setActiveCrispStep] = useState<number>(1);

  // Apply a preset
  const handlePresetSelect = (presetKey: string) => {
    setSelectedPreset(presetKey);
    const p = (presets as Record<string, any>)[presetKey];
    if (p && p.values) {
      setUnitsSold(p.values['Units Sold'] ?? 88.8);
      setUnitsOrdered(p.values['Units Ordered'] ?? 89.1);
      setInventoryLevel(p.values['Inventory Level'] ?? 301.1);
      setDiscount(p.values['Discount'] ?? 9.1);
      setPromotion(p.values['Promotion'] ?? 0);
      setEpidemic(p.values['Epidemic'] ?? 0);
      setCategory(p.values['Category'] ?? 'Clothing');
      setWeather(p.values['Weather Condition'] ?? 'Cloudy');
      setSeasonality(p.values['Seasonality'] ?? 'Autumn');
      setProductId(p.values['ProductID'] ?? 'P0001');
    }
  };

  // Live Regression Calculation based on exact fitted OLS coefficients
  const prediction = useMemo(() => {
    const intercept = modelData.intercept; // 47.0184
    let pred = intercept;

    // Feature contributions
    const contributions: Array<{
      feature: string;
      label: string;
      rawVal: string;
      normVal: number;
      coef: number;
      delta: number;
    }> = [];

    // 1. Units Sold (scaled by max 426.0)
    const normSold = Math.min(1, Math.max(0, unitsSold / 426.0));
    const coefSold = 288.2445;
    const deltaSold = coefSold * normSold;
    pred += deltaSold;
    contributions.push({
      feature: 'Units Sold',
      label: '實際銷售量',
      rawVal: `${Math.round(unitsSold)} 件`,
      normVal: normSold,
      coef: coefSold,
      delta: deltaSold,
    });

    // 2. Units Ordered (scaled by max 1616.0)
    const normOrdered = Math.min(1, Math.max(0, unitsOrdered / 1616.0));
    const coefOrdered = 80.9425;
    const deltaOrdered = coefOrdered * normOrdered;
    pred += deltaOrdered;
    contributions.push({
      feature: 'Units Ordered',
      label: '追加訂購量',
      rawVal: `${Math.round(unitsOrdered)} 件`,
      normVal: normOrdered,
      coef: coefOrdered,
      delta: deltaOrdered,
    });

    // 3. Epidemic (0 or 1)
    const coefEpidemic = -17.5953;
    const deltaEpidemic = coefEpidemic * epidemic;
    pred += deltaEpidemic;
    contributions.push({
      feature: 'Epidemic',
      label: '疫情管制事件',
      rawVal: epidemic === 1 ? '發生 (1)' : '無 (0)',
      normVal: epidemic,
      coef: coefEpidemic,
      delta: deltaEpidemic,
    });

    // 4. Category (One-Hot: Furniture, Groceries, Toys, Electronics, baseline: Clothing)
    const catFurniture = category === 'Furniture' ? 1 : 0;
    const catGroceries = category === 'Groceries' ? 1 : 0;
    const catToys = category === 'Toys' ? 1 : 0;
    const catElectronics = category === 'Electronics' ? 1 : 0;

    const deltaFurniture = -17.2626 * catFurniture;
    const deltaGroceries = 3.4237 * catGroceries;
    const deltaToys = -8.8912 * catToys;
    const deltaElectronics = -6.3723 * catElectronics;
    pred += deltaFurniture + deltaGroceries + deltaToys + deltaElectronics;

    const totalCatDelta = deltaFurniture + deltaGroceries + deltaToys + deltaElectronics;
    contributions.push({
      feature: `Category (${category})`,
      label: '商品品類效應',
      rawVal: category,
      normVal: 1,
      coef: category === 'Furniture' ? -17.26 : category === 'Groceries' ? 3.42 : category === 'Toys' ? -8.89 : category === 'Electronics' ? -6.37 : 0,
      delta: totalCatDelta,
    });

    // 5. Promotion (0 or 1)
    const coefPromotion = 10.5056;
    const deltaPromotion = coefPromotion * promotion;
    pred += deltaPromotion;
    contributions.push({
      feature: 'Promotion',
      label: '促銷活動',
      rawVal: promotion === 1 ? '促銷中 (1)' : '常規 (0)',
      normVal: promotion,
      coef: coefPromotion,
      delta: deltaPromotion,
    });

    // 6. Discount (scaled by max 25.0)
    const normDiscount = Math.min(1, Math.max(0, discount / 25.0));
    const coefDiscount = -0.6893;
    const deltaDiscount = coefDiscount * normDiscount;
    pred += deltaDiscount;
    contributions.push({
      feature: 'Discount',
      label: '折扣幅度',
      rawVal: `${discount.toFixed(1)}%`,
      normVal: normDiscount,
      coef: coefDiscount,
      delta: deltaDiscount,
    });

    // 7. Weather (Sunny, Rainy, Snowy, baseline: Cloudy)
    const weatherSunny = weather === 'Sunny' ? 1 : 0;
    const weatherRainy = weather === 'Rainy' ? 1 : 0;
    const weatherSnowy = weather === 'Snowy' ? 1 : 0;
    const deltaSunny = 3.8629 * weatherSunny;
    const deltaRainy = -3.9266 * weatherRainy;
    const deltaSnowy = -3.6645 * weatherSnowy;
    pred += deltaSunny + deltaRainy + deltaSnowy;

    contributions.push({
      feature: `Weather (${weather})`,
      label: '天氣狀況效應',
      rawVal: weather,
      normVal: 1,
      coef: weather === 'Sunny' ? 3.86 : weather === 'Rainy' ? -3.93 : weather === 'Snowy' ? -3.66 : 0,
      delta: deltaSunny + deltaRainy + deltaSnowy,
    });

    // 8. Inventory Level (scaled by max 2267.0)
    const normInventory = Math.min(1, Math.max(0, inventoryLevel / 2267.0));
    const coefInventory = -29.9799;
    const deltaInventory = coefInventory * normInventory;
    pred += deltaInventory;
    contributions.push({
      feature: 'Inventory Level',
      label: '在架與庫存量',
      rawVal: `${Math.round(inventoryLevel)} 件`,
      normVal: normInventory,
      coef: coefInventory,
      delta: deltaInventory,
    });

    // 9. Seasonality (Summer, Spring, baseline: Autumn / Winter)
    const seasonSummer = seasonality === 'Summer' ? 1 : 0;
    const seasonSpring = seasonality === 'Spring' ? 1 : 0;
    const deltaSummer = 3.8270 * seasonSummer;
    const deltaSpring = 0.5124 * seasonSpring;
    pred += deltaSummer + deltaSpring;

    contributions.push({
      feature: `Seasonality (${seasonality})`,
      label: '季節變動效應',
      rawVal: seasonality,
      normVal: 1,
      coef: seasonality === 'Summer' ? 3.83 : seasonality === 'Spring' ? 0.51 : 0,
      delta: deltaSummer + deltaSpring,
    });

    // 10. Product ID (P0020, P0009, P0012, P0017, P0013, baseline: other/P0001)
    let deltaPid = 0;
    let pidCoef = 0;
    if (productId === 'P0020') { deltaPid = -0.3549; pidCoef = -0.3549; }
    else if (productId === 'P0009') { deltaPid = 0.6296; pidCoef = 0.6296; }
    else if (productId === 'P0012') { deltaPid = -0.2740; pidCoef = -0.2740; }
    else if (productId === 'P0017') { deltaPid = 0.2304; pidCoef = 0.2304; }
    else if (productId === 'P0013') { deltaPid = 0.6439; pidCoef = 0.6439; }
    pred += deltaPid;

    contributions.push({
      feature: `Product ID (${productId})`,
      label: '商品特定校正',
      rawVal: productId,
      normVal: 1,
      coef: pidCoef,
      delta: deltaPid,
    });

    // Prediction interval: nominal coverage 95% is +- 44.14 around mean (mean width 88.28)
    const lowerPI = Math.max(0, Math.round(pred - 44.14));
    const upperPI = Math.round(pred + 44.14);

    // +-1 RMSE range (22.20)
    const lowerRMSE = Math.max(0, Math.round(pred - 22.20));
    const upperRMSE = Math.round(pred + 22.20);

    return {
      demand: Math.round(pred * 10) / 10,
      lowerPI,
      upperPI,
      lowerRMSE,
      upperRMSE,
      isOutsideRange: pred < 4 || pred > 430,
      contributions: contributions.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
    };
  }, [unitsSold, unitsOrdered, inventoryLevel, discount, promotion, epidemic, category, weather, seasonality, productId]);

  return (
    <main className="page-shell">
      {/* Top Header Banner */}
      <header style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 14px', borderRadius: '9999px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', marginBottom: '14px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block', boxShadow: '0 0 10px #3b82f6' }}></span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#93c5fd', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Kaggle 迴歸分析專題 • Retail Store Demand Forecasting
              </span>
            </div>

            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '10px' }}>
              零售需求多元線性回歸
            </h1>

            <p style={{ color: 'var(--text-secondary)', fontSize: '1.02rem', maxWidth: '820px', lineHeight: 1.6 }}>
              本作業使用 Kaggle 的 <strong style={{ color: '#f1f5f9' }}>Retail Store Inventory and Demand Forecasting</strong> 合成資料（76,000 筆、16 欄），依照 CRISP-DM 完成資料理解、資料準備、F-score 前 20 名特徵選擇、多元線性回歸、模型評估與部署規劃。
            </p>
          </div>

          {/* Quick Scenario Preset Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>預設情境快速試算：</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.entries(presets).map(([key, item]) => (
                <button
                  key={key}
                  onClick={() => handlePresetSelect(key)}
                  className={selectedPreset === key ? 'btn-primary' : 'btn-secondary'}
                  style={{ fontSize: '0.85rem', padding: '7px 14px' }}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Model Performance Metric Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '6px' }}>
            測試集判定係數（R²）
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#38bdf8' }} className="mono">
            0.7768
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            可解釋 77.7% 的樣本外需求變異
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '6px' }}>
            測試集平均絕對誤差（MAE）
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#34d399' }} className="mono">
            16.55 件
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            平均絕對誤差相較基準模型（37.04）降低 55.3%
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '6px' }}>
            測試集均方根誤差（RMSE）
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fbbf24' }} className="mono">
            22.20 件
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            相較 44 特徵全模型（21.81）僅微幅上升 0.39
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '6px' }}>
            模型精簡度（F-Score 前 20 名）
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#a78bfa' }} className="mono">
            20 / 44
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            95% 預測區間實際涵蓋率 95.60%（寬度 88.28）
          </div>
        </div>
      </section>

      {/* Main Workspace: Left Controls vs Right Live Prediction */}
      <div className="workspace-grid">
        {/* Left Column: Interactive Feature Controls */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>互動式特徵控制</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                調整銷售、訂單、庫存、促銷與環境參數，即時試算多元線性回歸模型之需求預測。
              </p>
            </div>
            <button
              onClick={() => handlePresetSelect('average')}
              className="btn-secondary"
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            >
              重設為平均值
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Group 1: 銷售與訂單 */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>
                一、銷售與訂單（核心預測特徵）
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Units Sold Slider */}
                <div className="slider-container">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <label style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                      實際銷售數量 (Units Sold)
                    </label>
                    <span className="mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#06b6d4' }}>
                      {Math.round(unitsSold)} 件
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="426"
                    step="1"
                    value={unitsSold}
                    aria-label="實際銷售數量 (Units Sold)"
                    onChange={(e) => {
                      setSelectedPreset('custom');
                      setUnitsSold(parseFloat(e.target.value));
                    }}
                  />
                  <div className="slider-scale">
                    <span>最小：0</span>
                    <span>當期門市實際售出件數（F-Score: 137,207.4，權重最顯著）</span>
                    <span>最大：426</span>
                  </div>
                </div>

                {/* Units Ordered Slider */}
                <div className="slider-container">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <label style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                      追加訂購量 (Units Ordered)
                    </label>
                    <span className="mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#06b6d4' }}>
                      {Math.round(unitsOrdered)} 件
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1616"
                    step="5"
                    value={unitsOrdered}
                    aria-label="追加訂購量 (Units Ordered)"
                    onChange={(e) => {
                      setSelectedPreset('custom');
                      setUnitsOrdered(parseFloat(e.target.value));
                    }}
                  />
                  <div className="slider-scale">
                    <span>最小：0</span>
                    <span>向供應鏈發出的補充採購量（F-Score: 21,495.8）</span>
                    <span>最大：1616</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Group 2: 庫存與促銷 */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>
                二、庫存、折扣與行銷策略
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Inventory Level Slider */}
                <div className="slider-container">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <label style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                      在架與庫存量 (Inventory Level)
                    </label>
                    <span className="mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#10b981' }}>
                      {Math.round(inventoryLevel)} 件
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2267"
                    step="10"
                    value={inventoryLevel}
                    aria-label="在架與庫存量 (Inventory Level)"
                    onChange={(e) => {
                      setSelectedPreset('custom');
                      setInventoryLevel(parseFloat(e.target.value));
                    }}
                  />
                  <div className="slider-scale">
                    <span>最小：0</span>
                    <span>期初庫存量（滯銷品往往伴隨高庫存，呈現負回歸權重）</span>
                    <span>最大：2267</span>
                  </div>
                </div>

                {/* Discount Slider */}
                <div className="slider-container">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <label style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                      折扣幅度 (Discount)
                    </label>
                    <span className="mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#10b981' }}>
                      {discount.toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    step="1"
                    value={discount}
                    aria-label="折扣幅度 (Discount)"
                    onChange={(e) => {
                      setSelectedPreset('custom');
                      setDiscount(parseFloat(e.target.value));
                    }}
                  />
                  <div className="slider-scale">
                    <span>0% (無折扣)</span>
                    <span>促銷降價百分比（範圍 0% - 25%）</span>
                    <span>25% (最大折扣)</span>
                  </div>
                </div>

                {/* Promotion Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>行銷宣傳活動 (Promotion)</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>當期是否有大型廣告或促銷方案配合（+10.5 件預測增益）</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => { setSelectedPreset('custom'); setPromotion(0); }}
                      className={promotion === 0 ? 'btn-primary' : 'btn-secondary'}
                      style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                    >
                      無促銷 (0)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedPreset('custom'); setPromotion(1); }}
                      className={promotion === 1 ? 'btn-primary' : 'btn-secondary'}
                      style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                    >
                      促銷中 (1)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Group 3: 環境、天氣與季節 */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>
                三、外生環境、天氣與季節
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                {/* Weather Select */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    天氣狀況 (Weather Condition)
                  </label>
                  <select
                    value={weather}
                    aria-label="天氣狀況"
                    onChange={(e) => { setSelectedPreset('custom'); setWeather(e.target.value); }}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#111827', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  >
                    <option value="Cloudy">多雲陰天 (Cloudy, 基準)</option>
                    <option value="Sunny">晴天 (Sunny, +3.86 件)</option>
                    <option value="Rainy">雨天 (Rainy, -3.93 件)</option>
                    <option value="Snowy">雪天 (Snowy, -3.66 件)</option>
                  </select>
                </div>

                {/* Seasonality Select */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    季節週期 (Seasonality)
                  </label>
                  <select
                    value={seasonality}
                    aria-label="季節週期"
                    onChange={(e) => { setSelectedPreset('custom'); setSeasonality(e.target.value); }}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#111827', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  >
                    <option value="Autumn">秋季 (Autumn, 基準)</option>
                    <option value="Summer">夏季 (Summer, +3.83 件)</option>
                    <option value="Spring">春季 (Spring, +0.51 件)</option>
                    <option value="Winter">冬季 (Winter, 0 件)</option>
                  </select>
                </div>

                {/* Epidemic Toggle */}
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px' }}>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>突發疫情管制事件 (Epidemic)</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>是否實施疫情管制或限制措施（-17.6 件顯著衝擊）</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => { setSelectedPreset('custom'); setEpidemic(0); }}
                      className={epidemic === 0 ? 'btn-primary' : 'btn-secondary'}
                      style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                    >
                      正常 (0)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedPreset('custom'); setEpidemic(1); }}
                      className={epidemic === 1 ? 'btn-primary' : 'btn-secondary'}
                      style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                    >
                      疫情衝擊 (1)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Group 4: 商品品類與代碼 */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>
                四、商品品類與代碼校正
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    商品品類 (Category)
                  </label>
                  <select
                    value={category}
                    aria-label="商品品類"
                    onChange={(e) => { setSelectedPreset('custom'); setCategory(e.target.value); }}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#111827', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  >
                    <option value="Clothing">服飾 Clothing (基準)</option>
                    <option value="Groceries">日用品 Groceries (+3.42 件)</option>
                    <option value="Furniture">家具 Furniture (-17.26 件)</option>
                    <option value="Toys">玩具 Toys (-8.89 件)</option>
                    <option value="Electronics">3C電子 Electronics (-6.37 件)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    商品代碼 (Product ID)
                  </label>
                  <select
                    value={productId}
                    aria-label="商品代碼"
                    onChange={(e) => { setSelectedPreset('custom'); setProductId(e.target.value); }}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#111827', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  >
                    <option value="P0001">P0001 (常規基準品)</option>
                    <option value="P0009">P0009 (+0.63 件)</option>
                    <option value="P0012">P0012 (-0.27 件)</option>
                    <option value="P0013">P0013 (+0.64 件)</option>
                    <option value="P0017">P0017 (+0.23 件)</option>
                    <option value="P0020">P0020 (-0.35 件)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Prediction Output Card & Contribution Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Main Prediction Glass Card */}
          <div
            className="glass-panel"
            style={{
              padding: '28px',
              background: 'linear-gradient(145deg, rgba(17, 24, 39, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(6, 182, 212, 0.25) 0%, transparent 70%)', pointerEvents: 'none' }}></div>

            <div style={{ fontSize: '0.82rem', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '8px' }}>
              即時多元線性回歸需求估值（Demand）
            </div>

            <div style={{ fontSize: '3.4rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '6px' }} className="mono">
              {prediction.demand} <span style={{ fontSize: '1.6rem', color: '#94a3b8', fontWeight: 500 }}>件</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span className="mono" style={{ fontSize: '0.95rem', color: '#94a3b8', fontWeight: 600 }}>
                基準截距 β₀ = 47.02 件
              </span>
              <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                瀏覽器即時推論
              </span>
            </div>

            {/* 95% Prediction Interval */}
            <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.85rem', color: '#93c5fd', fontWeight: 600 }}>95% 預測區間（Prediction Interval）：</span>
                <span className="mono" style={{ color: '#38bdf8', fontWeight: 700, fontSize: '1.05rem' }}>
                  [{prediction.lowerPI} ~ {prediction.upperPI}] 件
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                測試集實際涵蓋率為 <strong style={{ color: '#34d399' }}>95.60%</strong>（平均區間寬度 88.28 件），提供單筆需求波動範圍供採購安全庫存設定參考。
              </div>
            </div>

            {/* +-1 RMSE Range */}
            <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <span>±1 RMSE 參考範圍（±22.20）：</span>
                <span className="mono" style={{ color: '#f1f5f9', fontWeight: 600 }}>
                  [{prediction.lowerRMSE} ~ {prediction.upperRMSE}] 件
                </span>
              </div>
            </div>

            {prediction.isOutsideRange && (
              <p className="extrapolation-warning">
                此結果超出訓練集 Demand 樣本範圍（4 至 430 件），屬於統計外插（Extrapolation），實務上請特別留意極端值風險。
              </p>
            )}
          </div>

          {/* Feature Impact Decomposition (Δ from baseline) */}
          <div className="glass-panel" style={{ padding: '24px', flex: 1 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>
              特徵影響拆解（相對基準常數之 Δ）
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              從截距 β₀ = 47.02 出發，長條顯示各入選特徵當前數值對最終需求的推進幅度（w × x_norm）。
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', maxHeight: '380px', overflowY: 'auto' }} className="custom-scrollbar">
              {prediction.contributions.map((item) => {
                const isPos = item.delta >= 0;
                const absDelta = Math.abs(item.delta);
                // max reference is approx 288 for units sold
                const percentBar = Math.min(100, (absDelta / 120) * 100);

                return (
                  <div key={item.feature} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                        {item.label}
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px', fontSize: '0.75rem' }}>
                          ({item.rawVal})
                        </span>
                      </span>
                      <span className="mono" style={{ fontWeight: 700, color: isPos ? '#34d399' : '#f87171' }}>
                        {isPos ? `+${absDelta.toFixed(1)}` : `-${absDelta.toFixed(1)}`} 件
                      </span>
                    </div>

                    <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${percentBar}%`,
                          height: '100%',
                          background: isPos
                            ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                            : 'linear-gradient(90deg, #f43f5e, #fb923c)',
                          borderRadius: '3px',
                          transition: 'width 0.2s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Model Formulation & Scientific Pipeline */}
      <section className="glass-panel" style={{ padding: '28px', marginBottom: '36px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '14px' }}>
          數學公式與推論架構
        </h2>
        <div className="formula-grid">
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '12px' }}>
              模型僅在訓練集（N=60,800，隨機種子 42）擬合 MinMaxScaler 與 F-score 選擇器，再以 statsmodels OLS / scikit-learn LinearRegression 計算推論權重，以確保<strong>完全沒有資料洩漏（Zero Data Leakage）</strong>：
            </p>
            <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.88rem' }} className="mono">
              <span style={{ color: '#38bdf8' }}>Demand_hat</span> = 47.0184 + 288.24 · (Units_Sold / 426)<br />
              &nbsp;&nbsp;+ 80.94 · (Units_Ordered / 1616) - 29.98 · (Inventory / 2267)<br />
              &nbsp;&nbsp;- 17.60 · Epidemic - 17.26 · Furniture + 10.51 · Promotion<br />
              &nbsp;&nbsp;+ 3.86 · Sunny - 3.93 · Rainy + 3.83 · Summer + ...<br />
              <span style={{ color: '#94a3b8', fontSize: '0.78rem', display: 'block', marginTop: '6px' }}>
                F-statistic = 10,181.78 (p-value = 0.000) • 殘差標準誤 = 22.20
              </span>
            </div>
          </div>

          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '12px' }}>
              <strong>前 20 大特徵選擇與業務邏輯：</strong>
            </p>
            <ul style={{ color: 'var(--text-muted)', fontSize: '0.84rem', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><code>Units Sold</code>（銷量）與 <code>Units Ordered</code>（訂單）為前兩大主導因子，F-score 分別達 137,207 與 21,495。</li>
              <li><code>Epidemic</code>（疫情管制）具高達 -17.6 件之抑制衝擊，為第 3 大特徵（F: 9,303）。</li>
              <li><code>Category_Furniture</code> 與 <code>Category_Groceries</code> 分別呈現低頻大件負向 (-17.26) 與高頻民生正向 (+3.42) 差異。</li>
              <li><code>Weather Condition_Sunny</code> 與 <code>Seasonality_Summer</code> 具備顯著晴朗夏日推生效應 (+3.8 件)。</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Experimental Results & Visualizations Gallery */}
      <section className="glass-panel" style={{ padding: '28px', marginBottom: '36px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              實驗圖表與模型比較展覽館
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              以下為 Notebook 訓練流程直接產生之評估圖表與量化指標。
            </p>
          </div>

          {/* Tab Selector */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', background: 'rgba(0,0,0,0.35)', padding: '4px', borderRadius: '10px' }}>
            <button
              onClick={() => setActiveTab('actual_pred')}
              className={activeTab === 'actual_pred' ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            >
              實際值與預測值
            </button>
            <button
              onClick={() => setActiveTab('interval')}
              className={activeTab === 'interval' ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            >
              95% 預測區間
            </button>
            <button
              onClick={() => setActiveTab('residuals')}
              className={activeTab === 'residuals' ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            >
              殘差診斷圖
            </button>
            <button
              onClick={() => setActiveTab('features')}
              className={activeTab === 'features' ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            >
              前 20 名特徵排名
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={activeTab === 'comparison' ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            >
              模型指標比較
            </button>
          </div>
        </div>

        {/* Gallery Content */}
        <div style={{ background: '#070a12', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.05)', textAlign: 'center' }}>
          {activeTab === 'actual_pred' && (
            <div>
              <img
                src={imagePath('actual_vs_predicted.png')}
                alt="實際值與預測值比較散布圖"
                style={{ width: '100%', maxHeight: '540px', objectFit: 'contain', borderRadius: '8px' }}
              />
              <p style={{ marginTop: '14px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <strong>圖 1：測試集實際值 vs. 預測值散布圖（15,200 筆測試樣本）。</strong>紅色虛線為理想預測線 y = x；模型在絕大多數區間緊密貼合 45 度線，R² 達 0.7768。
              </p>
            </div>
          )}

          {activeTab === 'interval' && (
            <div>
              <img
                src={imagePath('prediction_interval.png')}
                alt="95% 預測區間帶走勢圖"
                style={{ width: '100%', maxHeight: '540px', objectFit: 'contain', borderRadius: '8px' }}
              />
              <p style={{ marginTop: '14px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <strong>圖 2：需求預測與 95% 預測區間（每 50 筆抽樣呈現）。</strong>淡藍色陰影為 95% 預測區間，測試集實際涵蓋率高達 95.60%，平均寬度為 88.28 件。
              </p>
            </div>
          )}

          {activeTab === 'residuals' && (
            <div>
              <img
                src={imagePath('residual_diagnostics.png')}
                alt="殘差診斷散布圖與直方圖"
                style={{ width: '100%', maxHeight: '540px', objectFit: 'contain', borderRadius: '8px' }}
              />
              <p style={{ marginTop: '14px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <strong>圖 3：殘差對擬合值散布圖（左）與殘差常態分布直方圖（右）。</strong>殘差大致對稱聚集於 0 軸周圍，顯示誤差未見明顯非線性系統性漂移。
              </p>
            </div>
          )}

          {activeTab === 'features' && (
            <div style={{ textAlign: 'left', overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>排名</th>
                    <th>特徵名稱 (Feature)</th>
                    <th>類別</th>
                    <th>F-Score (ANOVA)</th>
                    <th>p-value</th>
                    <th>回歸係數 (Coef)</th>
                    <th>標準誤 (Std Err)</th>
                    <th>t-statistic</th>
                  </tr>
                </thead>
                <tbody>
                  {modelData.coefficients.map((row) => (
                    <tr key={row.rank}>
                      <td className="mono" style={{ fontWeight: 700, color: '#38bdf8' }}>#{row.rank}</td>
                      <td><strong>{row.label}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>({row.feature})</span></td>
                      <td><span className="badge badge-blue">{row.category}</span></td>
                      <td className="mono">{row.f_score.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                      <td className="mono">{row.p_value === 0 ? '0.000' : row.p_value.toExponential(2)}</td>
                      <td className="mono" style={{ fontWeight: 700, color: row.coef >= 0 ? '#34d399' : '#f87171' }}>
                        {row.coef >= 0 ? `+${row.coef.toFixed(4)}` : row.coef.toFixed(4)}
                      </td>
                      <td className="mono">{row.stderr.toFixed(3)}</td>
                      <td className="mono">{row.t_stat.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'comparison' && (
            <div style={{ textAlign: 'left', overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>模型版本</th>
                    <th>使用特徵數</th>
                    <th>平均絕對誤差 (MAE)</th>
                    <th>均方根誤差 (RMSE)</th>
                    <th>判定係數 (R²)</th>
                    <th>模型特性與說明</th>
                  </tr>
                </thead>
                <tbody>
                  {modelData.model_comparison.map((m, idx) => (
                    <tr key={idx} style={{ background: idx === 2 ? 'rgba(59, 130, 246, 0.08)' : 'transparent' }}>
                      <td>
                        <strong>{m.model}</strong>
                        {idx === 2 && <span className="badge badge-emerald" style={{ marginLeft: '8px' }}>正式主模型</span>}
                      </td>
                      <td className="mono" style={{ fontWeight: 700 }}>{m.features}</td>
                      <td className="mono" style={{ color: '#34d399', fontWeight: 700 }}>{m.mae.toFixed(2)}</td>
                      <td className="mono" style={{ color: '#fbbf24', fontWeight: 700 }}>{m.rmse.toFixed(2)}</td>
                      <td className="mono" style={{ color: '#38bdf8', fontWeight: 700 }}>{m.r2.toFixed(4)}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{m.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* CRISP-DM Standard Methodology Section */}
      <section className="glass-panel" style={{ padding: '28px', marginBottom: '36px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px' }}>
            CRISP-DM 跨產業資料探勘流程標準
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            CRISP-DM 流程強調在評估模型後可循環反思商業目的與特徵定義。本研究嚴格落實六大階段：
          </p>
        </div>

        {/* Step Selector Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '20px' }}>
          {modelData.crisp_dm.map((step) => (
            <button
              key={step.step}
              onClick={() => setActiveCrispStep(step.step)}
              className={activeCrispStep === step.step ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '0.82rem', padding: '6px 14px', whiteSpace: 'nowrap' }}
            >
              {step.step}. {step.title.split('（')[0]}
            </button>
          ))}
        </div>

        {/* Step Content Card */}
        {(() => {
          const current = modelData.crisp_dm.find((s) => s.step === activeCrispStep) ?? modelData.crisp_dm[0];
          return (
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '22px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <span className="badge badge-blue">階段 {current.step}</span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{current.title}</h3>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.82rem', color: '#93c5fd', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                  分析目標 (Analytical Objective)
                </div>
                <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>{current.goal}</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                  實際作法 (Practical Actions)
                </div>
                <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  {current.actions.map((act, i) => (
                    <li key={i}>{act}</li>
                  ))}
                </ul>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '12px 16px', borderRadius: '8px', borderLeft: '3px solid #38bdf8' }}>
                <div style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px' }}>
                  階段產出與專業判讀 (Outputs &amp; Interpretation)
                </div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{current.outputs}</p>
              </div>
            </div>
          );
        })()}
      </section>

      {/* Mainstream Methods Comparison */}
      <section className="glass-panel" style={{ padding: '28px', marginBottom: '36px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
          主流或更優方法比較 (Comparative Methodologies)
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
          零售需求預測在實務上常依資料型態與業務需求選擇線性模型、正則化模型、樹模型或時間序列方法：
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>演算法 / 方法</th>
                <th>方法核心優點</th>
                <th>本作業中之用途、限制與實務考量</th>
              </tr>
            </thead>
            <tbody>
              {modelData.method_comparisons.map((m, idx) => (
                <tr key={idx}>
                  <td><strong>{m.method}</strong></td>
                  <td style={{ color: '#6ee7b7' }}>{m.advantage}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{m.scope_limits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* AI Assistance & Literature Research Notes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '36px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
            <span>GPT 輔助內容 (GPT Assistance)</span>
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '10px' }}>AI 協同開發與嚴謹度把關</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            GPT 協助整理作業規格、Notebook 架構設計、防資料洩漏（Data Leakage）檢核、F-score 前 20 名特徵篩選、95% 預測區間推論與報告排版。完整對話已如實匯出為 PDF 供課堂檢視；所有數值均由 Notebook 程式碼真實執行產出，未以對話替代實驗。
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#a78bfa', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
            <span>NotebookLM 研究摘要 (NotebookLM Summary)</span>
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '10px' }}>零售需求預測文獻指引</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            NotebookLM 文獻摘要指出，多元線性回歸提供絕佳基準與透明的各欄位權重；Ridge 能穩定共線性特徵，Lasso 可進行稀疏挑選。當需求與促銷或天氣存在交互作用時，梯度提升樹能提升預測；時間相依性顯著時應改採時間滾動切分與 SARIMA 模型。
          </p>
        </div>
      </div>

      {/* Execution Instructions & Key Files */}
      <section className="glass-panel" style={{ padding: '28px', marginBottom: '36px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
          專案檔案與本機可重現性指引 (Artifacts &amp; Reproducibility)
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          所有資料、程式腳本、產出結果皆已完整封裝，可隨時依循指令完整重建與驗證：
        </p>

        <div style={{ background: '#0a0d14', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '20px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>POWERSHELL 執行指令</div>
          <pre className="mono" style={{ color: '#38bdf8', fontSize: '0.88rem', overflowX: 'auto', lineHeight: 1.7 }}>
{`cd sales
python -m pip install -r requirements.txt
python scripts/build_hw2_notebook.py
python -m jupyter nbconvert --to notebook --execute 7115056075_hw2.ipynb --output 7115056075_hw2.ipynb --ExecutePreprocessor.timeout=600
python -m pytest tests/test_hw2_artifacts.py -q
cd ..`}
          </pre>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>7115056075_hw2.ipynb</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>主程式 Jupyter Notebook</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>7115056075_hw2_report.pdf</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>完整排版作業成果報告</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>ChatGPT 對話紀錄.pdf</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>完整 GPT 協同開發對話歷程</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>sales_data.csv</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>76,000 筆原始零售特徵資料</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <div>
          7115056075 HW2 • 零售需求多元線性回歸專題網站
        </div>
        <div>
          Next.js 14 • TypeScript • 無資料洩漏機器學習流程 • 支援 GitHub Pages 靜態部署
        </div>
      </footer>
    </main>
  );
}
