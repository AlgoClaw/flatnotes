import json
import os
from typing import Any, Dict, Optional

from fastapi import HTTPException

from helpers import CustomBaseModel
from logger import logger

SETTINGS_DIR = "/config"
SETTINGS_FILE = os.path.join(SETTINGS_DIR, "settings.json")


class SettingsModel(CustomBaseModel):
    display_table_of_contents: bool = True
    site_title: str = "flatnotes"
    ctrl_s_saves_note: bool = False
    compact_header: bool = False
    wide_layout: bool = False
    hide_logo_mark: bool = False
    hide_logo_wordmark: bool = False
    hide_site_icon: bool = False
    compact_search_results: bool = False
    hide_search_tags: bool = False
    justify_note_text: bool = False
    standard_paragraph_spacing: bool = False
    bullet_list_spacing: bool = False
    numbered_list_spacing: bool = False


class SettingsUpdateModel(CustomBaseModel):
    display_table_of_contents: Optional[bool] = None
    site_title: Optional[str] = None
    ctrl_s_saves_note: Optional[bool] = None
    compact_header: Optional[bool] = None
    wide_layout: Optional[bool] = None
    hide_logo_mark: Optional[bool] = None
    hide_logo_wordmark: Optional[bool] = None
    hide_site_icon: Optional[bool] = None
    compact_search_results: Optional[bool] = None
    hide_search_tags: Optional[bool] = None
    justify_note_text: Optional[bool] = None
    standard_paragraph_spacing: Optional[bool] = None
    bullet_list_spacing: Optional[bool] = None
    numbered_list_spacing: Optional[bool] = None


class SettingsManager:
    def __init__(self, file_path: str = SETTINGS_FILE) -> None:
        self.file_path = file_path
        self._default = SettingsModel().model_dump(by_alias=False)
        self._ensure_file_exists()

    def load(self) -> SettingsModel:
        if not os.path.exists(self.file_path):
            self._write_file(self._default)
            return SettingsModel(**self._default)

        data = self._read_file()
        merged = {**self._default, **data}
        try:
            return SettingsModel(**merged)
        except ValueError as exc:
            logger.error("Invalid settings data. Reverting to defaults. %s", exc)
            self._write_file(self._default)
            return SettingsModel(**self._default)

    def save(self, updates: Dict[str, Any]) -> SettingsModel:
        current = self.load().model_dump(by_alias=False)
        merged = {**current, **updates}
        settings = SettingsModel(**merged)
        self._write_file(settings.model_dump(by_alias=False))
        return settings

    def _read_file(self) -> Dict[str, Any]:
        try:
            with open(self.file_path, "r", encoding="utf-8") as file:
                content = file.read().strip()
        except OSError as exc:
            logger.error("Unable to read settings file: %s", exc)
            raise HTTPException(
                status_code=500,
                detail="Unable to read settings file.",
            ) from exc

        if not content:
            return {}

        cleaned = self._strip_module_wrapper(content)

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as exc:
            logger.error("Invalid JSON in settings file: %s", exc)
            return {}

    def _strip_module_wrapper(self, content: str) -> str:
        cleaned = content
        if cleaned.startswith("module.exports"):
            cleaned = cleaned.split("=", 1)[1].strip()
        if cleaned.endswith(";"):
            cleaned = cleaned[:-1].strip()
        return cleaned

    def _write_file(self, data: Dict[str, Any]) -> None:
        os.makedirs(os.path.dirname(self.file_path), exist_ok=True)
        serialized = SettingsModel(**data).model_dump(by_alias=True)
        payload = json.dumps(serialized, indent=2, sort_keys=True) + "\n"
        try:
            with open(self.file_path, "w", encoding="utf-8") as file:
                file.write(payload)
        except OSError as exc:
            logger.error("Unable to write settings file: %s", exc)
            raise HTTPException(
                status_code=500,
                detail="Unable to write settings file.",
            ) from exc

    def _ensure_file_exists(self) -> None:
        if not os.path.exists(self.file_path):
            self._write_file(self._default)
