# 零售門市需求預測：多元線性回歸分析與評估報告

本專案基於 Kaggle 公開資料集 **Retail Store Inventory and Demand Forecasting**，針對零售商品的實際需求量（Demand）建立**多元線性回歸（Multiple Linear Regression）**預測模型。完整的實作流程與程式碼請參閱 [`dataset.ipynb`](file:///c:/Users/user/Downloads/homework/dataset.ipynb)。

---

## 目錄
1. [資料來源與特徵說明](#一資料來源與特徵說明)
2. [分析流程與資料前處理](#二分析流程與資料前處理)
3. [特徵選擇 (Feature Selection)](#三特徵選擇-feature-selection)
4. [模型建置與訓練](#四模型建置與訓練)
5. [模型評估成果 (Model Evaluation)](#五模型評估成果-model-evaluation)
6. [預測視覺化與預測區間分析](#六預測視覺化與預測區間分析)
7. [結論與商業洞察](#七結論與商業洞察)
8. [執行環境與重現步驟](#八執行環境與重現步驟)

---

## 一、資料來源與特徵說明

### 1. 資料集來源
* **資料集名稱**：Retail Store Inventory and Demand Forecasting
* **平台來源**：Kaggle
* **公開連結**：[Kaggle Dataset Link](https://www.kaggle.com/datasets/atomicd/retail-store-inventory-and-demand-forecasting)
* **資料檔案**：[`sales_data.csv`](file:///c:/Users/user/Downloads/homework/sales_data.csv)
* **總樣本數**：76,000 筆資料

### 2. 特徵數量與定義
原始資料集包含 **16 個欄位**（1 個日期、1 個目標變數 `Demand` 以及 **14 個輸入特徵**，符合 10 至 20 個特徵之要求）：

| 欄位名稱 | 變數類型 | 資料型態 | 說明 |
| :--- | :--- | :--- | :--- |
| **Demand** | **目標變數 (Target)** | 數值型 (整數) | 該商品當期之市場需求量 (預測目標) |
| `Date` | 輔助欄位 | 日期字串 | 銷售日期 (前處理階段予以移除) |
| `Store ID` | 類別特徵 (Categorical) | 字串 (5 類) | 門市代碼 (S001 ~ S005) |
| `Product ID` | 類別特徵 (Categorical) | 字串 (20 類) | 商品編號 (P0001 ~ P0020) |
| `Category` | 類別特徵 (Categorical) | 字串 (5 類) | 商品類別 (Groceries, Furniture, Clothing, Toys, Electronics) |
| `Region` | 類別特徵 (Categorical) | 字串 (4 類) | 門市所在區域 (North, South, East, West) |
| `Weather Condition` | 類別特徵 (Categorical) | 字串 (4 類) | 天氣狀況 (Cloudy, Sunny, Rainy, Snowy) |
| `Seasonality` | 類別特徵 (Categorical) | 字串 (4 類) | 季節特性 (Winter, Spring, Summer, Autumn) |
| `Inventory Level` | 數值特徵 (Continuous) | 浮點數/整數 | 目前庫存水位 |
| `Units Sold` | 數值特徵 (Continuous) | 浮點數/整數 | 實際已售出數量 |
| `Units Ordered` | 數值特徵 (Continuous) | 浮點數/整數 | 訂貨/進貨數量 |
| `Price` | 數值特徵 (Continuous) | 浮點數 | 商品售價 |
| `Discount` | 數值特徵 (Continuous) | 浮點數 | 折扣幅度百分比 (%) |
| `Competitor Pricing` | 數值特徵 (Continuous) | 浮點數 | 競爭對手定價 |
| `Promotion` | 二元特徵 (Binary) | 0 / 1 | 是否正進行促銷活動 |
| `Epidemic` | 二元特徵 (Binary) | 0 / 1 | 是否處於疫情受影響期 |

---

## 二、分析流程與資料前處理

分析流程分為以下步驟：

```
[原始資料 sales_data.csv] 
       │
       ▼
[特徵工程 & 前處理]
 ├─ 移除 Date 欄位
 ├─ 數值特徵 MinMaxScaler 歸一化
 └─ 類別特徵 One-Hot Encoding (drop_first=True) ──> 產生 44 個特徵維度
       │
       ▼
[資料集切分] 80% 訓練集 (60,800 筆) / 20% 測試集 (15,200 筆)
       │
       ▼
[特徵選擇 (Feature Selection)] 
 └─ SelectKBest (f_regression), 門檻 p-value < 0.05 ──> 篩選出 41 個關鍵特徵
       │
       ▼
[模型訓練與統計檢定]
 ├─ sklearn LinearRegression (計算預測指標)
 └─ statsmodels OLS (計算係數顯著性與 95% 預測區間)
       │
       ▼
[模型評估與視覺化] (MAE, RMSE, R² & 95% Prediction Interval 圖)
```

1. **移除不相關欄位**：移除無直接線性關係之 `Date`。
2. **數值變數正規化 (MinMaxScaler)**：
   * 針對連續型變數 `Inventory Level`、`Units Sold`、`Units Ordered`、`Price`、`Discount`、`Competitor Pricing` 進行 Min-Max 縮放至 $[0, 1]$ 區間，消除不同量綱帶來的權重失衡。
3. **獨熱編碼 (One-Hot Encoding)**：
   * 針對 6 個類別變數使用 `pd.get_dummies(..., drop_first=True)` 轉換為二元特徵，避免虛擬變數陷阱（Dummy Variable Trap）。編碼後特徵空間擴展為 **44 維**。
4. **資料集切分 (Train-Test Split)**：
   * 採用 80% 訓練集與 20% 測試集切分（`random_state=42`）。
   * 訓練集：**60,800 筆**，測試集：**15,200 筆**。

---

## 三、特徵選擇 (Feature Selection)

為避免維度過高及雜訊干擾，專案採用單變量線性回歸統計檢定方法進行特徵篩選：
* **檢定方法**：`SelectKBest` 搭配 `f_regression`（基於 F 檢定統計量評估各特徵與目標變數 `Demand` 之關聯性）。
* **篩選門檻**：保留統計顯著性 $p\text{-value} < 0.05$ 之特徵。

### 篩選結果
在 44 個編碼特徵中，共選入 **41 個統計上顯著的特徵**，並剔除 3 個無顯著相關之特徵。

#### 關聯度最高的前 10 大關鍵特徵
| 排名 | 特徵名稱 | F-Score | P-Value | 業務意涵 |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `Units Sold` | **137,207.43** | $0.000$ | 售出數量與市場總需求量高度直接相關 |
| 2 | `Units Ordered` | **21,495.85** | $0.000$ | 門市進貨數量顯著反映對需求的預期 |
| 3 | `Epidemic` | **9,303.64** | $0.000$ | 疫情衝擊會顯著抑制或改變市場消費需求 |
| 4 | `Category_Furniture` | **6,317.22** | $0.000$ | 家具類商品具特殊消費週期，需求特性不同 |
| 5 | `Category_Groceries` | **5,583.41** | $0.000$ | 民生雜貨為高頻剛性需求品類 |
| 6 | `Promotion` | **5,197.68** | $0.000$ | 促銷活動能顯著刺激商品需求量增加 |
| 7 | `Discount` | **3,177.43** | $0.000$ | 折扣幅度直接影響顧客購買意願 |
| 8 | `Weather Condition_Sunny` | **1,417.73** | $< 10^{-300}$ | 晴朗天氣有利於實體門市人流與消費 |
| 9 | `Inventory Level` | **972.37** | $< 10^{-210}$ | 現有庫存水位制約或支撐供應需求 |
| 10 | `Weather Condition_Rainy` | **700.01** | $< 10^{-150}$ | 降雨對實體門市需求具有顯著負向拉低作用 |

> **剔除的不顯著特徵**：`Product ID_P0015` ($p=0.156$)、`Product ID_P0003` ($p=0.506$)、`Product ID_P0008` ($p=0.896$)。

---

## 四、模型建置與訓練

專案採用兩種互補的線性回歸方式：
1. **`sklearn.linear_model.LinearRegression`**：
   * 用於快速模型訓練與測試集預測產出。
2. **`statsmodels.api.OLS` (普通最小平方法回歸)**：
   * 進行嚴謹的統計推論、各回歸係數 $t$ 檢定、整體模型 $F$ 檢定與常態性檢驗。
   * 計算每筆預測樣本的點估計標準誤、信賴區間（Confidence Interval）及 **95% 預測區間（Prediction Interval）**。

---

## 五、模型評估成果 (Model Evaluation)

在包含 **15,200 筆測試樣本**的測試集上進行模型效能評估，評估指標成果如下：

### 1. 核心評估指標
| 評估指標 | 測試集數值 | 指標意義說明 |
| :--- | :---: | :--- |
| **MAE** (Mean Absolute Error) | **16.27** | 平均預測需求量與實際值差距約 16.27 單位 |
| **RMSE** (Root Mean Squared Error) | **21.82** | 考慮較大誤差懲罰之均方根誤差，表現穩定無極端偏差 |
| **$R^2$** (決定係數) | **0.7844 (78.44%)** | **模型能解釋測試集中高達 78.44% 的需求量變異** |
| **Adjusted $R^2$** (OLS 訓練集) | **0.7780 (77.80%)** | 扣除特徵數量懲罰後，解釋力依然高達 77.8% |
| **$F$-statistic** (OLS 全體檢定) | **5,594.0** ($p < 0.001$) | 全體回歸係數具高度顯著性，線性模型整體結構有效 |

### 2. 重點回歸係數解析 (OLS Coefficients)
* **`Units Sold` ($\beta = +277.01$, $t=238.04$)**：最重要的正向預測指標，售出量每增加 1 個標準化單位，需求量預期顯著提升。
* **`Units Ordered` ($\beta = +78.39$, $t=76.94$)**：訂購數量對需求呈現顯著的正向帶動。
* **`Price` ($\beta = +34.63$, $t=14.10$)** 與 **`Promotion` ($\beta = +10.11$, $t=32.23$)**：促銷活動及定價策略皆能有效拉動需求預估。
* **`Epidemic` ($\beta = -17.04$, $t=-69.23$)**：疫情事件帶來顯著負向抑制效應（需求平均減少約 17 個單位）。
* **`Category_Furniture` ($\beta = -27.25$, $t=-66.31$)**：相對基準分類，家具類在日常需求週轉上顯著偏低。

---

## 六、預測視覺化與預測區間分析

### 1. 實際值 vs 預測值散佈圖 (Actual vs Predicted)
下圖展示測試集 15,200 筆樣本之實際需求與模型預測值之對比分布：

![Actual vs Predicted Demand](actual_vs_predicted.png)

* **圖表說明**：
  * 橘色虛線為理想預測線（$y = x$）。
  * 預測點密集且對稱地分佈於 45 度對角線周圍，無顯著的系統性低估或高估偏差，驗證多元線性回歸在此資料集具備良好線性適配度。

---

### 2. 95% 預測區間走勢圖 (95% Prediction Interval)
藉由 `statsmodels.get_prediction().summary_frame(alpha=0.05)`，為每一筆測試資料計算觀測值的 **95% 預測區間（Lower PI ~ Upper PI）**，並依照預測值排序呈現：

![Demand Prediction with 95% Prediction Interval](demand_prediction_interval.png)

* **圖表說明**：
  * **橘色實線 (Predicted)**：模型對商品需求量之點估計曲線。
  * **藍色散佈點 (Actual)**：測試集真實需求量觀測值。
  * **淺藍色陰影區間 (95% Prediction Interval)**：包含未觀測隨機誤差項的 95% 預測區間帶。
* **成果分析**：
  * 真實需求量絕大多數均落於 95% 預測區間範圍之內，展現估計之可信度與穩健性。
  * 預測區間提供實務庫存決策極高價值，門市可依據區間上限（Upper PI）規劃安全庫存（Safety Stock），避免熱銷時缺貨。

---

## 七、結論與商業洞察

1. **模型效能卓越**：使用 41 個篩選特徵進行多元線性回歸，取得 $R^2 = 78.44\%$、$\text{MAE} = 16.27$ 的優異成績，能精準預測日常零售品項之需求水準。
2. **關鍵驅動因子**：銷售量（Units Sold）、進貨量（Units Ordered）、促銷活動（Promotion）與商品定價策略是拉抬需求量的關鍵核心。
3. **外部環境影響顯著**：
   * 疫情（Epidemic）對商品需求具有強力負面衝擊。
   * 氣候（晴天正向、雨天雪天負向）亦顯著左右門市客流與需求表現。
4. **預測區間落地應用**：透過 95% 預測區間，營運團隊不僅能取得點預測基準，亦能依據區間帶進行上下限風險控管與動態補貨調度。

---

## 八、執行環境與重現步驟

### 1. 必備 Python 套件
```bash
pip install pandas numpy matplotlib scikit-learn statsmodels
```

### 2. 專案執行方式
1. 確認當前目錄包含原始資料檔 [`sales_data.csv`](file:///c:/Users/user/Downloads/homework/sales_data.csv)。
2. 開啟 Jupyter Notebook 執行檔 [`dataset.ipynb`](file:///c:/Users/user/Downloads/homework/dataset.ipynb)。
3. 依序執行所有 Code Cells，即可自動重現資料清洗、特徵工程、特徵選擇、模型訓練、效能評估及兩組高清預測圖表。
