import csv
import importlib
import json
import os
from pathlib import Path

import nbformat
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]


def test_source_dataset_contract():
    expected_columns = [
        "Date",
        "Store ID",
        "Product ID",
        "Category",
        "Region",
        "Inventory Level",
        "Units Sold",
        "Units Ordered",
        "Price",
        "Discount",
        "Weather Condition",
        "Promotion",
        "Competitor Pricing",
        "Seasonality",
        "Epidemic",
        "Demand",
    ]

    with (ROOT / "sales_data.csv").open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.reader(handle)
        header = next(reader)
        row_count = sum(1 for _ in reader)

    assert header == expected_columns
    assert row_count == 76_000


def _build_notebook_in(tmp_path):
    module = importlib.import_module("scripts.build_hw2_notebook")
    output_path = tmp_path / "7115056075_hw2.ipynb"
    module.build_notebook(output_path)
    return nbformat.read(output_path, as_version=4)


def test_notebook_declares_all_crisp_dm_sections(tmp_path):
    notebook = _build_notebook_in(tmp_path)
    markdown = "\n".join(
        "".join(cell.source)
        for cell in notebook.cells
        if cell.cell_type == "markdown"
    )
    required_sections = [
        "Business Understanding",
        "Data Understanding",
        "Data Preparation",
        "Modeling",
        "Evaluation",
        "Deployment",
    ]
    assert all(section in markdown for section in required_sections)


def test_notebook_uses_train_only_preprocessing(tmp_path):
    notebook = _build_notebook_in(tmp_path)
    stage_order = [
        cell.metadata.get("analysis_stage")
        for cell in notebook.cells
        if cell.cell_type == "code" and cell.metadata.get("analysis_stage")
    ]
    assert stage_order.index("split") < stage_order.index("fit_preprocessor")
    assert stage_order.index("fit_preprocessor") < stage_order.index("feature_selection")


def test_notebook_selects_exactly_top_20(tmp_path):
    notebook = _build_notebook_in(tmp_path)
    selection_cells = [
        cell
        for cell in notebook.cells
        if cell.metadata.get("analysis_stage") == "feature_selection"
    ]
    assert len(selection_cells) == 1
    assert selection_cells[0].metadata["top_k"] == 20


def test_data_understanding_cell_runs_with_supported_pandas_api(tmp_path):
    notebook = _build_notebook_in(tmp_path)
    data_cell = next(
        cell
        for cell in notebook.cells
        if cell.metadata.get("analysis_stage") == "data_understanding"
    )
    namespace = {"pd": pd, "display": lambda value: value}
    previous_directory = Path.cwd()
    try:
        os.chdir(ROOT)
        exec(data_cell.source, namespace)
    finally:
        os.chdir(previous_directory)

    assert namespace["data_overview"].loc["rows", "value"] == 76_000


def test_analysis_outputs_are_complete():
    results_dir = ROOT / "results"
    metrics_path = results_dir / "metrics.json"
    comparison_path = results_dir / "model_comparison.csv"
    features_path = results_dir / "top20_features.csv"
    image_paths = [
        results_dir / "actual_vs_predicted.png",
        results_dir / "prediction_interval.png",
        results_dir / "residual_diagnostics.png",
    ]

    assert metrics_path.exists()
    assert comparison_path.exists()
    assert features_path.exists()
    assert all(path.exists() and path.stat().st_size > 10_000 for path in image_paths)

    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
    assert metrics["dataset"]["rows"] == 76_000
    assert metrics["dataset"]["train_rows"] == 60_800
    assert metrics["dataset"]["test_rows"] == 15_200
    assert len(metrics["selected_features"]) == 20
    assert len(set(metrics["selected_features"])) == 20
    assert set(metrics["models"]) == {
        "Mean baseline",
        "Linear regression - all features",
        "Linear regression - top 20",
    }
    for model_metrics in metrics["models"].values():
        assert set(model_metrics) == {"feature_count", "MAE", "RMSE", "R2"}
        assert model_metrics["RMSE"] >= model_metrics["MAE"] >= 0

    assert 0 <= metrics["prediction_interval"]["coverage"] <= 1
    assert metrics["prediction_interval"]["mean_width"] > 0
    assert "Adjusted_R2_train" in metrics["ols"]

    with features_path.open(encoding="utf-8-sig", newline="") as handle:
        feature_rows = list(csv.DictReader(handle))
    assert len(feature_rows) == 20
    assert [int(row["Rank"]) for row in feature_rows] == list(range(1, 21))


def test_readme_matches_analysis_metrics():
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    expected_fragments = [
        "7115056075_hw2.ipynb",
        "前 20",
        "MAE = 16.55",
        "RMSE = 22.20",
        "R² = 0.7768",
        "95.60%",
        "合成資料",
    ]
    assert all(fragment in readme for fragment in expected_fragments)


def test_readme_has_detailed_crisp_dm_narrative():
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    crisp_dm = readme.split("## CRISP-DM 流程", maxsplit=1)[1].split(
        "## GPT 輔助內容", maxsplit=1
    )[0]

    required_fragments = [
        "### 1. Business Understanding（商業理解）",
        "### 2. Data Understanding（資料理解）",
        "### 3. Data Preparation（資料準備）",
        "### 4. Modeling（建模）",
        "### 5. Evaluation（評估）",
        "### 6. Deployment（部署）",
        "#### 分析目標",
        "#### 實際作法",
        "#### 階段產出與判讀",
        "資料洩漏",
        "前 20 名",
        "95% 預測區間",
        "時間切分",
    ]
    assert all(fragment in crisp_dm for fragment in required_fragments)
    assert len(crisp_dm) >= 2_500


def test_report_pdf_is_kept_without_an_extra_word_copy():
    docx_path = ROOT / "7115056075_hw2_report.docx"
    pdf_path = ROOT / "7115056075_hw2_report.pdf"
    assert pdf_path.exists() and pdf_path.stat().st_size > 100_000
    assert not docx_path.exists()

