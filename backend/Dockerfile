FROM python:3.13.8-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_COMPILE_BYTECODE=1
RUN pip install --no-cache-dir uv==0.12.18
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project
COPY src ./src
COPY migrations ./migrations
COPY alembic.ini ./
RUN uv sync --locked --no-dev && useradd --create-home appuser && chown -R appuser /app
USER appuser
EXPOSE 8000
CMD ["uv", "run", "--no-sync", "uvicorn", "career_quest.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
