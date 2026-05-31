# Деплой на VPS

Проект разворачивается на одном VPS с Ubuntu 22.04 или Ubuntu 24.04:

- Nginx отдает собранный React/Vite frontend.
- Nginx проксирует запросы `/api/*` в FastAPI на `127.0.0.1:8000`.
- FastAPI обращается к локальной Ollama на `127.0.0.1:11434`.
- Ollama использует локальную модель `qwen3:0.6b`.

Frontend по умолчанию использует относительные запросы `/api/...`, поэтому отдельный публичный адрес backend в production-конфигурации не требуется.

## 1. Подготовить сервер

Подключитесь к VPS и установите системные пакеты:

```bash
sudo apt update
sudo apt install -y git curl nginx python3 python3-venv python3-pip nodejs npm
```

Проверьте версии:

```bash
python3 --version
node --version
npm --version
nginx -v
```

Текущая версия Vite требует Node.js `^20.19.0` или `>=22.12.0`. Если установленная из системного репозитория версия Node.js старее, установите актуальную LTS-версию и повторно проверьте `node --version`:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version
```

## 2. Установить Ollama и модель Qwen

Установите Ollama:

```bash
curl -fsSL https://ollama.com/install.sh | sh
sudo systemctl enable --now ollama
```

Загрузите модель:

```bash
ollama pull qwen3:0.6b
ollama list
```

Проверьте сервис:

```bash
sudo systemctl status ollama --no-pager
curl http://127.0.0.1:11434/api/tags
```

## 3. Клонировать проект

Клонируйте репозиторий в `/opt/gazprom-ai-demo`:

```bash
sudo git clone https://github.com/mihajlovfeda3/gazprom-ai-demo.git /opt/gazprom-ai-demo
cd /opt/gazprom-ai-demo
sudo git checkout main
```

Для обновления уже установленного проекта:

```bash
cd /opt/gazprom-ai-demo
sudo git pull origin main
```

## 4. Настроить FastAPI backend

Создайте виртуальное окружение и установите зависимости:

```bash
cd /opt/gazprom-ai-demo/backend
sudo python3 -m venv venv
sudo ./venv/bin/python -m pip install --upgrade pip
sudo ./venv/bin/python -m pip install -r requirements.txt
```

Проверьте синтаксис:

```bash
cd /opt/gazprom-ai-demo
sudo ./backend/venv/bin/python -m py_compile backend/llm.py backend/main.py backend/rag.py
```

Установите systemd unit из шаблона:

```bash
sudo cp /opt/gazprom-ai-demo/deploy/gazprom-backend.service.example /etc/systemd/system/gazprom-backend.service
sudo systemctl daemon-reload
sudo systemctl enable --now gazprom-backend
sudo systemctl status gazprom-backend --no-pager
```

Проверьте backend напрямую:

```bash
curl http://127.0.0.1:8000/api/health
```

## 5. Собрать frontend

Production frontend вызывает backend через относительный путь `/api`. Пустое значение `VITE_API_BASE_URL` означает same-origin запрос через Nginx.

```bash
cd /opt/gazprom-ai-demo/frontend
sudo cp .env.production.example .env.production
sudo npm install
sudo npm run build
```

Скопируйте сборку в каталог Nginx:

```bash
sudo mkdir -p /var/www/gazprom-ai-demo
sudo rm -rf /var/www/gazprom-ai-demo/*
sudo cp -r /opt/gazprom-ai-demo/frontend/dist/. /var/www/gazprom-ai-demo/
```

Для локального запуска frontend с прямым обращением к backend можно создать `.env.local`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## 6. Настроить Nginx

Установите конфигурацию из шаблона:

```bash
sudo cp /opt/gazprom-ai-demo/deploy/nginx-gazprom-ai-demo.conf.example /etc/nginx/sites-available/gazprom-ai-demo
sudo ln -sfn /etc/nginx/sites-available/gazprom-ai-demo /etc/nginx/sites-enabled/gazprom-ai-demo
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Проверьте открытие frontend в браузере:

```text
http://SERVER_IP/
```

## 7. Проверить API через Nginx

Проверьте health endpoint:

```bash
curl http://127.0.0.1/api/health
```

Проверьте основной material-agent:

```bash
curl -X POST http://127.0.0.1/api/material-agent \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "Нужно разобраться, как описывать API и интеграции в проекте",
    "employee_id": "emp_001"
  }'
```

Ожидаемый результат:

- `status` равен `success`;
- `recommended_materials` не пустой;
- `answer_mode` равен `llm`, если Ollama и Qwen доступны;
- `llm_model` равен `qwen3:0.6b`, если ответ сформирован Qwen;
- при временной недоступности Ollama endpoint продолжает работать с `answer_mode: template_fallback`.

Проверьте guardrail:

```bash
curl -X POST http://127.0.0.1/api/material-agent \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "как дела квен",
    "employee_id": "emp_001"
  }'
```

Ожидаемый результат: `answer_mode` равен `guardrail`, а `recommended_materials` и `sources` пустые.

## 8. Диагностика

Статус сервисов:

```bash
sudo systemctl status gazprom-backend --no-pager
sudo systemctl status ollama --no-pager
sudo systemctl status nginx --no-pager
```

Последние логи:

```bash
sudo journalctl -u gazprom-backend -n 100 --no-pager
sudo journalctl -u ollama -n 100 --no-pager
sudo journalctl -u nginx -n 100 --no-pager
```

Проверка портов:

```bash
sudo ss -lntp | grep -E ':80|:8000|:11434'
```

Проверка Nginx:

```bash
sudo nginx -t
curl -I http://127.0.0.1/
curl http://127.0.0.1/api/health
```

Проверка Ollama:

```bash
curl http://127.0.0.1:11434/api/tags
ollama list
```

Если Qwen временно недоступна, material-agent должен продолжить работу в режиме `template_fallback`. Это штатный резервный сценарий.
