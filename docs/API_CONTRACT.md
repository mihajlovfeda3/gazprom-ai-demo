# API Contract — Gazprom AI T&D Demo

Документ фиксирует контракт между backend и frontend. Frontend работает только с полями, описанными ниже, и не пытается выводить объекты целиком.

## Базовый URL

```txt
http://127.0.0.1:8000
```

## Общие правила для frontend

1. Backend возвращает поля в `snake_case`.
2. Нельзя ожидать `skillGap`, `recommendedCourses`, `iprDraft`.
3. Нельзя рендерить объект целиком: `{course}`, `{skill}`, `{source}`, `{managerData.employee}`.
4. Нужно выводить конкретные поля: `course.title`, `skill.title`, `source.title`, `managerData.employee.name`.
5. Для fallback demo-mode можно использовать `frontend/src/mockResponses_for_frontend.js`.

---

## GET `/api/health`

### Response

```json
{
  "status": "ok",
  "message": "Backend работает",
  "version": "0.4.0",
  "rag_mode": "tfidf-rag-lite"
}
```

---

## GET `/api/debug/search?query=...`

Технический endpoint для проверки RAG-lite.

### Response

```json
{
  "status": "success",
  "query": "системный дизайн",
  "rag_mode": "tfidf-rag-lite",
  "results": []
}
```

`results` содержит объекты с полями:

| Поле | Тип | Комментарий |
|---|---:|---|
| `id` | string | ID курса или источника |
| `kind` | string | `course` или `source` |
| `title` | string | Название |
| `type` | string | Тип материала |
| `text` | string | Текстовый chunk, по которому искал RAG-lite |
| `score` | number | Релевантность |
| `raw` | object | Сырой объект. Во frontend напрямую не рендерить. |

---

## POST `/api/route-agent`

Формирует маршрут развития сотрудника.

### Request

```json
{
  "current_role": "Middle системный аналитик",
  "target_role": "Senior системный аналитик",
  "employee_id": "emp_001"
}
```

### Response: ключевые поля

```json
{
  "status": "success",
  "agent": "Агент маршрута развития",
  "employee": {
    "name": "Иван Петров",
    "current_role": "Middle системный аналитик",
    "target_role": "Senior системный аналитик",
    "workload": "Высокая загрузка ближайшие 2 недели"
  },
  "pipeline": [],
  "skill_gap": [],
  "recommended_courses": [],
  "ipr_draft": [],
  "sources": [],
  "summary": "..."
}
```

### `skill_gap[]`

| Поле | Тип | Комментарий |
|---|---:|---|
| `skill` | string | Технический код навыка |
| `title` | string | Человекочитаемое название |
| `current_level` | number | Текущий уровень |
| `target_level` | number | Целевой уровень |
| `gap` | number | Разрыв |

### `recommended_courses[]`

| Поле | Тип | Комментарий |
|---|---:|---|
| `id` | string | ID курса |
| `title` | string | Название курса |
| `skills` | array | Коды навыков |
| `level` | string | Уровень |
| `duration_hours` | number | Длительность |
| `format` | string | Формат прохождения: `online`, `workshop`, `blended`, `external_online` |
| `source` | string | Внутренний источник или внешний источник |
| `provider` | string | Провайдер курса |
| `url` | string | Ссылка для клика по карточке |
| `course_type` | string | `internal` или `external` |
| `course_type_label` | string | Бейдж для UI |
| `requires_approval` | boolean | Требует ли согласования |
| `approval_label` | string | Бейдж для UI |
| `price_rub` | number | Стоимость в рублях |
| `price_label` | string | Текст цены для UI |
| `description` | string | Описание курса |
| `matched_skills` | array | Какие навыки закрывает курс |
| `matched_skills_count` | number | Количество совпавших навыков |
| `reason` | string | Почему курс рекомендован |

### Как рендерить карточку курса

```jsx
<a href={course.url} target="_blank" rel="noreferrer">
  <h3>{course.title}</h3>
  <p>{course.description}</p>
  <span>{course.course_type_label}</span>
  <span>{course.provider}</span>
  <span>{course.approval_label}</span>
  <span>{course.price_label}</span>
  <span>{course.duration_hours} ч.</span>
</a>
```

---

## POST `/api/knowledge-agent`

Свободный поиск по базе знаний и курсам.

### Request

```json
{
  "question": "Какие курсы помогут прокачать системный дизайн?"
}
```

### Response

```json
{
  "status": "success",
  "agent": "Агент корпоративного знания",
  "question": "Какие курсы помогут прокачать системный дизайн?",
  "pipeline": [],
  "answer": "...",
  "related_courses": [],
  "sources": []
}
```

`related_courses[]` использует тот же формат, что `recommended_courses[]`, но дополнительно содержит `score`.

---

## POST `/api/manager-agent`

Показывает экран руководителя для согласования маршрута.

### Request

```json
{
  "employee_id": "emp_001"
}
```

### Response

```json
{
  "status": "success",
  "agent": "Агент руководителя",
  "manager": {
    "id": "mgr_001",
    "name": "Мария Кузнецова",
    "role": "Руководитель отдела системного анализа"
  },
  "employee": {
    "employee_id": "emp_001",
    "name": "Иван Петров",
    "current_role": "Middle системный аналитик",
    "target_role": "Senior системный аналитик",
    "route_status": "Маршрут готов к согласованию",
    "workload": "Высокая загрузка ближайшие 2 недели",
    "recommendation": "Согласовать обучение с началом через 3 недели"
  },
  "pipeline": [],
  "decision_options": ["Согласовать", "Скорректировать", "Отложить"]
}
```

---

## Demo flow для frontend

1. Вызвать `/api/route-agent`.
2. Показать `employee`, `skill_gap`, `recommended_courses`, `ipr_draft`, `sources`.
3. По кнопке “Отправить руководителю” вызвать `/api/manager-agent`.
4. Показать `manager`, `employee`, `decision_options`.
5. В свободном поиске вызвать `/api/knowledge-agent`.
6. Показать `answer`, `related_courses`, `sources`.
