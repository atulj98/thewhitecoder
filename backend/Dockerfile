FROM python:3.12-slim
WORKDIR /app/backend
COPY backend/ /app/backend/
COPY content/published/ /app/content/published/
RUN pip install --no-cache-dir . && useradd --uid 10001 --create-home twc
USER twc
EXPOSE 8000
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
