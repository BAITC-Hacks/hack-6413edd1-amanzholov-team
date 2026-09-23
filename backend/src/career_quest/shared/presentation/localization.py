from career_quest.shared.domain.core import Json

MESSAGES: dict[str, tuple[str, str, str]] = {
    "forbidden": (
        "Доступ запрещён",
        "Қол жеткізуге тыйым салынған",
        "Access denied",
    ),
    "not_found": ("Объект не найден", "Нысан табылмады", "Object not found"),
    "invalid_token": (
        "Войдите в систему",
        "Жүйеге кіріңіз",
        "Authentication required",
    ),
    "invalid_credentials": (
        "Неверный логин или пароль",
        "Логин немесе құпиясөз қате",
        "Invalid credentials",
    ),
    "validation_error": (
        "Проверьте поля запроса",
        "Сұрау өрістерін тексеріңіз",
        "Invalid request fields",
    ),
    "stale_recommendation": (
        "Расчёт устарел; повторите запрос",
        "Есеп ескірді; сұрауды қайталаңыз",
        "Calculation is stale; regenerate",
    ),
    "rate_limited": (
        "Слишком много запросов",
        "Сұраулар тым көп",
        "Too many requests",
    ),
    "internal_error": ("Внутренняя ошибка", "Ішкі қате", "Internal error"),
    "target_gap_reduction": (
        "Сокращает разрыв до выбранной цели",
        "Таңдалған мақсатқа жақындатады",
        "Reduces a gap to the selected goal",
    ),
    "audience_eligible": (
        "Соответствует текущей роли и грейду",
        "Қазіргі рөл мен деңгейге сәйкес",
        "Eligible for current role and grade",
    ),
    "history_considered": (
        "Учтена история участия",
        "Қатысу тарихы ескерілді",
        "Participation history considered",
    ),
    "history_unavailable": (
        "История участия отсутствует",
        "Қатысу тарихы жоқ",
        "No participation history available",
    ),
    "ai_disabled": (
        "Локальный подбор по правилам",
        "Жергілікті ережелер бойынша таңдау",
        "Local rule-based selection",
    ),
    "no_eligible_activity": (
        "Подходящих активностей нет",
        "Сәйкес іс-шаралар жоқ",
        "No eligible activities",
    ),
}


def message(code: str, locale: str) -> str:
    index = {"ru": 0, "kk": 1, "en": 2}.get(locale, 0)
    return MESSAGES.get(
        code,
        (
            "Операция недоступна; причина указана в code",
            "Әрекет қолжетімсіз; себебі code өрісінде көрсетілген",
            "Operation unavailable; see code for the reason",
        ),
    )[index]


def localize_run(result: dict[str, Json], locale: str) -> dict[str, Json]:
    items = result.get("items")
    if isinstance(items, list):
        for item in items:
            if not isinstance(item, dict):
                continue
            explanation = item.get("explanation")
            if not isinstance(explanation, dict):
                continue
            codes = explanation.get("reason_codes")
            if isinstance(codes, list):
                explanation["messages"] = [
                    message(str(c), locale) for c in codes
                ]
            explanation["translation_fallback"] = (
                explanation.get("language") != locale
            )
    result["language"] = locale
    return result
