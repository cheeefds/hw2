import csv
import importlib.util
import json
import math
from pathlib import Path

import nbformat


ROOT = Path(__file__).resolve().parents[1]
EXPECTED_COLUMNS = [
    "CRIM",
    "ZN",
    "INDUS",
    "CHAS",
    "NOX",
    "RM",
    "AGE",
    "DIS",
    "RAD",
    "TAX",
    "PTRATIO",
    "B",
    "LSTAT",
    "MEDV",
]


def _load_builder():
    module_path = ROOT / "scripts" / "build_housing_notebook.py"
    spec = importlib.util.spec_from_file_location("build_housing_notebook", module_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _build_notebook_in(tmp_path):
    module = _load_builder()
    output_path = tmp_path / "housing_analysis.ipynb"
    module.build_notebook(output_path)
    return nbformat.read(output_path, as_version=4)


def test_source_dataset_contract():
    with (ROOT / "HousingData.csv").open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.reader(handle)
        header = next(reader)
        row_count = sum(1 for _ in reader)

    assert header == EXPECTED_COLUMNS
    assert row_count == 506


def test_notebook_declares_all_crisp_dm_sections(tmp_path):
    notebook = _build_notebook_in(tmp_path)
    markdown = "\n".join(
        str(cell.source) for cell in notebook.cells if cell.cell_type == "markdown"
    )
    for section in [
        "Business Understanding",
        "Data Understanding",
        "Data Preparation",
        "Modeling",
        "Evaluation",
        "Deployment",
    ]:
        assert section in markdown


def test_preprocessing_order_prevents_leakage(tmp_path):
    notebook = _build_notebook_in(tmp_path)
    stages = [
        cell.metadata.get("analysis_stage")
        for cell in notebook.cells
        if cell.cell_type == "code" and cell.metadata.get("analysis_stage")
    ]
    assert stages.index("split") < stages.index("fit_preprocessor")
    assert stages.index("fit_preprocessor") < stages.index("feature_selection")

    preprocessing_cell = next(
        cell
        for cell in notebook.cells
        if cell.metadata.get("analysis_stage") == "fit_preprocessor"
    )
    assert "SimpleImputer(strategy=\"median\")" in preprocessing_cell.source
    assert "preprocessor.fit_transform(X_train)" in preprocessing_cell.source
    assert "preprocessor.transform(X_test)" in preprocessing_cell.source


def test_notebook_selects_exactly_top_7(tmp_path):
    notebook = _build_notebook_in(tmp_path)
    selection_cell = next(
        cell
        for cell in notebook.cells
        if cell.metadata.get("analysis_stage") == "feature_selection"
    )
    assert selection_cell.metadata["top_k"] == 7


def test_analysis_outputs_are_complete():
    results_dir = ROOT / "results"
    metrics_path = results_dir / "metrics.json"
    comparison_path = results_dir / "model_comparison.csv"
    features_path = results_dir / "top7_features.csv"
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
    assert metrics["dataset"]["rows"] == 506
    assert metrics["dataset"]["candidate_features"] == 13
    assert len(metrics["selected_features"]) == 7
    assert len(set(metrics["selected_features"])) == 7
    assert set(metrics["models"]) == {
        "Mean baseline",
        "Linear regression - all 13 features",
        "Linear regression - top 7",
    }
    for values in metrics["models"].values():
        assert values["RMSE"] >= values["MAE"] >= 0
        assert math.isfinite(values["R2"])
    assert 0 <= metrics["prediction_interval"]["coverage"] <= 1
    assert metrics["prediction_interval"]["mean_width"] > 0
    assert math.isfinite(metrics["ols"]["Adjusted_R2_train"])


def test_web_model_matches_top7_order():
    metrics = json.loads((ROOT / "results" / "metrics.json").read_text(encoding="utf-8"))
    with (ROOT / "results" / "top7_features.csv").open(
        encoding="utf-8-sig", newline=""
    ) as handle:
        feature_rows = list(csv.DictReader(handle))

    csv_features = [row["Feature"] for row in feature_rows]
    assert len(csv_features) == 7
    assert metrics["selected_features"] == csv_features
    assert metrics["web_model"]["features"] == csv_features
    assert list(metrics["web_model"]["coefficients"]) == csv_features


def test_imputer_statistics_have_13_training_values():
    metrics = json.loads((ROOT / "results" / "metrics.json").read_text(encoding="utf-8"))
    imputer_values = metrics["web_model"]["imputer_values"]
    assert set(imputer_values) == set(EXPECTED_COLUMNS[:-1])
    assert len(imputer_values) == 13
    assert all(math.isfinite(float(value)) for value in imputer_values.values())
