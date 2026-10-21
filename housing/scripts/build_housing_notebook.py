from pathlib import Path

import nbformat as nbf


def _markdown(source: str):
    return nbf.v4.new_markdown_cell(source.strip())


def _code(source: str, stage: str, **metadata):
    cell = nbf.v4.new_code_cell(source.strip())
    cell.metadata["analysis_stage"] = stage
    cell.metadata.update(metadata)
    return cell


def build_notebook(output_path: str | Path = "housing_analysis.ipynb") -> Path:
    output_path = Path(output_path)
    notebook = nbf.v4.new_notebook()
    notebook.metadata.kernelspec = {
        "display_name": "Python 3",
        "language": "python",
        "name": "python3",
    }
    notebook.metadata.language_info = {"name": "python", "version": "3.12"}
    notebook.cells = [
        _markdown(
            """
# Housing Data：房價多元線性回歸分析

本 Notebook 以 `MEDV` 為目標，依 CRISP-DM 完成資料理解、缺失值處理、前 7 名特徵選擇、線性回歸比較、95% 預測區間與靜態網站資料匯出。所有填補、縮放與特徵選擇都只在訓練集擬合，避免資料洩漏。
"""
        ),
        _code(
            """
from pathlib import Path
import json
import warnings

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import statsmodels.api as sm
from sklearn.feature_selection import SelectKBest, f_regression
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import MinMaxScaler

warnings.filterwarnings("ignore", category=UserWarning)
plt.style.use("seaborn-v0_8-whitegrid")

RESULTS_DIR = Path("results")
RESULTS_DIR.mkdir(exist_ok=True)
RANDOM_STATE = 42
TARGET = "MEDV"
FEATURES = [
    "CRIM", "ZN", "INDUS", "CHAS", "NOX", "RM", "AGE",
    "DIS", "RAD", "TAX", "PTRATIO", "B", "LSTAT",
]
""",
            "setup",
        ),
        _markdown(
            """
## 1. Business Understanding（商業理解）

本問題希望用住宅區犯罪率、房間數、交通可及性、稅率與人口結構等資訊預測房價中位數 `MEDV`。線性回歸可提供透明的方向與係數，95% 預測區間則用來呈現單筆房價預測的不確定性。

## 2. Data Understanding（資料理解）

資料包含 506 筆、13 個候選特徵與 1 個目標欄位。下列程式檢查欄位、缺失值、重複列及描述統計，不直接修改原始 CSV。
"""
        ),
        _code(
            """
df = pd.read_csv("HousingData.csv", na_values=["NA"])
if list(df.columns) != FEATURES + [TARGET]:
    raise ValueError(f"HousingData.csv 欄位不符預期：{list(df.columns)}")
if df[TARGET].isna().all():
    raise ValueError("MEDV 目標欄位不可全部為空值")

data_overview = pd.DataFrame({
    "value": [
        len(df),
        df.shape[1],
        int(df.isna().sum().sum()),
        int(df.duplicated().sum()),
    ]
}, index=["rows", "columns", "missing_values", "duplicate_rows"])

display(data_overview)
display(df.head())
display(df.describe().T)
""",
            "data_understanding",
        ),
        _markdown(
            """
## 3. Data Preparation（資料準備）

使用固定亂數種子做 80/20 切分。中位數填補與 Min-Max scaling 都只在訓練資料上擬合，再套用到測試資料；這可避免測試集資訊流入訓練階段。
"""
        ),
        _code(
            """
X = df[FEATURES].copy()
y = df[TARGET].astype(float).copy()

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=RANDOM_STATE,
)

print("Train shape:", X_train.shape)
print("Test shape :", X_test.shape)
""",
            "split",
        ),
        _code(
            """
preprocessor = Pipeline([
    ("imputer", SimpleImputer(strategy="median")),
    ("scaler", MinMaxScaler()),
])

X_train_processed_array = preprocessor.fit_transform(X_train)
X_test_processed_array = preprocessor.transform(X_test)
X_train_processed = pd.DataFrame(
    X_train_processed_array,
    columns=FEATURES,
    index=X_train.index,
)
X_test_processed = pd.DataFrame(
    X_test_processed_array,
    columns=FEATURES,
    index=X_test.index,
)

print("Processed train shape:", X_train_processed.shape)
print("Processed test shape :", X_test_processed.shape)
""",
            "fit_preprocessor",
        ),
        _markdown(
            """
## 4. Modeling（建模）

先以訓練資料的 `f_regression` 對 13 個特徵排序，固定選取前 7 名。比較平均值基準、全部 13 特徵線性回歸與前 7 特徵線性回歸；正式主模型為前 7 特徵版本。
"""
        ),
        _code(
            """
TOP_K = 7
selector = SelectKBest(score_func=f_regression, k=TOP_K)
selector.fit(X_train_processed, y_train)

feature_scores = pd.DataFrame({
    "Feature": FEATURES,
    "F_Score": selector.scores_,
    "P_Value": selector.pvalues_,
}).sort_values("F_Score", ascending=False, ignore_index=True)
feature_scores.insert(0, "Rank", np.arange(1, len(feature_scores) + 1))

top7_features = feature_scores.head(TOP_K).copy()
selected_features = top7_features["Feature"].tolist()
X_train_selected = X_train_processed[selected_features]
X_test_selected = X_test_processed[selected_features]

top7_features.to_csv(
    RESULTS_DIR / "top7_features.csv",
    index=False,
    encoding="utf-8-sig",
)
display(top7_features)
""",
            "feature_selection",
            top_k=7,
        ),
        _code(
            """
def regression_metrics(y_true, y_pred):
    return {
        "MAE": float(mean_absolute_error(y_true, y_pred)),
        "RMSE": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "R2": float(r2_score(y_true, y_pred)),
    }


baseline_pred = np.full(len(y_test), y_train.mean(), dtype=float)

full_model = LinearRegression()
full_model.fit(X_train_processed, y_train)
full_pred = full_model.predict(X_test_processed)

selected_model = LinearRegression()
selected_model.fit(X_train_selected, y_train)
selected_pred = selected_model.predict(X_test_selected)

model_specs = [
    ("Mean baseline", baseline_pred, 0),
    ("Linear regression - all 13 features", full_pred, 13),
    ("Linear regression - top 7", selected_pred, 7),
]
comparison_rows = []
for model_name, predictions, feature_count in model_specs:
    row = {"Model": model_name, "Feature_Count": feature_count}
    row.update(regression_metrics(y_test, predictions))
    comparison_rows.append(row)

model_comparison = pd.DataFrame(comparison_rows)
model_comparison.to_csv(
    RESULTS_DIR / "model_comparison.csv",
    index=False,
    encoding="utf-8-sig",
)
display(model_comparison)

X_train_ols = sm.add_constant(X_train_selected.reset_index(drop=True), has_constant="add")
X_test_ols = sm.add_constant(X_test_selected.reset_index(drop=True), has_constant="add")
ols_model = sm.OLS(y_train.to_numpy(dtype=float), X_train_ols).fit()
prediction_frame = ols_model.get_prediction(X_test_ols).summary_frame(alpha=0.05)
lower_bound = prediction_frame["obs_ci_lower"].to_numpy(dtype=float)
upper_bound = prediction_frame["obs_ci_upper"].to_numpy(dtype=float)
coverage = float(np.mean((y_test.to_numpy() >= lower_bound) & (y_test.to_numpy() <= upper_bound)))
mean_width = float(np.mean(upper_bound - lower_bound))
""",
            "modeling",
        ),
        _markdown(
            """
## 5. Evaluation（評估）

以測試集 MAE、RMSE 與 R² 評估三個模型，並檢查主模型的 95% 預測區間覆蓋率、平均寬度與殘差分布。所有 JSON、CSV 與圖表都由本 Notebook 的實際結果產生。
"""
        ),
        _code(
            """
imputer = preprocessor.named_steps["imputer"]
scaler = preprocessor.named_steps["scaler"]
imputer_values = {name: float(value) for name, value in zip(FEATURES, imputer.statistics_)}
scale_min = {name: float(value) for name, value in zip(FEATURES, scaler.data_min_)}
scale_max = {name: float(value) for name, value in zip(FEATURES, scaler.data_max_)}
raw_means = {name: float(X_train[name].mean()) for name in FEATURES}

selected_coefficients = {
    name: float(value)
    for name, value in zip(selected_features, selected_model.coef_)
}
feature_details = []
for _, score_row in top7_features.iterrows():
    feature = score_row["Feature"]
    feature_details.append({
        "rank": int(score_row["Rank"]),
        "feature": feature,
        "f_score": float(score_row["F_Score"]),
        "p_value": float(score_row["P_Value"]),
        "coef": float(selected_coefficients[feature]),
        "stderr": float(ols_model.bse[feature]),
        "t_stat": float(ols_model.tvalues[feature]),
        "ols_p_value": float(ols_model.pvalues[feature]),
    })

models = {
    row["Model"]: {
        "feature_count": int(row["Feature_Count"]),
        "MAE": float(row["MAE"]),
        "RMSE": float(row["RMSE"]),
        "R2": float(row["R2"]),
    }
    for row in comparison_rows
}

metrics = {
    "dataset": {
        "rows": int(len(df)),
        "columns": int(df.shape[1]),
        "candidate_features": len(FEATURES),
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "missing_values": int(df.isna().sum().sum()),
        "missing_by_column": {
            name: int(value) for name, value in df.isna().sum().items()
        },
        "duplicate_rows": int(df.duplicated().sum()),
        "target_stats": {
            key: float(value)
            for key, value in y.describe()[["mean", "std", "min", "25%", "50%", "75%", "max"]].items()
        },
    },
    "selected_features": selected_features,
    "models": models,
    "prediction_interval": {
        "confidence": 0.95,
        "coverage": coverage,
        "mean_width": mean_width,
    },
    "ols": {
        "R2_train": float(ols_model.rsquared),
        "Adjusted_R2_train": float(ols_model.rsquared_adj),
        "F_statistic": float(ols_model.fvalue),
        "F_pvalue": float(ols_model.f_pvalue),
        "AIC": float(ols_model.aic),
        "BIC": float(ols_model.bic),
    },
    "feature_details": feature_details,
    "web_model": {
        "features": selected_features,
        "all_features": FEATURES,
        "imputer_values": imputer_values,
        "scale_min": scale_min,
        "scale_max": scale_max,
        "raw_means": raw_means,
        "coefficients": selected_coefficients,
        "intercept": float(selected_model.intercept_),
    },
}

with (RESULTS_DIR / "metrics.json").open("w", encoding="utf-8") as handle:
    json.dump(metrics, handle, ensure_ascii=False, indent=2)

display(model_comparison)
print("Selected features:", selected_features)
print("95% PI coverage:", f"{coverage:.2%}")
print("95% PI mean width:", f"{mean_width:.2f}")
""",
            "evaluation",
        ),
        _code(
            """
figure, axis = plt.subplots(figsize=(8, 6))
axis.scatter(y_test, selected_pred, alpha=0.72, edgecolor="white", linewidth=0.35)
limits = [float(min(y_test.min(), selected_pred.min())), float(max(y_test.max(), selected_pred.max()))]
axis.plot(limits, limits, "--", color="#ef4444", linewidth=1.6, label="Perfect prediction")
axis.set(xlabel="Actual MEDV", ylabel="Predicted MEDV", title="Housing: Actual vs Predicted")
axis.legend()
figure.tight_layout()
figure.savefig(RESULTS_DIR / "actual_vs_predicted.png", dpi=180, bbox_inches="tight")
plt.close(figure)

order = np.argsort(selected_pred)
positions = np.arange(len(order))
figure, axis = plt.subplots(figsize=(11, 6))
axis.fill_between(positions, lower_bound[order], upper_bound[order], alpha=0.22, color="#38bdf8", label="95% prediction interval")
axis.plot(positions, selected_pred[order], color="#2563eb", linewidth=1.8, label="Predicted MEDV")
axis.scatter(positions, y_test.to_numpy()[order], color="#f97316", s=16, alpha=0.8, label="Actual MEDV")
axis.set(xlabel="Test observations sorted by prediction", ylabel="MEDV", title="Housing: 95% Prediction Interval")
axis.legend()
figure.tight_layout()
figure.savefig(RESULTS_DIR / "prediction_interval.png", dpi=180, bbox_inches="tight")
plt.close(figure)

residuals = y_test.to_numpy() - selected_pred
figure, axes = plt.subplots(1, 2, figsize=(12, 5))
axes[0].scatter(selected_pred, residuals, alpha=0.72, edgecolor="white", linewidth=0.35)
axes[0].axhline(0, color="#ef4444", linestyle="--")
axes[0].set(xlabel="Predicted MEDV", ylabel="Residual", title="Residuals vs Predicted")
axes[1].hist(residuals, bins=16, color="#3b82f6", alpha=0.82, edgecolor="white")
axes[1].set(xlabel="Residual", ylabel="Count", title="Residual Distribution")
figure.tight_layout()
figure.savefig(RESULTS_DIR / "residual_diagnostics.png", dpi=180, bbox_inches="tight")
plt.close(figure)
""",
            "evaluation_plots",
        ),
        _markdown(
            """
## 6. Deployment（部署）

模型指標、縮放參數、填補值、前 7 特徵係數與圖表會匯出為靜態檔案，供 Next.js 在瀏覽器端計算預測。GitHub Pages 不需要 Python 伺服器；完整實驗、限制與執行方式記錄於 `housing/README.md`。
"""
        ),
        _code(
            """
required_outputs = [
    "metrics.json",
    "model_comparison.csv",
    "top7_features.csv",
    "actual_vs_predicted.png",
    "prediction_interval.png",
    "residual_diagnostics.png",
]
for file_name in required_outputs:
    path = RESULTS_DIR / file_name
    if not path.exists() or path.stat().st_size == 0:
        raise RuntimeError(f"缺少分析產出：{path}")
print("Deployment artifacts ready:", ", ".join(required_outputs))
""",
            "deployment",
        ),
    ]

    output_path.parent.mkdir(parents=True, exist_ok=True)
    nbf.write(notebook, output_path)
    return output_path


if __name__ == "__main__":
    created = build_notebook()
    print(f"Created {created}")
