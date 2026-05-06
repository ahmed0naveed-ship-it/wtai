import os

from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import StreamingResponse

from services.gemini import ask_gemini, stream_gemini


router = APIRouter()


@router.get("/status")
async def status():
    return {
        "status": "online",
        "provider": "Gemini",
        "model": os.getenv("MODEL_NAME", "gemini-2.5-flash-lite"),
    }


@router.post("/solve")
async def solve(
    question: str = Form(...),
    mode: str = Form("general"),
    course: str = Form("general"),
    history: str = Form("[]"),
    graph_latex: str = Form(""),
    global_memory: str = Form(""),
    file: UploadFile | None = File(None),
):
    answer = await ask_gemini(
        question=question,
        mode=mode,
        course=course,
        file=file,
        history=history,
        graph_latex=graph_latex,
        global_memory=global_memory,
    )

    return {"answer": answer}


@router.post("/stream")
async def stream(
    question: str = Form(...),
    mode: str = Form("general"),
    course: str = Form("general"),
    history: str = Form("[]"),
    graph_latex: str = Form(""),
    global_memory: str = Form(""),
    file: UploadFile | None = File(None),
):
    return StreamingResponse(
        stream_gemini(
            question=question,
            mode=mode,
            course=course,
            file=file,
            history=history,
            graph_latex=graph_latex,
            global_memory=global_memory,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )