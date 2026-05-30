import { useEffect, useRef, useState } from "react";
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
  const [managerStatus, setManagerStatus] = useState("Подборка готова к согласованию");
  const managerDecisionTouched = useRef(false);

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
    } catch (error) {
      console.warn("Material agent unavailable, using mock response", error);
      setRouteResult(mockRouteResponse);
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
  } catch {
    console.warn("Backend unavailable, using mock knowledge response");
    setKnowledgeResult(mockKnowledgeResponse);
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
        "Подборка готова к согласованию",
      workload:
        data.workload ||
        employeeObject.workload ||
        "Высокая загрузка ближайшие 2 недели",
      recommendation:
        data.recommendation ||
        employeeObject.recommendation ||
        "Согласовать 4-6 часов на изучение материалов после текущего спринта и попросить владельца направления проверить актуальность источников."
    };

    setManagerResult(normalizedManager);
    if (!managerDecisionTouched.current) {
      setManagerStatus(normalizedManager.status);
    }
  } catch {
    console.warn("Backend unavailable, using mock manager response");
    setManagerResult(mockManagerResponse);
    if (!managerDecisionTouched.current) {
      setManagerStatus(mockManagerResponse.status || "Подборка готова к согласованию");
    }
  }
}

  function sendToManager() {
    managerDecisionTouched.current = false;
    fetchManagerAgent();
    setScreen("manager");
  }

function updateManagerStatus(status) {
    managerDecisionTouched.current = true;
    setManagerStatus(status);
    setManagerResult((currentResult) => ({
      ...currentResult,
      status
    }));
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
  children,
  globalSearch,
  setGlobalSearch,
  onGlobalSearch
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(true);

  const menuItems = [
  { id: "knowledge", label: "База знаний", icon: "materials" },
  { id: "manager", label: "Проверка", icon: "review" }
];

  function openScreen(screenId) {
    setScreen(screenId);
    setMenuOpen(false);
  }

  function closeIntro() {
    setIntroOpen(false);
  }

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== "Escape") {
        return;
      }

      if (introOpen) {
        closeIntro();
        return;
      }

      if (menuOpen) {
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [introOpen, menuOpen]);

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

        <div
          className="railBrandMark"
          aria-label="Газпром нефть"
        >
          ГН
        </div>

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
		              <span className={`railIconGlyph ${item.icon}`} />
		              <span className="railIconLabel">{item.label}</span>
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
	                <h2>Рабочий кабинет ИТ-кластера</h2>
	              </div>
	
	              <button aria-label="Закрыть меню" onClick={() => setMenuOpen(false)}>×</button>
	            </div>

            <nav className="drawerNav">
              {menuItems.map((item) => (
                <button
                  key={item.id}
	                  className={screen === item.id ? "drawerNavItem active" : "drawerNavItem"}
	                  onClick={() => openScreen(item.id)}
	                >
		                  <span className={`drawerNavIcon ${item.icon}`} />
		                  {item.label}
		                </button>
              ))}
            </nav>

	          </aside>
        </>
      )}

      <main className="mainWorkspace">
        <header className="topBar cleanTopBar">
          <button
            className="topBrandBlock homeLogoButton"
            type="button"
            onClick={() => openScreen("landing")}
            aria-label="Газпром"
          >
            <img
              className="brandLogoImage"
              src="/gazprom-emblem.jpg"
              alt="Газпром"
            />
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
		            <div className="topStatusMenu">
		              <button
		                className="demoContourBadge"
		                type="button"
		              >
		                Демо-контур
		              </button>
	
		              <div className="topActionDropdown">
		                <button type="button" onClick={() => openScreen("knowledge")}>
		                  База знаний
		                </button>
		                <button type="button" onClick={() => openScreen("manager")}>
		                  Проверка
		                </button>
		              </div>
		            </div>
	
	            <div className="agentProfileWrap">
	              <button
	                className="agentProfileTrigger"
	                type="button"
	                aria-label="Профиль агента подбора материалов"
	              >
	                <span className="agentAvatar">ИИ</span>
	              </button>
	
	              <div className="agentProfilePopover" role="dialog" aria-label="Профиль агента">
	                <div className="agentPopoverHeader">
	                  <span className="agentAvatar large">ИИ</span>
	                  <div>
	                    <strong>Агент подбора материалов</strong>
	                    <p>Активен · обновил подборку 3 мин назад</p>
	                  </div>
	                </div>
	
	                <p className="agentPopoverText">
	                  Помогает находить релевантные источники под текущий курс и готовит подборку к проверке.
	                </p>
	
	                <div className="agentContextBlock">
	                  <span>Курс</span>
	                  <strong>Интеграционная архитектура и API</strong>
	                </div>
	
	                <div className="agentContextBlock">
	                  <span>Сейчас выполняет</span>
	                  <strong>Проверяет релевантность источников и готовность подборки</strong>
	                </div>
	
	                <div className="agentMetrics">
	                  <div><span>Материалов</span><strong>12</strong></div>
	                  <div><span>Уточнить</span><strong>2</strong></div>
	                  <div><span>Готовность</span><strong>47%</strong></div>
	                </div>
	
	                <button type="button" onClick={() => openScreen("route")}>
	                  Открыть подборку
	                </button>
	              </div>
	            </div>
	          </div>
        </header>

        <div className="workspaceContent">
          {children}
        </div>
	      </main>
	
	      {introOpen && (
	        <div className="introOverlay" role="presentation" onClick={closeIntro}>
	          <section
	            className="introCard"
	            role="dialog"
	            aria-modal="true"
	            aria-labelledby="introTitle"
	            onClick={(event) => event.stopPropagation()}
	          >
	            <button className="introClose" type="button" aria-label="Закрыть окно" onClick={closeIntro}>
	              ×
	            </button>
	
	            <span className="introBadge">Демо-контур</span>
	            <h2 id="introTitle">О демонстрационном продукте</h2>
	            <p>Это демонстрационный продукт для кейса Газпром нефти.</p>
	            <p>
	              Он показывает, как ИИ-агент может помогать сотруднику ИТ-кластера быстрее находить и собирать материалы под текущую рабочую задачу.
	            </p>
	            <p>
	              В этом сценарии сотрудник проходит курс по интеграционной архитектуре и API. Система подбирает релевантные источники из базы знаний, показывает прогресс подготовки материалов и помогает передать подборку на проверку руководителю.
	            </p>
	            <p>
	              Интерфейс работает в демо-контуре и предназначен для демонстрации логики продукта, пользовательского сценария и ценности ИИ-помощника.
	            </p>
	
	            <button className="introPrimary" type="button" onClick={closeIntro}>
	              Понятно
	            </button>
	          </section>
	        </div>
	      )}
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

function truncateDisplayText(value, maxLength = 220) {
  const text = formatDisplayText(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

function LandingScreen({ setScreen }) {
  const [materialsDrawerOpen, setMaterialsDrawerOpen] = useState(false);
  const [materialsSearch, setMaterialsSearch] = useState("");
  const [materialsFilter, setMaterialsFilter] = useState("Все");

  const courses = [
    {
      title: "Проектирование интеграций и API",
      meta: "Подборка в работе · владелец: ЦК системного анализа",
      progress: 65,
      type: "courseBlue",
      typeLabel: "НМД"
    },
    {
      title: "Шаблон описания интеграционного решения",
      meta: "Новый материал · архитектурный офис",
      progress: 0,
      type: "courseOrange",
      typeLabel: "Метод"
    },
    {
      title: "Архитектурное мышление для аналитиков",
      meta: "Рекомендовано · ЦК архитектуры",
      progress: 35,
      type: "courseGreen",
      typeLabel: "Видео"
    }
  ];

  const materialFilters = [
    "Все",
    "НМД",
    "Видео",
    "Методички",
    "Внутренние курсы",
    "Требуют уточнения",
    "Актуально"
  ];

  const dashboardMaterials = [
    {
      typeLabel: "НМД",
      typeGroup: "НМД",
      title: "Стандарт описания REST API и интеграций",
      responsibleLabel: "ЦК системного анализа",
      actualityLabel: "Актуально",
      matchLabel: "Совпадение 94%",
      needsClarification: false
    },
    {
      typeLabel: "Видео",
      typeGroup: "Видео",
      title: "Вебинар: проектирование API в продуктовой команде",
      responsibleLabel: "Архитектурный офис",
      actualityLabel: "Актуально",
      matchLabel: "Совпадение 91%",
      needsClarification: false
    },
    {
      typeLabel: "Метод",
      typeGroup: "Методички",
      title: "Шаблон интеграционного решения",
      responsibleLabel: "ЦК системного анализа",
      actualityLabel: "Требует уточнения",
      matchLabel: "Совпадение 88%",
      needsClarification: true
    },
    {
      typeLabel: "Курс",
      typeGroup: "Внутренние курсы",
      title: "Системный дизайн для аналитиков",
      responsibleLabel: "Корпоративный университет",
      actualityLabel: "Актуально",
      matchLabel: "Совпадение 84%",
      needsClarification: false
    },
    {
      typeLabel: "НМД",
      typeGroup: "НМД",
      title: "Регламент согласования API-контрактов",
      responsibleLabel: "ИТ-архитектура",
      actualityLabel: "Требует уточнения",
      matchLabel: "Совпадение 81%",
      needsClarification: true
    },
    {
      typeLabel: "Метод",
      typeGroup: "Методички",
      title: "Чек-лист качества интеграционного описания",
      responsibleLabel: "Офис качества ИТ",
      actualityLabel: "Актуально",
      matchLabel: "Совпадение 79%",
      needsClarification: false
    },
    {
      typeLabel: "Видео",
      typeGroup: "Видео",
      title: "Разбор ошибок при описании интеграций",
      responsibleLabel: "Команда API-платформы",
      actualityLabel: "Актуально",
      matchLabel: "Совпадение 76%",
      needsClarification: false
    }
  ];

  const filteredDashboardMaterials = dashboardMaterials.filter((material) => {
    const searchText = materialsSearch.trim().toLowerCase();
    const matchesSearch =
      !searchText ||
      `${material.title} ${material.typeLabel} ${material.responsibleLabel}`
        .toLowerCase()
        .includes(searchText);
    const matchesFilter =
      materialsFilter === "Все" ||
      material.typeGroup === materialsFilter ||
      (materialsFilter === "Требуют уточнения" && material.needsClarification) ||
      (materialsFilter === "Актуально" && material.actualityLabel === "Актуально");

    return matchesSearch && matchesFilter;
  });

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
              <h1>Добрый день, Александр!</h1>
              <p>
                ИТ-кластер · Санкт-Петербург · текущий фокус: подбор материалов под рабочую задачу
              </p>
            </div>

          </div>

          <button className="heroStatusLine" type="button" onClick={() => setScreen("route")}>
            <span>Текущий курс: Интеграционная архитектура и API</span>
            <span className="heroStatusDivider" />
            <strong>Продолжить</strong>
          </button>
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
            <button onClick={() => setMaterialsDrawerOpen(true)}>Все материалы</button>
          </div>

          <div className="courseRows">
            {courses.map((course) => (
              <div className="courseRow" key={course.title}>
                <span className={`courseTypeBadge ${course.type}`}>
                  {course.typeLabel}
                </span>
                <div className="courseBody">
                  <div className="courseTop">
                    <strong>{course.title}</strong>
                  </div>

                  <p>{course.meta}</p>

                  <div className="courseProgressTrack">
                    <div style={{ width: `${course.progress || 8}%` }} />
                  </div>
                </div>
                <span className="courseRowValue">
                  {course.progress > 0 ? `${course.progress}%` : "Новый"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboardCard trajectoryPanel">
          <div className="cardHeaderLine">
            <h2>Подборка в работе</h2>
            <button onClick={() => setScreen("route")}>Открыть</button>
          </div>

          <div className="selectionSummary">
            <div>
              <span>Рабочая задача</span>
              <strong>Проектирование API и интеграций</strong>
            </div>

            <div>
              <span>Темы</span>
              <strong>API · интеграции · системный дизайн</strong>
            </div>

            <div>
              <span>Материалов</span>
              <strong>12</strong>
            </div>

            <div>
              <span>Требуют уточнения</span>
              <strong>2</strong>
            </div>
          </div>

          <div className="trajectoryProgress">
            <div>
              <span>Готово к проверке</span>
              <strong>47%</strong>
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
            <button onClick={() => setScreen("knowledge")}>Открыть базу</button>
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
            <button onClick={() => setScreen("manager")}>Перейти</button>
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

      {materialsDrawerOpen && (
        <div
          className="materialsDrawerLayer"
          role="presentation"
          onClick={() => setMaterialsDrawerOpen(false)}
        >
          <aside
            className="materialsDrawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="materialsDrawerTitle"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="materialsDrawerHeader">
              <div>
                <span>Подборка</span>
                <h2 id="materialsDrawerTitle">Все материалы подборки</h2>
                <p>Материалы по рабочей задаче “Проектирование API и интеграций”</p>
              </div>

              <button type="button" onClick={() => setMaterialsDrawerOpen(false)}>
                Закрыть
              </button>
            </div>

            <input
              className="materialsDrawerSearch"
              value={materialsSearch}
              onChange={(event) => setMaterialsSearch(event.target.value)}
              placeholder="Найти по названию или типу"
            />

            <div className="materialsDrawerFilters" aria-label="Фильтры материалов">
              {materialFilters.map((filter) => (
                <button
                  className={materialsFilter === filter ? "active" : ""}
                  key={filter}
                  type="button"
                  onClick={() => setMaterialsFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="materialsDrawerList">
              {filteredDashboardMaterials.map((material) => (
                <div className="materialsDrawerItem" key={material.title}>
                  <span className="drawerMaterialType">{material.typeLabel}</span>

                  <div>
                    <strong>{material.title}</strong>
                    <p>{material.responsibleLabel}</p>
                    <div className="drawerMaterialMeta">
                      <span>{material.actualityLabel}</span>
                      <span>{material.matchLabel}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMaterialsDrawerOpen(false);
                      setScreen("route");
                    }}
                  >
                    Открыть
                  </button>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </main>
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
            Опишите рабочую задачу, а помощник подберет проверенные источники и ответственных.
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
                <div className="card largeCard answerCard">
                  <div className="sectionTitleRow">
                    <h3>Ответ ИИ-помощника</h3>
                    {answerBadge && <span className="softBadge">{answerBadge}</span>}
                  </div>
                  <p className="answerText">{formatDisplayText(selection.answer)}</p>

                  {selection.topics.length > 0 && (
                    <div className="answerMetaRow">
                      <span>Темы запроса:</span>
                      <TagList items={selection.topics} />
                    </div>
                  )}
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
            Найдите внутренние материалы, регламенты, НМД и записи вебинаров по рабочей задаче.
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

          <div className="card largeCard answerCard">
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

  const workload =
    managerResult.workload ||
    employeeObject.workload ||
    "Высокая загрузка ближайшие 2 недели";

  const recommendation =
    managerResult.recommendation ||
    employeeObject.recommendation ||
    "Согласовать 4-6 часов на изучение материалов после текущего спринта и попросить владельца направления проверить актуальность источников.";
  const currentContext = /middle|senior/i.test(currentRole)
    ? "Сотрудник ИТ-кластера"
    : formatDisplayText(currentRole);
  const employeeRoleLabel = currentContext === "Сотрудник ИТ-кластера"
    ? "Системный аналитик"
    : currentContext;
  const approvalStatus = managerStatus === "Подборка готова к проверке"
    ? "Подборка готова к согласованию"
    : managerStatus;
  const reviewMetrics = [
    { label: "Материалов", value: "12" },
    { label: "Требуют уточнения", value: "2" },
    { label: "Готовность", value: "47%" }
  ];
  const availabilityWindows = [
    "Чт, 15:00-17:00 — можно изучить 1 материал",
    "Пт, 10:00-12:00 — можно пройти блок API design"
  ];
  const systemSignals = [
    "Календарь: высокая загрузка ближайшие 2 недели",
    "Задачи: активный спринт до 10 июня",
    "База знаний: 12 материалов подобрано",
    "Владельцы источников: 2 материала требуют подтверждения"
  ];
  const reviewChecks = [
    "Подборка соответствует рабочей задаче сотрудника.",
    "Источники и ответственные указаны корректно.",
    "Проверяются актуальность материалов и владельцы источников.",
    "Время на изучение согласовано с учетом загрузки."
  ];

  return (
    <main className="page">
      <section className="screenHeader">
        <div>
          <div className="eyebrow">Проверка руководителем</div>
          <h2>Согласование обучения и загрузки</h2>
          <p>
            Руководитель видит материалы, занятость сотрудника и рекомендуемое окно для изучения.
          </p>
        </div>
      </section>

      <section className="managerReviewScreen">
        <div className="card managerReviewCard">
          <div className="managerReviewTop">
            <div className="managerEmployeeBlock">
              <div className="employeeAvatar managerAvatar">ИП</div>
              <div>
                <span className="managerSectionLabel">Сотрудник</span>
                <h3>{employeeName}</h3>
                <p>{employeeRoleLabel} · ИТ-кластер</p>
              </div>
            </div>

            <div className="managerApprovalStatus">
              <span className="managerSectionLabel">Статус подборки</span>
              <strong>{approvalStatus}</strong>
              <div className="managerMetrics">
                {reviewMetrics.map((metric) => (
                  <div className="managerMetric" key={metric.label}>
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="managerWindowBlock">
              <span className="managerSectionLabel">Рекомендация</span>
              <strong>Рекомендуемое окно: 4-6 часов после текущего спринта</strong>
              <p>Причина: {formatDisplayText(workload).toLowerCase()}</p>
            </div>
          </div>
        </div>

        <div className="managerInsightGrid">
          <div className="card managerInsightCard">
            <h3>Загрузка и доступные окна</h3>
            <div className="availabilityStrip" aria-hidden="true">
              <span className="loadHigh">Высокая</span>
              <span className="loadMedium">Средняя</span>
              <span className="loadFree">Окно</span>
            </div>
            <p>Ближайшие 2 недели: высокая загрузка.</p>
            <strong>Найдено 2 возможных окна:</strong>
            <ul className="managerSignalList">
              {availabilityWindows.map((window) => (
                <li key={window}>{window}</li>
              ))}
            </ul>
          </div>

          <div className="card managerInsightCard">
            <h3>Сигналы учтены</h3>
            <ul className="managerSignalList">
              {systemSignals.map((signal) => (
                <li key={signal}>{signal}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="card managerDecisionCard">
          <div>
            <span className="managerSectionLabel">Рекомендованное решение</span>
            <p>{formatDisplayText(recommendation)}</p>
          </div>

          <div className="buttonRow managerActions">
            <button
              type="button"
              className="primaryButton"
              onPointerDown={() => updateManagerStatus("Время на изучение согласовано")}
              onClick={() => updateManagerStatus("Время на изучение согласовано")}
            >
              Согласовать время
            </button>

            <button
              type="button"
              className="secondaryButton"
              onPointerDown={() => updateManagerStatus("Требуется уточнить подборку")}
              onClick={() => updateManagerStatus("Требуется уточнить подборку")}
            >
              Попросить уточнить подборку
            </button>

            <button
              type="button"
              className="secondaryButton ownerButton"
              onPointerDown={() => updateManagerStatus("Отправлено владельцу направления")}
              onClick={() => updateManagerStatus("Отправлено владельцу направления")}
            >
              Перенести / отправить владельцу направления
            </button>
          </div>
        </div>

        <div className="card managerChecklistCard">
          <h3>Что проверяет руководитель</h3>
          <ul className="plainList managerChecklist">
            {reviewChecks.map((check) => (
              <li key={check}><span>✓</span> {check}</li>
            ))}
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
      <div className="qualityAlertsHeader">
        <h3>Требует проверки владельцем</h3>
        <p>
          {alerts.length === 1
            ? "1 материал требует подтверждения актуальности."
            : `${alerts.length} материала требуют подтверждения актуальности.`}
        </p>
      </div>

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
                  {isVideo && formatDisplayText(materialType) !== "Видео-транскрипт" && (
                    <span>Видео-транскрипт</span>
                  )}
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

          {source.text && source.text !== sourceTitle && <p>{truncateDisplayText(source.text)}</p>}
        </div>
        );
      })}
    </div>
  );
}

export default App;
