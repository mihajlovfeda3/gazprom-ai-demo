# Test Requests

Use these requests to validate the backend after the pivot to `POST /api/material-agent`.

Run the backend from `backend/`:

```powershell
python -m uvicorn main:app --reload
```

If the project uses a virtual environment:

```powershell
.\venv\Scripts\python.exe -m uvicorn main:app --reload
```

## A. Health

```http
GET /api/health
```

Expected:

- `status = ok`

## B. Guardrail

```http
POST /api/material-agent
Content-Type: application/json
```

```json
{
  "query": "как дела квен",
  "employee_id": "emp_001"
}
```

Expected:

- `answer_mode = guardrail`
- `recommended_materials = []`
- `sources = []`
- `quality_alerts = []`
- retrieval is not executed
- LLM generation is not executed

## C. Main Scenario: API And Integrations

```http
POST /api/material-agent
Content-Type: application/json
```

```json
{
  "query": "Нужно разобраться, как описывать API и интеграции в проекте",
  "employee_id": "emp_001"
}
```

Expected:

- `status = success`
- `agent = Агент подбора материалов`
- `detected_topics` contains API and integrations
- `recommended_materials` is not empty
- at least one `video_transcript` material is present
- at least one NMD material is present
- at least one material has `responsible_label`
- at least one material has `match_label`
- at least one material has `actuality_label`
- `quality_alerts` may contain `warning`
- `answer_mode = llm` when Ollama is available
- `answer_mode = template_fallback` when Ollama is unavailable
- no external courses are returned
- `price_rub` and `price_label` are not returned

## D. NMD Request

```http
POST /api/material-agent
Content-Type: application/json
```

```json
{
  "query": "Где найти НМД по описанию API и интеграционных взаимодействий?",
  "employee_id": "emp_001"
}
```

Expected:

- `status = success`
- `recommended_materials` is not empty
- NMD-related materials are ranked highly
- `responsible_label` is present for returned materials
- `price_rub` and `price_label` are not returned

## E. Video Request

```http
POST /api/material-agent
Content-Type: application/json
```

```json
{
  "query": "Есть ли запись или вебинар про проектирование API?",
  "employee_id": "emp_001"
}
```

Expected:

- `status = success`
- `recommended_materials` is not empty
- video or webinar materials are returned
- video materials may include `transcript_status` and `video_duration_min`
- transcript-related `quality_alerts` may be present

## F. System Design Request

```http
POST /api/material-agent
Content-Type: application/json
```

```json
{
  "query": "Какие внутренние материалы помогут разобраться с системным дизайном?",
  "employee_id": "emp_001"
}
```

Expected:

- `status = success`
- `recommended_materials` is not empty
- materials are related to system design, architecture, or integrations
- external courses are not returned
- `price_rub` and `price_label` are not returned

## Optional Python Smoke Checks

From `backend/`:

```powershell
python -m py_compile llm.py main.py rag.py
```

Guardrail check:

```powershell
python -c "from fastapi.testclient import TestClient; from main import app; d=TestClient(app).post('/api/material-agent', json={'query':'как дела квен','employee_id':'emp_001'}).json(); print(d['answer_mode'], d['recommended_materials'], d['sources'], d['quality_alerts'])"
```

Main scenario check:

```powershell
python -c "from fastapi.testclient import TestClient; from main import app; d=TestClient(app).post('/api/material-agent', json={'query':'Нужно разобраться, как описывать API и интеграции в проекте','employee_id':'emp_001'}).json(); print(d['status'], d['answer_mode'], len(d['recommended_materials']), len(d['sources']))"
```
