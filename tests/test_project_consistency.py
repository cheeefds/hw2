import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HOUSING = ROOT / "housing"


def _housing_metrics():
    return json.loads((HOUSING / "results" / "metrics.json").read_text(encoding="utf-8"))


def test_housing_readme_matches_metrics():
    readme = (HOUSING / "README.md").read_text(encoding="utf-8")
    metrics = _housing_metrics()
    main_model = metrics["models"]["Linear regression - top 7"]
    expected_fragments = [
        f"MAE = {main_model['MAE']:.2f}",
        f"RMSE = {main_model['RMSE']:.2f}",
        f"R² = {main_model['R2']:.4f}",
        f"{metrics['prediction_interval']['coverage']:.2%}",
        "前 7",
        "中位數填補",
    ]
    expected_fragments.extend(metrics["selected_features"])
    assert all(fragment in readme for fragment in expected_fragments)


def test_housing_readme_has_full_crisp_dm_narrative():
    readme = (HOUSING / "README.md").read_text(encoding="utf-8")
    for section in [
        "### 1. Business Understanding（商業理解）",
        "### 2. Data Understanding（資料理解）",
        "### 3. Data Preparation（資料準備）",
        "### 4. Modeling（建模）",
        "### 5. Evaluation（評估）",
        "### 6. Deployment（部署）",
        "資料洩漏",
        "95% 預測區間",
        "限制",
    ]:
        assert section in readme
    assert len(readme) >= 2_500


def test_no_housing_report_exists():
    assert not list(HOUSING.glob("*.docx"))
    assert not list(HOUSING.glob("*.pdf"))


def test_housing_website_model_is_the_executed_metrics_file():
    website_model = json.loads(
        (ROOT / "selected_project_web" / "model" / "housing_model_data.json").read_text(
            encoding="utf-8"
        )
    )
    assert website_model == _housing_metrics()


def test_root_readme_links_both_problems_and_commands():
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    expected_fragments = [
        "sales/README.md",
        "housing/README.md",
        "GitHub Pages",
        "python -m pytest tests sales/tests housing/tests -q",
        "npm ci",
        "npm run build",
        "selected_project_web/public/images/sales/",
        "selected_project_web/public/images/housing/",
        "https://",
    ]
    assert all(fragment in readme for fragment in expected_fragments)
