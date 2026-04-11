import os
import json
import structlog
from typing import List, Dict, Any
from anthropic import AsyncAnthropic
import openai

log = structlog.get_logger()

# Fallback mechanism if Anthropic is down
class LLMService:
    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "anthropic").lower()
        self.anthropic = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY") or os.getenv("LLM_API_KEY"))
        self.openai_client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY") or os.getenv("LLM_API_KEY"))
        
    async def extract_intent(self, user_message: str, history: List[Dict[str, str]] = None) -> dict:
        """Extract NLP intent for searching Qdrant and filtering context."""
        system_prompt = '''
        You are NeuralFlix AI — a cinematic intelligence. 
        Extract movie search intent: genres, themes, emotional tone, era preference, and pacing.
        Return strict JSON object with these keys: 
        {"search_query": "Optimized natural language search for vector DB", "genres": ["list"], "tone": "string", "era": "string"}
        '''
        
        if history is None:
            history = []
        messages = history + [{"role": "user", "content": f"Extract intent for: {user_message}"}]

        try:
            if self.provider == "anthropic":
                response = await self.anthropic.messages.create(
                    model="claude-3-haiku-20240307",
                    system=system_prompt,
                    max_tokens=200,
                    messages=messages
                )
                content = response.content[0].text
            else:
                response = await self.openai_client.chat.completions.create(
                    model="gpt-3.5-turbo-json",
                    messages=[{"role": "system", "content": system_prompt}] + messages,
                    response_format={"type": "json_object"}
                )
                content = response.choices[0].message.content
                
            return json.loads(content)
            
        except Exception as e:
            log.error("llm_intent_extraction_failed", error=str(e), provider=self.provider)
            return {"search_query": user_message, "genres": [], "tone": "", "era": ""}

    async def explain_recommendations_stream(self, user_message: str, movies: List[Dict[str, Any]]) -> str:
        """Stream an explanation of why these movies were chosen."""
        movie_titles = ", ".join([m.get("title", "") for m in movies[:5]])
        system_prompt = f"""
        You are NeuralFlix AI. A user asked: "{user_message}". 
        We are recommending these movies: {movie_titles}.
        Briefly explain why in a highly engaging, cinematic, and personalized tone (2-3 sentences max).
        """
        
        try:
            if self.provider == "anthropic":
                stream = await self.anthropic.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=300,
                    system=system_prompt,
                    messages=[{"role": "user", "content": "Explain these recommendations."}],
                    stream=True
                )
                async for event in stream:
                    if event.type == "content_block_delta":
                        yield event.delta.text
            else:
                stream = await self.openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "system", "content": system_prompt}],
                    stream=True
                )
                async for chunk in stream:
                    if chunk.choices and chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
        except Exception as e:
            log.error("llm_explanation_stream_failed", error=str(e))
            yield "Here are some cinematic masterpieces curated just for your tastes."

llm_service = LLMService()
