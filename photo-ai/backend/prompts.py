"""
Ядро реализма. Главная задача проекта — фотографии, неотличимые от настоящих.

Три причины «пластиковости» AI-фото и как мы с ними боремся здесь:
  1. Слова "perfect/professional/flawless" в промпте → модель переусиливает.
     → Мы избегаем их и явно просим текстуру кожи и несовершенства.
  2. Высокий guidance_scale → потеря текстуры.
     → FLUX_PARAMS["guidance_scale"] держим низким (3.5).
  3. Нет фотографических артефактов (зерно, JPEG, естественный свет).
     → REALISM_SUFFIX добавляет их; output_format=jpeg, quality=90 (не 100).

ВАЖНО: эти константы — главный объект тюнинга на Неделе 0. Скрипт
scripts/validate_replicate.py гоняет их и сохраняет результат для слепого теста.
"""

# Добавляется КО ВСЕМ промптам генерации.
REALISM_SUFFIX = (
    ", shot on Sony A7 IV, 85mm f/1.8 lens, natural available light, "
    "visible skin pores and texture, subtle skin imperfections, "
    "authentic candid expression, slight film grain, "
    "unretouched raw photo, real person, photojournalistic"
)

# Негативный промпт ко всем генерациям.
NEGATIVE_PROMPT = (
    "plastic skin, airbrushed, oversmoothed skin, flawless skin, "
    "waxy, glossy, HDR, oversaturated, beauty filter, instagram filter, "
    "retouched, photoshopped, CGI, 3d render, illustration, painting, "
    "cartoon, anime, fashion magazine cover, studio glamour, "
    "symmetrical face, doll-like, uncanny"
)

# Параметры инференса Flux. guidance_scale — самый чувствительный к реализму.
FLUX_PARAMS = {
    "guidance_scale": 3.5,        # низкий CFG = больше текстуры, меньше «пластика»
    "num_inference_steps": 28,
    "output_format": "jpg",
    "output_quality": 90,         # не 100 — лёгкие JPEG-артефакты добавляют реализма
    "aspect_ratio": "4:5",        # портретный, под аватарки/LinkedIn/дейтинг
}

# Параметры обучения LoRA. rank=32 даёт лучшее сходство, чем дефолтные 16.
LORA_TRAINING_PARAMS = {
    "steps": 1500,                # >1000 (дефолт), но не переобучение
    "lora_rank": 32,
    "optimizer": "adamw8bit",
    "learning_rate": 0.0004,
    "batch_size": 1,
    "caption_dropout_rate": 0.05,
    "trigger_word": "TOK",
    "autocaption": True,
}

# Точная версия тренера подтверждается на Неделе 0 (replicate.com может обновить hash).
FLUX_TRAINER = (
    "ostris/flux-dev-lora-trainer:"
    "4ffd32160efd92e956d39c5338a9b8fbafca58e03f791f6d8011f3e20e8ea6fa"
)

TRIGGER = "TOK"  # тригер-слово, подставляется в каждый промпт ниже


CORPORATE_STYLES = [
    {
        "name": "linkedin_business",
        "prompt": f"{TRIGGER} in business attire, linkedin profile photo, "
                  "soft neutral office background, confident warm half-smile, "
                  "three-quarter shot, looking at camera",
        "count": 10,
    },
    {
        "name": "office_casual",
        "prompt": f"{TRIGGER} in smart casual clothes, modern office environment, "
                  "natural window light, relaxed professional expression, "
                  "environmental portrait",
        "count": 10,
    },
    {
        "name": "conference",
        "prompt": f"{TRIGGER} at a business conference, subtly blurred audience "
                  "behind, engaged listening expression, event documentary photo",
        "count": 10,
    },
    {
        "name": "executive",
        "prompt": f"{TRIGGER} executive portrait, dark suit, premium office interior, "
                  "authoritative yet approachable expression, corporate headshot",
        "count": 10,
    },
    {
        "name": "resume_classic",
        "prompt": f"{TRIGGER} resume photo, plain neutral grey background, "
                  "front-facing, professional attire, clean simple headshot",
        "count": 10,
    },
    {
        "name": "smart_casual",
        "prompt": f"{TRIGGER} in smart casual, coffee shop or loft background, "
                  "relaxed natural pose, approachable lifestyle professional portrait",
        "count": 10,
    },
    {
        "name": "outdoor_business",
        "prompt": f"{TRIGGER} outdoors in business casual, city street background, "
                  "golden hour light, dynamic candid moment",
        "count": 10,
    },
    {
        "name": "studio_neutral",
        "prompt": f"{TRIGGER} studio portrait, seamless backdrop, even soft lighting, "
                  "classic timeless professional headshot",
        "count": 10,
    },
]

DATING_STYLES = [
    {
        "name": "casual_weekend",
        "prompt": f"{TRIGGER} on a casual weekend, park or street, relaxed smile, "
                  "everyday outfit, golden hour sunlight, candid spontaneous",
        "count": 10,
    },
    {
        "name": "coffee_shop",
        "prompt": f"{TRIGGER} at a coffee shop, warm ambient light, cozy casual vibe, "
                  "relaxed and comfortable, lifestyle portrait",
        "count": 10,
    },
    {
        "name": "evening_out",
        "prompt": f"{TRIGGER} on an evening out, restaurant or bar background, "
                  "stylish evening look, city lights bokeh, date-night vibe",
        "count": 10,
    },
    {
        "name": "active_lifestyle",
        "prompt": f"{TRIGGER} active outdoors, sporty casual wear, park or waterfront, "
                  "energetic healthy vibe, natural movement",
        "count": 10,
    },
    {
        "name": "travel_vibes",
        "prompt": f"{TRIGGER} traveling, interesting architectural background, "
                  "explorer casual style, authentic travel moment",
        "count": 10,
    },
    {
        "name": "home_cozy",
        "prompt": f"{TRIGGER} at home, cozy interior, soft natural window light, "
                  "comfortable casual wear, warm inviting atmosphere",
        "count": 10,
    },
    {
        "name": "urban_rooftop",
        "prompt": f"{TRIGGER} on an urban rooftop, city skyline at sunset, "
                  "stylish casual, confident modern pose, street aesthetic",
        "count": 10,
    },
    {
        "name": "close_up_confidence",
        "prompt": f"{TRIGGER} close-up portrait outdoors, soft natural background, "
                  "genuine warm smile, direct eye contact",
        "count": 10,
    },
]

STYLE_MAP = {
    "corporate": CORPORATE_STYLES,
    "dating": DATING_STYLES,
    "bundle": CORPORATE_STYLES + DATING_STYLES,
}


def build_generation_input(style_prompt: str, seed: int) -> dict:
    """Собирает полный input для replicate.run() из стиля + реализм-обвязки."""
    return {
        "prompt": style_prompt + REALISM_SUFFIX,
        "negative_prompt": NEGATIVE_PROMPT,
        "seed": seed,
        **FLUX_PARAMS,
    }
