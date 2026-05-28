import { useState } from "react";
import {
  mockRouteResponse,
  mockKnowledgeResponse,
  mockManagerResponse
} from "./mockResponses";
import "./styles.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [screen, setScreen] = useState("landing");
  const [routeResult, setRouteResult] = useState(null);
  const [knowledgeResult, setKnowledgeResult] = useState(null);
  const [managerResult, setManagerResult] = useState(mockManagerResponse);
  const [routeLoading, setRouteLoading] = useState(false);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [managerStatus, setManagerStatus] = useState("Маршрут готов к согласованию");
  const [mode, setMode] = useState("demo");

  async function fetchRouteAgent() {
    setRouteLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/route-agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          current_role: "Middle системный аналитик",
          target_role: "Senior системный аналитик",
          employee_id: "emp_001"
        })
      });

      if (!response.ok) {
        throw new Error("Backend error");
      }

      const data = await response.json();
      setRouteResult(data);
      setMode("live backend");
    } catch (error) {
      console.warn("Backend unavailable, using mock route response");
      setRouteResult(mockRouteResponse);
      setMode("fallback demo");
    } finally {
      setTimeout(() => {
        setRouteLoading(false);
      }, 700);
    }
  }

  async function fetchKnowledgeAgent() {
    setKnowledgeLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/knowledge-agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: "Какие курсы помогут прокачать системный дизайн?"
        })
      });

      if (!response.ok) {
        throw new Error("Backend error");
      }

      const data = await response.json();
      setKnowledgeResult(data);
      setMode("live backend");
    } catch (error) {
      console.warn("Backend unavailable, using mock knowledge response");
      setKnowledgeResult(mockKnowledgeResponse);
      setMode("fallback demo");
    } finally {
      setTimeout(() => {
        setKnowledgeLoading(false);
      }, 700);
    }
  }

  async function fetchManagerAgent() {
    try {
      const response = await fetch(`${API_URL}/api/manager-agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          employee_id: "emp_001"
        })
      });

      if (!response.ok) {
        throw new Error("Backend error");
      }

      const data = await response.json();
      setManagerResult({
        ...mockManagerResponse,
        ...data
      });
      setMode("live backend");
    } catch (error) {
      console.warn("Backend unavailable, using mock manager response");
      setManagerResult(mockManagerResponse);
      setMode("fallback demo");
    }
  }

  function sendToManager() {
    fetchManagerAgent();
    setScreen("manager");
  }

  function updateManagerStatus(status) {
    setManagerStatus(status);
  }

  return (
    <div className="app">
      <Header screen={screen} setScreen={setScreen} mode={mode} />

      {screen === "landing" && <LandingScreen setScreen={setScreen} />}

      {screen === "route" && (
        <RouteAgentScreen
          routeResult={routeResult}
          routeLoading={routeLoading}
          fetchRouteAgent={fetchRouteAgent}
          sendToManager={sendToManager}
        />
      )}

      {screen === "knowledge" && (
        <KnowledgeAgentScreen
          knowledgeResult={knowledgeResult}
          knowledgeLoading={knowledgeLoading}
          fetchKnowledgeAgent={fetchKnowledgeAgent}
        />
      )}

      {screen === "manager" && (
        <ManagerScreen
          managerResult={managerResult}
          managerStatus={managerStatus}
          updateManagerStatus={updateManagerStatus}
        />
      )}
    </div>
  );
}

function Header({ screen, setScreen, mode }) {
  return (
    <header className="header">
      <div>
        <div className="logo">Gazprom AI T&amp;D</div>
        <div className="subtitle">RAG-lite demo prototype</div>
      </div>

      <nav className="nav">
        <button className={screen === "landing" ? "navButton active" : "navButton"} onClick={() => setScreen("landing")}>Лендинг</button>
        <button className={screen === "route" ? "navButton active" : "navButton"} onClick={() => setScreen("route")}>Маршрут</button>
        <button className={screen === "knowledge" ? "navButton active" : "navButton"} onClick={() => setScreen("knowledge")}>Знания</button>
        <button className={screen === "manager" ? "navButton active" : "navButton"} onClick={() => setScreen("manager")}>Руководитель</button>
      </nav>

      <div className="modeBadge">{mode}</div>
    </header>
  );
}

function LandingScreen({ setScreen }) {
  return (
    <main className="page">
      <section className="hero">
        <div className="heroText">
          <div className="eyebrow">AI-слой для обучения и развития</div>
          <h1>AI-карьерный слой для T&amp;D ИТ-кластера</h1>
          <p>
            Помогает сотруднику, руководителю и карьерному консультанту собрать
            маршрут развития на основе ролей, компетенций, курсов и ИПР.
          </p>

          <div className="heroActions">
            <button className="primaryButton" onClick={() => setScreen("route")}>Попробовать демо</button>
            <button className="secondaryButton" onClick={() => setScreen("knowledge")}>Задать вопрос агенту</button>
          </div>
        </div>

        <div className="heroPanel">
          <div className="pipelinePreview">
            <div>Пользователь</div>
            <span>→</span>
            <div>Агент</div>
            <span>→</span>
            <div>Источники</div>
            <span>→</span>
            <div>Маршрут</div>
          </div>
        </div>
      </section>

      <section className="agentGrid">
        <AgentCard title="Агент маршрута развития" text="Формирует путь от текущей роли к целевой позиции." button="Открыть сценарий" onClick={() => setScreen("route")} />
        <AgentCard title="Агент корпоративного знания" text="Ищет ответы по курсам, ролям, компетенциям и регламентам." button="Задать вопрос" onClick={() => setScreen("knowledge")} />
        <AgentCard title="Агент руководителя" text="Помогает согласовать обучение с учетом загрузки команды." button="Открыть экран" onClick={() => setScreen("manager")} />
      </section>
    </main>
  );
}

function AgentCard({ title, text, button, onClick }) {
  return (
    <div className="card agentCard">
      <h3>{title}</h3>
      <p>{text}</p>
      <button className="smallButton" onClick={onClick}>{button}</button>
    </div>
  );
}

function RouteAgentScreen({ routeResult, routeLoading, fetchRouteAgent, sendToManager }) {
  return (
    <main className="page">
      <section className="screenHeader">
        <div>
          <div className="eyebrow">Сценарий 1</div>
          <h2>Агент маршрута развития</h2>
          <p>
            Сотрудник выбирает текущую и целевую роль, а агент собирает маршрут
            развития с курсами, источниками и черновиком ИПР.
          </p>
        </div>
      </section>

      <section className="formCard card">
        <div className="fieldGrid">
          <div className="field">
            <label>Текущая роль</label>
            <div className="fakeInput">Middle системный аналитик</div>
          </div>
          <div className="field">
            <label>Целевая роль</label>
            <div className="fakeInput">Senior системный аналитик</div>
          </div>
        </div>

        <button className="primaryButton" onClick={fetchRouteAgent}>
          {routeLoading ? "Формируем маршрут..." : "Сформировать маршрут"}
        </button>
      </section>

      {routeLoading && <LoadingPipeline />}

      {routeResult && !routeLoading && (
        <section className="resultGrid">
          <PipelineBlock pipeline={routeResult.pipeline} />

          <div className="card">
            <h3>Разрыв компетенций</h3>
            <TagList items={routeResult.skill_gap} />
          </div>

          <div className="card largeCard">
            <h3>Рекомендованные курсы</h3>
            <CourseList courses={routeResult.recommended_courses} />
          </div>

          <div className="card largeCard">
            <h3>Черновик ИПР</h3>
            <NumberedList items={routeResult.ipr_draft} />
          </div>

          <div className="card">
            <h3>Источники</h3>
            <SourceList sources={routeResult.sources} />
          </div>

          <div className="card actionCard">
            <h3>Следующий шаг</h3>
            <p>Маршрут можно отправить руководителю для согласования обучения.</p>
            <button className="primaryButton" onClick={sendToManager}>Отправить руководителю</button>
          </div>
        </section>
      )}
    </main>
  );
}

function KnowledgeAgentScreen({ knowledgeResult, knowledgeLoading, fetchKnowledgeAgent }) {
  return (
    <main className="page">
      <section className="screenHeader">
        <div>
          <div className="eyebrow">Сценарий 2</div>
          <h2>Агент корпоративного знания</h2>
          <p>
            Пользователь задает вопрос, а агент ищет релевантные материалы и
            показывает ответ с источниками.
          </p>
        </div>
      </section>

      <section className="formCard card">
        <div className="field">
          <label>Вопрос</label>
          <div className="fakeInput">Какие курсы помогут прокачать системный дизайн?</div>
        </div>

        <button className="primaryButton" onClick={fetchKnowledgeAgent}>
          {knowledgeLoading ? "Ищем ответ..." : "Найти ответ"}
        </button>
      </section>

      {knowledgeLoading && <LoadingPipeline />}

      {knowledgeResult && !knowledgeLoading && (
        <section className="resultGrid">
          <PipelineBlock pipeline={knowledgeResult.pipeline} />

          <div className="card largeCard">
            <h3>Ответ агента</h3>
            <p className="answerText">{knowledgeResult.answer}</p>
          </div>

          <div className="card largeCard">
            <h3>Релевантные курсы</h3>
            <CourseList courses={knowledgeResult.related_courses} />
          </div>

          <div className="card">
            <h3>Источники</h3>
            <SourceList sources={knowledgeResult.sources} />
          </div>
        </section>
      )}
    </main>
  );
}

function ManagerScreen({ managerResult, managerStatus, updateManagerStatus }) {
  return (
    <main className="page">
      <section className="screenHeader">
        <div>
          <div className="eyebrow">Сценарий 3</div>
          <h2>Экран руководителя</h2>
          <p>
            Руководитель видит маршрут сотрудника, загрузку и рекомендацию по
            согласованию обучения.
          </p>
        </div>
      </section>

      <section className="managerLayout">
        <div className="card managerCard">
          <div className="employeeAvatar">ИП</div>
          <div>
            <h3>{managerResult.employee}</h3>
            <p>{managerResult.current_role} → {managerResult.target_role}</p>
          </div>

          <div className="statusBlock">
            <span>Статус</span>
            <strong>{managerStatus}</strong>
          </div>

          <div className="infoBlock">
            <span>Загрузка</span>
            <p>{managerResult.workload}</p>
          </div>

          <div className="infoBlock">
            <span>Рекомендация</span>
            <p>{managerResult.recommendation}</p>
          </div>

          <div className="buttonRow">
            <button className="primaryButton" onClick={() => updateManagerStatus("Согласовано")}>Согласовать</button>
            <button className="secondaryButton" onClick={() => updateManagerStatus("Требует корректировки")}>Скорректировать</button>
            <button className="dangerButton" onClick={() => updateManagerStatus("Отложено")}>Отложить</button>
          </div>
        </div>

        <div className="card">
          <h3>Что показывает этот экран</h3>
          <ul className="plainList">
            <li>Руководитель остается в контуре принятия решений.</li>
            <li>AI не согласует обучение автоматически.</li>
            <li>Система дает рекомендацию с учетом загрузки и целевой роли.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

function LoadingPipeline() {
  const steps = [
    "Запрос классифицирован",
    "Источники найдены",
    "Материалы отобраны",
    "Маршрут сформирован",
    "High-stakes проверка пройдена"
  ];

  return (
    <section className="card loadingCard">
      <h3>AI-пайплайн</h3>
      <div className="pipelineList">
        {steps.map((step) => (
          <div className="pipelineItem" key={step}>
            <span className="check">✓</span>
            <span>{step}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PipelineBlock({ pipeline = [] }) {
  return (
    <div className="card largeCard">
      <h3>AI-пайплайн</h3>
      <div className="pipelineList">
        {pipeline.map((item) => (
          <div className="pipelineItem" key={item.step}>
            <span className="check">✓</span>
            <div>
              <strong>{item.step}</strong>
              <p>{item.model}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TagList({ items = [] }) {
  return (
    <div className="tagList">
      {items.map((item) => (
        <span className="tag" key={item}>{item}</span>
      ))}
    </div>
  );
}

function CourseList({ courses = [] }) {
  return (
    <div className="courseList">
      {courses.map((course) => (
        <div className="courseItem" key={course.title}>
          <div>
            <strong>{course.title}</strong>
            <p>{course.reason}</p>
          </div>
          {course.duration_hours && <span className="hours">{course.duration_hours} ч</span>}
        </div>
      ))}
    </div>
  );
}

function NumberedList({ items = [] }) {
  return (
    <ol className="numberedList">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ol>
  );
}

function SourceList({ sources = [] }) {
  return (
    <div className="sourceList">
      {sources.map((source) => (
        <div className="sourceItem" key={source.title}>
          <strong>{source.title}</strong>
          <span>{source.type}</span>
        </div>
      ))}
    </div>
  );
}

export default App;
