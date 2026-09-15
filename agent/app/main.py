import asyncio
import logging
import os
import uuid
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.logging_config import configure_logging, mask_secret, safe_json, set_trace_id, summarize_chat_messages
from app.llm_chat import ChatCompletionRequest, chat_completion
from app.llm_models import ListModelsRequest, fetch_remote_models
from app.middleware.request_logging import RequestLoggingMiddleware
from app.schemas.ai_review import AiReviewRequest, AiReviewResult
from app.schemas.prompt_optimize import PromptOptimizeRequest, PromptOptimizeResult
from app.services.managed_ai_review_service import ManagedAiReviewService
from app.services.prompt_optimizer_service import PromptOptimizerService

logger = logging.getLogger(__name__)
settings = get_settings()
configure_logging(settings.log_level)
ai_review_service = ManagedAiReviewService()
prompt_optimizer_service = PromptOptimizerService()
_review_executor = ThreadPoolExecutor(
    max_workers=settings.ai_review_worker_threads,
    thread_name_prefix="ai-review",
)


def _execute_ai_review(body: AiReviewRequest, tid: str) -> AiReviewResult:
    set_trace_id(tid)
    return ai_review_service.execute(body)


def _execute_prompt_optimize(body: PromptOptimizeRequest, tid: str) -> PromptOptimizeResult:
    set_trace_id(tid)
    return prompt_optimizer_service.execute(body)


class ApiResponse(BaseModel):
    code: str
    message: str
    data: Any | None
    traceId: str


def trace_id(request: Request) -> str:
    incoming = request.headers.get("x-trace-id")
    resolved = incoming if incoming else uuid.uuid4().hex
    set_trace_id(resolved)
    return resolved


def require_internal_token(
    request: Request,
    x_internal_token: str | None = Header(default=None, alias="X-Internal-Token"),
) -> None:
    expected = os.getenv("LABELHUB_INTERNAL_TOKEN")
    if not expected:
        raise HTTPException(
            status_code=500,
            detail=ApiResponse(
                code="INTERNAL_TOKEN_NOT_CONFIGURED",
                message="LABELHUB_INTERNAL_TOKEN is not configured",
                data=None,
                traceId=trace_id(request),
            ).model_dump(),
        )
    if x_internal_token != expected:
        raise HTTPException(
            status_code=401,
            detail=ApiResponse(
                code="INTERNAL_UNAUTHORIZED",
                message="Internal token is invalid",
                data=None,
                traceId=trace_id(request),
            ).model_dump(),
        )


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info(
        "Agent starting version=0.1.0 log_level=%s log_http_bodies=%s",
        settings.log_level,
        settings.effective_log_http_bodies,
    )
    yield
    logger.info("Agent shutting down")
    _review_executor.shutdown(wait=False, cancel_futures=True)


app = FastAPI(title="LabelHub Agent", version="0.1.0", lifespan=lifespan)
app.add_middleware(RequestLoggingMiddleware, log_http_bodies=settings.effective_log_http_bodies)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict) and {"code", "message", "traceId"}.issubset(exc.detail.keys()):
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content=ApiResponse(
            code="SYSTEM_ERROR",
            message=str(exc.detail),
            data=None,
            traceId=trace_id(request),
        ).model_dump(),
    )


@app.get("/health", response_model=ApiResponse)
async def health(request: Request) -> ApiResponse:
    return ApiResponse(code="SUCCESS", message="success", data={"status": "UP"}, traceId=trace_id(request))


@app.get("/internal/health", response_model=ApiResponse, dependencies=[Depends(require_internal_token)])
async def internal_health(request: Request) -> ApiResponse:
    return ApiResponse(
        code="SUCCESS",
        message="success",
        data={"status": "UP", "scope": "internal"},
        traceId=trace_id(request),
    )


@app.post("/internal/llm/list-models", response_model=ApiResponse, dependencies=[Depends(require_internal_token)])
async def internal_list_models(request: Request, body: ListModelsRequest) -> ApiResponse:
    tid = trace_id(request)
    logger.info(
        "list-models provider=%s base_url=%s api_key=%s",
        body.provider_code or "-",
        body.base_url,
        mask_secret(body.api_key),
    )
    try:
        models = await fetch_remote_models(body)
        logger.info("list-models success count=%s", len(models))
        return ApiResponse(
            code="SUCCESS",
            message="success",
            data=[
                {
                    "modelCode": model.model_code,
                    "modelName": model.model_name,
                    "modelType": model.model_type,
                }
                for model in models
            ],
            traceId=tid,
        )
    except httpx.HTTPStatusError as exc:
        message = str(exc) if str(exc) else f"Provider list models failed: HTTP {exc.response.status_code}"
        logger.warning("list-models provider error status=%s message=%s", exc.response.status_code, message)
        raise HTTPException(
            status_code=502,
            detail=ApiResponse(
                code="REMOTE_PROVIDER_ERROR",
                message=message,
                data=None,
                traceId=tid,
            ).model_dump(),
        ) from exc
    except httpx.HTTPError as exc:
        logger.warning("list-models transport error: %s", exc)
        raise HTTPException(
            status_code=502,
            detail=ApiResponse(
                code="REMOTE_PROVIDER_ERROR",
                message=f"Provider list models failed: {exc}",
                data=None,
                traceId=tid,
            ).model_dump(),
        ) from exc


@app.post("/internal/llm/chat", response_model=ApiResponse, dependencies=[Depends(require_internal_token)])
async def internal_chat_completion(request: Request, body: ChatCompletionRequest) -> ApiResponse:
    tid = trace_id(request)
    logger.info(
        "chat-completion model=%s base_url=%s api_key=%s temperature=%s messages=%s",
        body.model,
        body.base_url,
        mask_secret(body.api_key),
        body.temperature,
        summarize_chat_messages([message.model_dump() for message in body.messages]),
    )
    if settings.effective_log_http_bodies:
        logger.debug(
            "chat-completion messages detail=%s",
            safe_json([message.model_dump() for message in body.messages]),
        )
    try:
        result = await chat_completion(body)
        logger.info(
            "chat-completion success model=%s text_len=%s preview=%s",
            result.model,
            len(result.text),
            result.text[:200],
        )
        return ApiResponse(
            code="SUCCESS",
            message="success",
            data=result.model_dump(),
            traceId=tid,
        )
    except httpx.HTTPStatusError as exc:
        logger.warning("chat-completion provider error status=%s", exc.response.status_code)
        raise HTTPException(
            status_code=502,
            detail=ApiResponse(
                code="REMOTE_PROVIDER_ERROR",
                message=f"Provider chat failed: HTTP {exc.response.status_code}",
                data=None,
                traceId=tid,
            ).model_dump(),
        ) from exc
    except httpx.HTTPError as exc:
        logger.warning("chat-completion transport error: %s", exc)
        raise HTTPException(
            status_code=502,
            detail=ApiResponse(
                code="REMOTE_PROVIDER_ERROR",
                message=f"Provider chat failed: {exc}",
                data=None,
                traceId=tid,
            ).model_dump(),
        ) from exc
    except ValueError as exc:
        logger.warning("chat-completion invalid response: %s", exc)
        raise HTTPException(
            status_code=502,
            detail=ApiResponse(
                code="REMOTE_PROVIDER_ERROR",
                message=str(exc),
                data=None,
                traceId=tid,
            ).model_dump(),
        ) from exc


@app.post(
    "/v1/ai-review",
    response_model=AiReviewResult,
    response_model_by_alias=True,
    summary="Execute AI review for a submission version",
    dependencies=[Depends(require_internal_token)],
)
async def execute_ai_review(request: Request, body: AiReviewRequest) -> AiReviewResult:
    """
    Backend → Agent 预审契约接口（必须携带 X-Internal-Token）。
    阻塞 LLM 调用在线程池执行，避免阻塞 asyncio 事件循环。
    """
    tid = trace_id(request)
    logger.info(
        "ai-review start submission_id=%s version_id=%s task_id=%s platform=%s model=%s dimensions=%s",
        body.submission_id,
        body.submission_version_id,
        body.task_id,
        body.platform_key,
        body.model_id,
        len(body.dimensions or []),
    )
    if settings.effective_log_http_bodies:
        logger.debug(
            "ai-review payload snapshot=%s",
            safe_json(
                {
                    "submitDataKeys": sorted((body.submit_data or {}).keys()),
                    "itemPayloadKeys": sorted((body.item_payload or {}).keys()),
                    "memoryContextCount": len(body.memory_context or []),
                    "promptTemplateLen": len(body.prompt_template or ""),
                }
            ),
        )
    loop = asyncio.get_running_loop()
    try:
        result = await loop.run_in_executor(_review_executor, _execute_ai_review, body, tid)
        logger.info(
            "ai-review success submission_id=%s verdict=%s total_score=%s trace=%s",
            body.submission_id,
            result.verdict,
            result.total_score,
            tid,
        )
        return result
    except ValueError as exc:
        logger.warning("ai-review bad request submission_id=%s error=%s", body.submission_id, exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("ai-review execution failed submission_id=%s", body.submission_id)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post(
    "/v1/prompt-optimize",
    response_model=PromptOptimizeResult,
    response_model_by_alias=True,
    summary="Optimize review prompt template from misalignment cases",
    dependencies=[Depends(require_internal_token)],
)
async def execute_prompt_optimize(request: Request, body: PromptOptimizeRequest) -> PromptOptimizeResult:
    """
    Backend → Agent 提示词优化契约接口（必须携带 X-Internal-Token）。
    阻塞 LLM 调用在线程池执行，避免阻塞 asyncio 事件循环。
    """
    tid = trace_id(request)
    logger.info(
        "prompt-optimize start cases=%s dimensions=%s goals=%s",
        len(body.misalignment_cases or []),
        len(body.dimensions or []),
        len(body.optimization_goals or []),
    )
    if settings.effective_log_http_bodies:
        logger.debug(
            "prompt-optimize payload snapshot=%s",
            safe_json(
                {
                    "baselinePromptLen": len(body.baseline_prompt_template or ""),
                    "misalignmentCaseCount": len(body.misalignment_cases or []),
                    "optimizationGoalCount": len(body.optimization_goals or []),
                }
            ),
        )
    loop = asyncio.get_running_loop()
    try:
        result = await loop.run_in_executor(_review_executor, _execute_prompt_optimize, body, tid)
        logger.info(
            "prompt-optimize success targeted_types=%s trace=%s",
            result.targeted_misalignment_types,
            tid,
        )
        return result
    except ValueError as exc:
        logger.warning("prompt-optimize bad request error=%s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("prompt-optimize execution failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
