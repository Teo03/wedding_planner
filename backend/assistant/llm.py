"""Optional language-model layer, spoken to over the OpenAI chat-completions API.

Deliberately provider-agnostic: Groq, Gemini's compatibility endpoint,
OpenRouter, Together and Azure OpenAI all accept this same request shape, so
switching provider is three environment variables and no code change. Azure has
no free generative tier, and GitHub Models is being retired, so the default
points at Groq, whose free tier needs no card.

When nothing is configured the assistant still answers -- see views.compose --
from retrieved rows alone.
"""
import json
import urllib.error
import urllib.request

from django.conf import settings

TIMEOUT_SECONDS = 25
# urllib's default User-Agent ("Python-urllib/x.y") is rejected by the
# provider's CDN with Cloudflare error 1010, so send a real one.
USER_AGENT = "wedding-planner/1.0 (+https://github.com/Teo03/wedding_planner)"


def is_configured():
    return bool(settings.LLM_API_KEY)


def complete(system_prompt, messages):
    """Return the assistant's reply, or None if unavailable for any reason.

    Never raises: the caller has a usable deterministic answer either way, and
    a chat widget falling back is far better than a 500.
    """
    if not is_configured():
        return None

    payload = {
        "model": settings.LLM_MODEL,
        "messages": [{"role": "system", "content": system_prompt}, *messages],
        "temperature": 0.3,
        "max_tokens": 700,
    }
    request = urllib.request.Request(
        f"{settings.LLM_API_BASE.rstrip('/')}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.LLM_API_KEY}",
            "User-Agent": USER_AGENT,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            body = json.load(response)
        return body["choices"][0]["message"]["content"].strip()
    except (urllib.error.URLError, KeyError, IndexError, ValueError, TimeoutError):
        return None
