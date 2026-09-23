# Career Quest — backend

Модульный монолит FastAPI, Python 3.13, PostgreSQL, SQLAlchemy AsyncSession.
Все файлы backend, миграции, Compose, документация и скрипты находятся в этой
папке. Frontend не изменён и пока использует собственный локальный режим.

## Запуск в PowerShell 7

Из папки `backend`:

```powershell
Copy-Item .env.example .env
# Заполните POSTGRES_PASSWORD и DATABASE_URL в .env.
# Для демонстрации: DEMO_SEED=true и собственный DEMO_PASSWORD (от 12 символов).
docker compose up --build
```

Для `POSTGRES_PASSWORD` используйте URL-safe пароль: буквы, цифры, `_`, `-`.
Compose ожидает PostgreSQL, затем отдельный сервис `bootstrap` выполняет
миграции и явно включённый seed. API: http://localhost:8000/docs.
Проверки: `/health/live`, `/health/ready`. PostgreSQL и HTTP доступны только
через loopback. Данные сохраняются в Docker volume.

Локальный запуск Python с доступной PostgreSQL:

```powershell
python -m pip install uv==0.12.18
uv sync --locked
uv run alembic upgrade head
uv run python -m career_quest.cli seed
uv run uvicorn career_quest.main:app --host 127.0.0.1 --port 8000
```

Команда `seed` требует `DEMO_PASSWORD`, повторный запуск сохраняет существующее
состояние. В production demo-auth и seed запрещены. SSO пока не реализован:
production-конфигурация не предоставляет фиктивный способ входа.

## Сценарии и права

Поддержаны заявления навыков и опыта, черновики навыков, назначение оценщика,
решения/доработка/апелляции, вакансии, карьерные цели, карта разрывов, отдельное
решение о повышении, запись на активность и независимое подтверждение
завершения. What-if ничего не записывает. Classic/RPG меняет только настройку.

Синтетические логины: `employee`, `reviewer`, `reviewer2`, `hr`, `admin`,
`outsider`. Пароль задаётся конфигурацией. Admin назначает оценщика и управляет
вакансиями/импортом; оценочные полномочия определяются `PermissionGrant`.
HR видит только разрешённые подразделения. Импорт сотрудников не создаёт
учётных записей. Evidence — текст и HTTP(S)-ссылка; сервер не скачивает её.

Для изменяющих состояние команд нужен `Idempotency-Key` (1–128 символов).
Одинаковый пользователь/операция/ключ/тело возвращают прежний результат;
изменённое тело даёт 409. Новый ключ не обходит уникальность решения или
завершения. Снимки рекомендаций создаются отдельно и проверяются по версиям.

В списках: `offset`, `limit` (1–100), стабильная сортировка по внутреннему UUID.
Есть фильтры `category` у навыков, `format` у активностей и `status` у вакансий.
Команды отклоняют неизвестные поля и bool вместо уровня. Ошибки имеют
`code`, `message`, `details`, `request_id`; язык ошибки задаёт `Accept-Language`.
Настройки пользователя: `locale=ru|kk|en`, `ui_mode`, `reduced_motion`.
Исходные англоязычные названия каталога не выдаются за переведённые.

## Импорт

В репозитории обнаружены канонические JSON/CSV в `../frontend/public/data`.
Исходный ZIP, README датасета и PDF не найдены. Файлы не копируются в backend.

```powershell
uv run python -m career_quest.cli import --path ../frontend/public/data --dry-run
uv run python -m career_quest.cli import --path ../frontend/public/data --source canonical
# Для ZIP или дополнительных профилей:
uv run python -m career_quest.cli import --path C:/data/career_quest_dataset.zip --source canonical
```

HTTP: `POST /api/v1/admin/imports?source=canonical&dry_run=true`, multipart поле
`file` с ZIP; отчёт — `GET /api/v1/admin/imports/{id}`. Размер ZIP до 10 MiB,
распакованный объём до 40 MiB, до 200 записей. Traversal, симлинки и неоднозначные
дубликаты отклоняются; macOS metadata игнорируются. Дополнительные профили
используют тот же namespace. История без профилей передаётся вместе с пустой
оболочкой `employees.json` с `meta.as_of_date` и `employees: []`.

Импорт атомарный; dry-run проводит проверки в откатываемой транзакции и не
создаёт отчёт в БД. Конфликт содержимого внешнего ID даёт 409. Отсутствующие
записи не удаляются. Оценки имеют `imported_assessment`; completed после
`last_review_date` реконструируются с явной меткой `legacy_proxy` и предупреждением.
Ранние завершения не начисляются повторно. Будущая история исключается.

## Часы, рекомендации и AI

`BusinessClock` использует дату `meta.as_of_date` импортированного набора;
для чистого demo — `BUSINESS_DATE=2026-10-01`. `SystemClock` всегда использует
реальное UTC для сессий, аудита и новых `completed_at`.

Подбор учитывает цель, критические разрывы, prerequisites, текущие роль/грейд,
расписание, историю участия и трудоёмкость. Обязательные мероприятия исключены.
Эффект ограничивается `gain/max_level/5`. Подбор возвращает 0–3 допустимых
действия с фактами, прогнозом и версиями. Пустой результат содержит причину.

Без `LLM_ENDPOINT` режим — `rule_based_fallback`, причина — `ai_disabled`.
Для локального OpenAI-compatible сервиса задайте URL с `/v1`, модель и при
необходимости ключ. HTTP-адаптер обращается к `/chat/completions`. В контейнере
`127.0.0.1` означает сам контейнер; адрес другого сервиса должен быть явно
разрешён конфигурацией `ALLOW_EXTERNAL_AI=true`. Такой opt-in необходим для
любого адреса вне loopback. Внешние адреса требуют HTTPS. Персональные поля,
evidence и архив в AI не передаются. AI может только переставить проверенные
кандидаты и сослаться на существующие факты; ошибка/тайм-аут дают fallback.
Вызов ограничен 3 секундами по умолчанию, максимум 5; транзакция на время
ожидания закрыта. Перед сохранением проверяются версии.

## Проверки

Интеграционные/API тесты требуют отдельную PostgreSQL с именем БД `*_test`.
Они очищают только явно указанную тестовую БД. SQLite не используется.

```powershell
docker compose --profile test up -d --wait db-test
$env:TEST_DATABASE_URL = 'postgresql+asyncpg://career_quest:YOUR_URL_SAFE_PASSWORD@localhost:55433/career_quest_test'
./scripts/Check.ps1
```

Отдельные команды:

```powershell
uv sync --locked
uv run ruff check src tests
uv run ruff format --check src tests
uv run mypy src
uv run pytest
```

Без `TEST_DATABASE_URL` выполняются unit/architecture тесты, PostgreSQL-тесты
явно пропускаются. `Check.ps1` требует URL, чтобы полный прогон не был ложным
успехом. После полного прогона исходный набор остаётся в тестовой БД; замер:

```powershell
uv run python scripts/benchmark.py
```

Скрипт работает только с `*_test`, создаёт локальную тестовую учётную запись
с временным случайным паролем и сохраняет измерения в
`docs/benchmark-results.md`. Он не предназначен для рабочей БД.

Подробности: [архитектура](docs/architecture.md),
[допущения](docs/assumptions.md), [демонстрация](docs/demo.md).
