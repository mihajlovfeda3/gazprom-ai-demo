from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


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
    version="0.2.0",
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
        matched_skills = list(gap_skills.intersection(course_skills))

        if matched_skills:
            recommendations.append(
                {
                    "id": course["id"],
                    "title": course["title"],
                    "duration_hours": course["duration_hours"],
                    "format": course["format"],
                    "source": course["source"],
                    "matched_skills": [
                        get_skill_title(skill) for skill in matched_skills
                    ],
                    "reason": (
                        "Курс закрывает разрыв по навыкам: "
                        + ", ".join(get_skill_title(skill) for skill in matched_skills)
                        + "."
                    ),
                    "description": course["description"],
                }
            )

    recommendations.sort(key=lambda item: len(item["matched_skills"]), reverse=True)
    return recommendations[:4]


def get_demo_sources() -> List[Dict[str, Any]]:
    """
    Пока RAG еще не подключен, возвращаем главные источники для демо.
    Следующим шагом заменим это на настоящий поиск по sources/courses.
    """

    sources = load_json("sources.json")

    selected_sources = sources[:5]

    return [
        {
            "title": source["title"],
            "type": source["type"],
            "text": source["text"],
            "score": 1.0,
        }
        for source in selected_sources
    ]


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
        "version": "0.2.0",
    }


@app.post("/api/route-agent")
def route_agent(request: RouteAgentRequest) -> Dict[str, Any]:
    employee = find_employee(request.employee_id)
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
        f"Добавить курс «{course['title']}» в ИПР."
        for course in recommended_courses[:3]
    ]

    ipr_draft.append(
        "Согласовать обучение с руководителем, если курс требует рабочего времени или бюджета."
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
        "sources": get_demo_sources(),
        "summary": (
            f"Для перехода из роли «{request.current_role}» в «{request.target_role}» "
            f"системе нужно закрыть ключевые разрывы компетенций и добавить релевантные курсы в ИПР."
        ),
    }


@app.post("/api/knowledge-agent")
def knowledge_agent(request: KnowledgeAgentRequest) -> Dict[str, Any]:
    courses = load_json("courses.json")
    sources = get_demo_sources()

    related_courses = courses[:4]

    return {
        "status": "success",
        "agent": "Агент корпоративного знания",
        "question": request.question,
        "pipeline": get_pipeline(include_high_stakes=False),
        "answer": (
            "По найденным материалам система рекомендует начать с курсов по системному анализу, "
            "архитектурным основам и проектированию интеграций. "
            "Рекомендация сформирована на основе каталога курсов, матрицы компетенций и карьерного трека."
        ),
        "related_courses": [
            {
                "title": course["title"],
                "source": course["source"],
                "duration_hours": course["duration_hours"],
                "description": course["description"],
            }
            for course in related_courses
        ],
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