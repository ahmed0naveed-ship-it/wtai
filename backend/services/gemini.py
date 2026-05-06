import os
import json
import base64
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = os.getenv("MODEL_NAME", "gemini-2.5-flash-lite")

genai.configure(api_key=API_KEY)

model = genai.GenerativeModel(MODEL_NAME)

MODE_RULES = {
    "general": (
        "Act like a premium general AI assistant. Be smart, direct, natural, "
        "helpful, and concise unless the user asks for detail."
    ),
    "math": (
        "Focus on math accuracy. Show clean steps, use LaTeX for equations, "
        "and end with the final answer when solving."
    ),
    "english": (
        "Focus on writing, reading, grammar, essays, tone, structure, and explanations. "
        "Be clear and helpful."
    ),
    "science": (
        "Focus on science accuracy. Explain concepts clearly, use steps when useful, "
        "and avoid unnecessary filler."
    ),

    # old fallback modes so older frontend values do not break
    "test": "Give a balanced answer. Keep it clear, useful, and not too long.",
    "explain": "Explain clearly like a teacher with steps, but avoid unnecessary filler.",
    "quick": "Answer in 1-4 short sentences. No long steps unless the user asks.",
}


def safe_json_history(history: str):
    try:
        parsed = json.loads(history)
        if isinstance(parsed, list):
            return parsed
        return []
    except Exception:
        return []


def build_recent_history(history: str):
    parsed_history = safe_json_history(history)

    recent_history = ""

    for msg in parsed_history[-8:]:
        role = msg.get("role", "user")
        content = msg.get("content", "")

        if content:
            recent_history += f"{role.upper()}: {content}\n"

    return recent_history


def build_prompt(
    question: str,
    mode: str,
    course: str,
    history: str = "[]",
    graph_latex: str = "",
    global_memory: str = "",
):
    rules = MODE_RULES.get(mode, MODE_RULES["general"])
    recent_history = build_recent_history(history)

    memory_context = ""

    if global_memory.strip():
        memory_context = f"""
Relevant memory from saved chats:
{global_memory.strip()}

Memory rules:
- Use saved chat memory only when it helps answer the user.
- Do not randomly bring up old chats.
- If the memory is unrelated, ignore it.
- If the user asks what they discussed before, use this memory.
"""

    graph_context = ""

    if graph_latex.strip():
        graph_context = f"""
Frontend graph rendered:
{graph_latex.strip()}

Graph rules:
- Explain this exact graph.
- Do not give a different equation.
- Do not write "[Graph: ...]".
- Do not output Python, matplotlib, Desmos setup code, or plotting code.
- Keep the graph explanation short and useful.
"""

    return f"""
You are WTAI, a premium AI assistant.

Current mode:
{mode}

Mode rules:
{rules}

Course/context:
{course}

Recent conversation:
{recent_history}

{memory_context}

Current user message:
{question}

{graph_context}

Response rules:
- Be direct and natural.
- Do not over-explain unless the user asks.
- Use markdown when helpful.
- Use LaTeX only for math.
- If the user asks to graph something, explain the graph briefly because the frontend already rendered it.
- Never output Python, matplotlib, Desmos setup code, or plotting code unless the user explicitly asks for code.
- If the user asks a follow-up like "tell me" or "what is it", use the recent conversation context.
- If the user uploaded an image, analyze it carefully.
- If you are unsure, say what you can infer instead of pretending.
"""


async def build_parts(
    question: str,
    mode: str,
    course: str,
    file=None,
    history: str = "[]",
    graph_latex: str = "",
    global_memory: str = "",
):
    prompt = build_prompt(
        question=question,
        mode=mode,
        course=course,
        history=history,
        graph_latex=graph_latex,
        global_memory=global_memory,
    )

    parts = [{"text": prompt}]

    if file is not None:
        image_bytes = await file.read()
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")

        parts.append({
            "inline_data": {
                "mime_type": file.content_type or "image/jpeg",
                "data": image_base64,
            }
        })

    return parts


def friendly_error_message(error: Exception):
    error_message = str(error)

    if "ResourceExhausted" in error_message or "Quota exceeded" in error_message:
        return "Gemini quota limit hit. Wait a bit and try again."

    if "API_KEY" in error_message or "api key" in error_message.lower():
        return "Gemini API key issue. Check your backend .env file."

    if "model" in error_message.lower() and "not found" in error_message.lower():
        return "Gemini model issue. Check MODEL_NAME in your backend .env file."

    return "Backend AI request failed."


async def ask_gemini(
    question: str,
    mode: str,
    course: str,
    file=None,
    history: str = "[]",
    graph_latex: str = "",
    global_memory: str = "",
):
    try:
        parts = await build_parts(
            question=question,
            mode=mode,
            course=course,
            file=file,
            history=history,
            graph_latex=graph_latex,
            global_memory=global_memory,
        )

        response = model.generate_content(parts)

        if hasattr(response, "text") and response.text:
            return response.text

        return "I could not generate a response."

    except Exception as e:
        print("Gemini Error:", repr(e))
        return friendly_error_message(e)


async def stream_gemini(
    question: str,
    mode: str,
    course: str,
    file=None,
    history: str = "[]",
    graph_latex: str = "",
    global_memory: str = "",
):
    try:
        parts = await build_parts(
            question=question,
            mode=mode,
            course=course,
            file=file,
            history=history,
            graph_latex=graph_latex,
            global_memory=global_memory,
        )

        response = model.generate_content(
            parts,
            stream=True,
        )

        for chunk in response:
            try:
                if hasattr(chunk, "text") and chunk.text:
                    text = chunk.text

                    # Gemini sometimes sends big chunks.
                    # Split by words so frontend feels like it is streaming.
                    words = text.split(" ")

                    for word in words:
                        if word:
                            yield word + " "

            except Exception:
                continue

    except Exception as e:
        print("Gemini Stream Error:", repr(e))

        error_message = str(e)

        if "ResourceExhausted" in error_message or "Quota exceeded" in error_message:
            yield "Gemini quota limit hit. Wait a bit and try again."
        elif "API_KEY" in error_message or "api key" in error_message.lower():
            yield "Gemini API key issue. Check your backend .env file."
        elif "model" in error_message.lower() and "not found" in error_message.lower():
            yield "Gemini model issue. Check MODEL_NAME in your backend .env file."
        else:
            yield "Backend streaming request failed. Check the backend terminal."