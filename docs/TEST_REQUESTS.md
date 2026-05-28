# Test Requests — Gazprom AI T&D Demo Backend

## 1. Запуск backend

```powershell
cd backend
.\venv\Scripts\python.exe -m uvicorn main:app --reload
```

Если `venv` еще нет:

```powershell
cd backend
py -3.12 -m venv venv
.\venv\Scripts\python.exe -m pip install --upgrade pip
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m uvicorn main:app --reload
```

---

## 2. Health check

Открыть в браузере:

```txt
http://127.0.0.1:8000/api/health
```

Ожидаемый результат:

```json
{
  "status": "ok",
  "message": "Backend работает",
  "version": "0.4.0",
  "rag_mode": "tfidf-rag-lite"
}
```

---

## 3. Debug RAG search

Открыть в браузере:

```txt
http://127.0.0.1:8000/api/debug/search?query=системный%20дизайн
```

Еще проверки:

```txt
http://127.0.0.1:8000/api/debug/search?query=внешнее%20обучение%20интеграции
http://127.0.0.1:8000/api/debug/search?query=курс%20требует%20согласования
http://127.0.0.1:8000/api/debug/search?query=API%20Design
```

---

## 4. Route agent через PowerShell

```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/api/route-agent" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"current_role":"Middle системный аналитик","target_role":"Senior системный аналитик","employee_id":"emp_001"}'
```

Что проверить в ответе:

- `status = success`
- `skill_gap` не пустой
- `recommended_courses` не пустой
- у курсов есть `provider`, `url`, `course_type`, `requires_approval`, `price_rub`, `price_label`
- `ipr_draft` не пустой
- `sources` не пустой

---

## 5. Knowledge agent через PowerShell

```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/api/knowledge-agent" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"question":"Какие внешние курсы помогут прокачать системный дизайн и интеграции?"}'
```

Еще вопросы для проверки свободного поиска:

```json
{"question":"Какие курсы требуют согласования руководителя?"}
{"question":"Что пройти для развития API и интеграционного проектирования?"}
{"question":"Какие внутренние курсы есть для системного аналитика?"}
{"question":"Как сформировать ИПР для перехода на Senior системного аналитика?"}
```

---

## 6. Manager agent через PowerShell

```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/api/manager-agent" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"employee_id":"emp_001"}'
```

Что проверить:

- `manager.name`
- `employee.name`
- `employee.workload`
- `employee.recommendation`
- `decision_options`

---

## 7. Проверка через Swagger UI

Открыть:

```txt
http://127.0.0.1:8000/docs
```

Дальше вручную протестировать:

1. `GET /api/health`
2. `GET /api/debug/search`
3. `POST /api/route-agent`
4. `POST /api/knowledge-agent`
5. `POST /api/manager-agent`
