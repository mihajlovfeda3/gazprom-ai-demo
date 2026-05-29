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


def _build_materials_context(materials: List[Dict[str, Any]]) -> str:
    if not materials:
        return "No recommended internal materials were found."

    lines = []

    for material in materials[:6]:
        description = material.get("description") or material.get("text") or ""
        if len(description) > 400:
            description = description[:400] + "..."

        lines.append(
            "- "
            f"Title: {material.get('title', 'Untitled')}; "
            f"Type: {material.get('material_type_label', material.get('type', 'material'))}; "
            f"Source/provider: {material.get('provider', material.get('source', 'corporate knowledge base'))}; "
            f"Responsible: {material.get('responsible_label', 'not specified')}; "
            f"Actuality: {material.get('actuality_label', material.get('actuality_status', 'not specified'))}; "
            f"Match: {material.get('match_label', 'not specified')}; "
            f"Reason: {material.get('reason', '')}; "
            f"Description: {description}"
        )

    return "\n".join(lines)


def _build_required_material_titles_context(materials: List[Dict[str, Any]]) -> str:
    titles = [
        material.get("title", "Untitled")
        for material in materials[:3]
        if material.get("title")
    ]

    if not titles:
        return "No material titles available."

    return "; ".join(titles)


def _get_required_material_titles(materials: List[Dict[str, Any]]) -> List[str]:
    return [
        material.get("title", "Untitled")
        for material in materials[:3]
        if material.get("title")
    ]


def _format_titles_for_answer(titles: List[str]) -> str:
    quoted_titles = [f"«{title}»" for title in titles[:3]]

    if len(quoted_titles) <= 1:
        return quoted_titles[0] if quoted_titles else "найденный внутренний материал"

    if len(quoted_titles) == 2:
        return " и ".join(quoted_titles)

    return f"{quoted_titles[0]}, {quoted_titles[1]} и {quoted_titles[2]}"


def _build_constrained_material_answer(materials: List[Dict[str, Any]]) -> Optional[str]:
    titles = _get_required_material_titles(materials)

    if not titles:
        return None

    return (
        f"Для задачи подходят материалы {_format_titles_for_answer(titles)}. "
        "У этих материалов есть ответственные или владельцы, поэтому понятно, к кому обращаться за уточнением актуальности и применения. "
        "Агент не назначает обучение и не принимает решение, а только объясняет найденные внутренние материалы."
    )


def _is_material_answer_compliant(answer: str, materials: List[Dict[str, Any]]) -> bool:
    if "\n" in answer or re.search(r"(^|\n)\s*[-*0-9]+[.)-]?\s+", answer):
        return False

    sentences = [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?])\s+", answer.strip())
        if sentence.strip()
    ]

    if len(sentences) != 3:
        return False

    lower_answer = answer.lower()
    if "не назначает обучение" not in lower_answer or "не принимает решение" not in lower_answer:
        return False

    if "ответствен" not in lower_answer and "владельц" not in lower_answer:
        return False

    required_titles = _get_required_material_titles(materials)
    if len(required_titles) >= 2:
        mentioned_titles = sum(1 for title in required_titles if title in answer)
        if mentioned_titles < 2:
            return False

    return True


def _build_quality_alerts_context(quality_alerts: List[Dict[str, Any]]) -> str:
    if not quality_alerts:
        return "No quality alerts."

    lines = []

    for alert in quality_alerts[:6]:
        lines.append(
            "- "
            f"Material ID: {alert.get('material_id', 'not specified')}; "
            f"Status: {alert.get('status', 'not specified')}; "
            f"Message: {alert.get('message', '')}; "
            f"Owner action: {alert.get('owner_action', '')}"
        )

    return "\n".join(lines)


def _build_detected_topics_context(detected_topics: List[Any]) -> str:
    if not detected_topics:
        return "No topics detected."

    lines = []

    for topic in detected_topics:
        if isinstance(topic, dict):
            lines.append(
                "- "
                f"Topic: {topic.get('topic', 'not specified')}; "
                f"Title: {topic.get('title', 'not specified')}; "
                f"Reason: {topic.get('reason', '')}"
            )
        else:
            lines.append(f"- {topic}")

    return "\n".join(lines)


def generate_material_answer(
    query: str,
    detected_topics: List[Any],
    recommended_materials: List[Dict[str, Any]],
    quality_alerts: List[Dict[str, Any]],
    fallback_answer: str,
) -> Dict[str, Any]:
    """
    Generates a short explanation for material-agent using only deterministic results.

    The LLM is only a wording layer: it must not evaluate an employee, assign
    training, invent materials, or change the material selection.
    """

    system_prompt = (
        "Ты генеративный слой внутреннего агента подбора корпоративных материалов. "
        "Ты объясняешь только те материалы, которые уже найдены deterministic search/ranking. "
        "Нельзя оценивать сотрудника, строить skill gap, назначать обучение или принимать решение за пользователя/руководителя. "
        "Нельзя придумывать материалы, владельцев, ссылки, цены, провайдеров, даты или факты. "
        "Используй только provided recommended materials, detected topics, quality alerts и fallback draft. "
        "Назови ровно 2 или 3 материала из provided recommended materials. "
        "Обязательно дословно используй названия из блока Required material titles to name. "
        "Обязательно упомяни, что у материалов есть ответственные или владельцы. "
        "Обязательно используй фразу 'не назначает обучение'. "
        "Не упоминай внешние курсы и цены. "
        "Верни ровно один абзац из 3 предложений на русском языке. "
        "Предложение 1 должно назвать 2 или 3 материала. "
        "Предложение 2 должно сказать, что у этих материалов есть ответственные или владельцы. "
        "Предложение 2 обязательно начинается словами 'У этих материалов'. "
        "Предложение 3 должно сказать, что агент не назначает обучение и не принимает решение. "
        "Предложение 3 обязательно начинается словами 'Агент не назначает обучение'. "
        "Не объединяй предложения 1 и 2, не объединяй предложения 2 и 3. "
        "Запрещены markdown, списки, маркеры, нумерация, таблицы и переносы строк. "
        "Не выводи служебные метки вроде '1-е предложение', 'Предложение 1' или placeholders. "
        "Не показывай ход рассуждений и не добавляй вводные фразы."
    )

    prompt = f"""
User query:
{query}

Detected topics:
{_build_detected_topics_context(detected_topics)}

Recommended internal materials:
{_build_materials_context(recommended_materials)}

Required material titles to name:
{_build_required_material_titles_context(recommended_materials)}

Quality alerts:
{_build_quality_alerts_context(quality_alerts)}

Fallback draft answer:
{fallback_answer}

Сформулируй финальный ответ обычным абзацем без markdown, списков, нумерации, служебных меток и переносов строк. Не объединяй предложения: после названий материалов поставь точку, второе предложение начни словами "У этих материалов", третье предложение начни словами "Агент не назначает обучение". Структура смысла: сначала дословно назови 2-3 материала из Required material titles to name, затем скажи, что у них есть ответственные или владельцы, затем скажи, что агент не назначает обучение и не принимает решение, а только объясняет найденные внутренние материалы.
"""

    llm_answer = _call_ollama(
        prompt=prompt,
        system_prompt=system_prompt,
        timeout_sec=30,
    )

    if llm_answer:
        if not _is_material_answer_compliant(llm_answer, recommended_materials):
            constrained_answer = _build_constrained_material_answer(recommended_materials)

            if constrained_answer:
                return {
                    "answer": constrained_answer,
                    "answer_mode": "template_fallback",
                    "llm_model": None,
                }

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
