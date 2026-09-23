import logging
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from time import perf_counter
from uuid import uuid4

import httpx
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from starlette.exceptions import HTTPException
from starlette.responses import Response

from career_quest.bootstrap import build, database_factory
from career_quest.infrastructure.settings import Settings
from career_quest.modules.careers.presentation.routes import router as careers
from career_quest.modules.competencies.presentation.routes import (
    router as competencies,
)
from career_quest.modules.data_import.presentation.routes import (
    router as imports,
)
from career_quest.modules.hr.presentation.routes import router as hr
from career_quest.modules.identity.presentation.routes import (
    router as identity,
)
from career_quest.modules.learning.presentation.routes import (
    router as learning,
)
from career_quest.modules.people.domain.models import CatalogState
from career_quest.modules.recommendations.presentation.routes import (
    router as recommendations,
)
from career_quest.shared.domain.core import BusinessError, DatasetClock
from career_quest.shared.presentation.localization import message

logger = logging.getLogger("career_quest")


def create_app(settings: Settings | None = None) -> FastAPI:
    configuration = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        engine, factory = database_factory(configuration)
        async with httpx.AsyncClient(follow_redirects=False) as client:
            app.state.engine = engine
            app.state.runtime = build(configuration, factory, client)
            try:
                async with factory() as uow:
                    dates = {
                        s.as_of_date
                        for s in await uow.store.find(CatalogState)
                    }
                    if len(dates) == 1:
                        app.state.runtime.clock = DatasetClock(dates.pop())
                    elif len(dates) > 1:
                        raise RuntimeError(
                            "Multiple business dates in one database"
                        )
            except SQLAlchemyError:
                # Readiness reports missing migrations.
                logger.warning("schema_unavailable")
            try:
                yield
            finally:
                await engine.dispose()

    app = FastAPI(
        title="Career Quest",
        version="0.1.0",
        lifespan=lifespan,
        description=(
            "Independent verification and explainable career development."
        ),
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=configuration.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "Idempotency-Key",
            "Accept-Language",
        ],
    )

    def error(
        request: Request, code: str, status: int, details: object = None
    ) -> JSONResponse:
        locale = (
            request.headers.get("accept-language", "ru")
            .split(",")[0]
            .split("-")[0]
        )
        return JSONResponse(
            status_code=status,
            content={
                "code": code,
                "message": message(code, locale),
                "details": details or {},
                "request_id": getattr(
                    request.state, "request_id", str(uuid4())
                ),
            },
        )

    @app.exception_handler(BusinessError)
    async def business_error(
        request: Request, exc: BusinessError
    ) -> JSONResponse:
        return error(request, exc.code, exc.status, exc.details)

    @app.exception_handler(RequestValidationError)
    async def validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return error(
            request,
            "validation_error",
            422,
            {
                "fields": [
                    {"location": list(e["loc"]), "type": e["type"]}
                    for e in exc.errors()
                ]
            },
        )

    @app.exception_handler(IntegrityError)
    async def integrity_error(
        request: Request, exc: IntegrityError
    ) -> JSONResponse:
        return error(request, "integrity_conflict", 409)

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException) -> JSONResponse:
        return error(
            request,
            "not_found" if exc.status_code == 404 else "http_error",
            exc.status_code,
        )

    @app.middleware("http")
    async def observation(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request.state.request_id = str(uuid4())
        start = perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            logger.error(
                "request_failed request_id=%s", request.state.request_id
            )
            response = error(request, "internal_error", 500)
        response.headers["X-Request-ID"] = request.state.request_id
        route = request.scope.get("route")
        logger.info(
            "request_id=%s operation=%s duration_ms=%.2f status=%s",
            request.state.request_id,
            getattr(route, "path", "unmatched"),
            (perf_counter() - start) * 1000,
            response.status_code,
        )
        return response

    @app.get("/health/live", tags=["health"])
    async def live() -> dict[str, str]:
        return {"status": "live"}

    @app.get("/health/ready", tags=["health"])
    async def ready(request: Request) -> Response:
        try:
            async with app.state.engine.connect() as connection:
                revision = (
                    await connection.execute(
                        text("SELECT version_num FROM alembic_version")
                    )
                ).scalar_one()
                if revision != "0001":
                    return error(request, "schema_not_ready", 503)
            return JSONResponse({"status": "ready"})
        except SQLAlchemyError:
            return error(request, "database_not_ready", 503)

    for router in [
        identity,
        competencies,
        careers,
        learning,
        recommendations,
        hr,
        imports,
    ]:
        app.include_router(router, prefix="/api/v1")
    return app


app = create_app()
