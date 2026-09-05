# DEPRECATION WARNING: This document mentions Go and Flutter, but the actual project has been built using Node.js, Express, TypeScript, React, PostgreSQL, and Drizzle ORM.

# TeamTrack — Architecture

## 1. Назначение

TeamTrack — мобильное приложение для университетской проектной команды.

Главная задача системы — объединить в одном месте:

- поиск конкурсов и других мероприятий;
- проекты команды;
- участников;
- задачи;
- дедлайны;
- календарь;
- уведомления;
- документы;
- комментарии;
- результаты;
- аналитику.

На первом этапе приложение работает без AI.

AI не является частью основной архитектуры первой версии.

---

## 2. Общая архитектура

TeamTrack состоит из:

1. Flutter mobile application
2. Go backend
3. PostgreSQL database
4. MinIO file storage
5. Competition scraper system
6. Firebase Cloud Messaging
7. Docker infrastructure

Общая схема:

```text
┌──────────────────────────────┐
│       Flutter Mobile         │
│          iOS / Android       │
└──────────────┬───────────────┘
               │
               │ HTTPS / JSON
               ▼
┌──────────────────────────────┐
│          Go Backend          │
│       Modular Monolith       │
└──────────────┬───────────────┘
               │
       ┌───────┼────────┐
       │       │        │
       ▼       ▼        ▼
┌──────────┐ ┌───────┐ ┌──────────────┐
│PostgreSQL│ │ MinIO │ │ Firebase FCM │
└──────────┘ └───────┘ └──────────────┘
       ▲
       │
┌──────┴──────────────────┐
│   Competition Scraper   │
└──────────┬──────────────┘
           │
           ▼
   External Websites
3. Архитектурный стиль

TeamTrack является модульным монолитом.

На первом этапе НЕ использовать микросервисную архитектуру.

Один Go backend содержит отдельные доменные модули:

auth
users
competitions
projects
tasks
files
notifications
results
analytics
scraper

Каждый модуль должен иметь одну понятную ответственность.

Не создавать отдельные сервисы без реальной необходимости.

Запрещено преждевременно добавлять:

Kubernetes;
Kafka;
RabbitMQ;
Redis;
Elasticsearch;
GraphQL;
микросервисы;
service mesh;
event sourcing;
CQRS.

Если в будущем появится реальная необходимость в таких технологиях, сначала объяснить причину и получить согласование.

4. Backend Architecture

Backend использует следующую структуру:

HTTP Request
      ↓
Middleware
      ↓
Handler
      ↓
Service
      ↓
Repository
      ↓
PostgreSQL

Каждый слой имеет строго определённую ответственность.

5. Middleware

Middleware отвечает только за инфраструктурные HTTP-задачи.

Допустимые обязанности:

authentication;
request ID;
logging;
panic recovery;
CORS;
rate limiting;
security headers.

Middleware не должен содержать основную бизнес-логику.

6. Handler Layer

Handler отвечает за HTTP API.

Handler должен:

Получить HTTP request.
Распарсить параметры.
Провалидировать входные данные.
Получить текущего пользователя.
Вызвать Service.
Преобразовать результат в HTTP response.

Handler не должен:

обращаться к PostgreSQL напрямую;
выполнять SQL;
содержать бизнес-логику;
самостоятельно принимать сложные решения о permissions;
работать с MinIO напрямую.
7. Service Layer

Service является главным слоем бизнес-логики.

Service отвечает за:

бизнес-правила;
permissions;
проверки доступа;
изменение состояния сущностей;
оркестрацию нескольких repositories;
вычисление бизнес-статусов;
работу со связанными сущностями.

Пример:

Create Project
      ↓
Check User
      ↓
Check Competition
      ↓
Check Permissions
      ↓
Create Project
      ↓
Add Project Members
8. Repository Layer

Repository отвечает только за доступ к данным.

Repository использует sqlc.

Repository не должен содержать:

бизнес-логику;
permissions;
HTTP;
JWT;
scraping;
пользовательские сообщения;
сложные решения о доступе.

Repository выполняет SQL queries и возвращает данные Service layer.

9. Database Architecture

Основная база данных:

PostgreSQL 15+

Доступ:

Service
   ↓
Repository
   ↓
sqlc
   ↓
PostgreSQL

Все SQL-запросы должны быть параметризованными.

Запрещено создавать SQL через:

fmt.Sprintf()

Запрещено конкатенировать пользовательский ввод с SQL.

10. Database Tables

Основные таблицы:

users
refresh_tokens
fcm_tokens
roles
user_roles

competition_sources
competitions

projects
project_members

tasks

comments
files

notifications

results

audit_logs

Не обязательно создавать все таблицы одновременно.

Таблицы создаются по мере реализации соответствующего функционального модуля.

11. Primary Keys

Все основные сущности используют UUID.

Использовать:

gen_random_uuid()

Не использовать последовательные integer ID как primary key для основных сущностей.

12. Date and Time

Для datetime использовать:

TIMESTAMPTZ

Не использовать:

TIMESTAMP

для данных, где имеет значение реальное время события.

Приложение должно корректно работать с часовыми поясами.

13. Database Migrations

Используется:

golang-migrate

Миграции должны быть последовательными.

Пример:

001_initial_schema.up.sql
001_initial_schema.down.sql

002_users.up.sql
002_users.down.sql

003_competitions.up.sql
003_competitions.down.sql

После создания migration-файла его нельзя изменять.

Изменения существующей структуры БД выполняются только новой migration.

14. Competition Domain

Competition представляет внешнее мероприятие.

Поддерживаемые типы:

competition
grant
hackathon
tournament
olympiad
forum
accelerator
championship
other

Основные поля:

id
title
organizer
type
official_url
source_url
start_at
deadline_at
result_at
prize_fund
region
format
audience
topics
requirements
description
status
source_id
created_at
updated_at
15. Competition Sources

Источники конкурсов хранятся отдельно от самих конкурсов.

Сущность:

competition_sources

Она должна содержать как минимум:

id
name
url
status
last_checked_at
last_success_at
last_error
competitions_count
created_at
updated_at

Один источник может содержать множество конкурсов.

16. Competition Scraper

Автоматический поиск конкурсов является отдельным модулем:

backend/internal/scraper/

Scraper не должен смешиваться с Handler, Project или Task логикой.

Архитектура:

Scraper Engine
      ↓
Source Adapter
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
17. Source Adapters

Для каждого сайта желательно использовать отдельный adapter.

Пример:

scraper/
├── engine/
├── adapters/
│   ├── source_a/
│   ├── source_b/
│   └── source_c/
├── normalizer/
├── deduplicator/
└── scheduler/

Один adapter не должен содержать код другого источника.

Добавление нового сайта должно по возможности не требовать изменения существующих adapters.

18. Scraper Errors

Ошибка одного источника не должна останавливать обработку остальных источников.

Например:

Source A → ERROR
Source B → SUCCESS
Source C → SUCCESS

Общий результат:

PARTIAL SUCCESS

Ошибки должны записываться через Zap logger.

Не использовать:

fmt.Println()

для production logging.

19. Scraper Rate Limiting

Scraper должен обращаться к внешним сайтам с разумной частотой.

Не использовать агрессивный scraping.

Не пытаться обходить:

CAPTCHA;
авторизацию;
anti-bot protection;
технические ограничения;
другие защитные механизмы сайтов.

Перед подключением источника учитывать:

robots.txt;
правила сайта;
terms of service;
допустимую частоту запросов.
20. Competition Normalization

Данные разных сайтов могут иметь разные форматы.

Перед сохранением они приводятся к единой модели TeamTrack.

Например:

Хакатон
Hackathon
IT Hack
IT-Hackathon

могут быть нормализованы в:

hackathon

Normalization должна быть предсказуемой и детерминированной.

AI не используется для normalization в первой версии.

21. Competition Deduplication

Один конкурс может встречаться на нескольких сайтах.

Система должна пытаться определить дубликаты.

Для этого могут использоваться:

external_id
official_url
source_url
normalized title
organizer
dates
content hash

Нельзя полагаться только на название конкурса.

22. Competition Upsert

При повторном запуске scraper:

Новый конкурс
      ↓
INSERT
Существующий конкурс + изменения
      ↓
UPDATE
Существующий конкурс + изменений нет
      ↓
SKIP

Особенно важны изменения:

deadline;
start_at;
result_at;
prize_fund;
official_url;
description;
status.
23. Projects

Project представляет участие команды в конкретном конкурсе.

Связь:

Competition
      ↓
Project

Competition и Project являются разными сущностями.

Competition:

внешнее мероприятие.

Project:

внутренняя работа команды по участию в мероприятии.

24. Project Fields

Project должен поддерживать:

id
competition_id
name
description
url
type
start_at
deadline_at
responsible_user_id
priority
status
created_at
updated_at

Priority:

high
medium
low
25. Project Status

Статусы проекта:

new
preparation
in_progress
ready_to_submit
submitted
waiting_result
completed
cancelled

Переходы между статусами должны контролироваться backend.

26. Project Members

Связь пользователей и проектов является many-to-many.

Используется:

project_members

Пример:

User
 ├── Project A
 └── Project B

Project A
 ├── User 1
 ├── User 2
 └── User 3
27. Tasks

Каждая задача принадлежит проекту.

Project
   ├── Task
   ├── Task
   └── Task

Task содержит:

id
project_id
title
description
assignee_id
deadline_at
priority
status
comment
created_at
updated_at

Статусы:

todo
in_progress
review
done
28. Team

Пользователь является отдельной сущностью.

Профиль пользователя должен позволять отображать:

имя;
роль;
компетенции;
контакты;
активные проекты;
активные задачи;
просроченные задачи.

Backend является источником истины для этих данных.

29. Roles

Основные роли:

ADMIN
MANAGER
MEMBER
VIEWER

ADMIN:

полный доступ;
управление пользователями;
управление источниками;
настройки системы;
просмотр всей статистики.

MANAGER:

создание проектов;
редактирование проектов;
создание задач;
назначение участников;
управление командой.

MEMBER:

просмотр доступных проектов;
работа со своими задачами;
комментарии;
загрузка файлов.

VIEWER:

только просмотр разрешённой информации.
30. Permissions

Permissions всегда проверяются на backend.

Flutter не является механизмом безопасности.

Flutter может скрывать кнопки, которые пользователю недоступны, но backend всё равно обязан проверить permission.

Нельзя считать пользователя авторизованным только потому, что кнопка скрыта в интерфейсе.

31. Authentication

Используется:

JWT Access Token
+
Refresh Token

Access token:

15 minutes

Refresh token:

30 days

Refresh token хранится в PostgreSQL только как SHA-256 hash.

Открытый refresh token в базе не хранится.

32. Authentication Flow

Login:

Flutter
   ↓
POST /api/v1/auth/login
   ↓
Backend
   ↓
Validate credentials
   ↓
Create access token
Create refresh token
   ↓
Flutter

Refresh:

Access token expired
        ↓
Flutter receives 401
        ↓
POST /api/v1/auth/refresh
        ↓
Backend validates refresh token
        ↓
Old refresh token invalidated
        ↓
New tokens created

Используется refresh token rotation.

Logout инвалидирует текущий refresh token.

Logout-all инвалидирует все refresh tokens пользователя.

33. Password Security

Пароли хранятся только в виде bcrypt hash.

Использовать:

bcrypt cost=12

Пароли никогда не должны:

логироваться;
возвращаться API;
храниться в открытом виде;
попадать в комментарии к ошибкам.
34. File Storage

Файлы хранятся в:

MinIO

PostgreSQL хранит только metadata файла.

Например:

files
├── id
├── project_id
├── filename
├── mime_type
├── size
├── storage_key
└── created_at
35. File Upload

Поток:

Flutter
   ↓
POST /api/v1/files
   ↓
Backend
   ↓
Authentication
   ↓
Authorization
   ↓
File validation
   ↓
MinIO
   ↓
Metadata → PostgreSQL
36. File Download

Поток:

Flutter
   ↓
GET /api/v1/files/:id/download
   ↓
Backend
   ↓
Authentication
   ↓
Authorization
   ↓
Generate presigned URL
   ↓
MinIO

Presigned URL должен иметь ограниченное время действия.

37. File Security

Разрешённые расширения:

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

Максимальный размер:

50 MB

Имена файлов должны быть sanitized.

Storage key должен использовать UUID.

Нельзя доверять только расширению файла.

38. Comments

Комментарии могут относиться к проекту или задаче.

Комментарии должны содержать:

id
author_id
project_id
task_id
content
created_at
updated_at

Должна существовать проверка, что пользователь имеет доступ к объекту, к которому добавляется комментарий.

Упоминания пользователей могут поддерживаться через формат:

@username
39. Notifications

Уведомления бывают двух основных типов:

event-based
deadline-based

Event-based:

Task assigned
Comment added
Deadline changed
Project completed

Deadline-based:

14 days
7 days
3 days
1 day
after deadline
40. Push Notifications

Используется:

Firebase Cloud Messaging

FCM tokens хранятся в:

fcm_tokens

Один пользователь может иметь несколько устройств.

41. Background Workers

Фоновые операции выполняются через background workers внутри Go backend.

На первом этапе не добавлять отдельную инфраструктуру очередей без необходимости.

Worker может выполнять:

проверку дедлайнов;
создание уведомлений;
запуск scraper jobs;
другие фоновые операции.
42. Deadline Status

Deadline status вычисляется на backend.

Правила:

Больше 14 дней
→ green

7–14 дней
→ yellow

3–7 дней
→ orange

Меньше 3 дней
→ red

Дедлайн прошёл
→ gray

Проект завершён
→ blue

Flutter не вычисляет deadline status самостоятельно.

Flutter только отображает значение, полученное от backend.

43. Calendar

Календарь является представлением данных из проектов и задач.

В календаре могут отображаться:

дедлайны конкурсов;
дедлайны задач;
даты подачи;
даты результатов;
другие важные события.

Backend остаётся источником данных.

Flutter отвечает только за отображение и взаимодействие пользователя с календарём.

44. Urgent Section

Раздел "Срочно" показывает:

проекты с дедлайном менее 3 дней;
просроченные проекты;
просроченные задачи.

Данные должны формироваться backend.

Главная страница должна иметь быстрый доступ к срочным элементам.

45. Results

После завершения проекта он не удаляется.

Проект переводится в:

completed

и сохраняется в истории.

Результаты:

win
first_place
second_place
third_place
final
participation
lost

Дополнительные данные:

prize
amount
result_date
comment
results_url
files
46. Analytics

Аналитика строится на основе существующих данных.

Основные показатели:

количество участий;
количество финалов;
количество побед;
количество грантов;
сумма призовых;
количество проектов;
проекты в работе;
завершённые проекты;
просроченные задачи;
выполненные задачи;
процент побед.

AI не используется для расчёта базовой аналитики.

47. Flutter Architecture

Flutter использует:

Screen / Widget
      ↓
Riverpod Provider
      ↓
Repository
      ↓
Dio API Client
      ↓
HTTPS
      ↓
Go Backend
48. Flutter Responsibilities

Widget отвечает за:

отображение UI;
пользовательские действия;
presentation state.

Provider отвечает за:

состояние;
вызов repository;
loading;
success;
empty;
error.

Repository отвечает за:

получение данных;
отправку данных;
преобразование DTO;
взаимодействие с API.

Dio API Client отвечает за:

HTTP;
headers;
authentication;
interceptors;
обработку сетевых ошибок.
49. Flutter State

Каждый экран, который загружает данные, должен поддерживать четыре состояния:

loading
success
empty
error

Для loading использовать skeleton UI там, где это уместно.

Обычный бесконечный spinner не должен быть единственным состоянием загрузки.

50. Flutter Networking

Используется:

Dio

Interceptors должны обеспечивать:

Authorization header;
обработку 401;
refresh token;
повтор исходного запроса после успешного refresh;
обработку сетевых ошибок.

HTTP-запросы непосредственно из Widget запрещены.

51. Flutter State Management

Используется:

Riverpod

Не использовать несколько конкурирующих state-management решений без необходимости.

Бизнес-логика не должна находиться внутри Widget.

52. Flutter Routing

Используется:

GoRouter

Основные маршруты:

/auth/login

/

/competitions
/competitions/:id

/projects
/projects/:id

/tasks

/calendar

/team
/team/:id

/notifications

/results

/analytics

/settings
53. API

Все API endpoints используют:

/api/v1/

Примеры:

GET    /api/v1/competitions
GET    /api/v1/competitions/:id
POST   /api/v1/competitions
PATCH  /api/v1/competitions/:id
DELETE /api/v1/competitions/:id
54. API Response Format

Успешный ответ:

{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 150
  }
}

Ошибка:

{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request"
  }
}

Основные коды:

UNAUTHORIZED
FORBIDDEN
NOT_FOUND
VALIDATION_ERROR
INTERNAL_ERROR
55. Pagination

Все списковые endpoints должны поддерживать:

?page=1&per_page=20

Backend отвечает за pagination.

Flutter отображает полученные данные.

56. Search and Filters

Раздел конкурсов должен поддерживать поиск и фильтрацию.

Фильтры:

тип;
дедлайн;
регион;
тематика;
формат;
призовой фонд.

Поиск и фильтрация должны выполняться backend, когда объём данных этого требует.

Не загружать всю базу конкурсов на устройство ради фильтрации.

57. Logging

Используется:

Zap

Production logging выполняется через Zap.

Не использовать:

fmt.Println()

для production logging.

Никогда не логировать:

password;
access token;
refresh token;
JWT secrets;
database password;
MinIO credentials;
Firebase credentials;
другие секреты.
58. Configuration

Используется:

Viper

Configuration должна поступать из environment variables и/или конфигурационных файлов.

Secrets не должны находиться непосредственно в исходном коде.

59. Environment

Пример основных переменных:

DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
DB_SSLMODE

SERVER_PORT
SERVER_ENV

JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
JWT_ACCESS_TTL
JWT_REFRESH_TTL

MINIO_ENDPOINT
MINIO_ACCESS_KEY
MINIO_SECRET_KEY
MINIO_BUCKET
MINIO_USE_SSL

FIREBASE_CREDENTIALS_FILE

CORS_ALLOWED_ORIGINS

.env не должен попадать в Git.

В Git хранится только:

.env.example
60. Security

Основные требования:

Authentication
Authorization
Input Validation
SQL Parameterization
IDOR Protection
File Validation
Rate Limiting
Secure Token Handling
Audit Logging
Secret Management

Безопасность должна обеспечиваться backend.

61. IDOR Protection

Каждый защищённый ресурс должен проверять права текущего пользователя.

Например:

GET /api/v1/projects/:id

не должен возвращать проект только потому, что такой UUID существует.

Backend должен проверить:

существует ли ресурс;
имеет ли пользователь доступ;
является ли он участником;
имеет ли соответствующую роль;
разрешено ли конкретное действие.
62. Audit Logs

Важные действия пользователей должны при необходимости записываться в:

audit_logs

Например:

создание проекта;
изменение проекта;
удаление проекта;
изменение роли;
добавление пользователя;
изменение источника;
изменение результата.

Не записывать в audit log пароли и секреты.

63. Docker

Development infrastructure запускается через:

docker-compose

Минимально:

PostgreSQL
MinIO

Не добавлять дополнительные инфраструктурные сервисы без необходимости.

64. CI/CD

GitHub Actions должен выполнять проверки.

Backend:

go build ./...
go test ./...

Flutter:

flutter analyze
flutter test

По мере развития проекта pipeline может расширяться.

65. Testing

Основные уровни тестирования:

Unit Tests
Integration Tests
API Tests

Особое внимание уделять:

authentication;
refresh token rotation;
permissions;
IDOR;
projects;
tasks;
deadline calculations;
scraper normalization;
scraper deduplication;
competition upsert.
66. Project Structure

Backend:

backend/
├── cmd/
│   └── server/
│       └── main.go
│
├── internal/
│   ├── config/
│   ├── database/
│   ├── auth/
│   ├── users/
│   ├── competitions/
│   ├── projects/
│   ├── tasks/
│   ├── files/
│   ├── notifications/
│   ├── results/
│   ├── analytics/
│   └── scraper/
│
├── pkg/
│   ├── middleware/
│   ├── validator/
│   ├── logger/
│   ├── response/
│   └── jwt/
│
├── migrations/
├── sqlc/
├── go.mod
├── Dockerfile
└── Makefile

Flutter:

mobile/
└── lib/
    ├── main.dart
    ├── app.dart
    │
    ├── core/
    │   ├── constants/
    │   ├── theme/
    │   ├── router/
    │   ├── network/
    │   ├── storage/
    │   ├── errors/
    │   └── utils/
    │
    ├── features/
    │   ├── auth/
    │   ├── home/
    │   ├── competitions/
    │   ├── projects/
    │   ├── tasks/
    │   ├── team/
    │   ├── calendar/
    │   ├── notifications/
    │   ├── files/
    │   ├── results/
    │   └── analytics/
    │
    └── shared/
        ├── widgets/
        ├── models/
        └── providers/
67. Feature Structure

Каждый Flutter feature должен по возможности иметь:

feature/
├── data/
│   ├── repositories/
│   ├── datasources/
│   └── dto/
│
├── domain/
│   ├── models/
│   └── state/
│
└── presentation/
    ├── screens/
    ├── widgets/
    └── providers/

Не создавать ненужные слои только ради количества файлов.

Если для простой функции отдельный слой не даёт практической пользы, сначала объяснить решение.

68. Dependency Direction

Backend:

HTTP
 ↓
Handler
 ↓
Service
 ↓
Repository
 ↓
Database

Flutter:

Widget
 ↓
Provider
 ↓
Repository
 ↓
API Client
 ↓
Backend

Нарушать направление зависимостей без объяснения запрещено.

69. Source of Truth

Основным источником истины для бизнес-данных является:

PostgreSQL

Основным хранилищем файлов является:

MinIO

Flutter является клиентом.

Cache, если появится в будущем, не должен становиться главным источником истины.

70. AI Architecture

AI отсутствует в первой версии.

Будущая AI-интеграция должна быть отдельным слоем:

Flutter
   ↓
Go Backend
   ↓
AI Service

Основная система не должна зависеть от AI.

Если AI недоступен, TeamTrack должен продолжать работать.

AI не должен напрямую обращаться к PostgreSQL.

71. Web Version

Web-версия не является частью первой версии.

Архитектура должна позволять добавить web client в будущем без изменения основного backend API.

72. Extensibility

Архитектура должна позволять в будущем добавлять:

новые источники конкурсов;
новые типы мероприятий;
новые роли;
AI-функции;
web client;
новые виды уведомлений;
дополнительные аналитические показатели.

При этом будущие функции не должны реализовываться заранее.

73. Основные принципы

TeamTrack должен следовать следующим принципам:

KISS
YAGNI
DRY
SOLID
Separation of Concerns
Single Responsibility
Backend as Source of Truth
Secure by Default
Testability
Maintainability

Главная цель:

Не написать как можно больше кода.

Главная цель:

Создать простую, надёжную и расширяемую систему, которую можно постепенно развивать без переписывания уже работающих частей.

74. Правило минимальной реализации

Каждая новая функция должна реализовываться минимально необходимым количеством кода.

Перед созданием новой абстракции необходимо спросить:

Она действительно нужна?
Используется ли она более одного раза?
Упрощает ли она код?
Соответствует ли она текущей архитектуре?

Не создавать абстракции только потому, что они могут понадобиться когда-нибудь в будущем.

75. Правило против лишнего кода

AI не должен создавать:

неиспользуемые файлы;
неиспользуемые классы;
неиспользуемые interfaces;
фиктивные repositories;
пустые services;
ненужные DTO;
ненужные модели;
ненужные зависимости;
демонстрационный код, который не используется приложением.

Каждый созданный файл должен иметь конкретную причину существования.

76. Правило против преждевременной разработки

Если текущая задача относится только к одному модулю, AI не должен одновременно реализовывать другие модули.

Например:

Если задача:

создать health endpoint

нельзя одновременно создавать:

authentication;
users;
competitions;
projects;
tasks;
scraper;
notifications.

Сначала закончить текущую задачу.

77. Правило изменения архитектуры

Если AI считает, что текущую архитектуру необходимо изменить:

Остановиться.
Объяснить проблему.
Показать предлагаемое изменение.
Объяснить преимущества и недостатки.
Дождаться согласования пользователя.

Нельзя молча менять архитектуру.

78. Главное правило

TeamTrack развивается постепенно.

AI должен предпочитать:

маленькое изменение
+
проверка
+
следующее маленькое изменение

вместо:

огромное изменение
+
сотни файлов
+
непонятный код
+
сложная отладка
