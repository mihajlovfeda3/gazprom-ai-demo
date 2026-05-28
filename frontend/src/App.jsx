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
  const [knowledgeQuestion, setKnowledgeQuestion] = useState("Какие курсы помогут прокачать системный дизайн?");
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

  async function fetchKnowledgeAgent(questionText = knowledgeQuestion) {
  setKnowledgeLoading(true);

  const finalQuestion =
    questionText && questionText.trim().length > 0
      ? questionText.trim()
      : "Какие курсы помогут прокачать системный дизайн?";

  try {
    const response = await fetch(`${API_URL}/api/knowledge-agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question: finalQuestion
      })
    });

    if (!response.ok) {
      throw new Error("Backend error");
    }

    const data = await response.json();
    console.log("KNOWLEDGE DATA:", data);
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
    console.log("MANAGER DATA:", data);

    const employeeObject =
      typeof data.employee === "object" && data.employee !== null
        ? data.employee
        : data;

    const normalizedManager = {
      employee:
        typeof data.employee === "string"
          ? data.employee
          : employeeObject.name || "Иван Петров",
      current_role:
        data.current_role ||
        employeeObject.current_role ||
        "Middle системный аналитик",
      target_role:
        data.target_role ||
        employeeObject.target_role ||
        "Senior системный аналитик",
      status:
        data.status ||
        data.route_status ||
        employeeObject.status ||
        employeeObject.route_status ||
        "Маршрут готов к согласованию",
      workload:
        data.workload ||
        employeeObject.workload ||
        "Высокая загрузка ближайшие 2 недели",
      recommendation:
        data.recommendation ||
        employeeObject.recommendation ||
        "Согласовать обучение с началом через 3 недели из-за высокой загрузки ближайшие 2 недели."
    };

    setManagerResult(normalizedManager);
    setManagerStatus(normalizedManager.status);
    setMode("live backend");
  } catch (error) {
    console.warn("Backend unavailable, using mock manager response");
    setManagerResult(mockManagerResponse);
    setManagerStatus(mockManagerResponse.status || "Маршрут готов к согласованию");
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
  knowledgeQuestion={knowledgeQuestion}
  setKnowledgeQuestion={setKnowledgeQuestion}
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

function KnowledgeAgentScreen({
  knowledgeResult,
  knowledgeLoading,
  fetchKnowledgeAgent,
  knowledgeQuestion,
  setKnowledgeQuestion
}) {
  const exampleQuestions = [
    "Какие курсы помогут прокачать системный дизайн?",
    "Как перейти из Middle системного аналитика в Senior?",
    "Когда нужно согласование руководителя?",
    "Какие курсы нужны для архитектурного мышления?"
  ];

  return (
    <main className="page">
      <section className="screenHeader">
        <div>
          <div className="eyebrow">Сценарий 2</div>
          <h2>Агент корпоративного знания</h2>
          <p>
            Пользователь задает свободный вопрос, а агент ищет релевантные
            материалы и показывает ответ с источниками.
          </p>
        </div>
      </section>

      <section className="formCard card knowledgeForm">
        <div className="field">
          <label>Введите вопрос агенту знаний</label>

          <textarea
            className="questionInput"
            value={knowledgeQuestion}
            onChange={(event) => setKnowledgeQuestion(event.target.value)}
            placeholder="Например: какие курсы помогут прокачать системный дизайн?"
          />

          <div className="exampleGrid">
            {exampleQuestions.map((question) => (
              <button
                className="exampleButton"
                key={question}
                onClick={() => setKnowledgeQuestion(question)}
                type="button"
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        <button
          className="primaryButton"
          onClick={() => fetchKnowledgeAgent(knowledgeQuestion)}
        >
          {knowledgeLoading ? "Ищем ответ..." : "Найти ответ"}
        </button>
      </section>

      {knowledgeLoading && <LoadingPipeline />}

      {knowledgeResult && !knowledgeLoading && (
        <section className="resultGrid">
          <PipelineBlock pipeline={knowledgeResult.pipeline} />

          <div className="card largeCard">
            <h3>Ответ агента</h3>
            <p className="answerText">
              {typeof knowledgeResult.answer === "string"
                ? knowledgeResult.answer
                : "Ответ получен, но требует текстового отображения."}
            </p>
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
  const employeeObject =
    typeof managerResult.employee === "object" && managerResult.employee !== null
      ? managerResult.employee
      : {};

  const employeeName =
    typeof managerResult.employee === "string"
      ? managerResult.employee
      : employeeObject.name || managerResult.name || "Иван Петров";

  const currentRole =
    managerResult.current_role ||
    employeeObject.current_role ||
    "Middle системный аналитик";

  const targetRole =
    managerResult.target_role ||
    employeeObject.target_role ||
    "Senior системный аналитик";

  const workload =
    managerResult.workload ||
    employeeObject.workload ||
    "Высокая загрузка ближайшие 2 недели";

  const recommendation =
    managerResult.recommendation ||
    employeeObject.recommendation ||
    "Согласовать обучение с началом через 3 недели из-за высокой загрузки ближайшие 2 недели.";

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
            <h3>{employeeName}</h3>
            <p>
              {currentRole} → {targetRole}
            </p>
          </div>

          <div className="statusBlock">
            <span>Статус</span>
            <strong>{managerStatus}</strong>
          </div>

          <div className="infoBlock">
            <span>Загрузка</span>
            <p>{workload}</p>
          </div>

          <div className="infoBlock">
            <span>Рекомендация</span>
            <p>{recommendation}</p>
          </div>

          <div className="buttonRow">
            <button
              className="primaryButton"
              onClick={() => updateManagerStatus("Согласовано")}
            >
              Согласовать
            </button>

            <button
              className="secondaryButton"
              onClick={() => updateManagerStatus("Требует корректировки")}
            >
              Скорректировать
            </button>

            <button
              className="dangerButton"
              onClick={() => updateManagerStatus("Отложено")}
            >
              Отложить
            </button>
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
        {pipeline.map((item, index) => (
          <div className="pipelineItem" key={`${item.step || "step"}-${index}`}>
            <span className="check">✓</span>
            <div>
              <strong>{item.step || "Этап выполнен"}</strong>
              <p>{item.model || ""}</p>
              {item.description && <p>{item.description}</p>}
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
      {items.map((item, index) => {
        if (typeof item === "string") {
          return (
            <span className="tag" key={item}>
              {item}
            </span>
          );
        }

        return (
          <div className="skillItem" key={item.skill || item.title || index}>
            <strong>{item.title || item.skill || "Компетенция"}</strong>
            <span>
              {item.current_level ?? "—"} → {item.target_level ?? "—"}
            </span>
            <span>Разрыв: {item.gap ?? "—"}</span>
          </div>
        );
      })}
    </div>
  );
}

function CourseList({ courses = [] }) {
  return (
    <div className="courseList">
      {courses.map((course, index) => (
        <div className="courseItem" key={course.id || course.title || index}>
          <div>
            <strong>
              {course.url ? (
                <a href={course.url} target="_blank" rel="noreferrer">
                  {course.title || "Курс"}
                </a>
              ) : (
                course.title || "Курс"
              )}
            </strong>

            {course.reason && <p>{course.reason}</p>}
            {course.description && <p>{course.description}</p>}

            <div className="courseMeta">
              {(course.provider || course.source) && (
                <span>{course.provider || course.source}</span>
              )}

              {course.course_type && (
                <span>
                  {course.course_type === "external"
                    ? "Внешний курс"
                    : "Внутренний курс"}
                </span>
              )}

              {typeof course.requires_approval === "boolean" && (
                <span>
                  {course.requires_approval
                    ? "Требует согласования"
                    : "Не требует согласования"}
                </span>
              )}

              {course.price_rub !== undefined && course.price_rub !== null && (
                <span>{course.price_rub} ₽</span>
              )}
            </div>
          </div>

          {course.duration_hours && (
            <span className="hours">{course.duration_hours} ч</span>
          )}
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
      {sources.map((source, index) => (
        <div className="sourceItem" key={`${source.title || "source"}-${index}`}>
          <strong>{source.title || "Источник"}</strong>

          <span>
            {source.type || "Документ"}
            {" · relevance: "}
            {typeof source.score === "number" ? source.score.toFixed(2) : "—"}
          </span>

          {source.text && <p>{source.text}</p>}
        </div>
      ))}
    </div>
  );
}

export default App;
