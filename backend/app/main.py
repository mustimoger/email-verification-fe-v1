from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .core.logging import configure_logging
from .core.settings import get_settings
from .api.tasks import router as tasks_router
from .api.account import router as account_router
from .api.usage import router as usage_router
from .api.api_keys import router as api_keys_router
from .api.maintenance import router as maintenance_router
from .api.overview import router as overview_router
from .api.billing import router as billing_router
from .api.integrations import router as integrations_router
from .api.account import router as account_router
from .api.usage import router as usage_router
from .api.debug import router as debug_router


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)

    app = FastAPI(title="Email Verification Backend", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.backend_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(tasks_router)
    app.include_router(account_router)
    app.include_router(usage_router)
    app.include_router(api_keys_router)
    app.include_router(integrations_router)
    app.include_router(maintenance_router)
    app.include_router(overview_router)
    app.include_router(billing_router)
    app.include_router(debug_router)

    return app


app = create_app()
