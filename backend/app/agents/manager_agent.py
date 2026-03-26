import asyncio
import re
from typing import Any, Dict

from app.agents.base import BaseAgent


class ManagerAgent(BaseAgent):
    """Decomposes the user's natural-language requirement into an ordered list of sub-tasks."""

    def __init__(self):
        super().__init__("ManagerAgent")

    async def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        nl_requirement: str = context.get("nl_requirement", "")
        stage = "manager"

        await self.emit("Parsing user requirement...", "info", stage)
        await asyncio.sleep(1)

        # Heuristic task-type detection
        text = nl_requirement.lower()
        if any(kw in text for kw in ["classif", "categor", "predict class", "label"]):
            task_type = "classification"
        elif any(kw in text for kw in ["regress", "predict value", "forecast", "price", "amount"]):
            task_type = "regression"
        elif any(kw in text for kw in ["cluster", "segment", "group"]):
            task_type = "clustering"
        elif any(kw in text for kw in ["nlp", "text", "sentiment", "language"]):
            task_type = "nlp"
        else:
            task_type = "classification"

        await self.emit(f"Identified task type: {task_type}", "info", stage)
        await asyncio.sleep(1)

        await self.emit("Decomposing into sub-tasks...", "info", stage)
        await asyncio.sleep(1)

        sub_tasks = [
            "1. Data Analysis",
            "2. Feature Engineering",
            "3. Model Selection",
            "4. Training",
            "5. Evaluation",
        ]
        await self.emit(f"Sub-tasks: {sub_tasks}", "success", stage)

        context["task_type"] = task_type
        context["sub_tasks"] = sub_tasks
        return context
