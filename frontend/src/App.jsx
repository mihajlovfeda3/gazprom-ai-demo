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
  const [globalSearch, setGlobalSearch] = useState("");
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
  function handleGlobalSearch(query = globalSearch) {
  const finalQuery = query.trim();

  if (!finalQuery) {
    return;
  }

  setKnowledgeQuestion(finalQuery);
  setKnowledgeResult(null);
  setScreen("knowledge");
  fetchKnowledgeAgent(finalQuery);
}

  return (
  <AppShell
  screen={screen}
  setScreen={setScreen}
  mode={mode}
  globalSearch={globalSearch}
  setGlobalSearch={setGlobalSearch}
  onGlobalSearch={handleGlobalSearch}
>
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
  </AppShell>
);
}
function handleGlobalSearch(query = globalSearch) {
  const finalQuery = query.trim();

  if (!finalQuery) {
    return;
  }

  setKnowledgeQuestion(finalQuery);
  setScreen("knowledge");
  fetchKnowledgeAgent(finalQuery);
}

function AppShell({
  screen,
  setScreen,
  mode,
  children,
  globalSearch,
  setGlobalSearch,
  onGlobalSearch
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = [
    { id: "landing", label: "Главная", short: "Г" },
    { id: "route", label: "Траектория", short: "Т" },
    { id: "knowledge", label: "ИИ-поиск", short: "П" },
    { id: "manager", label: "Руководитель", short: "Р" }
  ];

  function openScreen(screenId) {
    setScreen(screenId);
    setMenuOpen(false);
  }

  return (
    <div className="productApp productAppCompact">
      <aside className="blueRail cleanRail">
        <button
          className="railMenuButton"
          onClick={() => setMenuOpen(true)}
          aria-label="Открыть меню"
        >
          <span />
          <span />
          <span />
        </button>

        <div className="internProfileWrap">
  <button
    className="internAvatarButton"
    onClick={() => openScreen("landing")}
    aria-label="Профиль стажера"
  >
    <span className="internAvatar">
      <svg
        viewBox="0 0 40 40"
        aria-hidden="true"
        className="internAvatarSvg"
      >
        <circle cx="20" cy="14" r="7" />
        <path d="M8 34c1.8-7.4 6.2-11 12-11s10.2 3.6 12 11" />
      </svg>
    </span>
  </button>

  <div className="internTooltip">
    <strong>Алексей Смирнов</strong>
    <span>Стажёр ИТ-кластера</span>
    <p>Рабочий профиль сотрудника</p>
  </div>
</div>

        <div className="railIcons cleanRailIcons">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={screen === item.id ? "railIconButton active" : "railIconButton"}
              onClick={() => openScreen(item.id)}
              title={item.label}
            >
              {item.short}
            </button>
          ))}
        </div>

        <div className="railBottom">
          <button
            className="railIconButton"
            onClick={() => openScreen("knowledge")}
            title="Задать вопрос"
          >
            ?
          </button>
        </div>
      </aside>

      {menuOpen && (
        <>
          <div className="drawerBackdrop" onClick={() => setMenuOpen(false)} />

          <aside className="menuDrawer">
            <div className="drawerHeader">
              <div>
                <span>Газпром нефть</span>
                <h2>ИИ T&amp;D платформа</h2>
              </div>

              <button onClick={() => setMenuOpen(false)}>×</button>
            </div>

            <nav className="drawerNav">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  className={screen === item.id ? "drawerNavItem active" : "drawerNavItem"}
                  onClick={() => openScreen(item.id)}
                >
                  <span>{item.short}</span>
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="drawerHint">
              Единая экосистема ИИ-агентов для обучения, развития и согласования маршрутов сотрудников.
            </div>
          </aside>
        </>
      )}

      <main className="mainWorkspace">
        <header className="topBar cleanTopBar">
          <form
  className="searchPill activeSearch"
  onSubmit={(event) => {
    event.preventDefault();
    onGlobalSearch(globalSearch);
  }}
>
  <input
    className="globalSearchInput"
    value={globalSearch}
    onChange={(event) => setGlobalSearch(event.target.value)}
    placeholder="Спросите ИИ-агента: «как перейти в Senior?»"
  />

  <button className="globalSearchButton" type="submit">
    Найти
  </button>
</form>

          <div className="topActions cleanTopActions">
            <button className="topKnowledgeButton" onClick={() => openScreen("knowledge")}>
              ИИ-поиск
            </button>
          </div>
        </header>

        <div className="workspaceContent">
          {children}
        </div>
      </main>

      <aside className="rightPanel cleanRightPanel">
        <div className="assistantCard cleanAssistantCard">
          <div className="assistantTitle">
            <span>ИИ</span>
            <h3>Ассистент развития</h3>
          </div>

          <p>
            Помогает найти курсы, источники, карьерные требования и подготовить
            маршрут развития сотрудника.
          </p>

          <button className="assistantAsk" onClick={() => openScreen("knowledge")}>
            Задать вопрос
          </button>
        </div>

        <div className="panelBlock cleanPanelBlock">
          <h3>Активные сценарии</h3>

          <button onClick={() => openScreen("route")}>
            Сформировать маршрут
          </button>

          <button onClick={() => openScreen("knowledge")}>
            Найти знания и курсы
          </button>

          <button onClick={() => openScreen("manager")}>
            Согласование руководителя
          </button>
        </div>

        <div className="backendStatusCard">
          <span>Статус подключения</span>
          <strong>{mode === "live backend" ? "Рабочий контур" : "Демо-режим"}</strong>
          <p>
            {mode === "live backend"
              ? "Данные поступают из backend."
              : "Используются резервные demo-данные."}
          </p>
        </div>
      </aside>
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
  const agentCards = [
    {
      title: "Агент маршрута развития",
      label: "Карьерная траектория",
      text: "Строит путь от текущей роли к целевой позиции с учетом компетенций, курсов, источников и ИПР.",
      action: "Сформировать маршрут",
      screen: "route",
      accent: "blue"
    },
    {
      title: "Агент корпоративного знания",
      label: "ИИ-поиск",
      text: "Отвечает на вопросы по курсам, регламентам, матрицам компетенций и внутренним материалам.",
      action: "Задать вопрос",
      screen: "knowledge",
      accent: "orange"
    },
    {
      title: "Агент руководителя",
      label: "Согласование",
      text: "Помогает руководителю принять решение по обучению с учетом загрузки, цели развития и пользы для команды.",
      action: "Открыть согласование",
      screen: "manager",
      accent: "dark"
    }
  ];

  return (
    <main className="page landingDashboard">
      <section className="gnHero">
        <div className="gnHeroContent">
          <div className="gnKicker">Газпром нефть · AI T&amp;D платформа</div>

          <h1>Единая экосистема AI-агентов для обучения и развития</h1>

          <p>
            Платформа помогает сотруднику строить карьерный маршрут,
            находить релевантные курсы и источники, а руководителю — быстро
            согласовывать обучение в управляемом контуре.
          </p>

          <div className="gnHeroActions">
            <button className="gnPrimaryButton" onClick={() => setScreen("route")}>
              Сформировать маршрут
            </button>

            <button className="gnSecondaryButton" onClick={() => setScreen("knowledge")}>
              Спросить AI-агента
            </button>
          </div>
        </div>

        <div className="gnHeroStatus">
          <div className="statusHeader">
            <span>Статус экосистемы</span>
            <strong>Демо-контур активен</strong>
          </div>

          <div className="statusList">
            <div>
              <span className="statusDot blue" />
              Route Agent подключен
            </div>

            <div>
              <span className="statusDot orange" />
              Knowledge Agent подключен
            </div>

            <div>
              <span className="statusDot dark" />
              Manager Agent подключен
            </div>
          </div>
        </div>
      </section>

      <section className="gnMetrics">
        <div className="gnMetricCard">
          <span>AI-агентов</span>
          <strong>3</strong>
          <p>маршрут, знания, руководитель</p>
        </div>

        <div className="gnMetricCard">
          <span>Сценариев</span>
          <strong>4</strong>
          <p>маршрут, поиск, курсы, согласование</p>
        </div>

        <div className="gnMetricCard">
          <span>Источников</span>
          <strong>RAG</strong>
          <p>курсы, роли, ИПР, регламенты</p>
        </div>

        <div className="gnMetricCard">
          <span>Режим</span>
          <strong>Live</strong>
          <p>backend + fallback demo-mode</p>
        </div>
      </section>

      <section className="gnSectionHeader">
        <div>
          <h2>Рабочие AI-агенты</h2>
          <p>
            Каждый агент закрывает отдельный этап T&amp;D-процесса, но работает
            в единой логике: запрос → источники → рекомендация → действие.
          </p>
        </div>
      </section>

      <section className="gnAgentGrid">
        {agentCards.map((agent) => (
          <button
            className={`gnAgentCard ${agent.accent}`}
            key={agent.title}
            onClick={() => setScreen(agent.screen)}
          >
            <div className="agentLabel">{agent.label}</div>
            <h3>{agent.title}</h3>
            <p>{agent.text}</p>
            <span>{agent.action} →</span>
          </button>
        ))}
      </section>

      <section className="gnWorkFlow">
        <div className="gnFlowCard">
          <h3>Как работает AI-слой</h3>

          <div className="flowSteps">
            <div>
              <strong>01</strong>
              <span>Пользователь задает запрос</span>
            </div>

            <div>
              <strong>02</strong>
              <span>Агент ищет источники и контекст</span>
            </div>

            <div>
              <strong>03</strong>
              <span>Система собирает маршрут или ответ</span>
            </div>

            <div>
              <strong>04</strong>
              <span>Руководитель принимает решение</span>
            </div>
          </div>
        </div>

        <div className="gnQuickCard">
          <h3>Быстрые действия</h3>

          <button onClick={() => setScreen("route")}>
            Построить маршрут Middle → Senior
          </button>

          <button onClick={() => setScreen("knowledge")}>
            Найти курсы по системному дизайну
          </button>

          <button onClick={() => setScreen("manager")}>
            Перейти к согласованию руководителем
          </button>
        </div>
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
