from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional


OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:0.6b")
USE_LOCAL_LLM = os.getenv("USE_LOCAL_LLM", "true").lower() in {
    "1",
    "true",
    "yes",
    "on",
}


def _cleanup_llm_text(text: str) -> str:
    """
    Убирает thinking-блоки и служебный мусор, если модель их вернула.
    """

    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"(?is)thinking\.\.\..*?done thinking\.?", "", text)
    text = text.replace("\r", "").strip()
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _call_ollama(
    prompt: str,
    system_prompt: str,
    timeout_sec: int = 30,
) -> Optional[str]:
    """
    Вызывает локальную Ollama-модель через /api/chat.

    Почему chat, а не generate:
    у Qwen thinking-моделей /api/generate может вернуть reasoning в поле thinking
    и пустой response. /api/chat с think=False стабильнее для коротких ответов.
    """

    if not USE_LOCAL_LLM:
        return None

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": "/no_think\n" + prompt,
            },
        ],
        "stream": False,
        "think": False,
        "options": {
            "temperature": 0.2,
            "num_predict": 220,
        },
    }

    request = urllib.request.Request(
        url=f"{OLLAMA_BASE_URL}/api/chat",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout_sec) as response:
            raw_body = response.read().decode("utf-8")
            data = json.loads(raw_body)

        message = data.get("message", {})
        answer = message.get("content", "")

        # fallback на случай, если Ollama вернет другой формат
        if not answer:
            answer = data.get("response", "")

        answer = _cleanup_llm_text(answer)

        if not answer:
            return None

        return answer

    except Exception:
        return None


def _build_courses_context(related_courses: List[Dict[str, Any]]) -> str:
    if not related_courses:
        return "Курсы не найдены."

    lines = []

    for course in related_courses[:4]:
        lines.append(
            "- "
            f"Название: {course.get('title', 'Без названия')}; "
            f"Тип: {course.get('course_type_label', course.get('course_type', 'не указан'))}; "
            f"Провайдер: {course.get('provider', 'не указан')}; "
            f"Длительность: {course.get('duration_hours', 'не указана')} часов; "
            f"Цена: {course.get('price_label', 'не указана')}; "
            f"Согласование: {course.get('approval_label', 'не указано')}; "
            f"Описание: {course.get('description', '')}"
        )

    return "\n".join(lines)


def _build_sources_context(sources: List[Dict[str, Any]]) -> str:
    if not sources:
        return "Источники не найдены."

    lines = []

    for source in sources[:5]:
        text = source.get("text", "")

        if len(text) > 500:
            text = text[:500] + "..."

        lines.append(
            "- "
            f"Название: {source.get('title', 'Без названия')}; "
            f"Тип: {source.get('type', 'не указан')}; "
            f"Текст: {text}"
        )

    return "\n".join(lines)


def generate_knowledge_answer(
    question: str,
    related_courses: List[Dict[str, Any]],
    sources: List[Dict[str, Any]],
    fallback_answer: str,
) -> Dict[str, Any]:
    """
    Генерирует красивый ответ для knowledge-agent.

    Важно:
    - LLM не выбирает курсы.
    - LLM не меняет источники.
    - LLM не должна придумывать факты.
    - Если LLM недоступна, возвращается fallback_answer.
    """

    system_prompt = (
        "Ты генеративный слой демо-платформы корпоративного T&D для ИТ-кластера. "
        "ИПР означает индивидуальный план развития сотрудника. "
        "Твоя задача — НЕ выбирать курсы, а аккуратно переформулировать готовый черновик ответа. "
        "Используй только данные из черновика, найденных курсов и источников. "
        "Нельзя придумывать новые курсы, цены, регламенты, источники или факты. "
        "Нельзя обещать автоматическое согласование. "
        "Ответ должен быть на русском языке, деловым и понятным. "
        "Напиши один связный абзац из 3 предложений. "
        "Обязательно дословно назови найденные курсы. "
        "Обязательно упомяни цену и необходимость согласования для внешнего обучения. "
        "Не используй нумерацию, списки, markdown и таблицы. "
        "Не показывай ход рассуждений."
    )

    course_titles = ", ".join(
        f"«{course.get('title', 'Без названия')}»"
        for course in related_courses[:2]
    )

    course_details = "; ".join(
        f"{course.get('title', 'Без названия')} — {course.get('price_label', 'цена не указана')}, "
        f"{course.get('approval_label', 'согласование не указано')}"
        for course in related_courses[:2]
    )

    draft_answer = (
        f"По запросу пользователя можно рекомендовать курсы {course_titles}. "
        f"Они помогают развить системный дизайн, проектирование API, интеграционные паттерны "
        f"и архитектурное мышление. "
        f"Так как это внешнее обучение ({course_details}), его нужно согласовать с руководителем, "
        f"если затрагиваются бюджет или рабочее время."
    )

    prompt = f"""
Вопрос пользователя:
{question}

Готовый черновик ответа, который нужно улучшить, но не менять по смыслу:
{draft_answer}

Найденные курсы:
{_build_courses_context(related_courses)}

Найденные источники:
{_build_sources_context(sources)}

Переформулируй черновик в один аккуратный деловой абзац из 3 предложений.
"""

    llm_answer = _call_ollama(
        prompt=prompt,
        system_prompt=system_prompt,
        timeout_sec=30,
    )

    if llm_answer:
        return {
            "answer": llm_answer,
            "answer_mode": "llm",
            "llm_model": OLLAMA_MODEL,
        }

    return {
        "answer": fallback_answer,
        "answer_mode": "template_fallback",
        "llm_model": None,
    }