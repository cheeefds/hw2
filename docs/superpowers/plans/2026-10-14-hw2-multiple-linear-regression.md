# HW2 Multiple Linear Regression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 產出學號 `7115056075` 可直接繳交、可從頭重現，並使用訓練集 F-score 前 20 名特徵的多元線性回歸作業包。

**Architecture:** 以自包含 Notebook 執行資料理解、無洩漏前處理、特徵選擇、三模型比較、OLS 推論與圖片輸出。Notebook 的實際輸出再作為 README、DOCX 與 PDF 的唯一數值來源，最後由封裝檢查程式驗證 ZIP 內容。

**Tech Stack:** Python 3、Jupyter Notebook、pandas、NumPy、scikit-learn、statsmodels、Matplotlib、python-docx、Poppler/LibreOffice（依環境可用工具）

**Spec:** `docs/superpowers/specs/2026-10-14-hw2-multiple-linear-regression-design.md`

## Global Constraints

- 保留原始 `dataset.ipynb`、`sales_data.csv` 與既有 ChatGPT 對話 PDF。
- 正式主程式必須命名為 `7115056075_hw2.ipynb`。
- 特徵選擇只使用訓練資料的 `f_regression` F-score，固定取前 20 名。
- 所有報告數字與圖片必須來自實際執行結果，不得自行捏造。
- 正式報告命名為 `7115056075_hw2_report.pdf`，最終壓縮檔命名為 `7115056075_hw2.zip`。
- 不建立網站，不修改原始 CSV，不自動 commit 或 push。

## Review Focus

- 前處理順序：測試資料不得參與 scaler、encoder 或 selector 的 fit。
- 類別欄位：訓練與測試轉換後欄位必須完全對齊，且無未知類別錯誤。
- 特徵數量：主模型必須恰好使用 20 個不重複特徵。
- 數值一致性：Notebook、CSV/JSON 結果、README 與 PDF 必須使用同一輪執行輸出。
- 可繳交性：ZIP 必須包含必要檔案且不得包含暫存快取或測試產物。

---

### Task 1: 執行環境與資料契約

**Files:**
- Create: `requirements.txt`
- Create: `tests/test_hw2_artifacts.py`
- Inspect: `sales_data.csv`

**Interfaces:**
- Consumes: 原始 CSV 的 16 個欄位與 76,000 筆資料。
- Produces: 可用 Python/Jupyter 執行器、固定依賴清單及資料契約測試。

- [ ] **Step 1: 找出現有 Notebook kernel 對應的 Python 執行器**

Run: 檢查 Jupyter kernelspec、Conda 環境與已安裝套件。
Expected: 記錄一個可執行 `pandas`、`sklearn`、`statsmodels` 與 Notebook 的 Python 路徑；若不存在，再請求安裝權限。

- [ ] **Step 2: 建立資料契約失敗測試**

在 `tests/test_hw2_artifacts.py` 新增 `test_source_dataset_contract()`，斷言資料為 76,000 列、16 欄，且包含 `Demand`、`Date` 與設計列出的 14 個候選特徵。

- [ ] **Step 3: 執行資料契約測試**

Run: `<python> -m pytest tests/test_hw2_artifacts.py::test_source_dataset_contract -v`
Expected: PASS；若資料內容不同則停止，不修改原始 CSV。

- [ ] **Step 4: 建立最小依賴清單**

在 `requirements.txt` 列出 Notebook 實際使用的套件，不鎖定未驗證的版本。

### Task 2: 正式 Notebook 與前 20 名特徵流程

**Files:**
- Create: `scripts/build_hw2_notebook.py`
- Create: `7115056075_hw2.ipynb`
- Modify: `tests/test_hw2_artifacts.py`

**Interfaces:**
- Consumes: `sales_data.csv` 與 Task 1 的資料契約。
- Produces: `7115056075_hw2.ipynb`，執行後寫出 `results/metrics.json`、`results/model_comparison.csv`、`results/top20_features.csv` 及三張 PNG。

- [ ] **Step 1: 新增 Notebook 結構失敗測試**

新增 `test_notebook_uses_train_only_preprocessing()`、`test_notebook_selects_exactly_top_20()` 與 `test_notebook_declares_all_crisp_dm_sections()`；檢查切分先於 fit、`k=20`、輸出檔名及六個 CRISP-DM 標題。

- [ ] **Step 2: 執行 Notebook 結構測試確認失敗**

Run: `<python> -m pytest tests/test_hw2_artifacts.py -v`
Expected: 因正式 Notebook 尚不存在而 FAIL。

- [ ] **Step 3: 建立 Notebook 產生器**

在 `scripts/build_hw2_notebook.py` 寫入 Markdown 與程式儲存格；程式須先 split，再對訓練資料 fit `MinMaxScaler`、`OneHotEncoder(handle_unknown="ignore", drop="first")` 與 `SelectKBest(f_regression, k=20)`。

- [ ] **Step 4: 產生正式 Notebook**

Run: `<python> scripts/build_hw2_notebook.py`
Expected: 建立有效 nbformat 4 的 `7115056075_hw2.ipynb`，所有 code cell 尚未帶入陳舊輸出。

- [ ] **Step 5: 執行 Notebook 結構測試**

Run: `<python> -m pytest tests/test_hw2_artifacts.py -v`
Expected: PASS，且確認主模型恰好取 F-score 前 20 名。

### Task 3: 從頭執行分析與核對結果

**Files:**
- Modify: `7115056075_hw2.ipynb`（寫回執行輸出）
- Create: `results/metrics.json`
- Create: `results/model_comparison.csv`
- Create: `results/top20_features.csv`
- Create: `results/actual_vs_predicted.png`
- Create: `results/prediction_interval.png`
- Create: `results/residual_diagnostics.png`
- Modify: `tests/test_hw2_artifacts.py`

**Interfaces:**
- Consumes: Task 2 的未執行 Notebook。
- Produces: 同一輪分析的指標、前 20 名特徵、圖表與已執行 Notebook。

- [ ] **Step 1: 新增分析輸出驗證測試**

新增 `test_analysis_outputs_are_complete()`，斷言三個模型皆有 MAE、RMSE、R-squared，主模型有 Adjusted R-squared、區間涵蓋率與平均區間寬度，前 20 名 CSV 恰好 20 列且名稱不重複，三張圖片存在且非空。

- [ ] **Step 2: 執行輸出測試確認失敗**

Run: `<python> -m pytest tests/test_hw2_artifacts.py::test_analysis_outputs_are_complete -v`
Expected: 因 `results/` 尚未完整產生而 FAIL。

- [ ] **Step 3: 從第一格執行正式 Notebook**

Run: `<python> -m jupyter nbconvert --to notebook --execute 7115056075_hw2.ipynb --output 7115056075_hw2.ipynb --ExecutePreprocessor.timeout=600`
Expected: 執行完成且無 traceback，產生全部 `results/` 輸出。

- [ ] **Step 4: 執行分析輸出測試**

Run: `<python> -m pytest tests/test_hw2_artifacts.py -v`
Expected: PASS。

- [ ] **Step 5: 人工核對合理性**

檢查主模型優於平均值基準、RMSE 不小於 MAE、區間上下限順序正確、圖片座標與圖例完整；不以預設門檻捏造「模型優異」結論。

### Task 4: 來源研究、README 與正式報告

**Files:**
- Modify: `README.md`
- Create: `scripts/build_report.py`
- Create: `7115056075_hw2_report.docx`
- Create: `7115056075_hw2_report.pdf`
- Create: `report_render/`（僅供驗證，不放入 ZIP）

**Interfaces:**
- Consumes: Task 3 的 metrics、前 20 特徵 CSV、模型比較 CSV、圖片及既有 NotebookLM 摘要。
- Produces: 與實際分析一致、具來源連結的 README、DOCX 與 PDF。

- [ ] **Step 1: 查核第一方或原始來源**

查核 Kaggle 資料集頁面，以及 scikit-learn、statsmodels 或原始研究文件中與線性回歸、特徵選擇、預測區間、Ridge/Lasso、樹模型及時間序列方法直接相關的資料；記錄可點擊來源，不引用無法核對的 `[1]` 至 `[30]`。

- [ ] **Step 2: 更新 README**

依 `results/` 自動或明確帶入本輪結果，完整呈現 CRISP-DM、前 20 名特徵、三模型比較、NotebookLM 摘要來源說明、主流方法比較、執行指令與繳交檔案。

- [ ] **Step 3: 建立報告產生器**

在 `scripts/build_report.py` 讀取 `results/`，建立含封面、目錄式章節、表格、三張圖片、GPT 輔助內容、NotebookLM 摘要、限制與參考資料的繁體中文 DOCX。

- [ ] **Step 4: 產生 DOCX 與 PDF**

Run: `<python> scripts/build_report.py`
Expected: 產生 `7115056075_hw2_report.docx`，並以環境可用的 LibreOffice/文件轉換工具產生同名 PDF。

- [ ] **Step 5: 渲染並逐頁檢查 PDF**

Run: 使用文件與 PDF 技能指定的渲染工具輸出 `report_render/*.png`。
Expected: 無截斷、重疊、亂碼、多餘空白頁；所有表格與圖片可讀，頁碼與標題一致。

- [ ] **Step 6: 核對跨檔數值一致性**

比對 Notebook、`results/metrics.json`、README、DOCX 與 PDF 的樣本數、前 20 名特徵及全部評估指標。

### Task 5: 最終封裝與驗證

**Files:**
- Create: `scripts/verify_submission.py`
- Create: `7115056075_hw2.zip`
- Modify: `tests/test_hw2_artifacts.py`

**Interfaces:**
- Consumes: Task 1–4 的正式成果。
- Produces: 通過內容清單與完整性檢查的最終 ZIP。

- [ ] **Step 1: 新增封裝失敗測試**

新增 `test_submission_zip_contents()`，要求 ZIP 至少包含主 Notebook、PDF 報告、原始 CSV、GPT 對話 PDF、README、requirements、三張結果圖及結果 CSV/JSON，且不包含 `__pycache__`、`.pytest_cache`、`report_render` 或測試檔。

- [ ] **Step 2: 執行封裝測試確認失敗**

Run: `<python> -m pytest tests/test_hw2_artifacts.py::test_submission_zip_contents -v`
Expected: 因 ZIP 尚不存在而 FAIL。

- [ ] **Step 3: 建立並執行封裝檢查程式**

在 `scripts/verify_submission.py` 驗證必要檔案、Notebook JSON、PDF 頁數與結果檔後，以明確白名單建立 `7115056075_hw2.zip`。

- [ ] **Step 4: 執行完整測試**

Run: `<python> -m pytest tests/test_hw2_artifacts.py -v`
Expected: 全部 PASS。

- [ ] **Step 5: 最終 Git 範圍檢查**

Run: `git status --short` 與 `git diff --stat`
Expected: 僅包含本作業需要的新檔與修改；不 commit、不 push。
