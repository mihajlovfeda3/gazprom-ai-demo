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
  const [knowledgeQuestion, setKnowledgeQuestion] = useState("Какие материалы помогут разобраться с проектированием API?");
  const [materialTask, setMaterialTask] = useState("Нужно разобраться, как описывать API и интеграции в проекте");
  const [globalSearch, setGlobalSearch] = useState("");
  const [managerResult, setManagerResult] = useState(mockManagerResponse);
  const [routeLoading, setRouteLoading] = useState(false);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [managerStatus, setManagerStatus] = useState("Подборка готова к проверке");
  const [mode, setMode] = useState("demo");

  async function fetchRouteAgent(queryText = materialTask) {
    setRouteLoading(true);

    const finalQuery =
      queryText && queryText.trim().length > 0
        ? queryText.trim()
        : "Нужно разобраться, как описывать API и интеграции в проекте";

    try {
      const response = await fetch(`${API_URL}/api/material-agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: finalQuery,
          employee_id: "emp_001"
        })
      });

      if (!response.ok) {
        throw new Error("Material agent backend error");
      }

      const data = await response.json();

      console.log("MATERIAL AGENT DATA:", data);
      setRouteResult(data);
      setMode("live backend");
    } catch (error) {
      console.warn("Material agent unavailable, using mock response", error);
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
      : "Какие материалы помогут разобраться с проектированием API?";

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
        "Сотрудник ИТ-кластера",
      target_role:
        data.target_role ||
        employeeObject.target_role ||
        "Решение рабочей задачи",
      status:
        data.status ||
        data.route_status ||
        employeeObject.status ||
        employeeObject.route_status ||
        "Подборка готова к проверке",
      workload:
        data.workload ||
        employeeObject.workload ||
        "Высокая загрузка ближайшие 2 недели",
      recommendation:
        data.recommendation ||
        employeeObject.recommendation ||
        "Согласовать время на изучение после текущего спринта и проверить актуальность источников."
    };

    setManagerResult(normalizedManager);
    setManagerStatus(normalizedManager.status);
    setMode("live backend");
  } catch (error) {
    console.warn("Backend unavailable, using mock manager response");
    setManagerResult(mockManagerResponse);
    setManagerStatus(mockManagerResponse.status || "Подборка готова к проверке");
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
        materialTask={materialTask}
        setMaterialTask={setMaterialTask}
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
  { id: "landing", label: "Рабочий стол", short: "Г" },
  { id: "route", label: "Подбор материалов", short: "М" },
  { id: "knowledge", label: "База знаний", short: "Б" },
  { id: "manager", label: "Руководитель", short: "Р" }
];

  function openScreen(screenId) {
    setScreen(screenId);
    setMenuOpen(false);
  }

  return (
    <div className="gazpromShell">
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

        <button
          className="railBrandMark"
          onClick={() => openScreen("landing")}
          aria-label="Газпром нефть"
        >
          ГН
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
    <span>Сотрудник ИТ-кластера</span>
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
                <h2>Рабочий кабинет</h2>
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
              Рабочий контур для поиска проверенных материалов, источников и ответственных.
            </div>
          </aside>
        </>
      )}

      <main className="mainWorkspace">
        <header className="topBar cleanTopBar">
          <button
            className="topBrandBlock"
            onClick={() => openScreen("landing")}
            type="button"
            aria-label="Рабочий стол"
          >
            <span className="brandSymbol" aria-hidden="true">
              <span />
            </span>
          </button>

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
    placeholder="Спросите ИИ-помощника: «где материалы по API?»"
  />

  <button className="globalSearchButton" type="submit">
    Найти
  </button>
</form>

          <div className="topActions cleanTopActions" aria-label="Контекст">
            <span className="workContext">ИТ-кластер · Тюмень</span>
          </div>
        </header>

        <div className="workspaceContent">
          {children}
        </div>
      </main>

      <aside className="rightPanel cleanRightPanel">
        <div className="backendStatusCard backendStatusCompact">
          <span>Статус подключения</span>
          <strong>{mode === "live backend" ? "Контур подключен" : "Демо-контур"}</strong>
          <p>
            {mode === "live backend"
              ? "Данные поступают из backend."
              : "Используются резервные demo-данные."}
          </p>
        </div>

        <div className="panelBlock cleanPanelBlock">
          <h3>Быстрые действия</h3>

          <button onClick={() => openScreen("route")}>
            Найти материалы под задачу
          </button>

          <button onClick={() => openScreen("knowledge")}>
            Найти знания и материалы
          </button>

          <button onClick={() => openScreen("manager")}>
            Проверка руководителем
          </button>
        </div>
      </aside>
    </div>
    </div>
  );
}


function normalizeSelectionData(data = {}) {
  return {
    answer: data.answer || "",
    answerMode: data.answer_mode || "",
    llmModel: data.llm_model || "",
    topics: data.detected_topics || data.topics || data.skill_gap || [],
    materials:
      data.recommended_materials ||
      data.materials ||
      data.recommended_courses ||
      [],
    qualityAlerts: data.quality_alerts || [],
    sources: data.sources || [],
    summary: data.summary || "",
    pipeline: data.pipeline || []
  };
}

function getText(value, fallback = "") {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return fallback;
}

function getTopicTitle(topic) {
  if (typeof topic === "string") {
    return topic;
  }

  if (!topic || typeof topic !== "object") {
    return "Тема запроса";
  }

  return topic.title || topic.name || topic.skill || "Тема запроса";
}

function formatScore(score) {
  if (typeof score !== "number") {
    return null;
  }

  if (score <= 1) {
    return `${Math.round(score * 100)}%`;
  }

  return score.toFixed(2);
}

function formatDisplayText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/Сформирован маршрут развития и черновик ИПР\./gi, "Сформирована подборка материалов для проверки.")
    .replace(/Найдены релевантные курсы, матрицы компетенций и регламенты\./gi, "Найдены релевантные материалы, матрицы тем и регламенты.")
    .replace(/Внешнее обучение/g, "Внешний материал")
    .replace(/внешнего обучения/gi, "внешних материалов")
    .replace(/времени обучения/gi, "времени на изучение")
    .replace(/при сильном разрыве по/gi, "при фокусе на")
    .replace(/Курс закрывает разрыв по навыкам:/g, "Материал связан с темами:")
    .replace(/курс закрывает разрыв по навыкам:/g, "материал связан с темами:")
    .replace(/закрывает разрыв по навыкам:/g, "связан с темами:")
    .replace(/разрыв по навыкам:/g, "темы запроса:")
    .replace(/разрыв по/gi, "фокус по")
    .replace(/Разрыв/gi, "Тема")
    .replace(/Черновик ИПР/g, "Черновик подборки для развития")
    .replace(/ИПР/g, "подборку")
    .replace(/маршрут развития/gi, "подборку материалов")
    .replace(/маршрут/gi, "подборку")
    .replace(/курсы/gi, "материалы")
    .replace(/курса/gi, "материала")
    .replace(/курсу/gi, "материалу")
    .replace(/курс/g, "материал")
    .replace(/Курс/g, "Материал")
    .replace(/Согласовать обучение/gi, "Согласовать время на изучение")
    .replace(/Подготовка к роли Senior системного аналитика/g, "Подготовка к сложным задачам системного аналитика")
    .replace(/Матрица компетенций Senior системного аналитика/g, "Матрица тем системного анализа")
    .replace(/матрицы компетенций/gi, "матрицы тем")
    .replace(/Матрица компетенций/g, "Матрица тем")
    .replace(/Карьерный трек системного аналитика/g, "Навигация по материалам системного анализа")
    .replace(/Переход из Middle системного аналитика в Senior требует/gi, "Рабочие задачи повышенной сложности требуют")
    .replace(/перехода с уровня Middle на Senior/gi, "работы с задачами повышенной сложности")
    .replace(/Senior системный аналитик/gi, "Системный аналитик")
    .replace(/Senior/gi, "сложные задачи")
    .replace(/Middle/gi, "базовый уровень")
    .replace(/Темае/gi, "фокусе")
    .replace(/подборку \./g, "подборку.")
    .replace(/\([^)]*₽[^)]*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function LandingScreen({ setScreen }) {
  const courses = [
    {
      title: "Проектирование интеграций и API",
      meta: "Подборка в работе · владелец: ЦК системного анализа",
      progress: 65,
      type: "courseBlue"
    },
    {
      title: "Шаблон описания интеграционного решения",
      meta: "Новый материал · архитектурный офис",
      progress: 0,
      type: "courseOrange"
    },
    {
      title: "Архитектурное мышление для аналитиков",
      meta: "Рекомендовано · ЦК архитектуры",
      progress: 35,
      type: "courseGreen"
    }
  ];

  const materials = [
    {
      status: "Актуально",
      title: "Руководство по доступам в продуктовую среду",
      meta: "Обновлено 3 дня назад · владелец: М. Петров"
    },
    {
      status: "На ревью",
      title: "Архитектура микросервисов v2.4",
      meta: "На проверке · ЦК DevOps"
    },
    {
      status: "Устарело",
      title: "Регламент работы с инцидентами 2023",
      meta: "Задача на обновление · срок: 10 июня"
    },
    {
      status: "Актуально",
      title: "FAQ: настройка CI/CD-пайплайнов",
      meta: "Обновлено вчера · 128 просмотров"
    }
  ];

  return (
    <main className="page employeeDashboard">
      <section className="employeeHero">
        <div className="employeeHeroMain">
          <div className="employeeGreeting">
            <div>
              <span className="sectionKicker">Рабочий стол</span>
              <h1>Добрый день, Александр</h1>
              <p>
                ИТ-кластер · Тюмень · текущий фокус: подбор материалов под рабочую задачу
              </p>
            </div>

            <div className="employeeBadges">
              <span>Доступы</span>
              <span>Знакомство</span>
              <span className="active">Архитектура</span>
              <span>Регламенты</span>
            </div>
          </div>

          <div className="heroActionsRow">
            <button className="gnPrimaryButton" onClick={() => setScreen("route")}>
              Найти материалы под задачу
            </button>

            <button className="gnSecondaryButton" onClick={() => setScreen("knowledge")}>
              Открыть базу знаний
            </button>
          </div>
        </div>
      </section>

      <section className="employeeStats">
        <div className="employeeStatCard">
          <span>Материалы к изучению</span>
          <strong>12</strong>
          <p>3 новых на этой неделе</p>
        </div>

        <div className="employeeStatCard">
          <span>Подборки в работе</span>
          <strong>2</strong>
          <p>ожидают уточнения источников</p>
        </div>

        <div className="employeeStatCard">
          <span>Прогресс по текущей задаче</span>
          <strong>47%</strong>
          <p>готовность к проверке</p>
        </div>
      </section>

      <section className="dashboardGrid">
        <div className="dashboardCard coursesPanel">
          <div className="cardHeaderLine">
            <h2>Текущие материалы</h2>
            <button onClick={() => setScreen("route")}>Все материалы →</button>
          </div>

          <div className="courseRows">
            {courses.map((course) => (
              <div className="courseRow" key={course.title}>
                <div className={`courseIcon ${course.type}`} />
                <div className="courseBody">
                  <div className="courseTop">
                    <strong>{course.title}</strong>
                    {course.progress > 0 ? <span>{course.progress}%</span> : <span>Новый</span>}
                  </div>

                  <p>{course.meta}</p>

                  <div className="courseProgressTrack">
                    <div style={{ width: `${course.progress || 8}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboardCard trajectoryPanel">
          <div className="cardHeaderLine">
            <h2>Подборка в работе</h2>
            <button onClick={() => setScreen("route")}>Открыть →</button>
          </div>

          <div className="trajectoryRoles">
            <div>
              <span>Рабочая задача</span>
              <strong>Проектирование API</strong>
            </div>

            <div>
              <span>Цель</span>
              <strong>Найти проверенные материалы</strong>
            </div>
          </div>

          <div className="trajectoryProgress">
            <div>
              <span>Темы запроса</span>
              <strong>4 темы</strong>
            </div>

            <div className="wideProgress">
              <div />
            </div>
          </div>

          <button className="panelAction" onClick={() => setScreen("route")}>
            Обновить подборку материалов
          </button>
        </div>

        <div className="dashboardCard knowledgePanel">
          <div className="cardHeaderLine">
            <h2>Последние материалы базы знаний</h2>
            <button onClick={() => setScreen("knowledge")}>Открыть базу →</button>
          </div>

          <div className="materialGrid">
            {materials.map((item) => (
              <div className="materialItem" key={item.title}>
                <span className={`materialStatus ${item.status === "Устарело" ? "warning" : ""}`}>
                  {item.status}
                </span>

                <div>
                  <strong>{item.title}</strong>
                  <p>{item.meta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboardCard managerPanel">
          <div className="cardHeaderLine">
            <h2>Проверка руководителем</h2>
            <button onClick={() => setScreen("manager")}>Перейти →</button>
          </div>

          <p>
            Подборка материалов готова к проверке. Руководитель может
            согласовать время на изучение или попросить уточнить источники.
          </p>

          <div className="managerDecisionPreview">
            <span>Загрузка</span>
            <strong>Высокая ближайшие 2 недели</strong>
          </div>

          <button className="panelAction" onClick={() => setScreen("manager")}>
            Открыть проверку
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

function RouteAgentScreen({
  routeResult,
  routeLoading,
  fetchRouteAgent,
  sendToManager,
  materialTask,
  setMaterialTask
}) {
  const quickTasks = [
    "Какие материалы помогут разобраться с проектированием API?",
    "Что изучить перед задачей по системному дизайну?",
    "Где найти актуальные материалы по интеграциям?",
    "Есть ли запись или вебинар про проектирование API?"
  ];
  const selection = normalizeSelectionData(routeResult || {});
  const isGuardrail = selection.answerMode === "guardrail";
  const answerBadge =
    selection.answerMode === "llm"
      ? selection.llmModel && selection.llmModel.toLowerCase().includes("qwen")
        ? "Ответ сформирован Qwen"
        : "Ответ сформирован ИИ"
      : selection.answerMode === "template_fallback"
        ? "Ответ сформирован по шаблону"
        : "";

  function handleSubmit(event) {
    event.preventDefault();
    fetchRouteAgent(materialTask);
  }

  return (
    <main className="page">
      <section className="screenHeader">
        <div>
          <div className="eyebrow">Подбор материалов</div>
<h2>Найти материалы под задачу</h2>
<p>
  Опишите рабочую задачу или цель развития. ИИ-помощник подберет проверенные
  материалы, источники и ответственных по теме.
</p>
        </div>
      </section>

      <form className="formCard card materialTaskForm" onSubmit={handleSubmit}>
        <div className="field">
          <label>Опишите рабочую задачу или цель развития</label>
          <textarea
            className="questionInput"
            value={materialTask}
            onChange={(event) => setMaterialTask(event.target.value)}
            placeholder="Например: нужно разобраться, как описывать API и интеграции в проекте"
          />

          <div className="exampleGrid">
            {quickTasks.map((task) => (
              <button
                className="exampleButton"
                key={task}
                onClick={() => setMaterialTask(task)}
                type="button"
              >
                {task}
              </button>
            ))}
          </div>
        </div>

        <button className="primaryButton" type="submit" disabled={routeLoading}>
          {routeLoading ? <LoadingLabel text="Ищем материалы" /> : "Найти материалы под задачу"}
        </button>
      </form>

      {routeLoading && <LoadingPipeline />}

      {routeResult && !routeLoading && (
        <section className="resultGrid">
          {isGuardrail ? (
            <GuardrailBlock answer={selection.answer} />
          ) : (
            <>
              {selection.answer && (
                <div className="card largeCard">
                  <div className="sectionTitleRow">
                    <h3>Ответ ИИ-помощника</h3>
                    {answerBadge && <span className="softBadge">{answerBadge}</span>}
                  </div>
                  <p className="answerText">{formatDisplayText(selection.answer)}</p>
                </div>
              )}

              {selection.topics.length > 0 && (
                <div className="card">
                  <h3>Темы запроса</h3>
                  <TagList items={selection.topics} />
                </div>
              )}

              {selection.pipeline.length > 0 && <PipelineBlock pipeline={selection.pipeline} />}

              {selection.materials.length > 0 && (
                <div className="card largeCard">
                  <h3>Рекомендованные материалы</h3>
                  <MaterialList materials={selection.materials} />
                </div>
              )}

              {selection.qualityAlerts.length > 0 && (
                <QualityAlerts alerts={selection.qualityAlerts} />
              )}

              {selection.sources.length > 0 && (
                <div className="card largeCard sourcesCard">
                  <h3>Использованные источники</h3>
                  <SourceList sources={selection.sources} />
                </div>
              )}

              {selection.summary && (
                <div className="card">
                  <h3>Пояснение</h3>
                  <p className="answerText">{formatDisplayText(selection.summary)}</p>
                </div>
              )}

              <div className="card actionCard">
                <h3>Проверка подборки руководителем</h3>
                <p>
                  После проверки подборку можно отправить руководителю для согласования времени на изучение.
                </p>
                <button className="primaryButton" onClick={sendToManager}>Отправить подборку руководителю</button>
              </div>
            </>
          )}
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
    "Какие материалы помогут разобраться с проектированием API?",
    "Что изучить перед задачей по системному дизайну?",
    "Когда нужно согласование руководителя?",
    "Какие внутренние материалы есть по архитектурному мышлению?"
  ];

  return (
    <main className="page">
      <section className="screenHeader">
        <div>
          <div className="eyebrow">Корпоративные знания</div>
<h2>База знаний</h2>
<p>
  Пользователь задает вопрос, а ИИ-помощник ищет релевантные материалы,
  источники и ответственных в корпоративной базе знаний.
</p>
        </div>
      </section>

      <form
        className="formCard card knowledgeForm"
        onSubmit={(event) => {
          event.preventDefault();
          fetchKnowledgeAgent(knowledgeQuestion);
        }}
      >
        <div className="field">
          <label>Введите вопрос по базе знаний</label>

          <textarea
            className="questionInput"
            value={knowledgeQuestion}
            onChange={(event) => setKnowledgeQuestion(event.target.value)}
            placeholder="Например: какие материалы помогут разобраться с проектированием API?"
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
          type="submit"
          disabled={knowledgeLoading}
        >
          {knowledgeLoading ? <LoadingLabel text="Ищем ответ" /> : "Найти ответ"}
        </button>
      </form>

      {knowledgeLoading && <LoadingPipeline />}

      {knowledgeResult && !knowledgeLoading && (
        <section className="resultGrid">
          <PipelineBlock pipeline={knowledgeResult.pipeline} />

          <div className="card largeCard">
            <div className="sectionTitleRow">
              <h3>Ответ ИИ-помощника</h3>
              {knowledgeResult.answer_mode === "llm" && (
                <span className="softBadge">Ответ сформирован ИИ</span>
              )}
            </div>
            <p className="answerText">
              {typeof knowledgeResult.answer === "string"
                ? formatDisplayText(knowledgeResult.answer)
                : "Ответ получен, но требует текстового отображения."}
            </p>
          </div>

          <div className="card largeCard">
            <h3>Рекомендованные материалы</h3>
            <CourseList courses={knowledgeResult.related_courses} />
          </div>

          <div className="card largeCard sourcesCard">
            <h3>Использованные источники</h3>
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
    "Сотрудник ИТ-кластера";

  const targetRole =
    managerResult.target_role ||
    employeeObject.target_role ||
    "Решение рабочей задачи";

  const workload =
    managerResult.workload ||
    employeeObject.workload ||
    "Высокая загрузка ближайшие 2 недели";

  const recommendation =
    managerResult.recommendation ||
    employeeObject.recommendation ||
    "Согласовать время на изучение после текущего спринта и проверить актуальность источников.";
  const currentContext = /middle|senior/i.test(currentRole)
    ? "Сотрудник ИТ-кластера"
    : formatDisplayText(currentRole);
  const targetContext = /middle|senior/i.test(targetRole)
    ? "Решение рабочей задачи"
    : formatDisplayText(targetRole);

  return (
    <main className="page">
      <section className="screenHeader">
        <div>
         <div className="eyebrow">Проверка подборки</div>
<h2>Проверка подборки материалов</h2>
<p>
  Руководитель видит подобранные материалы, источники и рекомендацию по
  времени на изучение.
</p>
        </div>
      </section>

      <section className="managerLayout">
        <div className="card managerCard">
          <div className="employeeAvatar">ИП</div>

          <div>
            <h3>{employeeName}</h3>
            <p>
              {currentContext} · {targetContext}
            </p>
          </div>

          <div className="statusBlock">
            <span>Статус</span>
            <strong>{managerStatus}</strong>
          </div>

          <div className="infoBlock">
            <span>Загрузка</span>
            <p>{formatDisplayText(workload)}</p>
          </div>

          <div className="infoBlock">
            <span>Рекомендация</span>
            <p>{formatDisplayText(recommendation)}</p>
          </div>

          <div className="buttonRow">
            <button
              className="primaryButton"
              onClick={() => updateManagerStatus("Время на изучение согласовано")}
            >
              Согласовать время на изучение
            </button>

            <button
              className="secondaryButton"
              onClick={() => updateManagerStatus("Требуется уточнить подборку")}
            >
              Попросить уточнить подборку
            </button>

            <button
              className="secondaryButton ownerButton"
              onClick={() => updateManagerStatus("Отправлено владельцу направления")}
            >
              Отправить владельцу направления
            </button>
          </div>
        </div>

        <div className="card">
          <h3>Что проверяет руководитель</h3>
          <ul className="plainList">
            <li>Подборка соответствует рабочей задаче сотрудника</li>
            <li>Источники и ответственные указаны корректно</li>
            <li>Проверяются источники, ответственные и актуальность материалов</li>
            <li>Время на изучение согласовано с учетом загрузки</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

function LoadingPipeline() {
  const steps = [
    "Запрос обработан",
    "Темы определены",
    "Источники найдены",
    "Материалы отобраны",
    "Подборка сформирована"
  ];

  return (
    <section className="card loadingCard">
      <h3>Как формируется подборка</h3>
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

function LoadingLabel({ text }) {
  return (
    <span className="loadingLabel">
      {text}
      <span className="loadingDots" aria-hidden="true">
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </span>
    </span>
  );
}

function PipelineBlock({ pipeline = [] }) {
  return (
    <div className="card largeCard pipelineCompact">
      <h3>Как сформирована подборка</h3>
      <div className="pipelineList">
        {pipeline.map((item, index) => {
          const pipelineItem =
            typeof item === "object" && item !== null
              ? item
              : { step: String(item) };

          return (
          <div className="pipelineItem" key={`${pipelineItem.step || "step"}-${index}`}>
            <span className="check">✓</span>
            <div>
              <strong>{formatDisplayText(pipelineItem.step) || "Этап выполнен"}</strong>
              <p>{pipelineItem.model || ""}</p>
              {pipelineItem.description && <p>{formatDisplayText(pipelineItem.description)}</p>}
            </div>
          </div>
        );
        })}
      </div>
    </div>
  );
}

function TagList({ items = [] }) {
  return (
    <div className="tagList">
      {items.map((item, index) => (
        <span className="tag" key={getTopicTitle(item) || index}>
          {getTopicTitle(item)}
        </span>
      ))}
    </div>
  );
}

function CourseList({ courses = [] }) {
  return <MaterialList materials={courses} />;
}

function GuardrailBlock({ answer }) {
  return (
    <div className="card largeCard guardrailCard">
      <div className="sectionTitleRow">
        <h3>Запрос не относится к подбору корпоративных материалов</h3>
        <span className="softBadge">Запрос вне сценария</span>
      </div>

      <p className="answerText">
        {formatDisplayText(answer) ||
          "Опишите рабочую задачу или цель развития, чтобы подобрать внутренние материалы, источники и ответственных."}
      </p>

      <div className="guardrailHint">
        Пример: нужно разобраться, как описывать API и интеграции в проекте
      </div>
    </div>
  );
}

function QualityAlerts({ alerts = [] }) {
  if (!alerts.length) {
    return null;
  }

  return (
    <div className="card largeCard qualityAlertsCard">
      <h3>Замечания по качеству подборки</h3>

      <div className="qualityAlertsList">
        {alerts.map((item, index) => {
          const alert =
            typeof item === "object" && item !== null
              ? item
              : { message: String(item) };
          const message = getText(alert.message, "Замечание по подборке");
          const ownerAction = getText(alert.owner_action);

          return (
            <div className="qualityAlertItem" key={`${message}-${index}`}>
              <strong>{formatDisplayText(message)}</strong>
              {ownerAction && <p>Действие владельца: {formatDisplayText(ownerAction)}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MaterialList({ materials = [] }) {
  if (!materials.length) {
    return <p className="emptyStateText">Материалы пока не найдены. Попробуйте уточнить рабочую задачу.</p>;
  }

  return (
    <div className="materialList courseList">
      {materials.map((item, index) => {
        const material =
          typeof item === "object" && item !== null
            ? item
            : { title: String(item) };
        const materialType =
          material.material_type_label ||
          material.material_type ||
          material.course_type_label ||
          material.course_type ||
          "Материал";
        const provider = material.provider || material.source;
        const responsible = material.responsible_label || material.responsible;
        const actuality = material.actuality_label || material.actuality_status;
        const match = material.match_label || formatScore(material.score);
        const isVideo =
          material.material_type === "video_transcript" ||
          material.material_type_label === "Видео-транскрипт" ||
          material.transcript_status;

        return (
          <div className="materialItemCard courseItem" key={material.id || material.title || index}>
            <div className="materialCardHeader">
              <div>
                <strong>{formatDisplayText(material.title) || "Материал"}</strong>
                <div className="materialBadges">
                  <span>{formatDisplayText(materialType) || "Материал"}</span>
                  {isVideo && <span>Видео-транскрипт</span>}
                </div>
              </div>

              {material.video_duration_min && (
                <span className="hours">{material.video_duration_min} мин</span>
              )}

              {!material.video_duration_min && material.duration_hours && (
                <span className="hours">{material.duration_hours} ч</span>
              )}
            </div>

            {material.description && <p>{formatDisplayText(material.description)}</p>}
            {material.reason && <p>{formatDisplayText(material.reason)}</p>}

            <div className="materialMeta courseMeta">
              {provider && <span>{formatDisplayText(provider)}</span>}
              {responsible && <span>Ответственный: {formatDisplayText(responsible)}</span>}
              {actuality && <span>{formatDisplayText(actuality)}</span>}
              {match && <span>{formatDisplayText(match)}</span>}
              {material.video_duration_min && <span>Длительность: {material.video_duration_min} мин</span>}
              {material.transcript_status && <span>Транскрипт: {formatDisplayText(material.transcript_status)}</span>}
            </div>

            {material.url && (
              <a className="openMaterialButton" href={material.url} target="_blank" rel="noreferrer">
                Открыть материал
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

function NumberedList({ items = [] }) {
  return (
    <ol className="numberedList">
      {items.map((item, index) => {
        const text =
          typeof item === "string"
            ? item
            : item?.title || item?.text || item?.description || "Пункт подборки";

        return <li key={`${text}-${index}`}>{formatDisplayText(text)}</li>;
      })}
    </ol>
  );
}

function SourceList({ sources = [] }) {
  return (
    <div className="sourceList sourceCompact">
      {sources.map((item, index) => {
        const source =
          typeof item === "object" && item !== null
            ? item
            : { title: String(item) };
        const score = source.match_label || formatScore(source.score);
        const sourceType = source.type || source.kind || source.source || "Документ";
        const sourceTitle = source.title || source.name || source.text;

        return (
        <div className="sourceItem" key={`${sourceTitle || "source"}-${index}`}>
          <strong>{formatDisplayText(sourceTitle) || "Источник"}</strong>

          <span>
            {formatDisplayText(sourceType) || "Документ"}
            {score ? ` · совпадение: ${score}` : ""}
          </span>

          {source.text && source.text !== sourceTitle && <p>{formatDisplayText(source.text)}</p>}
        </div>
        );
      })}
    </div>
  );
}

export default App;
