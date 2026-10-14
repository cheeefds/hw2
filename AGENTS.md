# AGENTS.md

## 1. 專案目標

本專案包含多個資料分析或機器學習問題，以及一個使用 Next.js 製作的互動式成果網站。

執行任務時，優先確保：

1. 分析結果與網站顯示的數據一致。
2. 使用者可以透過下拉選單切換不同 Project。
3. 網站可以輸出為靜態檔案並部署到 GitHub Pages。
4. README 提供可直接執行的安裝、測試與部署步驟。

## 2. 回覆方式

- 除非使用者明確指定其他語言，否則使用繁體中文。
- 先提供結果或下一步行動，再補充原因。
- 英文術語第一次出現時，附上簡短中文說明。
- 多步驟工作使用編號，並在每輪說明目前進度。
- 不要宣稱尚未實際執行的測試已通過。
- 發生錯誤時，指出錯誤位置、原因與修復方式。
- 回覆最後提供一個能在兩分鐘內完成的下一步行動。

## 3. 修改程式前

開始修改前必須：

1. 檢查目前目錄及目標檔案附近是否有更深層的 `AGENTS.md`，較接近檔案的規則優先。
2. 閱讀現有程式，確認資料來源、模型輸出、圖片路徑與網站結構。
3. 檢查 `git status`，不要覆蓋或刪除使用者尚未提交的修改。
4. 優先做最小幅度修改，保留原本命名、資料流程與程式風格。

## 4. 資料與模型規則

- 不得自行捏造模型分數、預測結果、係數、資料筆數或圖表內容。
- 網站使用的數值必須來自專案現有結果，或由程式重新計算並留下來源。
- 每個 Project 的模型資料分開保存，例如：

  ```text
  selected_project_web/model/project1_model_data.json
  selected_project_web/model/project2_model_data.json
  ```

- JSON 建議包含特徵名稱、平均值、標準差、係數、截距、R²、MAE 與 RMSE。
- 不要直接修改原始資料；衍生資料應使用新檔案或新欄位，並清楚標示來源。
- 若模型需要 Python、伺服器或資料庫才能預測，必須先說明 GitHub Pages 無法直接執行這些功能。

## 5. 網站實作規則

- 網站預設位於 `selected_project_web/`；如果實際路徑不同，所有指令與 workflow 必須同步修改。
- 多 Project 網站使用同一個下拉選單切換畫面，不要建立互不相連的重複首頁。
- 每個 Project 應各自封裝資料與畫面元件，避免把所有條件判斷堆在單一元件中。
- 保留響應式設計，至少檢查桌面與手機寬度。
- 圖片放在 `public/images/`，不同 Project 使用不同子資料夾。
- 圖片必須提供有意義的 `alt` 替代文字。
- 所有使用者看到的介面文字預設使用繁體中文。
- 不要複製參考網站的數據；只能參考版面、配色與互動方式。

## 6. GitHub Pages 規則

Next.js 必須使用靜態輸出：

```javascript
const [repositoryOwner = "", repositoryName = ""] =
  (process.env.GITHUB_REPOSITORY ?? "").split("/");

const isGitHubPagesBuild =
  process.env.GITHUB_ACTIONS === "true" && repositoryName.length > 0;

const isUserOrOrganizationSite =
  repositoryName.toLowerCase() ===
  `${repositoryOwner}.github.io`.toLowerCase();

const basePath =
  isGitHubPagesBuild && !isUserOrOrganizationSite
    ? `/${repositoryName}`
    : "";

const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
```

其他限制：

- 不得依賴 API Routes、Server Actions、Python 執行環境或長時間運作的後端服務。
- 瀏覽器端預測必須使用已匯出的 JSON 參數或純 JavaScript/TypeScript 計算。
- 圖片與靜態資源路徑必須包含 `NEXT_PUBLIC_BASE_PATH`。
- GitHub Actions 的 `working-directory`、快取路徑與 `out` 上傳路徑必須對應實際網站位置。
- 如果 `actions/configure-pages` 回報 `Not Found`，先檢查 repository 的 `Settings → Pages → Source` 是否已選擇 `GitHub Actions`。

## 7. README 與 .gitignore

根目錄 `README.md` 至少包含：

- 專案目的與兩個 Project 的簡介。
- GitHub Pages 線上網址。
- 每個 Project 的網站截圖。
- 本機安裝、開發、建置與部署指令。
- 資料夾結構及主要輸出位置。

`.gitignore` 至少排除：

```gitignore
node_modules/
.next/
out/
.vercel/
.env*
!.env.example
__pycache__/
*.py[cod]
.venv/
venv/
.pytest_cache/
.ipynb_checkpoints/
.vscode/
.idea/
Thumbs.db
.DS_Store
*.tmp
*.log
```

不要忽略網站實際需要的模型 JSON、成果圖片、`package-lock.json` 或 GitHub Actions workflow。

## 8. 測試要求

修改後依序執行適用的測試：

```powershell
cd selected_project_web
npm ci
npm run build
Test-Path .\out\index.html
```

另外必須確認：

1. 下拉選單可以切換所有 Project。
2. 每個 Project 的輸入控制與預測結果會同步更新。
3. 圖片、CSS 與 JavaScript 在 repository 子路徑下可以載入。
4. `out/index.html` 存在，且 `out/` 不包含需要伺服器執行的 API。
5. README 中的相對路徑、圖片與連結都有效。

如果專案已有測試，優先執行既有測試。若因為缺少套件、資料、權限或網路而無法完成，必須列出未測試項目與原因。

## 9. Git 與安全規則

- 不要執行 `git reset --hard`、強制推送或大量刪除，除非使用者明確同意。
- 不要提交 `.env`、API key、token、密碼或個人資料。
- 不要自動建立 commit 或 push，除非使用者明確要求。
- 修改完成後使用 `git diff` 確認範圍，只提交與目前任務有關的檔案。
- 刪除產生的暫存檔，但不得刪除使用者原有檔案。

## 10. 完成條件

只有符合以下條件才能宣告完成：

1. 要求的功能已實作。
2. 靜態網站建置成功。
3. 主要互動功能已實際驗證。
4. README、`.gitignore` 與部署設定保持一致。
5. 已清楚說明修改內容、測試結果與任何尚未驗證的限制。
