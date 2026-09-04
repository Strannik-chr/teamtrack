# TeamTrack — Development Roadmap

## 1. Назначение

Этот файл определяет последовательность разработки TeamTrack.

AI обязан читать этот файл перед началом работы.

Разработка выполняется строго по этапам.

AI НЕ должен самостоятельно переходить к следующему этапу.

AI НЕ должен реализовывать будущие функции заранее.

AI НЕ должен создавать весь проект за один запрос.

Каждый этап выполняется небольшими контролируемыми шагами.

После завершения каждого шага AI должен остановиться и дождаться следующей команды пользователя.

---

# 2. Главный принцип разработки

Основной принцип:

> Сначала минимально необходимая рабочая версия, затем постепенное расширение.

Нельзя создавать код "на будущее", если он не нужен текущему этапу.

Нельзя создавать архитектуру ради архитектуры.

Нельзя добавлять технологии, библиотеки, сервисы или абстракции без конкретной необходимости.

---

# 3. Текущий этап

```text
CURRENT PHASE: 0
STATUS: FOUNDATION

На текущем этапе создаётся и проверяется структура проекта и документация.

4. PHASE 0 — FOUNDATION
Цель

Подготовить правила, архитектуру и документацию проекта.

Уже создано
AGENTS.md
docs/PROJECT_RULES.md
docs/ARCHITECTURE.md
docs/ROADMAP.md
Результат

Перед началом программирования AI должен:

Прочитать AGENTS.md.
Прочитать docs/PROJECT_RULES.md.
Прочитать docs/ARCHITECTURE.md.
Прочитать docs/ROADMAP.md.
Проверить существующую структуру проекта.
Не изменять ничего без команды пользователя.
5. PHASE 1 — BACKEND FOUNDATION
Цель

Создать минимальный рабочий Go backend.

Реализовать только
Go module;
базовую структуру backend;
configuration;
Zap logger;
Chi router;
HTTP server;
graceful shutdown;
middleware structure;
health endpoint;
базовую обработку ошибок.
Endpoint
GET /health

Ответ:

{
  "status": "ok"
}
НЕ реализовывать

На этом этапе запрещено создавать:

authentication;
JWT;
users;
competitions;
projects;
tasks;
files;
notifications;
analytics;
scraper.
Проверка
go build ./...
go test ./...

Health endpoint должен возвращать HTTP 200.

6. PHASE 2 — DATABASE FOUNDATION
Цель

Подключить PostgreSQL.

Реализовать
database connection;
PostgreSQL configuration;
golang-migrate;
базовую migration;
sqlc configuration;
database health check.
Важно

Не создавать все таблицы приложения заранее.

Таблицы добавляются по мере реализации соответствующих модулей.

Проверка
docker-compose up -d
docker-compose ps

go build ./...
go test ./...

Migration должна:

применяться;
откатываться;
повторно применяться без ошибок.
7. PHASE 3 — AUTHENTICATION
Цель

Создать безопасную авторизацию.

Реализовать
users;
roles;
user_roles;
refresh_tokens;
password hashing;
login;
refresh;
logout;
logout-all;
JWT middleware.
Authentication

Access token:

15 minutes

Refresh token:

30 days

Refresh token хранится в БД только в виде SHA-256 hash.

Используется refresh token rotation.

Endpoints
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/logout-all
Проверка

Проверить:

правильный login;
неправильный пароль;
недействительный token;
expired access token;
refresh;
rotation;
logout;
logout-all.
8. PHASE 4 — FLUTTER FOUNDATION
Цель

Создать минимальный Flutter client.

Реализовать
Flutter project;
Dart;
Riverpod;
GoRouter;
Dio;
API client;
secure token storage;
theme;
constants;
authentication flow.
Проверка
flutter analyze
flutter test
flutter build apk

Приложение должно запускаться без ошибок.

9. PHASE 5 — USERS AND TEAM
Цель

Создать команду пользователей.

Реализовать
user profile;
team list;
team member profile;
roles;
permissions.
Роли
ADMIN
MANAGER
MEMBER
VIEWER
Правило

Permissions всегда проверяются backend.

Flutter может скрывать недоступные элементы интерфейса, но не является механизмом безопасности.

10. PHASE 6 — COMPETITIONS CORE
Цель

Создать каталог конкурсов.

Это один из главных модулей TeamTrack.

Реализовать

Backend:

competition model;
competition repository;
competition service;
handlers;
API;
pagination;
search;
filters.

Flutter:

competition list;
competition card;
competition details;
search;
filters.
Данные конкурса
Название
Организатор
Тип
Официальная ссылка
Ссылка источника
Дата начала
Дедлайн
Дата результатов
Призовой фонд
Регион
Формат
Для кого
Тематика
Требования
Описание
Статус
Источник
Типы
Конкурс
Грант
Хакатон
Турнир
Олимпиада
Форум
Акселератор
Чемпионат
Другое
Важно

На этом этапе конкурсы добавляются вручную.

Автоматический сбор с сайтов пока НЕ реализовывать.

11. PHASE 7 — PROJECTS
Цель

Связать конкурс с внутренней работой команды.

Реализовать
project CRUD;
project members;
project priority;
responsible user;
project status;
competition relation.
Статусы
new
preparation
in_progress
ready_to_submit
submitted
waiting_result
completed
cancelled
Приоритет
high
medium
low
12. PHASE 8 — TASKS
Цель

Создать управление задачами проекта.

Реализовать
task CRUD;
assignee;
deadline;
priority;
status;
comments.
Статусы
todo
in_progress
review
done
Основной сценарий
Project
   ↓
Tasks
   ↓
Assign User
   ↓
Work
   ↓
Review
   ↓
Done
13. PHASE 9 — DEADLINES AND CALENDAR
Цель

Создать управление сроками.

Deadline status

Backend вычисляет статус:

green  = больше 14 дней
yellow = 7–14 дней
orange = 3–7 дней
red    = меньше 3 дней
gray   = дедлайн прошёл
blue   = проект завершён

Flutter только отображает статус.

Calendar

Добавить:

project deadlines;
task deadlines;
submission dates;
result dates;
other important dates.

Виды:

month
week
list
14. PHASE 10 — URGENT
Цель

Создать раздел "Срочно".

Показывать:

Дедлайны менее 3 дней
Просроченные проекты
Просроченные задачи

Главный экран должен иметь быстрый доступ к этим данным.

15. PHASE 11 — COMMENTS AND FILES
Цель

Добавить рабочую коммуникацию и документы.

Comments

Добавить:

комментарии проекта;
комментарии задач;
автора;
дату;
mentions.
Files

Добавить:

upload;
download;
metadata;
permissions;
MinIO;
presigned URLs.

Максимальный размер:

50 MB

Разрешённые типы:

pdf
doc
docx
xls
xlsx
ppt
pptx
png
jpg
jpeg
zip
16. PHASE 12 — NOTIFICATIONS
Цель

Добавить уведомления.

Deadline notifications
14 days
7 days
3 days
1 day
after deadline
Event notifications
task assigned
comment added
deadline changed
project completed
Push

Использовать:

Firebase Cloud Messaging

Background worker проверяет дедлайны.

17. PHASE 13 — RESULTS
Цель

Добавить фиксацию результатов конкурса.

Результаты
Победа
1 место
2 место
3 место
Финал
Участие
Не прошли

Дополнительно:

prize
amount
result_date
comment
results_url
files

Завершённые проекты не удаляются.

Они переходят в историю.

18. PHASE 14 — ANALYTICS
Цель

Добавить обычную статистику без AI.

Показатели:

количество участий;
финалы;
победы;
гранты;
призовые;
проекты;
активные проекты;
завершённые проекты;
просроченные задачи;
выполненные задачи;
процент побед.

Также:

самый активный участник;
самый успешный проект;
загруженность команды.
19. PHASE 15 — SCRAPER V1
Цель

Автоматически находить конкурсы на внешних сайтах.

Это отдельный важный этап.

Pipeline
External Website
      ↓
Fetch
      ↓
Parse
      ↓
Normalize
      ↓
Validate
      ↓
Deduplicate
      ↓
Upsert
      ↓
PostgreSQL
Источники

Каждый сайт должен иметь отдельный adapter.

scraper/
├── engine/
├── adapters/
│   ├── source_a/
│   ├── source_b/
│   └── source_c/
├── normalizer/
├── deduplicator/
└── scheduler/
Важно

Ошибка одного сайта не должна останавливать остальные.

Например:

Source A → ERROR
Source B → SUCCESS
Source C → SUCCESS

Обработка должна продолжаться.

Scraper не должен
обходить CAPTCHA;
обходить авторизацию;
обходить anti-bot protection;
использовать агрессивную частоту запросов.

Перед подключением источника учитывать правила сайта, robots.txt и допустимую частоту запросов.

20. PHASE 16 — SECURITY HARDENING
Цель

Провести полноценную проверку безопасности.

Проверить:

authentication;
authorization;
IDOR;
SQL injection;
input validation;
file validation;
rate limiting;
token security;
secret management;
CORS;
logging;
permissions.

Также проверить, что секреты не находятся в Git.

21. PHASE 17 — TESTING
Цель

Увеличить покрытие тестами.

Проверить:

authentication;
refresh rotation;
permissions;
projects;
tasks;
deadline calculation;
scraper normalization;
deduplication;
API;
repositories;
services.
22. PHASE 18 — DEPLOYMENT
Цель

Подготовить production deployment.

Рассмотреть:

production PostgreSQL;
production MinIO;
HTTPS;
secrets;
environment configuration;
database backups;
monitoring;
logging;
CI/CD.

Production configuration не должна использовать development credentials.

23. PHASE 19 — RELEASE
Цель

Подготовить первую полноценную версию приложения.

Проверить:

Backend
Flutter
Database
Authentication
Permissions
Files
Notifications
Scraper
Security
Tests
CI/CD

После этого подготовить приложение к публикации.

24. AI — FUTURE VERSION

AI НЕ является частью MVP.

AI будет добавляться только после того, как основная система станет стабильной.

Будущие AI-функции могут включать:

анализ конкурсов;
подбор конкурсов;
анализ требований;
помощь в подготовке заявки;
анализ документов;
рекомендации команде.

Но AI не должен быть необходимым для работы основной системы.

25. Что считается MVP

MVP должен включать:

Authentication
Users
Roles
Team
Competitions
Projects
Tasks
Deadlines
Calendar
Urgent
Comments
Files
Notifications
Results
Dashboard
Basic Analytics

Автоматический scraper является отдельным этапом после основной рабочей системы.

AI не входит в MVP.

26. Правило остановки

После каждого законченного шага AI обязан:

Объяснить, что было сделано.
Показать изменённые файлы.
Показать команды проверки.
Указать результат проверки.
Остановиться.

AI НЕ должен автоматически продолжать разработку.

27. Размер одного шага

Один шаг должен быть небольшим.

Предпочтительно:

1 задача
1 логическая функция
несколько связанных файлов

Не следует выполнять одновременно:

backend
+
database
+
Flutter
+
authentication
+
UI
+
scraper

если пользователь явно этого не попросил.

28. Проверка после каждого изменения

Backend:

go build ./...
go test ./...

Flutter:

flutter analyze
flutter test

Если изменение затрагивает только один слой, сначала выполнять минимально необходимые проверки.

29. Если появилась ошибка

Алгоритм:

Ошибка
  ↓
Определить причину
  ↓
Определить затронутый слой
  ↓
Найти минимальное исправление
  ↓
Исправить
  ↓
Повторно проверить

Запрещено сразу переписывать весь модуль.

Если временное решение неизбежно, явно обозначить его.

30. Запрет на массовую генерацию

AI запрещено создавать сотни файлов или тысячи строк кода одним действием без прямого запроса пользователя.

Если для реализации требуется большое количество файлов:

Разбить работу на несколько этапов.
Объяснить структуру.
Реализовать первый небольшой блок.
Проверить его.
Остановиться.
31. Запрет на фиктивную реализацию

Не использовать fake/mock реализацию вместо реальной функциональности, если текущий этап требует рабочую функцию.

Не создавать:

TODO
FIXME
fake repository
fake API
dummy service
placeholder database

без явного объяснения причины.

Если placeholder действительно необходим для текущего шага, он должен быть явно обозначен как временный.

32. Запрет на ненужные зависимости

Не добавлять новую библиотеку только потому, что она удобна.

Перед добавлением зависимости AI должен объяснить:

Зачем она нужна.
Почему существующих инструментов недостаточно.
Как она влияет на проект.
33. Запрет на изменение архитектуры без согласования

Если реализация требует изменения архитектуры:

STOP

AI должен сначала объяснить:

проблему;
предлагаемое изменение;
почему оно необходимо;
какие файлы затронет;
какие последствия будут.

Без согласования архитектуру менять нельзя.

34. Главная цель roadmap

Roadmap существует не для того, чтобы написать как можно больше кода.

Roadmap существует для того, чтобы:

не потерять направление;
не создавать лишний код;
не перескакивать через этапы;
не ломать работающую систему;
постепенно получать рабочий продукт.

Главный принцип:

Маленький рабочий шаг лучше огромного незавершённого проекта.
