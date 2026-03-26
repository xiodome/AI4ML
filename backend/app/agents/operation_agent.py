import asyncio
from typing import Any, Dict

from app.agents.base import BaseAgent


class OperationAgent(BaseAgent):
    """Generates clean, executable Python code for the entire ML pipeline."""

    def __init__(self):
        super().__init__("OperationAgent")

    async def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        stage = "code_generation"
        task_type: str = context.get("task_type", "classification")
        selected_model: str = context.get("selected_model", "XGBoost Classifier")
        numeric_cols = context.get("numeric_cols", ["feature_1", "feature_2"])
        categorical_cols = context.get("categorical_cols", ["cat_1"])
        metrics = context.get("metrics", {})
        file_path: str = context.get("file_path", "data.csv")
        nl_requirement: str = context.get("nl_requirement", "")

        await self.emit("Generating pipeline code...", "info", stage)
        await asyncio.sleep(1)

        code = _generate_code(
            task_type=task_type,
            selected_model=selected_model,
            numeric_cols=numeric_cols,
            categorical_cols=categorical_cols,
            metrics=metrics,
            file_path=file_path,
            nl_requirement=nl_requirement,
        )

        await self.emit("Code generation complete", "success", stage)

        context["generated_code"] = code
        return context


def _generate_code(
    task_type: str,
    selected_model: str,
    numeric_cols,
    categorical_cols,
    metrics: Dict[str, Any],
    file_path: str,
    nl_requirement: str,
) -> str:
    is_regression = task_type == "regression"

    if "XGBoost" in selected_model:
        model_import = (
            "from xgboost import XGBRegressor" if is_regression else "from xgboost import XGBClassifier"
        )
        model_class = "XGBRegressor" if is_regression else "XGBClassifier"
        model_params = (
            "n_estimators=100, learning_rate=0.1, max_depth=6, random_state=42"
            if is_regression
            else "n_estimators=100, learning_rate=0.1, max_depth=6, random_state=42, eval_metric='logloss'"
        )
    elif "Random Forest" in selected_model:
        model_import = (
            "from sklearn.ensemble import RandomForestRegressor"
            if is_regression
            else "from sklearn.ensemble import RandomForestClassifier"
        )
        model_class = "RandomForestRegressor" if is_regression else "RandomForestClassifier"
        model_params = "n_estimators=100, random_state=42"
    else:
        model_import = (
            "from sklearn.linear_model import LinearRegression"
            if is_regression
            else "from sklearn.linear_model import LogisticRegression"
        )
        model_class = "LinearRegression" if is_regression else "LogisticRegression"
        model_params = "" if is_regression else "max_iter=1000, random_state=42"

    metric_comment = (
        f"# Achieved RMSE: {metrics.get('rmse', 'N/A')}, R²: {metrics.get('r2', 'N/A')}"
        if is_regression
        else f"# Achieved Accuracy: {metrics.get('accuracy', 'N/A')}"
    )

    eval_code = (
        "rmse = np.sqrt(mean_squared_error(y_test, y_pred))\n"
        '    r2   = r2_score(y_test, y_pred)\n'
        '    print(f"RMSE : {rmse:.4f}")\n'
        '    print(f"R2   : {r2:.4f}")\n'
        '    return {"rmse": float(rmse), "r2": float(r2)}'
        if is_regression
        else (
            "acc = accuracy_score(y_test, y_pred)\n"
            '    print(f"Accuracy : {acc:.4f}")\n'
            "    print(classification_report(y_test, y_pred))\n"
            '    return {"accuracy": float(acc)}'
        )
    )

    metric_imports = (
        "from sklearn.metrics import mean_squared_error, r2_score"
        if is_regression
        else "from sklearn.metrics import accuracy_score, classification_report"
    )

    numeric_list = repr(numeric_cols)
    categorical_list = repr(categorical_cols)

    return f'''"""
AI4ML Auto-generated Pipeline
Requirement: {nl_requirement}
Model: {selected_model}
Task type: {task_type}
{metric_comment}
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder, LabelEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
{model_import}
{metric_imports}
import joblib


# ── Configuration ──────────────────────────────────────────────────────────
DATA_PATH = "{file_path}"
NUMERIC_FEATURES  = {numeric_list}
CATEGORICAL_FEATURES = {categorical_list}
TEST_SIZE   = 0.2
RANDOM_STATE = 42


# ── Load data ──────────────────────────────────────────────────────────────
def load_data(path: str = DATA_PATH) -> pd.DataFrame:
    df = pd.read_csv(path)
    print(f"Loaded {{df.shape[0]}} rows × {{df.shape[1]}} cols")
    return df


# ── Build pre-processing pipeline ─────────────────────────────────────────
def build_preprocessor(numeric_features, categorical_features):
    numeric_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler",  StandardScaler()),
    ])
    categorical_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    preprocessor = ColumnTransformer([
        ("num", numeric_transformer,  numeric_features),
        ("cat", categorical_transformer, categorical_features),
    ])
    return preprocessor


# ── Build full pipeline ────────────────────────────────────────────────────
def build_pipeline():
    preprocessor = build_preprocessor(NUMERIC_FEATURES, CATEGORICAL_FEATURES)
    model = {model_class}({model_params})
    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("model", model),
    ])
    return pipeline


# ── Train & evaluate ───────────────────────────────────────────────────────
def train_and_evaluate(df: pd.DataFrame):
    target_col = df.columns[-1]
    X = df.drop(columns=[target_col])
    y = df[target_col]
{"" if is_regression else chr(10) + "    le = LabelEncoder()" + chr(10) + "    y = le.fit_transform(y.astype(str))"}
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE
    )

    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)

    {eval_code}


# ── Prediction function ────────────────────────────────────────────────────
def predict(pipeline, features: dict):
    """Run inference on a single sample.

    Args:
        pipeline: Fitted sklearn Pipeline returned by train_and_evaluate().
        features: Dict mapping feature name → value.

    Returns:
        Prediction value / class label.
    """
    import pandas as pd
    df = pd.DataFrame([features])
    prediction = pipeline.predict(df)
    return prediction[0]


# ── Main ───────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    df = load_data()
    metrics = train_and_evaluate(df)
    print("Final metrics:", metrics)
'''
