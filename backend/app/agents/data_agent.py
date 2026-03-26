import asyncio
from typing import Any, Dict

from app.agents.base import BaseAgent


class DataAgent(BaseAgent):
    """Analyses the uploaded CSV and determines preprocessing strategy."""

    def __init__(self):
        super().__init__("DataAgent")

    async def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        file_path: str = context.get("file_path", "")
        stage = "data_analysis"

        await self.emit("Loading dataset...", "info", stage)
        await asyncio.sleep(0.5)

        dataset_info: Dict[str, Any] = {}

        if file_path:
            try:
                import pandas as pd  # noqa: PLC0415

                df = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: pd.read_csv(file_path)
                )
                rows, cols = df.shape
                await self.emit(f"Dataset shape: {rows} x {cols}", "info", stage)

                await self.emit("Analyzing column types...", "info", stage)
                await asyncio.sleep(0.3)

                numeric_cols = df.select_dtypes(include="number").columns.tolist()
                categorical_cols = df.select_dtypes(exclude="number").columns.tolist()
                await self.emit(
                    f"Found {len(numeric_cols)} numeric columns, "
                    f"{len(categorical_cols)} categorical columns",
                    "info",
                    stage,
                )

                await self.emit("Checking missing values...", "info", stage)
                await asyncio.sleep(0.3)

                missing = df.isnull().sum()
                missing_dict = {
                    col: int(count)
                    for col, count in missing.items()
                    if count > 0
                }
                await self.emit(f"Missing values: {missing_dict}", "info", stage)

                # Basic stats
                stats: Dict[str, Any] = {}
                for col in numeric_cols:
                    stats[col] = {
                        "mean": float(df[col].mean()),
                        "std": float(df[col].std()),
                        "min": float(df[col].min()),
                        "max": float(df[col].max()),
                    }

                dataset_info = {
                    "rows": rows,
                    "cols": cols,
                    "numeric_cols": numeric_cols,
                    "categorical_cols": categorical_cols,
                    "missing": missing_dict,
                    "stats": stats,
                    "columns": df.columns.tolist(),
                }
                context["dataframe_columns"] = df.columns.tolist()
                context["numeric_cols"] = numeric_cols
                context["categorical_cols"] = categorical_cols
            except Exception as exc:
                await self.emit(f"Could not read dataset: {exc}", "warning", stage)
                dataset_info = _mock_dataset_info()
        else:
            await self.emit("No dataset provided – using mock data profile.", "warning", stage)
            dataset_info = _mock_dataset_info()
            context["numeric_cols"] = dataset_info["numeric_cols"]
            context["categorical_cols"] = dataset_info["categorical_cols"]

        await self.emit("Determining preprocessing strategy...", "info", stage)
        await asyncio.sleep(0.5)

        preprocessing = (
            "Will apply: StandardScaler for numeric, "
            "OneHotEncoder for categorical, "
            "fill missing with median/mode"
        )
        await self.emit(preprocessing, "success", stage)

        context["dataset_info"] = dataset_info
        return context


def _mock_dataset_info() -> Dict[str, Any]:
    return {
        "rows": 1000,
        "cols": 10,
        "numeric_cols": ["feature_1", "feature_2", "feature_3", "feature_4", "feature_5"],
        "categorical_cols": ["cat_1", "cat_2"],
        "missing": {"feature_3": 12, "cat_2": 5},
        "stats": {
            "feature_1": {"mean": 0.0, "std": 1.0, "min": -3.0, "max": 3.0},
            "feature_2": {"mean": 50.0, "std": 10.0, "min": 20.0, "max": 80.0},
        },
        "columns": ["feature_1", "feature_2", "feature_3", "feature_4", "feature_5", "cat_1", "cat_2", "target"],
    }
