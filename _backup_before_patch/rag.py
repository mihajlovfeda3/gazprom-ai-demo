from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"


def load_json(filename: str) -> Any:
    """
    Загружает JSON-файл из папки data.
    """
    path = DATA_DIR / filename

    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


class RagLiteIndex:
    """
    Мини-RAG для демо.

    Что делает:
    1. Загружает courses.json и sources.json.
    2. Превращает курсы и источники в текстовые куски.
    3. Строит TF-IDF индекс.
    4. По вопросу пользователя возвращает top-k самых похожих материалов.
    """

    def __init__(self) -> None:
        self.courses = load_json("courses.json")
        self.sources = load_json("sources.json")
        self.chunks = self._build_chunks()

        self.vectorizer = TfidfVectorizer(
            lowercase=True,
            ngram_range=(1, 2),
        )

        self.texts = [chunk["text"] for chunk in self.chunks]
        self.matrix = self.vectorizer.fit_transform(self.texts)

    def _build_chunks(self) -> List[Dict[str, Any]]:
        chunks: List[Dict[str, Any]] = []

        for course in self.courses:
            skills = ", ".join(course.get("skills", []))

            text = (
                f"Курс: {course.get('title', '')}. "
                f"Навыки: {skills}. "
                f"Уровень: {course.get('level', '')}. "
                f"Формат: {course.get('format', '')}. "
                f"Длительность: {course.get('duration_hours', '')} часов. "
                f"Источник: {course.get('source', '')}. "
                f"Описание: {course.get('description', '')}"
            )

            chunks.append(
                {
                    "id": course.get("id"),
                    "kind": "course",
                    "title": course.get("title"),
                    "type": "Курс",
                    "text": text,
                    "raw": course,
                }
            )

        for source in self.sources:
            text = (
                f"Источник: {source.get('title', '')}. "
                f"Тип: {source.get('type', '')}. "
                f"Текст: {source.get('text', '')}"
            )

            chunks.append(
                {
                    "id": source.get("id"),
                    "kind": "source",
                    "title": source.get("title"),
                    "type": source.get("type"),
                    "text": text,
                    "raw": source,
                }
            )

        return chunks

    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Ищет самые релевантные куски по запросу.
        """

        if not query or not query.strip():
            return []

        query_vector = self.vectorizer.transform([query])
        scores = cosine_similarity(query_vector, self.matrix)[0]

        top_indices = scores.argsort()[::-1][:top_k]

        results: List[Dict[str, Any]] = []

        for index in top_indices:
            chunk = self.chunks[int(index)]
            score = float(scores[int(index)])

            if score <= 0:
                continue

            results.append(
                {
                    "id": chunk["id"],
                    "kind": chunk["kind"],
                    "title": chunk["title"],
                    "type": chunk["type"],
                    "text": chunk["text"],
                    "score": round(score, 4),
                    "raw": chunk["raw"],
                }
            )

        return results


rag_index = RagLiteIndex()


def search_knowledge(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Внешняя функция поиска, которую использует main.py.
    """
    return rag_index.search(query=query, top_k=top_k)


def get_rag_mode() -> str:
    """
    Возвращает режим RAG для /api/health.
    """
    return "tfidf-rag-lite"