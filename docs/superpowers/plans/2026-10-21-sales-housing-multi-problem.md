# Sales 與 Housing 雙問題網站 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將既有 Sales 分析與新的 Housing 前 7 特徵分析分開保存，並在同一個可部署至 GitHub Pages 的 Next.js 網站中切換與互動。

**Architecture:** `sales/` 與 `housing/` 各自保存資料、Notebook、產出、測試與 README；共同網站只讀取兩份獨立的靜態模型 JSON。首頁管理 problem 選擇，兩個 dashboard 各自管理輸入與呈現狀態，共用 CSS 與少量展示元件。

**Tech Stack:** Python 3.12、pandas、scikit-learn、statsmodels、matplotlib、nbformat、pytest、Next.js 14、React 18、TypeScript、GitHub Pages static export

**Spec:** `docs/superpowers/specs/2026-10-21-sales-housing-multi-problem-design.md`

## Global Constraints

- 正式專案是外層 `hw2/`；內層未追蹤的 `hw2/hw2/` 只提供 `HousingData.csv`，不得複製其他檔案或自行刪除該資料夾。
- Housing 目標固定為 `MEDV`，候選特徵固定為 13 個，`f_regression` 固定選前 7 名，`random_state=42`，測試集比例固定為 20%。
- 缺失值填補、縮放與特徵選擇只能在訓練集擬合；原始 CSV 不得修改。
- Housing 不建立 DOCX、PDF report 或簡報；完整內容寫入 `housing/README.md`。
- Sales 現有模型方法與數值保持不變；只有重跑證據顯示不一致時才能修正。
- 網站必須維持 `output: "export"`、`trailingSlash: true`，不可使用 API Routes、Server Actions 或 Python 後端。
- 圖片與其他公開資源必須支援 `NEXT_PUBLIC_BASE_PATH`。
- 未經使用者明確要求，不建立 commit、不 push、不刪除內層副本。

## Review Focus

- Housing 的 `NA` 只能使用訓練集 median 填補，測試必須證明 pipeline 中 `SimpleImputer` 位於縮放及模型之前。
- 搬移 Sales 後不得留下指向根目錄舊位置的分析、測試、README 或網站圖片路徑。
- Housing 必須恰好輸出 7 個不重複特徵，且網站 JSON 的特徵與 `top7_features.csv` 順序一致。
- Problem 切換後必須呈現各自的標題、控制項與預測，不得沿用另一個 dashboard 的輸入狀態或圖片。
- 模擬 GitHub repository 子路徑建置時，兩個 dashboard 的 JavaScript、CSS 與圖片都必須可由 base path 載入。

---

### Task 1: 整理 Sales 為獨立且可重現的問題資料夾

**Files:**
- Create: `sales/README.md`
- Move: `sales_data.csv`, `7115056075_hw2.ipynb`, `7115056075_hw2_report.pdf`, `dataset.ipynb`, `ChatGPT-需求預測與特徵選擇-20261007-1014.pdf`, `actual_vs_predicted.png`, `demand_prediction_interval.png` to `sales/`
- Move: `scripts/`, `results/`, `tests/`, `requirements.txt` to `sales/`
- Modify: `sales/scripts/build_hw2_notebook.py`
- Modify: `sales/tests/test_hw2_artifacts.py`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: 目前根目錄的 Sales 資料、產出與測試。
- Produces: 可從 `sales/` 目錄獨立執行的 `build_notebook(output_path: str | Path = "7115056075_hw2.ipynb") -> Path` 與完整 Sales 測試套件。

- [ ] **Step 1: 先更新 Sales 測試的路徑契約**

  將 `ROOT` 固定為 `sales/`，保留 76,000 筆、16 欄、前 20 特徵、三模型指標、圖檔與 README 既有斷言；新增 `test_sales_files_are_scoped_to_sales_directory()`，斷言 Sales 的資料、Notebook、結果和 README 位於同一問題資料夾。

- [ ] **Step 2: 執行測試並確認路徑契約先失敗**

  Run: `python -m pytest sales/tests/test_hw2_artifacts.py -q`

  Expected: FAIL，因 Sales 檔案尚未移入新位置或匯入路徑尚未調整。

- [ ] **Step 3: 建立 `sales/` 並搬移既有 Sales 檔案**

  使用保留歷史的檔案搬移方式；不要搬動 `.github/`、`AGENTS.md`、`docs/` 或 `selected_project_web/`。將既有根 README 內容先保存為 `sales/README.md`，再修正其中的相對連結與執行指令。

- [ ] **Step 4: 修正 Sales Notebook 建立器與測試匯入路徑**

  `build_hw2_notebook()` 產生的資料與結果路徑以 `sales/` 為執行目錄；測試用 `importlib.util.spec_from_file_location` 載入 `sales/scripts/build_hw2_notebook.py`，避免依賴根目錄套件名稱。

- [ ] **Step 5: 執行 Sales 測試與差異檢查**

  Run: `python -m pytest sales/tests/test_hw2_artifacts.py -q`

  Expected: 全部 PASS；Sales 指標仍為既有值，前 20 特徵與三張 `results/` 圖片均存在。

  Run: `git diff --check`

  Expected: 無輸出。

### Task 2: 以 TDD 建立 Housing 前 7 特徵分析流程

**Files:**
- Create: `housing/HousingData.csv`
- Create: `housing/requirements.txt`
- Create: `housing/scripts/__init__.py`
- Create: `housing/scripts/build_housing_notebook.py`
- Create: `housing/tests/test_housing_artifacts.py`
- Generate: `housing/housing_analysis.ipynb`
- Generate: `housing/results/metrics.json`
- Generate: `housing/results/model_comparison.csv`
- Generate: `housing/results/top7_features.csv`
- Generate: `housing/results/actual_vs_predicted.png`
- Generate: `housing/results/prediction_interval.png`
- Generate: `housing/results/residual_diagnostics.png`

**Interfaces:**
- Consumes: `housing/HousingData.csv`，欄位必須恰為 `CRIM, ZN, INDUS, CHAS, NOX, RM, AGE, DIS, RAD, TAX, PTRATIO, B, LSTAT, MEDV`。
- Produces: `build_notebook(output_path: str | Path = "housing_analysis.ipynb") -> Path`；執行 Notebook 後產生結構化結果，其中 `metrics.json` 含 `dataset`、`selected_features`、`models`、`prediction_interval`、`ols` 與 `web_model`。

- [ ] **Step 1: 寫 Housing 資料與 Notebook 契約的失敗測試**

  建立以下測試：`test_source_dataset_contract()` 斷言 506 筆與 14 欄；`test_notebook_declares_all_crisp_dm_sections()`；`test_preprocessing_order_prevents_leakage()` 斷言 split 早於 imputer/scaler fit、再早於 feature selection；`test_notebook_selects_exactly_top_7()` 斷言 metadata `top_k == 7`。

- [ ] **Step 2: 執行契約測試並確認失敗**

  Run: `python -m pytest housing/tests/test_housing_artifacts.py -q`

  Expected: FAIL，因 Housing 資料與建立器尚未位於正式路徑。

- [ ] **Step 3: 複製唯一原始資料並建立 Notebook 產生器**

  從 `hw2/HousingData.csv` 複製到 `housing/HousingData.csv`，不修改內容。`build_notebook()` 必須產生六個 CRISP-DM 章節與有序 stage metadata：`setup`、`data_understanding`、`split`、`fit_preprocessor`、`feature_selection`、`modeling`、`evaluation`、`deployment`。

- [ ] **Step 4: 實作 Housing pipeline**

  使用 `Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", MinMaxScaler())])`，只對 `X_train` 呼叫 `fit_transform`，對 `X_test` 只呼叫 `transform`。使用 `SelectKBest(f_regression, k=7)`，比較平均值基準、全部 13 特徵 `LinearRegression` 與前 7 特徵 `LinearRegression`，並用同一組前 7 特徵建立 `statsmodels.OLS`。

- [ ] **Step 5: 寫完整成果的失敗測試**

  `test_analysis_outputs_are_complete()` 斷言三個資料檔、三張大於 10 KB 的圖片、7 個不重複選取特徵、三個模型及合法 MAE/RMSE/R²；`test_web_model_matches_top7_order()` 斷言 JSON 特徵順序與 CSV 相同；`test_imputer_statistics_have_13_training_values()` 斷言 13 個填補值皆為有限數。

- [ ] **Step 6: 產生並完整執行 Housing Notebook**

  Run: `cd housing; python scripts/build_housing_notebook.py`

  Run: `cd housing; jupyter nbconvert --to notebook --execute housing_analysis.ipynb --output housing_analysis.ipynb --ExecutePreprocessor.timeout=600`

  Expected: 兩個指令 exit code 0，`housing/results/` 產出三個資料檔與三張圖。

- [ ] **Step 7: 執行 Housing 與 Sales 回歸測試**

  Run: `python -m pytest housing/tests sales/tests -q`

  Expected: 全部 PASS。

### Task 3: 建立 Housing README 與跨問題資料一致性檢查

**Files:**
- Create: `housing/README.md`
- Create: `tests/test_project_consistency.py`
- Modify: `sales/README.md`

**Interfaces:**
- Consumes: Task 1 的 Sales 成果及 Task 2 的 Housing `metrics.json`、CSV 與圖片。
- Produces: 兩份問題 README，以及可供後續網站工作重複使用的跨問題真實來源檢查。

- [ ] **Step 1: 寫 README 一致性的失敗測試**

  `test_housing_readme_matches_metrics()` 從 JSON 格式化實際 MAE、RMSE、R²、預測區間覆蓋率與前 7 特徵並斷言 README 包含它們；`test_housing_readme_has_full_crisp_dm_narrative()` 斷言六階段與至少 2,500 個字元；`test_no_housing_report_exists()` 斷言 `housing/` 沒有 `.docx` 或 `.pdf`。

- [ ] **Step 2: 執行 README 測試並確認失敗**

  Run: `python -m pytest tests/test_project_consistency.py -q`

  Expected: FAIL，因 Housing README 尚未建立。

- [ ] **Step 3: 撰寫 Housing README 並修正 Sales README**

  Housing README 完整記錄資料來源、欄位、缺失值、前 7 選擇、三模型實測結果、OLS、95% 預測區間、三張圖、CRISP-DM、限制、執行指令與網站用途。Sales README 只做搬移後路徑修正，不改寫既有實測數字。

- [ ] **Step 4: 執行跨問題一致性測試**

  Run: `python -m pytest tests/test_project_consistency.py sales/tests housing/tests -q`

  Expected: 全部 PASS。

### Task 4: 將網站拆成可切換的 Sales 與 Housing Dashboard

**Files:**
- Create: `selected_project_web/components/ProblemSelector.tsx`
- Create: `selected_project_web/components/SalesDashboard.tsx`
- Create: `selected_project_web/components/HousingDashboard.tsx`
- Create: `selected_project_web/model/sales_model_data.json`
- Create: `selected_project_web/model/housing_model_data.json`
- Create: `selected_project_web/public/images/sales/actual_vs_predicted.png`
- Create: `selected_project_web/public/images/sales/prediction_interval.png`
- Create: `selected_project_web/public/images/sales/residual_diagnostics.png`
- Create: `selected_project_web/public/images/housing/actual_vs_predicted.png`
- Create: `selected_project_web/public/images/housing/prediction_interval.png`
- Create: `selected_project_web/public/images/housing/residual_diagnostics.png`
- Modify: `selected_project_web/app/page.tsx`
- Modify: `selected_project_web/app/globals.css`
- Modify: `selected_project_web/scripts/verify-static-export.mjs`
- Delete after replacement: `selected_project_web/model/model_data.json`
- Delete after replacement: three old unscoped files under `selected_project_web/public/images/`

**Interfaces:**
- Consumes: Sales 既有網站 JSON、`sales/results/` 圖片，以及 Housing `metrics.json.web_model`、`top7_features.csv` 與 `housing/results/` 圖片。
- Produces: `ProblemSelector({ value, onChange }: { value: "sales" | "housing"; onChange: (problem: "sales" | "housing") => void })`、`SalesDashboard(): JSX.Element`、`HousingDashboard(): JSX.Element`，以及只負責選擇 problem 的 `Home(): JSX.Element`。

- [ ] **Step 1: 擴充靜態匯出驗證並確認先失敗**

  在 `verify-static-export.mjs` 新增斷言：輸出包含 `Sales：零售需求預測`、`Housing：房價預測` 與 problem selector 標籤；兩組圖片來源檔皆存在；模擬 base path 建置結果不得含根路徑硬編碼。先執行 `npm run build && npm run verify:export`，預期因 Housing 尚未加入而 FAIL。

- [ ] **Step 2: 封裝現有 SalesDashboard**

  將現有 `page.tsx` 的 Sales 狀態、預測公式、圖表、CRISP-DM 與表格原樣移至 `SalesDashboard.tsx`；模型 import 改為 `sales_model_data.json`，圖片改為 `/images/sales/<file>`，不改動既有公式與數字。

- [ ] **Step 3: 實作 ProblemSelector 與首頁狀態**

  `ProblemSelector` 使用有可見文字的 `<label htmlFor="problem-select">` 與原生 `<select id="problem-select">`。`Home` 預設 `sales`，選擇 `housing` 時只掛載 `HousingDashboard`，確保兩個 dashboard 的輸入狀態互不污染。

- [ ] **Step 4: 實作 HousingDashboard**

  依 `housing_model_data.json` 的 `features`、`imputer_values`、`scale_min`、`scale_max`、`coefficients` 與 `intercept` 計算前 7 特徵預測及各特徵貢獻。介面需與 Sales 對等地包含資料摘要、預設值、13 個可調整原始欄位、外插警告、即時預測、模型比較、前 7 特徵表、三張圖、CRISP-DM 與方法限制。

- [ ] **Step 5: 調整共用 CSS 與響應式版面**

  新增 problem selector 樣式，沿用既有 design tokens；在 960 px 與 640 px 斷點確認 dashboard、控制項、表格及圖片不產生頁面級水平溢出。

- [ ] **Step 6: 執行網站建置與靜態匯出驗證**

  Run: `cd selected_project_web; npm ci`

  Run: `cd selected_project_web; npm run build`

  Run: `cd selected_project_web; npm run verify:config && npm run verify:export`

  Run: `Test-Path selected_project_web/out/index.html`

  Expected: 所有 Node 指令 exit code 0，最後輸出 `True`。

- [ ] **Step 7: 以 repository 子路徑重新建置**

  Run: `$env:GITHUB_ACTIONS='true'; $env:GITHUB_REPOSITORY='owner/example-repo'; npm run build; npm run verify:config; npm run verify:export`

  Expected: exit code 0；靜態輸出引用 `/example-repo/_next/` 與 `/example-repo/images/...`，沒有需要後端的 API。

- [ ] **Step 8: 用瀏覽器實際驗證互動與版面**

  在桌面與 390 px 手機寬度切換 Sales/Housing，改動各自一個數值欄位並確認預測更新；確認切回另一問題時標題、控制項、模型表與圖片完全對應，瀏覽器 console 沒有 error。

### Task 5: 根 README、整體測試與交付檢查

**Files:**
- Create: `README.md`
- Modify: `.github/workflows/deploy-pages.yml` only if verification proves its paths are stale
- Modify: `.gitignore` only if generated caches are not already excluded

**Interfaces:**
- Consumes: Task 1–4 的正式資料夾、測試、成果與網站。
- Produces: 使用者可直接執行的專案入口說明與完整驗證證據。

- [ ] **Step 1: 寫根 README 契約的失敗測試**

  在 `tests/test_project_consistency.py` 新增 `test_root_readme_links_both_problems_and_commands()`，斷言包含 `sales/README.md`、`housing/README.md`、GitHub Pages 網址、本機分析測試指令、`npm ci`、`npm run build`、資料夾樹與兩個網站圖片子目錄。

- [ ] **Step 2: 撰寫根 README**

  只做總覽與操作入口，不複製兩份完整分析。提供從根目錄執行 Sales、Housing、pytest、網站開發、網站建置和 GitHub Pages 部署的 PowerShell 指令。

- [ ] **Step 3: 執行全部 Python 測試**

  Run: `python -m pytest tests sales/tests housing/tests -q`

  Expected: 全部 PASS，無 warning 被誤當成成功。

- [ ] **Step 4: 執行網站最終驗證**

  Run: `cd selected_project_web; npm ci; npm run build; npm run verify:config; npm run verify:export`

  Expected: 全部 exit code 0，`out/index.html` 存在。

- [ ] **Step 5: 檢查連結、敏感資訊與修改範圍**

  Run: `git diff --check`

  Run: `git status --short`

  Expected: 無格式錯誤；只包含本規格要求的搬移、新增與修改，沒有 `.env`、token、`node_modules/`、`.next/`、`out/` 或 Notebook checkpoint。

- [ ] **Step 6: 記錄交付狀態**

  列出已通過的 Python 測試數、網站指令、桌面與手機互動結果；若因環境限制未能執行任何項目，明確標示未測試內容與原因，不宣稱成功。
