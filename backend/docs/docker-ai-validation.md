# Docker и живой AI: результаты проверки

Проверено 2026-09-23 на Windows с Docker Engine 29.1.2,
Compose v2.40.3-desktop.1, Linux-контейнерами Python 3.13.8/PostgreSQL 18.1.
Использован отдельный Compose project `career-quest-verification`,
синтетический demo seed и новые случайные пароли в игнорируемом `.env`.

## Docker

- `docker compose -p career-quest-verification build`: оба образа собраны.
- `docker compose -p career-quest-verification up -d --wait`: PostgreSQL
  healthy, bootstrap завершился с кодом 0, API healthy.
- `scripts/Demo.ps1` через контейнерный API на 127.0.0.1:8000: полный сценарий
  прошёл; coverage 100%, ready_for_review=true, официальный грейд Junior;
  RPG не изменил расчёты.

## Живая модель

Docker Model Runner, llama.cpp CPU, модель `ai/smollm2:360M-Q4_K_M`,
загрузка 270.60 MB. Endpoint из контейнера:
`http://model-runner.docker.internal/engines/v1`. Отправлялись только
синтетические данные. Ни датасет, ни персональные поля наружу не передавались.

Первый простой inference вернул HTTP 200; холодный запуск занял 7.41 с.
Изначальный запрос ранжирования с `json_object` не уложился в 3 секунды:
прямой адаптер дал ReadTimeout, HTTP API корректно вернул
`rule_based_fallback / ai_timeout` за 3076 мс с одной допустимой рекомендацией.

Добавлена опциональная поддержка `LLM_RESPONSE_FORMAT=json_schema`.
Схема ограничивает event_id, fact_id, reason_code и количество результатов;
прикладная проверка результата по снимку остаётся обязательной.
Также исправлена классификация локальных Docker-адресов в Settings.
Внешний AI по-прежнему требует отдельного разрешения и HTTPS.

После исправления, на прогретой модели с прежним бюджетом 3 секунды:

| Проверка | Результат | Время |
|---|---|---:|
| Прямой HTTP-адаптер на синтетических фактах | Корректный JSON с разрешёнными ID | 1563 мс |
| Прикладной валидатор ранжирования | llm_ranked / validated_ai_ranking | 1412 мс |
| POST /api/v1/recommendations, синтетический reviewer | llm_ranked / validated_ai_ranking, 1 item, is_current=true | 1826 мс |

Ruff, mypy strict и 29 unit/architecture тестов прошли после изменения.
Полный PostgreSQL-прогон из 39 тестов зафиксирован отдельно в validation.md;
он не выдаётся за повторно выполненный после этой проверки.

Для воспроизведения используйте команды из раздела AI в README.
`scripts/smoke_ai.py` возвращает ненулевой exit code, если живое ранжирование
не прошло проверку. Это opt-in тест, не часть обычного pytest.

Замеры не являются SLA или оценкой качества модели на рабочих данных.
Холодный запуск и более длинный запрос могут вызвать штатный fallback.
После проверки временные контейнеры остановлены; volume, образы и загруженная
модель сохранены. Обычный `docker compose up --build` запускает backend без AI;
для проверенной AI-конфигурации добавьте `-f compose.yaml -f compose.ai.yaml`.

Использованный API описан в официальной
[документации Docker Model Runner](https://docs.docker.com/ai/model-runner/api-reference/).
