from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rag import get_rag_mode, search_knowledge
from llm import generate_knowledge_answer, generate_material_answer


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"


def load_json(filename: str) -> Any:
    """
    Загружает JSON-файл из папки data.
    """
    path = DATA_DIR / filename

    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


app = FastAPI(
    title="Gazprom AI T&D Demo Backend",
    description="Демо backend для AI-карьерного слоя",
    version="0.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RouteAgentRequest(BaseModel):
    current_role: str
    target_role: str
    employee_id: Optional[str] = "emp_001"

class MaterialAgentRequest(BaseModel):
    query: str
    employee_id: Optional[str] = None

class KnowledgeAgentRequest(BaseModel):
    question: str


class ManagerAgentRequest(BaseModel):
    employee_id: str = "emp_001"


def get_pipeline(include_high_stakes: bool = True) -> List[Dict[str, str]]:
    """
    Возвращает демонстрационный AI-пайплайн.
    Это нужно, чтобы frontend мог красиво показать:
    запрос классифицирован → источники найдены → ответ сформирован.
    """

    pipeline = [
        {
            "step": "Классификация запроса",
            "model": "Ministral 3 14B",
            "status": "done",
            "description": "Определены тип запроса, текущая роль, целевая роль и нужные источники.",
        },
        {
            "step": "Поиск источников",
            "model": "Demo RAG-lite",
            "status": "done",
            "description": "Найдены релевантные курсы, матрицы компетенций и регламенты.",
        },
        {
            "step": "Отбор релевантного",
            "model": "Top-k retrieval",
            "status": "done",
            "description": "Выбраны наиболее подходящие материалы для ответа.",
        },
        {
            "step": "Формирование ответа",
            "model": "Mistral Small 4 в production / template generator в demo",
            "status": "done",
            "description": "Сформирован маршрут развития и черновик ИПР.",
        },
    ]

    if include_high_stakes:
        pipeline.append(
            {
                "step": "Проверка high-stakes",
                "model": "Mistral Medium 3.5 в production",
                "status": "done",
                "description": "В production-версии используется для руководительских и рискованных HR/T&D-сценариев.",
            }
        )

    return pipeline

def get_material_pipeline() -> List[Dict[str, str]]:
    """
    Pipeline для нового material-agent после pivot.
    Агент не оценивает сотрудника, не строит skill gap и не назначает обучение.
    """

    return [
        {
            "step": "Классификация запроса",
            "model": "Ministral 3 14B в production / rules in demo",
            "status": "done",
            "description": (
                "Определен тип запроса: поиск корпоративных материалов под рабочую задачу "
                "или цель развития."
            ),
        },
        {
            "step": "Выделение тем запроса",
            "model": "Router + topic extraction",
            "status": "done",
            "description": (
                "Из запроса выделены темы, например API design, интеграции, НМД, "
                "видео-материалы или архитектурные практики."
            ),
        },
        {
            "step": "Поиск по корпоративной базе знаний",
            "model": "Corporate RAG в production / TF-IDF RAG-lite in demo",
            "status": "done",
            "description": (
                "Найдены внутренние курсы, НМД, методички, документы и видео-транскрипты "
                "из проверяемых корпоративных источников."
            ),
        },
        {
            "step": "Ранжирование материалов",
            "model": "Embedding + reranker в production / top-k retrieval in demo",
            "status": "done",
            "description": (
                "Материалы отсортированы по степени совпадения с задачей пользователя, "
                "а не по предполагаемой оценке сотрудника."
            ),
        },
        {
            "step": "Проверка владельца и актуальности",
            "model": "Rules + metadata validation",
            "status": "done",
            "description": (
                "Для каждого материала показаны ответственный, статус актуальности "
                "и предупреждения, если материал требует проверки."
            ),
        },
        {
            "step": "Формирование объяснения",
            "model": "Mistral Small 4 в production / template or Qwen in demo",
            "status": "done",
            "description": (
                "Сформировано объяснение, почему материалы подходят под задачу. "
                "Агент не назначает обучение и не принимает решений за человека."
            ),
        },
    ]

def find_role(role_name: str) -> Optional[Dict[str, Any]]:
    roles = load_json("roles.json")

    for role in roles:
        if role["role"].lower() == role_name.lower():
            return role

    return None


def find_employee(employee_id: str) -> Optional[Dict[str, Any]]:
    employees = load_json("employees.json")

    for employee in employees:
        if employee["id"] == employee_id:
            return employee

    return None


def get_skill_title(skill: str) -> str:
    """
    Переводим технические названия навыков в нормальные русские названия.
    """

    titles = {
        "requirements_management": "Управление требованиями",
        "system_design": "Системный дизайн",
        "business_communication": "Коммуникация с бизнес-заказчиком",
        "architecture_basics": "Архитектурные основы",
        "integration_design": "Проектирование интеграций",
        "stakeholder_management": "Работа со стейкхолдерами",
        "api_design": "Проектирование API",
        "business_analysis": "Бизнес-анализ",
        "process_modeling": "Моделирование процессов",
        "sql": "SQL",
        "data_analysis": "Анализ данных",
        "product_thinking": "Продуктовое мышление",
        "business_value": "Бизнес-ценность",
        "prioritization": "Приоритизация",
    }

    return titles.get(skill, skill)

def get_course_responsible(course: Dict[str, Any]) -> Dict[str, str]:
    """
    Возвращает ответственного за курс для демо-карточки.

    В production это будет владелец курса / методолог / L&D-координатор
    из LMS, карьерного портала или системы заявок на внешнее обучение.
    """

    if course.get("responsible_label"):
        return {
            "responsible_name": course.get("responsible_name", ""),
            "responsible_role": course.get("responsible_role", ""),
            "responsible_unit": course.get("responsible_unit", ""),
            "responsible_label": course.get("responsible_label", ""),
        }

    course_type = course.get("course_type", "internal")
    source = course.get("source", "")

    if course_type == "external":
        return {
            "responsible_name": "Елена Морозова",
            "responsible_role": "L&D-координатор внешнего обучения",
            "responsible_unit": "Корпоративный университет",
            "responsible_label": "Елена Морозова — L&D-координатор внешнего обучения",
        }

    if source == "Карьерный портал":
        return {
            "responsible_name": "Алексей Романов",
            "responsible_role": "карьерный консультант ИТ-кластера",
            "responsible_unit": "Карьерный портал",
            "responsible_label": "Алексей Романов — карьерный консультант ИТ-кластера",
        }

    return {
        "responsible_name": "Ирина Соколова",
        "responsible_role": "методолог корпоративного обучения",
        "responsible_unit": "Портал знаний",
        "responsible_label": "Ирина Соколова — методолог корпоративного обучения",
    }

def format_price(price_rub: Optional[int]) -> str:
    """
    Возвращает короткий текст для карточки курса.
    """
    if price_rub is None or price_rub == 0:
        return "Бесплатно"

    return f"{price_rub:,}".replace(",", " ") + " ₽"


def format_course_type(course_type: str) -> str:
    """
    Человекочитаемый бейдж типа курса.
    """
    labels = {
        "internal": "Внутренний курс",
        "external": "Внешнее обучение",
    }
    return labels.get(course_type, course_type)


def get_course_responsible(course: Dict[str, Any]) -> Dict[str, str]:
    """
    Возвращает ответственного за курс для демо.

    В production это будет владелец курса / методолог / L&D-координатор
    из LMS, карьерного портала или системы заявок на внешнее обучение.
    """

    if course.get("responsible_label"):
        return {
            "responsible_name": course.get("responsible_name", ""),
            "responsible_role": course.get("responsible_role", ""),
            "responsible_unit": course.get("responsible_unit", ""),
            "responsible_label": course.get("responsible_label", ""),
        }

    course_type = course.get("course_type", "internal")
    source = course.get("source", "")

    if course_type == "external":
        return {
            "responsible_name": "Елена Морозова",
            "responsible_role": "L&D-координатор внешнего обучения",
            "responsible_unit": "Корпоративный университет",
            "responsible_label": "Елена Морозова — L&D-координатор внешнего обучения",
        }

    if source == "Карьерный портал":
        return {
            "responsible_name": "Алексей Романов",
            "responsible_role": "карьерный консультант ИТ-кластера",
            "responsible_unit": "Карьерный портал",
            "responsible_label": "Алексей Романов — карьерный консультант ИТ-кластера",
        }

    return {
        "responsible_name": "Ирина Соколова",
        "responsible_role": "методолог корпоративного обучения",
        "responsible_unit": "Портал знаний",
        "responsible_label": "Ирина Соколова — методолог корпоративного обучения",
    }


def build_course_payload(
    course: Dict[str, Any],
    matched_skills: Optional[List[str]] = None,
    score: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Собирает единую карточку курса для route-agent и knowledge-agent.
    """

    price_rub = course.get("price_rub", 0)
    requires_approval = course.get("requires_approval", False)
    course_type = course.get("course_type", "internal")
    responsible = get_course_responsible(course)

    payload = {
        "id": course.get("id"),
        "title": course.get("title"),
        "skills": course.get("skills", []),
        "level": course.get("level"),
        "duration_hours": course.get("duration_hours"),
        "format": course.get("format"),
        "source": course.get("source"),
        "provider": course.get("provider", "Демо-база"),
        "url": course.get("url", "#"),
        "course_type": course_type,
        "course_type_label": (
            "Внешнее обучение" if course_type == "external" else "Внутренний курс"
        ),
        "requires_approval": requires_approval,
        "approval_label": (
            "Требует согласования" if requires_approval else "Без согласования"
        ),
        "price_rub": price_rub,
        "price_label": (
            "Бесплатно" if not price_rub else f"{price_rub:,} ₽".replace(",", " ")
        ),
        "responsible_name": responsible["responsible_name"],
        "responsible_role": responsible["responsible_role"],
        "responsible_unit": responsible["responsible_unit"],
        "responsible_label": responsible["responsible_label"],
        "description": course.get("description", ""),
    }

    if matched_skills is not None:
        payload["matched_skills"] = matched_skills

    if score is not None:
        payload["score"] = score

    return payload

def infer_material_topics(query: str) -> List[Dict[str, str]]:
    """
    Выделяет темы запроса без оценки сотрудника.
    Это не skill gap, а просто темы, найденные в рабочей задаче / цели.
    """

    lower = query.lower()
    topics = []

    topic_rules = [
        ("api_design", "Проектирование API", ["api", "апи", "контракт"]),
        ("integration_design", "Интеграции", ["интеграц", "интеграцион", "шина", "обмен данными"]),
        ("system_design", "Системный дизайн", ["системн", "system design", "дизайн системы"]),
        ("architecture_basics", "Архитектурные основы", ["архитект", "архитектур"]),
        ("requirements_management", "Управление требованиями", ["требован", "requirements"]),
        ("nmd", "Нормативно-методические документы", ["нмд", "регламент", "норматив", "методич"]),
        ("video_learning", "Видеоматериалы и записи", ["видео", "запись", "вебинар", "лекци"]),
        ("career_materials", "Карьерные материалы", ["карьер", "роль", "трек", "развит"]),
    ]

    for topic, title, keywords in topic_rules:
        if any(keyword in lower for keyword in keywords):
            topics.append(
                {
                    "topic": topic,
                    "title": title,
                    "reason": "Тема найдена в запросе пользователя.",
                }
            )

    if not topics:
        topics.append(
            {
                "topic": "general_learning_request",
                "title": "Общий запрос на подбор материалов",
                "reason": "Запрос относится к поиску корпоративных знаний и материалов.",
            }
        )

    return topics


def expand_material_query(query: str) -> str:
    """
    Расширяет запрос для RAG-lite.
    В production это будет делать router / малая LLM.
    """

    lower = query.lower()
    expanded = query.strip()

    if "api" in lower or "апи" in lower:
        expanded += " api_design проектирование API контракты интеграции"

    if "интеграц" in lower:
        expanded += " integration_design интеграционные паттерны взаимодействие систем"

    if "системн" in lower or "system design" in lower:
        expanded += " system_design системный дизайн архитектура корпоративных систем"

    if "архитект" in lower:
        expanded += " architecture_basics архитектурные основы"

    if "нмд" in lower or "регламент" in lower:
        expanded += " НМД регламент нормативно методический документ"

    if "видео" in lower or "вебинар" in lower or "запись" in lower:
        expanded += " видео транскрипт запись вебинар лекция"

    return expanded


def get_material_responsible(material: Dict[str, Any]) -> Dict[str, str]:
    """
    Возвращает ответственного за материал.
    Для курса используем уже существующую get_course_responsible.
    Для документов/НМД/видео — демо-ответственные.
    """

    if material.get("responsible_label"):
        return {
            "responsible_name": material.get("responsible_name", ""),
            "responsible_role": material.get("responsible_role", ""),
            "responsible_unit": material.get("responsible_unit", ""),
            "responsible_label": material.get("responsible_label", ""),
        }

    material_type = material.get("type", "")
    source_type = material.get("source_type", "")

    if source_type == "video_transcript" or "видео" in material_type.lower():
        return {
            "responsible_name": "Елена Морозова",
            "responsible_role": "L&D-координатор видеоматериалов",
            "responsible_unit": "Корпоративный университет",
            "responsible_label": "Елена Морозова — L&D-координатор видеоматериалов",
        }

    if "нмд" in material_type.lower() or "регламент" in material_type.lower():
        return {
            "responsible_name": "Ирина Соколова",
            "responsible_role": "владелец методологии",
            "responsible_unit": "Центр компетенций",
            "responsible_label": "Ирина Соколова — владелец методологии",
        }

    if "карьер" in material_type.lower():
        return {
            "responsible_name": "Алексей Романов",
            "responsible_role": "карьерный консультант ИТ-кластера",
            "responsible_unit": "Карьерный портал",
            "responsible_label": "Алексей Романов — карьерный консультант ИТ-кластера",
        }

    return {
        "responsible_name": "Ирина Соколова",
        "responsible_role": "методолог корпоративного обучения",
        "responsible_unit": "Портал знаний",
        "responsible_label": "Ирина Соколова — методолог корпоративного обучения",
    }


def get_actuality_payload(material: Dict[str, Any]) -> Dict[str, str]:
    """
    Возвращает статус актуальности материала.
    В production статус будет приходить из LMS/НМД/портала знаний.
    """

    status = material.get("actuality_status", "actual")

    labels = {
        "actual": "Актуально",
        "needs_review": "Требует проверки",
        "outdated": "Устарело",
    }

    return {
        "actuality_status": status,
        "actuality_label": material.get("actuality_label", labels.get(status, "Актуально")),
        "last_reviewed_at": material.get("last_reviewed_at", "2026-05-01"),
        "valid_until": material.get("valid_until", "2026-12-31"),
    }


def build_material_payload_from_search_item(
    item: Dict[str, Any],
    rank_index: int,
) -> Dict[str, Any]:
    """
    Собирает единую карточку материала.
    Материалом может быть курс, документ, НМД, видео-транскрипт, карьерный материал.
    """

    kind = item.get("kind")
    raw = item.get("raw", {})
    score = item.get("score")

    if kind == "course":
        payload = build_course_payload(
            course=raw,
            matched_skills=None,
            score=score,
        )

        payload["material_type"] = "course"
        payload["material_type_label"] = "Курс"

        # После pivot в material-agent не показываем цены:
        # фокус не на бюджете внешнего обучения, а на поиске внутренних материалов.
        payload.pop("price_rub", None)
        payload.pop("price_label", None)

        # На всякий случай убираем внешние поля, если они не нужны UI.
        payload.pop("course_type_label", None)

    else:
        responsible = get_material_responsible(raw)
        actuality = get_actuality_payload(raw)

        payload = {
            "id": raw.get("id", item.get("id")),
            "title": raw.get("title", item.get("title")),
            "material_type": raw.get("source_type", "document"),
            "material_type_label": raw.get("type", item.get("type", "Материал")),
            "type": raw.get("type", item.get("type")),
            "source": raw.get("source", "Корпоративная база знаний"),
            "provider": raw.get("provider", raw.get("source", "Корпоративная база знаний")),
            "url": raw.get("url", "#"),
            "description": raw.get("description", raw.get("text", ""))[:500],
            "text": raw.get("text", item.get("text", "")),
            "score": score,
            "responsible_name": responsible["responsible_name"],
            "responsible_role": responsible["responsible_role"],
            "responsible_unit": responsible["responsible_unit"],
            "responsible_label": responsible["responsible_label"],
            "actuality_status": actuality["actuality_status"],
            "actuality_label": actuality["actuality_label"],
            "last_reviewed_at": actuality["last_reviewed_at"],
            "valid_until": actuality["valid_until"],
            "transcript_status": raw.get("transcript_status"),
            "video_duration_min": raw.get("video_duration_min"),
        }

    # Для демо даем понятный процент совпадения по рангу, а не сырой TF-IDF score.
    payload["match_percent"] = max(60, 92 - rank_index * 5)
    payload["match_label"] = f"{payload['match_percent']}% совпадения"

    payload["reason"] = (
        "Материал рекомендован, потому что совпадает с темами запроса "
        "и найден в корпоративной базе знаний."
    )

    return payload


def build_quality_alerts(materials: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """
    Демо-контур проверки качества базы знаний.
    Показывает, что система отслеживает актуальность материалов.
    """

    alerts = []

    for material in materials:
        if material.get("actuality_status") == "needs_review":
            alerts.append(
                {
                    "material_id": material.get("id"),
                    "status": "warning",
                    "message": "Материал требует проверки актуальности владельцем.",
                    "owner_action": "Отправить владельцу материала на валидацию.",
                }
            )

        if material.get("actuality_status") == "outdated":
            alerts.append(
                {
                    "material_id": material.get("id"),
                    "status": "critical",
                    "message": "Материал помечен как устаревший и не должен быть основой рекомендации.",
                    "owner_action": "Обновить материал или исключить из выдачи.",
                }
            )

        if material.get("material_type") == "video_transcript" and material.get("transcript_status") == "draft":
            alerts.append(
                {
                    "material_id": material.get("id"),
                    "status": "warning",
                    "message": "Видео-транскрипт распознан, но еще не подтвержден владельцем.",
                    "owner_action": "Проверить расшифровку и подтвердить актуальность.",
                }
            )

    return alerts

def calculate_skill_gap(
    current_skills: Dict[str, int],
    target_skills: Dict[str, int],
) -> List[Dict[str, Any]]:
    """
    Сравнивает текущие навыки сотрудника с требованиями целевой роли.
    Если уровень ниже целевого — добавляет навык в gap.
    """

    gap = []

    for skill, target_level in target_skills.items():
        current_level = current_skills.get(skill, 0)

        if current_level < target_level:
            gap.append(
                {
                    "skill": skill,
                    "title": get_skill_title(skill),
                    "current_level": current_level,
                    "target_level": target_level,
                    "gap": target_level - current_level,
                }
            )

    gap.sort(key=lambda item: item["gap"], reverse=True)
    return gap


def recommend_courses_by_gap(skill_gap: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Подбирает курсы по навыкам, которые попали в разрыв компетенций.
    """

    courses = load_json("courses.json")
    gap_skills = {item["skill"] for item in skill_gap}

    recommendations = []

    for course in courses:
        course_skills = set(course.get("skills", []))
        matched_skill_codes = list(gap_skills.intersection(course_skills))

        if matched_skill_codes:
            matched_skills = [get_skill_title(skill) for skill in matched_skill_codes]
            payload = build_course_payload(
                course=course,
                matched_skills=matched_skills,
            )
            payload["reason"] = (
                "Курс закрывает разрыв по навыкам: "
                + ", ".join(matched_skills)
                + "."
            )
            payload["matched_skills_count"] = len(matched_skills)
            recommendations.append(payload)

    recommendations.sort(
        key=lambda item: (
            item["matched_skills_count"],
            item.get("duration_hours") or 0,
        ),
        reverse=True,
    )
    return recommendations[:4]


def get_rag_sources(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Возвращает релевантные источники через RAG-lite поиск.
    """

    results = search_knowledge(query=query, top_k=top_k)

    sources = []

    for item in results:
        raw = item.get("raw", {})
        sources.append(
            {
                "id": item.get("id"),
                "title": item.get("title"),
                "type": item.get("type"),
                "score": item.get("score"),
                "text": item.get("text"),
                "kind": item.get("kind"),
                "source": raw.get("source"),
                "provider": raw.get("provider"),
                "url": raw.get("url"),
                "course_type": raw.get("course_type"),
            }
        )

    return sources


def build_knowledge_answer(question: str, related_courses: List[Dict[str, Any]]) -> str:
    """
    Demo-ответ без настоящей LLM: формируем понятный текст из найденных курсов.
    """
    if not related_courses:
        return (
            "В демо-базе не найдено точного курса под этот запрос. "
            "Можно уточнить роль, навык или направление развития, например: системный дизайн, "
            "интеграции, API, управление требованиями или коммуникация с бизнес-заказчиком."
        )

    course_titles = ", ".join(f"«{course['title']}»" for course in related_courses[:3])

    return (
        f"По запросу «{question}» система нашла релевантные материалы в каталоге обучения. "
        f"В первую очередь можно рассмотреть: {course_titles}. "
        "Рекомендация сформирована на основе демо-каталога курсов, матрицы компетенций и карьерных материалов. "
        "Курсы, требующие бюджета или рабочего времени, должны быть согласованы с руководителем."
    )


@app.get("/")
def root() -> Dict[str, Any]:
    return {
        "message": "Gazprom AI T&D Demo Backend",
        "docs": "Open /docs to test API",
    }


@app.get("/api/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "message": "Backend работает",
        "version": "0.4.0",
        "rag_mode": get_rag_mode(),
    }


@app.get("/api/debug/search")
def debug_search(query: str) -> Dict[str, Any]:
    results = search_knowledge(query=query, top_k=5)

    return {
        "status": "success",
        "query": query,
        "rag_mode": get_rag_mode(),
        "results": results,
    }


@app.post("/api/route-agent")
def route_agent(request: RouteAgentRequest) -> Dict[str, Any]:
    employee = find_employee(request.employee_id or "emp_001")
    current_role = find_role(request.current_role)
    target_role = find_role(request.target_role)

    if not target_role:
        return {
            "status": "error",
            "message": f"Целевая роль не найдена: {request.target_role}",
        }

    if employee and employee.get("current_role") == request.current_role:
        current_skills = employee["skills"]
        employee_name = employee["name"]
        workload = employee["workload"]
    elif current_role:
        current_skills = current_role["skills"]
        employee_name = "Демо-сотрудник"
        workload = "Загрузка не указана"
    else:
        current_skills = {}
        employee_name = "Демо-сотрудник"
        workload = "Загрузка не указана"

    skill_gap = calculate_skill_gap(
        current_skills=current_skills,
        target_skills=target_role["skills"],
    )

    recommended_courses = recommend_courses_by_gap(skill_gap)

    ipr_draft = [
        (
            f"Добавить курс «{course['title']}» в ИПР "
            f"({course['course_type_label'].lower()}, {course['price_label'].lower()}, "
            f"{course['approval_label'].lower()})."
        )
        for course in recommended_courses[:3]
    ]

    ipr_draft.append(
        "Согласовать обучение с руководителем, если курс требует рабочего времени или бюджета."
    )

    query = (
        f"{request.current_role} перейти в {request.target_role}. "
        f"Какие компетенции, курсы, карьерный трек и регламенты нужны?"
    )

    return {
        "status": "success",
        "agent": "Агент маршрута развития",
        "employee": {
            "name": employee_name,
            "current_role": request.current_role,
            "target_role": request.target_role,
            "workload": workload,
        },
        "pipeline": get_pipeline(include_high_stakes=True),
        "skill_gap": skill_gap,
        "recommended_courses": recommended_courses,
        "ipr_draft": ipr_draft,
        "sources": get_rag_sources(query=query, top_k=5),
        "summary": (
            f"Для перехода из роли «{request.current_role}» в «{request.target_role}» "
            f"системе нужно закрыть ключевые разрывы компетенций и добавить релевантные курсы в ИПР. "
            f"Подбор учитывает тип курса, провайдера, стоимость и необходимость согласования."
        ),
    }
def expand_knowledge_query(question: str) -> str:
    """
    Расширяет пользовательский вопрос для RAG-lite.
    Нужно из-за того, что TF-IDF не понимает формы слов:
    'внешние' и 'внешнее' для него разные слова.
    """

    query = question.strip()
    lower = query.lower()

    if "внеш" in lower:
        query += " внешнее обучение external внешний провайдер платный бюджет согласование"

    if "платн" in lower or "бюджет" in lower or "стоим" in lower or "цен" in lower:
        query += " цена стоимость бюджет платный требует согласования external"

    if "системн" in lower or "system design" in lower:
        query += " system_design системный дизайн архитектура интеграции"

    if "интеграц" in lower or "api" in lower:
        query += " integration_design api_design интеграции API"

    if "архитект" in lower:
        query += " architecture_basics архитектурные основы"

    return query


def infer_query_skills(question: str) -> set[str]:
    """
    Определяет примерные навыки из вопроса.
    Это fallback на случай, если RAG-lite не поднял нужный курс в top-k.
    """

    lower = question.lower()
    skills = set()

    if "системн" in lower or "system design" in lower:
        skills.add("system_design")

    if "архитект" in lower:
        skills.add("architecture_basics")

    if "интеграц" in lower:
        skills.add("integration_design")

    if "api" in lower:
        skills.add("api_design")

    if "требован" in lower:
        skills.add("requirements_management")

    if "коммуникац" in lower or "заказчик" in lower:
        skills.add("business_communication")

    return skills

@app.post("/api/material-agent")
def material_agent(request: MaterialAgentRequest) -> Dict[str, Any]:
    """
    Новый безопасный агент после pivot:
    не оценивает сотрудника, не строит skill gap, не назначает обучение.
    Ищет и ранжирует проверенные внутренние материалы под задачу / цель.
    """

    import re

    query = request.query.strip()
    expanded_query = expand_material_query(query)
    detected_topics = infer_material_topics(query)

    search_results = search_knowledge(query=expanded_query, top_k=20)

    recommended_materials = []
    seen_ids = set()

    for item in search_results:
        raw = item.get("raw", {})
        kind = item.get("kind")

        # После pivot ядро material-agent работает только с внутренними
        # и проверяемыми корпоративными материалами.
        if kind == "course" and raw.get("course_type") == "external":
            continue

        material_id = raw.get("id", item.get("id"))

        if material_id in seen_ids:
            continue

        material_payload = build_material_payload_from_search_item(
            item=item,
            rank_index=len(recommended_materials),
        )

        # В новом material-agent цены не показываем.
        material_payload.pop("price_rub", None)
        material_payload.pop("price_label", None)

        recommended_materials.append(material_payload)
        seen_ids.add(material_id)

        if len(recommended_materials) >= 6:
            break

    quality_alerts = build_quality_alerts(recommended_materials)

    raw_sources = get_rag_sources(query=expanded_query, top_k=20)

    sources = []
    for source in raw_sources:
        # Убираем внешние курсы из источников нового material-agent.
        if source.get("course_type") == "external":
            continue

        cleaned_source = dict(source)
        cleaned_source.pop("price_rub", None)
        cleaned_source.pop("price_label", None)

        # Чистим текст источника от ценовых фраз.
        text = cleaned_source.get("text")
        if isinstance(text, str):
            text = re.sub(
                r"\s*Цена:\s*(бесплатно для сотрудника|стоимость\s+\d+\s+рублей)\.",
                "",
                text,
            )
            cleaned_source["text"] = text.strip()

        sources.append(cleaned_source)

        if len(sources) >= 5:
            break

    if recommended_materials:
        top_titles = ", ".join(
            f"«{material.get('title')}»"
            for material in recommended_materials[:3]
        )

        answer = (
            f"По запросу «{query}» система нашла релевантные внутренние материалы: "
            f"{top_titles}. Агент не оценивает сотрудника и не назначает обучение, "
            f"а показывает проверенные источники, владельцев материалов и степень совпадения с задачей."
        )
    else:
        answer = (
            f"По запросу «{query}» точных внутренних материалов в демо-базе не найдено. "
            f"В production-контуре запрос будет расширен по корпоративному RAG, включая документы, "
            f"НМД, курсы и видео-транскрипты."
        )

    draft_selection = [
        f"Добавить материал «{material.get('title')}» в подборку."
        for material in recommended_materials[:3]
    ]

    llm_result = generate_material_answer(
        query=query,
        detected_topics=detected_topics,
        recommended_materials=recommended_materials,
        quality_alerts=quality_alerts,
        fallback_answer=answer,
    )

    return {
        "status": "success",
        "agent": "Агент подбора материалов",
        "query": query,
        "pipeline": get_material_pipeline(),
        "detected_topics": detected_topics,
        "recommended_materials": recommended_materials,
        "draft_selection": draft_selection,
        "quality_alerts": quality_alerts,
        "sources": sources,
        "answer": llm_result["answer"],
        "answer_mode": llm_result["answer_mode"],
        "llm_model": llm_result["llm_model"],
        "summary": (
            "Система подбирает внутренние материалы под задачу пользователя на основе корпоративных источников. "
            "Она не делает выводов о квалификации сотрудника и не выполняет автономных действий."
        ),
    }
    

@app.post("/api/knowledge-agent")
def knowledge_agent(request: KnowledgeAgentRequest) -> Dict[str, Any]:
    courses = load_json("courses.json")

    question = request.question.strip()
    lower_question = question.lower()

    allowed_topics = [
        "курс",
        "обуч",
        "ипр",
        "развит",
        "компетен",
        "навык",
        "skill",
        "роль",
        "senior",
        "middle",
        "junior",
        "системн",
        "архитект",
        "api",
        "интеграц",
        "согласован",
        "руководител",
        "карьер",
        "трек",
        "онбординг",
        "адаптац",
    ]

    if not any(topic in lower_question for topic in allowed_topics):
        return {
            "status": "success",
            "agent": "Агент корпоративного знания",
            "question": question,
            "pipeline": get_pipeline(include_high_stakes=False),
            "answer": (
                "Я могу помочь с вопросами по обучению, ИПР, карьерным трекам, "
                "компетенциям, курсам и согласованию развития. Попробуйте задать вопрос "
                "про нужную роль, навык или направление обучения."
            ),
            "answer_mode": "guardrail",
            "llm_model": None,
            "related_courses": [],
            "sources": [],
        }
    expanded_query = expand_knowledge_query(question)

    wants_external = "внеш" in question.lower()
    query_skills = infer_query_skills(question)

    search_results = search_knowledge(query=expanded_query, top_k=20)
    sources = get_rag_sources(query=expanded_query, top_k=5)

    def course_to_card(course: Dict[str, Any], score: Optional[float] = None) -> Dict[str, Any]:
        price_rub = course.get("price_rub", 0)
        requires_approval = course.get("requires_approval", False)
        course_type = course.get("course_type", "internal")
        responsible = get_course_responsible(course)

        return {
            "id": course.get("id"),
            "title": course.get("title"),
            "skills": course.get("skills", []),
            "level": course.get("level"),
            "duration_hours": course.get("duration_hours"),
            "format": course.get("format"),
            "source": course.get("source"),
            "responsible_name": responsible["responsible_name"],
            "responsible_role": responsible["responsible_role"],
            "responsible_unit": responsible["responsible_unit"],
            "responsible_label": responsible["responsible_label"],
            "provider": course.get("provider", "Демо-база"),
            "url": course.get("url", "#"),
            "course_type": course_type,
            "course_type_label": (
                "Внешнее обучение" if course_type == "external" else "Внутренний курс"
            ),
            "requires_approval": requires_approval,
            "approval_label": (
                "Требует согласования" if requires_approval else "Без согласования"
            ),
            "price_rub": price_rub,
            "price_label": (
                "Бесплатно" if not price_rub else f"{price_rub:,} ₽".replace(",", " ")
            ),
            "description": course.get("description", ""),
            "score": score,
        }

    related_courses = []
    seen_course_ids = set()

    for item in search_results:
        if item["kind"] != "course":
            continue

        course = item["raw"]

        if wants_external and course.get("course_type") != "external":
            continue

        course_id = course.get("id")
        if course_id in seen_course_ids:
            continue

        related_courses.append(course_to_card(course=course, score=item["score"]))
        seen_course_ids.add(course_id)

        if len(related_courses) >= 4:
            break

    # Fallback: если пользователь явно спросил про внешнее обучение,
    # но RAG-lite не поднял внешние курсы в top-k, добираем их из каталога.
    if wants_external and len(related_courses) < 2:
        for course in courses:
            if course.get("course_type") != "external":
                continue

            course_id = course.get("id")
            if course_id in seen_course_ids:
                continue

            course_skills = set(course.get("skills", []))

            if query_skills and not query_skills.intersection(course_skills):
                continue

            related_courses.append(course_to_card(course=course, score=None))
            seen_course_ids.add(course_id)

            if len(related_courses) >= 4:
                break

    # Общий fallback: если курсы не нашлись вообще, показываем любые релевантные курсы из поиска.
    if not related_courses:
        for item in search_results:
            if item["kind"] != "course":
                continue

            course = item["raw"]
            course_id = course.get("id")

            if course_id in seen_course_ids:
                continue

            related_courses.append(course_to_card(course=course, score=item["score"]))
            seen_course_ids.add(course_id)

            if len(related_courses) >= 4:
                break

    if related_courses:
        course_titles = ", ".join(f"«{course['title']}»" for course in related_courses[:3])

        if wants_external:
            answer = (
                f"По запросу «{question}» система нашла внешние программы обучения: "
                f"{course_titles}. Такие курсы требуют согласования, если затрагивают бюджет "
                f"или рабочее время сотрудника."
            )
        else:
            answer = (
                f"По запросу «{question}» система нашла релевантные материалы и курсы: "
                f"{course_titles}. Рекомендация сформирована на основе демо-каталога курсов, "
                f"матрицы компетенций и карьерных материалов."
            )
    else:
        answer = (
            f"По запросу «{question}» в демо-базе не найдено точного курса. "
            f"В production-версии агент расширит поиск по корпоративному RAG и внешним провайдерам."
        )
    llm_result = generate_knowledge_answer(
        question=question,
        related_courses=related_courses,
        sources=sources,
        fallback_answer=answer,
    )
    return {
        "status": "success",
        "agent": "Агент корпоративного знания",
        "question": question,
        "pipeline": get_pipeline(include_high_stakes=False),
        "answer": llm_result["answer"],
        "answer_mode": llm_result["answer_mode"],
        "llm_model": llm_result["llm_model"],
        "related_courses": related_courses,
        "sources": sources,
    }


@app.post("/api/manager-agent")
def manager_agent(request: ManagerAgentRequest) -> Dict[str, Any]:
    manager_data = load_json("manager.json")
    team = manager_data["team"]

    employee_card = None

    for item in team:
        if item["employee_id"] == request.employee_id:
            employee_card = item
            break

    if not employee_card:
        return {
            "status": "error",
            "message": f"Сотрудник не найден: {request.employee_id}",
        }

    return {
        "status": "success",
        "agent": "Агент руководителя",
        "manager": manager_data["manager"],
        "employee": employee_card,
        "pipeline": [
            {
                "step": "Сбор контекста сотрудника",
                "model": "Ministral 3 14B",
                "status": "done",
            },
            {
                "step": "Проверка маршрута и загрузки",
                "model": "Mistral Medium 3.5 в production",
                "status": "done",
            },
            {
                "step": "Рекомендация руководителю",
                "model": "Mistral Small 4 в production / template generator в demo",
                "status": "done",
            },
        ],
        "decision_options": [
            "Согласовать",
            "Скорректировать",
            "Отложить",
        ],
    }
