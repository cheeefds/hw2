# Sales 與 Housing 雙問題分析網站設計

## 目標與完成條件

將目前只處理 `sales_data.csv` 的專案整理成兩個彼此獨立、可重現的資料分析問題，並由同一個 Next.js 靜態網站展示。使用者可透過網站頂部的 Problem 下拉選單切換 Sales 與 Housing；兩個問題都提供資料說明、CRISP-DM 流程、模型比較、互動預測、特徵結果、評估指標與圖表。

Housing 使用 `MEDV` 作為預測目標，從 13 個候選特徵中以 `f_regression` 固定選取前 7 名，並以這 7 個特徵的線性回歸作為正式主模型。Housing 不建立 DOCX 或 PDF report，完整方法、結果與限制寫入 README。

只有在兩套分析測試、網站靜態建置及主要互動驗證通過後，才視為完成。

## 專案結構

正式專案維持在外層 `hw2/`，整理後的主要結構如下：

```text
hw2/
├─ sales/
│  ├─ sales_data.csv
│  ├─ 7115056075_hw2.ipynb
│  ├─ scripts/
│  ├─ results/
│  ├─ tests/
│  ├─ README.md
│  └─ 既有 PDF report 與相關作業檔案
├─ housing/
│  ├─ HousingData.csv
│  ├─ housing_analysis.ipynb
│  ├─ scripts/
│  ├─ results/
│  ├─ tests/
│  └─ README.md
├─ selected_project_web/
│  ├─ app/
│  ├─ components/
│  ├─ model/
│  │  ├─ sales_model_data.json
│  │  └─ housing_model_data.json
│  └─ public/images/
│     ├─ sales/
│     └─ housing/
└─ README.md
```

內層未追蹤的 `hw2/hw2/` 只作為 `HousingData.csv` 的來源，不從中複製其他重複檔案，也不在未取得確認時刪除該資料夾。網站位置不變，因此 GitHub Pages workflow 的 `working-directory` 與部署輸出路徑可以維持現況。

## Sales 分析

Sales 保留現有且已完成的資料流程與真實結果：

- 目標為 `Demand`，排除只用於資料理解的 `Date`。
- 固定 `random_state=42`，以 80/20 切分訓練集與測試集。
- 數值特徵使用 `MinMaxScaler`，類別特徵使用 One-Hot Encoding；前處理器只在訓練集擬合。
- 比較平均值基準、全部處理後特徵線性回歸與前 20 名特徵線性回歸。
- 使用前 20 名特徵的模型作為主模型，保留 MAE、RMSE、R²、OLS 統計與 95% 預測區間。
- 原有 Notebook、結果、圖片及 PDF report 移入 `sales/`，同步修正相對路徑、測試與 README，不重新捏造或手動改寫模型數字。

## Housing 分析

Housing 採用與 Sales 對等的 CRISP-DM 與評估流程，但依資料型態做必要調整：

1. 讀取 `HousingData.csv`，驗證 506 筆資料、14 個欄位與目標欄位 `MEDV`，並檢查缺失值、重複列及描述統計。
2. 將 `MEDV` 以外的 13 個數值欄位作為候選特徵，固定 `random_state=42` 做 80/20 切分。
3. 缺失值使用只在訓練集擬合的 median imputation（中位數填補），再以只在訓練集擬合的 `MinMaxScaler` 縮放，避免資料洩漏。
4. 以訓練集的 `f_regression` 計算 13 個特徵的 F-score，固定選取前 7 名。
5. 比較訓練集平均值基準、全部 13 特徵線性回歸與前 7 特徵線性回歸；前 7 特徵模型為正式主模型。
6. 以相同前 7 特徵建立 OLS 統計模型，輸出係數、標準誤、t 值、Adjusted R²、95% 預測區間覆蓋率與平均寬度。

Housing 的 `results/` 至少包含：

- `metrics.json`
- `model_comparison.csv`
- `top7_features.csv`
- `actual_vs_predicted.png`
- `prediction_interval.png`
- `residual_diagnostics.png`

數字與特徵名稱都必須由實際執行的 Notebook 產生。若資料特性造成線性模型限制，應在 README 說明，不替換或美化不理想的指標。

## README 設計

根目錄 README 提供專案總覽、兩個問題的入口、資料夾結構、網站網址，以及本機分析、測試、開發、建置與部署指令。

`sales/README.md` 保存並修正既有完整 Sales 說明；`housing/README.md` 取代 Housing report，完整記錄：

- 資料來源、欄位與預測目標。
- CRISP-DM 六階段的目標、實作、產出與判讀。
- 缺失值處理、切分、縮放與避免資料洩漏的方式。
- 前 7 特徵、三個模型的實測指標、OLS 統計與 95% 預測區間。
- 三張評估圖、限制、可重現指令與網站使用方式。

## 網站架構與互動

首頁元件只管理目前選取的 problem，頂部提供具備可存取標籤的下拉選單：

- `Sales：零售需求預測`
- `Housing：房價預測`

Sales 與 Housing 各自封裝成 dashboard 元件，避免把兩套狀態與條件堆進單一 `page.tsx`。兩者共用版面元件與 CSS，但各自讀取獨立 JSON、圖片與輸入狀態。切換 problem 時顯示對應的標題、資料摘要、預設情境、互動輸入、即時預測、特徵貢獻、模型比較、圖表、CRISP-DM 與方法限制。

Housing 的互動預測以匯出的前 7 特徵縮放參數、缺失值填補值、截距與係數在瀏覽器端計算，不依賴 Python、API Routes 或 Server Actions。輸入控制範圍由訓練資料產生；若輸入超過訓練範圍，顯示外插警告。圖片路徑使用 `NEXT_PUBLIC_BASE_PATH`，確保 GitHub Pages repository 子路徑可載入。

## 錯誤處理與資料一致性

- 分析腳本遇到欄位缺失、目標全空或資料格式錯誤時，應以清楚訊息停止，不輸出部分或過期結果。
- JSON 由實際模型成果產生或經腳本核對，不手動輸入未驗證指標。
- README、Notebook、CSV、JSON 與網站顯示的筆數、特徵數及評估值必須一致。
- 原始 CSV 不直接修改；所有衍生檔案放入對應問題的 `results/` 或網站資源目錄。

## 測試與驗證

Python 測試分別驗證 Sales 與 Housing 的資料契約、Notebook 階段順序、訓練集限定前處理、固定特徵數、輸出檔案、指標結構及 README 一致性。Housing 額外驗證缺失值填補只在訓練集擬合，且選出的特徵恰為 7 個。

網站驗證包含：

1. TypeScript/Next.js 靜態建置成功，且 `out/index.html` 存在。
2. Problem 下拉選單可切換兩個 dashboard，切換後標題、輸入、預測、圖片與表格皆對應正確資料。
3. 兩套 dashboard 的輸入控制會更新預測值，且不產生瀏覽器錯誤。
4. 桌面與手機寬度沒有水平溢出或內容遮蔽，圖片都有有意義的 `alt`。
5. 使用模擬 repository base path 建置後，CSS、JavaScript、JSON 與圖片路徑仍有效，`out/` 不包含需要後端的 API。

## 不在本次範圍

- 不為 Housing 製作 DOCX、PDF report 或額外簡報。
- 不更換 Sales 已確認的分析方法與模型數字，除非路徑調整後的重跑結果證明現有產出不一致。
- 不刪除內層重複專案、不自動 commit、不 push，也不直接修改遠端 GitHub Pages 設定。
