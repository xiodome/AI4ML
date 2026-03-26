import asyncio
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Callable, Coroutine, Dict, List, Optional


class BaseAgent(ABC):
    """Abstract base class for all ML pipeline agents."""

    def __init__(self, name: str):
        self.name = name
        self._log_callback: Optional[Callable[[Dict[str, Any]], Coroutine]] = None

    def set_log_callback(self, callback: Callable[[Dict[str, Any]], Coroutine]) -> None:
        self._log_callback = callback

    async def emit(self, message: str, log_type: str = "info", stage: str = "") -> None:
        entry: Dict[str, Any] = {
            "agent": self.name,
            "message": message,
            "log_type": log_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "stage": stage or self.name.lower().replace(" ", "_"),
        }
        if self._log_callback:
            await self._log_callback(entry)

    @abstractmethod
    async def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute agent logic. Receives shared context dict, returns updated context."""
        ...
