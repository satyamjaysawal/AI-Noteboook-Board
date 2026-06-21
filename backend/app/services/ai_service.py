import json
import re

import google.generativeai as genai

from app.config import get_settings

PROMPTS = {
    "correct_sentence": 'Correct the grammar and structure of this sentence without explanation:\n"{prompt}"',
    "word_suggestions": (
        "Suggest 3-5 alternative words for each significant word in this text "
        '(exclude articles and prepositions). Return suggestions in JSON:\n"{prompt}"'
    ),
    "summarize": 'Summarize this text in 1-2 sentences:\n"{prompt}"',
    "generate": 'Generate a response based on this prompt:\n"{prompt}"',
    "expand": 'Expand this text into a detailed paragraph:\n"{prompt}"',
}


class AIService:
    def __init__(self) -> None:
        settings = get_settings()
        self._model = None

        if settings.google_api_key:
            genai.configure(api_key=settings.google_api_key)
            self._model = genai.GenerativeModel(
                "gemini-2.5-flash",
                generation_config={"temperature": 0.7, "max_output_tokens": 1000},
            )

    @property
    def is_configured(self) -> bool:
        return self._model is not None

    @staticmethod
    def _clean_markdown(text: str) -> str:
        return re.sub(r"```json|```", "", text).strip()

    async def process(self, task: str, prompt: str) -> dict:
        if not self._model:
            raise RuntimeError("AI model is not configured")

        template = PROMPTS.get(task, PROMPTS["generate"])
        final_prompt = template.format(prompt=prompt)

        response = await self._model.generate_content_async(final_prompt)
        cleaned = self._clean_markdown(response.text.strip())

        if task == "word_suggestions":
            try:
                return {"suggestions": json.loads(cleaned)}
            except json.JSONDecodeError:
                return {"suggestions": [line.strip() for line in cleaned.split("\n") if line.strip()]}

        return {"response": cleaned}