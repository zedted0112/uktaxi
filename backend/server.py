# Thin entry-point shim — keeps `uvicorn server:app` working unchanged.
# All application logic now lives in the `app/` package.
from app.main import app  # noqa: F401
