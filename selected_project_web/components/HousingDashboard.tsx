'use client';

import { useMemo, useState } from 'react';
import modelData from '@/model/housing_model_data.json';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const imagePath = (fileName: string) => `${basePath}/images/housing/${fileName}`;

const featureInfo: Record<string, { label: string; unit: string; description: string }> = {
  CRIM: { label: '城鎮人均犯罪率', unit: '比率', description: 'Per-capita crime rate by town' },
  ZN: { label: '大型住宅用地比例', unit: '%', description: 'Residential land zoned for lots over 25,000 sq.ft.' },
  INDUS: { label: '非零售商業用地比例', unit: '%', description: 'Non-retail business acres per town' },
  CHAS: { label: '鄰近 Charles River', unit: '0 / 1', description: 'Charles River dummy variable' },
  NOX: { label: '一氧化氮濃度', unit: 'parts per 10M', description: 'Nitric oxides concentration' },
  RM: { label: '每戶平均房間數', unit: '間', description: 'Average rooms per dwelling' },
  AGE: { label: '1940 年前住宅比例', unit: '%', description: 'Owner-occupied units built before 1940' },
  DIS: { label: '就業中心加權距離', unit: '指數', description: 'Weighted distances to employment centres' },
  RAD: { label: '放射狀公路可及性', unit: '指數', description: 'Accessibility to radial highways' },
  TAX: { label: '財產稅率', unit: '每 10,000 美元', description: 'Full-value property-tax rate' },
  PTRATIO: { label: '學生教師比例', unit: '比率', description: 'Pupil-teacher ratio by town' },
  B: { label: '人口組成轉換指標', unit: '指數', description: 'Dataset-defined demographic transform' },
  LSTAT: { label: '低社經地位人口比例', unit: '%', description: 'Lower-status population percentage' },
};

const crispDm = [
  {
    title: 'Business Understanding（商業理解）',
    goal: '以可解釋模型預測 MEDV，並提供單筆預測的不確定性。',
    actions: ['比較平均值基準、全部 13 特徵與前 7 特徵模型', '以 MAE、RMSE、R² 與 95% 預測區間共同評估'],
    output: '前 7 特徵線性回歸作為可在瀏覽器執行的正式主模型。',
  },
  {
    title: 'Data Understanding（資料理解）',
    goal: '確認 506 筆資料、14 欄、缺失值與 MEDV 分布。',
    actions: ['驗證固定欄位契約', '統計 120 個缺失值與 0 筆重複資料'],
    output: '缺失值集中於 6 欄，MEDV 沒有缺失，可保留全部目標資料。',
  },
  {
    title: 'Data Preparation（資料準備）',
    goal: '避免測試集資訊流入訓練流程。',
    actions: ['固定 random_state=42 做 80/20 切分', '只在訓練集擬合中位數填補與 Min-Max scaling'],
    output: '得到 404 筆訓練資料與 102 筆獨立測試資料。',
  },
  {
    title: 'Modeling（建模）',
    goal: '從 13 個候選特徵固定選出前 7 名。',
    actions: ['以訓練集 f_regression 排序', '建立 LinearRegression 與相同特徵的 OLS'],
    output: `選出 ${modelData.selected_features.join('、')}。`,
  },
  {
    title: 'Evaluation（評估）',
    goal: '用未參與擬合的測試集檢查誤差、解釋力與區間品質。',
    actions: ['比較三個模型指標', '檢查實際值、預測值、預測區間與殘差'],
    output: `主模型 R²=${modelData.models['Linear regression - top 7'].R2.toFixed(4)}，95% 區間覆蓋率 ${(modelData.prediction_interval.coverage * 100).toFixed(2)}%。`,
  },
  {
    title: 'Deployment（部署）',
    goal: '以純靜態資源部署到 GitHub Pages。',
    actions: ['匯出訓練集填補值、縮放範圍、截距與係數', '在瀏覽器端重現前 7 特徵線性公式'],
    output: '網站不依賴 Python、API、Server Actions 或資料庫。',
  },
];

type GalleryTab = 'actual' | 'interval' | 'residuals' | 'features' | 'comparison';

export default function HousingDashboard() {
  const allFeatures = modelData.web_model.all_features;
  const initialValues = modelData.web_model.raw_means as Record<string, number>;
  const [values, setValues] = useState<Record<string, number>>({ ...initialValues });
  const [scenario, setScenario] = useState('average');
  const [activeTab, setActiveTab] = useState<GalleryTab>('actual');
  const [activeStep, setActiveStep] = useState(0);

  const setFeature = (feature: string, value: number) => {
    setScenario('custom');
    setValues((current) => ({ ...current, [feature]: value }));
  };

  const applyScenario = (nextScenario: string) => {
    const next = { ...initialValues };
    if (nextScenario === 'lower_lstat') {
      next.LSTAT = modelData.web_model.scale_min.LSTAT + (modelData.web_model.scale_max.LSTAT - modelData.web_model.scale_min.LSTAT) * 0.25;
      next.RM = modelData.web_model.scale_min.RM + (modelData.web_model.scale_max.RM - modelData.web_model.scale_min.RM) * 0.75;
    }
    if (nextScenario === 'higher_lstat') {
      next.LSTAT = modelData.web_model.scale_min.LSTAT + (modelData.web_model.scale_max.LSTAT - modelData.web_model.scale_min.LSTAT) * 0.75;
      next.RM = modelData.web_model.scale_min.RM + (modelData.web_model.scale_max.RM - modelData.web_model.scale_min.RM) * 0.25;
    }
    setScenario(nextScenario);
    setValues(next);
  };

  const prediction = useMemo(() => {
    const contributions = modelData.selected_features.map((feature) => {
      const min = (modelData.web_model.scale_min as Record<string, number>)[feature];
      const max = (modelData.web_model.scale_max as Record<string, number>)[feature];
      const raw = values[feature] ?? (modelData.web_model.imputer_values as Record<string, number>)[feature];
      const normalized = max === min ? 0 : (raw - min) / (max - min);
      const coefficient = (modelData.web_model.coefficients as Record<string, number>)[feature];
      return { feature, raw, normalized, coefficient, delta: normalized * coefficient };
    });
    const value = contributions.reduce((total, item) => total + item.delta, modelData.web_model.intercept);
    return { value, contributions };
  }, [values]);

  const extrapolated = allFeatures.filter((feature) => {
    const min = (modelData.web_model.scale_min as Record<string, number>)[feature];
    const max = (modelData.web_model.scale_max as Record<string, number>)[feature];
    return values[feature] < min || values[feature] > max;
  });

  const mainMetrics = modelData.models['Linear regression - top 7'];
  const selectedStep = crispDm[activeStep];

  return (
    <main className="page-shell">
      <header style={{ marginBottom: 32 }}>
        <div className="badge badge-emerald" style={{ marginBottom: 14 }}>Housing Problem · 前 7 特徵</div>
        <h1 style={{ fontSize: '2.45rem', lineHeight: 1.15, marginBottom: 12 }}>房價多元線性回歸互動分析</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 900 }}>
          以 MEDV 為預測目標，從 13 個候選欄位選出前 7 名。缺失值填補、縮放與特徵選擇都只在訓練集擬合，網站使用實際 Notebook 匯出的參數即時計算。
        </p>
      </header>

      <section className="metric-grid" aria-label="Housing 模型摘要">
        {[
          ['資料筆數', modelData.dataset.rows.toLocaleString(), '506 筆原始住宅資料'],
          ['前 7 模型 R²', mainMetrics.R2.toFixed(4), '測試集判定係數'],
          ['MAE', mainMetrics.MAE.toFixed(2), '平均絕對誤差'],
          ['RMSE', mainMetrics.RMSE.toFixed(2), '均方根誤差'],
          ['95% 覆蓋率', `${(modelData.prediction_interval.coverage * 100).toFixed(2)}%`, `平均寬度 ${modelData.prediction_interval.mean_width.toFixed(2)}`],
        ].map(([label, value, note]) => (
          <article className="glass-panel metric-card" key={label}>
            <div className="metric-label">{label}</div>
            <div className="metric-value">{value}</div>
            <div className="metric-note">{note}</div>
          </article>
        ))}
      </section>

      <section className="workspace-grid">
        <div className="glass-panel" style={{ padding: 26 }}>
          <div className="section-heading">
            <div>
              <div className="badge badge-blue">Interactive Inputs</div>
              <h2>13 個原始特徵</h2>
            </div>
            <select value={scenario} onChange={(event) => applyScenario(event.target.value)} aria-label="Housing 預設情境">
              <option value="average">訓練資料平均情境</option>
              <option value="lower_lstat">低 LSTAT／高 RM 情境</option>
              <option value="higher_lstat">高 LSTAT／低 RM 情境</option>
              <option value="custom" disabled>自訂輸入</option>
            </select>
          </div>

          <div className="housing-controls custom-scrollbar">
            {allFeatures.map((feature) => {
              const info = featureInfo[feature];
              const min = (modelData.web_model.scale_min as Record<string, number>)[feature];
              const max = (modelData.web_model.scale_max as Record<string, number>)[feature];
              const step = feature === 'CHAS' ? 1 : Math.max((max - min) / 100, 0.001);
              return (
                <label className="slider-container" key={feature}>
                  <span className="control-label">
                    <span><strong>{info.label}</strong> <span className="mono">({feature})</span></span>
                    <span className="mono control-value">{values[feature].toFixed(feature === 'CHAS' ? 0 : 2)} {info.unit}</span>
                  </span>
                  <input
                    aria-label={`${info.label} ${feature}`}
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={values[feature]}
                    onChange={(event) => setFeature(feature, Number(event.target.value))}
                  />
                  <span className="slider-scale"><span>{min.toFixed(2)}</span><span>{info.description}</span><span>{max.toFixed(2)}</span></span>
                </label>
              );
            })}
          </div>
          {extrapolated.length > 0 && (
            <div className="extrapolation-warning">目前有超出訓練範圍的欄位：{extrapolated.join('、')}。此預測屬於外插，可信度較低。</div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="glass-panel prediction-card">
            <div className="badge badge-emerald">Live Prediction</div>
            <div className="prediction-label">預測 MEDV</div>
            <div className="prediction-value" data-testid="housing-prediction">{prediction.value.toFixed(2)}</div>
            <div className="prediction-unit">資料集房價中位數單位</div>
            <p className="prediction-note">此數字由前 7 特徵的訓練集填補、縮放參數、截距與係數直接計算。</p>
          </div>

          <div className="glass-panel" style={{ padding: 22 }}>
            <h2 style={{ fontSize: '1.05rem', marginBottom: 14 }}>特徵貢獻拆解</h2>
            <div className="contribution-list">
              {prediction.contributions.map((item) => (
                <div className="contribution-row" key={item.feature}>
                  <div><strong>{item.feature}</strong><span>{featureInfo[item.feature].label}</span></div>
                  <div className="mono" style={{ color: item.delta >= 0 ? '#34d399' : '#f87171' }}>
                    {item.delta >= 0 ? '+' : ''}{item.delta.toFixed(2)}
                  </div>
                </div>
              ))}
              <div className="contribution-row contribution-total">
                <div><strong>Intercept</strong><span>模型截距</span></div>
                <div className="mono">{modelData.web_model.intercept.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel" style={{ padding: 26, marginBottom: 32 }}>
        <div className="section-heading">
          <div><div className="badge badge-blue">Evidence</div><h2>模型結果與圖表</h2></div>
          <div className="tab-list" role="tablist" aria-label="Housing 結果類型">
            {([
              ['actual', '實際 vs 預測'],
              ['interval', '95% 預測區間'],
              ['residuals', '殘差診斷'],
              ['features', '前 7 特徵'],
              ['comparison', '模型比較'],
            ] as [GalleryTab, string][]).map(([id, label]) => (
              <button key={id} className={activeTab === id ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab(id)} role="tab" aria-selected={activeTab === id}>{label}</button>
            ))}
          </div>
        </div>

        {activeTab === 'actual' && <img className="result-image" src={imagePath('actual_vs_predicted.png')} alt="Housing 測試集實際 MEDV 與前 7 特徵模型預測值散點圖" />}
        {activeTab === 'interval' && <img className="result-image" src={imagePath('prediction_interval.png')} alt="Housing 測試集預測值、實際值與 95% 預測區間" />}
        {activeTab === 'residuals' && <img className="result-image" src={imagePath('residual_diagnostics.png')} alt="Housing 前 7 特徵模型殘差與預測值及殘差分布" />}

        {activeTab === 'features' && (
          <div className="table-scroll custom-scrollbar"><table className="data-table"><thead><tr><th>排名</th><th>特徵</th><th>說明</th><th>F-score</th><th>係數</th><th>t 值</th></tr></thead><tbody>
            {modelData.feature_details.map((row) => <tr key={row.feature}><td>#{row.rank}</td><td className="mono"><strong>{row.feature}</strong></td><td>{featureInfo[row.feature].label}</td><td>{row.f_score.toFixed(2)}</td><td style={{ color: row.coef >= 0 ? '#34d399' : '#f87171' }}>{row.coef.toFixed(4)}</td><td>{row.t_stat.toFixed(2)}</td></tr>)}
          </tbody></table></div>
        )}

        {activeTab === 'comparison' && (
          <div className="table-scroll custom-scrollbar"><table className="data-table"><thead><tr><th>模型</th><th>特徵數</th><th>MAE</th><th>RMSE</th><th>R²</th></tr></thead><tbody>
            {Object.entries(modelData.models).map(([name, result]) => <tr key={name}><td><strong>{name}</strong>{name.endsWith('top 7') && <span className="badge badge-emerald" style={{ marginLeft: 8 }}>正式主模型</span>}</td><td>{result.feature_count}</td><td>{result.MAE.toFixed(2)}</td><td>{result.RMSE.toFixed(2)}</td><td>{result.R2.toFixed(4)}</td></tr>)}
          </tbody></table></div>
        )}
      </section>

      <section className="glass-panel" style={{ padding: 26, marginBottom: 32 }}>
        <div className="section-heading"><div><div className="badge badge-emerald">CRISP-DM</div><h2>六階段分析流程</h2></div></div>
        <div className="tab-list" style={{ marginBottom: 18 }}>
          {crispDm.map((step, index) => <button key={step.title} className={activeStep === index ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveStep(index)}>{index + 1}. {step.title.split('（')[0]}</button>)}
        </div>
        <article className="crisp-card">
          <h3>{activeStep + 1}. {selectedStep.title}</h3>
          <p><strong>分析目標：</strong>{selectedStep.goal}</p>
          <ul>{selectedStep.actions.map((action) => <li key={action}>{action}</li>)}</ul>
          <p className="crisp-output"><strong>產出與判讀：</strong>{selectedStep.output}</p>
        </article>
      </section>

      <section className="formula-grid" style={{ marginBottom: 32 }}>
        <article className="glass-panel info-card">
          <div className="badge badge-blue">資料品質</div>
          <h2>缺失值與資料洩漏控制</h2>
          <p>資料共有 {modelData.dataset.missing_values} 個缺失值。中位數填補與縮放皆只在 404 筆訓練資料擬合，102 筆測試資料只接受轉換。</p>
        </article>
        <article className="glass-panel info-card">
          <div className="badge badge-emerald">方法比較</div>
          <h2>可延伸模型</h2>
          <p>Ridge 可降低共線性造成的係數不穩定，Lasso 可做稀疏選擇，Gradient Boosting 可處理非線性；後續應使用相同切分或交叉驗證公平比較。</p>
        </article>
        <article className="glass-panel info-card">
          <div className="badge badge-blue">限制</div>
          <h2>不可直接當作現代估價</h2>
          <p>資料只有 506 筆，且 MEDV 在 50 有上限效應。線性關聯不代表因果，本成果僅供課堂分析與方法展示。</p>
        </article>
        <article className="glass-panel info-card">
          <div className="badge badge-emerald">Reproducibility</div>
          <h2>可重現檔案</h2>
          <p>完整步驟、指標與限制位於 <span className="mono">housing/README.md</span>；Notebook、CSV、JSON 與三張圖都保存在 Housing 獨立資料夾。</p>
        </article>
      </section>

      <footer className="dashboard-footer">
        <span>Housing Data · MEDV 前 7 特徵線性回歸</span>
        <span>Next.js 14 · 靜態 JSON 推論 · GitHub Pages</span>
      </footer>
    </main>
  );
}
