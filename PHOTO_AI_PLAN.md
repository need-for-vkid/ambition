# AI Photo Avatars — Детальный план технической реализации

> Статус: v1.0 — план до написания кода  
> Рынок: Россия  
> Ключевое требование: фотореалистичность — неотличимость от настоящих фото

---

## 0. Ключевой принцип: реалистичность важнее качества

**Главная проблема всех AI-аватарок**: они выглядят «слишком правильно» — идеальная кожа, студийный свет, нет ни одной природной несовершенности. Люди сразу видят, что это AI. Это убивает доверие к продукту.

**Решение встроено на уровне архитектуры** — не как пост-обработка, а как основа промпт-инженерии и настроек модели. Подробно в секции ML.

---

## 1. Продуктовые гипотезы

### Гипотеза 1: Профессиональный пакет (корпоративный)

**Аудитория**: IT-специалисты, менеджеры, фрилансеры на Upwork/FL.ru, HR-специалисты, продавцы B2B  
**Боль**: нужно профессиональное фото для LinkedIn / резюме / корпоративного сайта, но фотограф стоит 5,000-15,000₽ и надо записываться за 2 недели  
**Оффер**: 80 профессиональных хедшотов в 8 стилях за 990₽, готовых через 90 минут  
**Стили**:
- LinkedIn Business (деловой, нейтральный фон)
- Office Casual (кэжуал в офисной среде)
- Conference Speaker (уверенная поза, аудитория на фоне)
- Executive Premium (тёмный костюм, глубокий интерьер)
- Resume Classic (серый/белый фон, фронтальный портрет)
- Smart Casual (кофейня/лофт, расслабленная поза)
- Outdoor Business (улица, естественный свет)
- Studio Neutral (нейтральный фон, любой стиль одежды)

**Каналы**: Яндекс.Директ («фото для LinkedIn», «хедшот», «корпоративное фото»), HH.ru таргет, LinkedIn таргет (если доступен), IT Telegram-каналы

---

### Гипотеза 2: Дейтинг / Lifestyle пакет

**Аудитория**: мужчины и женщины 22-38 лет, пользователи Tinder/Mamba/Badoo/Bumble, одинокие, хотят улучшить профиль  
**Боль**: на всех фото выгляжу плохо, хочу нормальные фото но не хочу объяснять зачем фотографируюсь  
**Инсайт**: это самый *виральный* сегмент — люди делятся результатами, показывают друзьям  
**Оффер**: 80 lifestyle-фото в 8 стилях за 990₽  
**Стили**:
- Casual Weekend (парк/улица, легкая улыбка)
- Coffee Shop (кофейня, расслабленная поза)
- Evening Out (вечерний лук, ресторан на фоне)
- Active Lifestyle (спорт, открытое пространство)
- Travel Vibes (имитация путешествия, природный фон)
- Home Cozy (дома, мягкий уютный свет)
- Rooftop / Urban (урбанистика, закат)
- Confidence Close-Up (крупный план, естественный свет)

**Каналы**: VK Ads (таргет по дейтинг-интересам), TikTok (контент «before/after»), Telegram каналы про дейтинг и отношения, Instagram (если доступен через VPN-аудиторию)

**Вирусный механизм**: водяной знак «сделано в [бренд].ru» на превью (снимается после публикации в соцсетях с нашей меткой)

---

### Гипотеза 3: Telegram / VK аватарки

**Аудитория**: все — массовый рынок, низкий порог входа  
**Боль**: хочу красивую аватарку в Telegram/VK, текущее фото стыдно показывать  
**Оффер**: 20 аватарок в 4 стилях за 390₽ — максимально дешёвый входной тикет  
**Цель этой гипотезы**: виральность и объём, а не маржинальность. Конвертация в основные пакеты.  
**Стратегия**: купивший аватарки получает оффер «обновить полный профиль» со скидкой 200₽

---

### Гипотеза 4: Пакет «Охота за работой»

**Аудитория**: люди активно ищущие работу через HH.ru / SuperJob  
**Боль**: HR видят плохое фото и не кликают — хочу фото которое выглядит как у топ-менеджера  
**Уникальный угол**: не «красивое фото», а «фото которое проходит HR-фильтр»  
**Канал**: рекламный ретаргет HH.ru (если доступен), контент-маркетинг «как HR оценивает фото в резюме»  
**Примечание**: по сути является вариантом Гипотезы 1, но с другим фреймингом и лендингом. Тестировать как A/B к корпоративному.

---

### Матрица приоритетов

| Гипотеза | CAC потенциал | Виральность | Маржа | Срочность покупки | Приоритет |
|---|---|---|---|---|---|
| Корпоративный | Низкий | Низкая | Высокая | Средняя | **1** |
| Дейтинг | Средний | Высокая | Высокая | Высокая | **2** |
| Telegram аватарки | Низкий | Очень высокая | Низкая | Высокая | **3 (после MVP)** |
| Охота за работой | Средний | Низкая | Высокая | Высокая | A/B к №1 |

**Стратегия запуска**: сначала тестируем Гипотезы 1 и 2 одновременно с раздельными лендингами и единым бэкендом. Через 2 недели смотрим что конвертирует лучше.

---

## 2. Апсейл-механика

### Логика (почему это работает)

После обучения LoRA на фото пользователя — генерировать дополнительные стили почти бесплатно (~90₽ на 80 фото). Себестоимость апсейла = 90₽. Продаём за 490₽. Маржа апсейла = 400₽ (81%).

Пользователь уже в режиме покупки, LoRA уже обучена, фото заново загружать не нужно — барьер для апсейла минимален.

### Flow апсейла

```
[Пользователь оплатил корпоративный пакет 990₽]
         ↓
[Страница успеха — показывается немедленно]
         ↓
┌─────────────────────────────────────────────┐
│  "Мы уже обрабатываем твои фото.            │
│  Пока LoRA обучается на твоих фото,         │
│  добавь дейтинг-пакет за 490₽ вместо 990₽. │
│  Загружать фото заново не нужно —           │
│  мы используем те же самые."                │
│                                             │
│  [Добавить дейтинг за 490₽] [Нет, спасибо] │
└─────────────────────────────────────────────┘
         ↓ (если не конвертировал на странице)
[Email через 45 минут: «Твои корпоративные фото почти готовы.
 Последний шанс добавить дейтинг-пакет за 490₽ — 
 предложение сгорает когда мы доставим твой заказ»]
         ↓ (если не конвертировал после email)
[Email с результатами: включить ненавязчивый блок
 «Понравились результаты? Добавь дейтинг за 490₽»]
```

### Аналогичная механика в обратную сторону

Купивший дейтинг-пакет получает оффер «добавить корпоративный за 490₽». Один и тот же апсейл работает в обе стороны.

### Пакеты и цены

| Пакет | Цена | Кол-во фото | Стилей | Себестоимость | Маржа |
|---|---|---|---|---|---|
| Корпоративный | 990₽ | 80 | 8 | ~230₽ | ~77% |
| Дейтинг | 990₽ | 80 | 8 | ~230₽ | ~77% |
| Бандл (оба) | 1,490₽ | 160 | 16 | ~320₽ | ~79% |
| Апсейл (к любому) | 490₽ | 80 | 8 | ~90₽ | ~82% |
| Telegram аватарки | 390₽ | 20 | 4 | ~110₽ | ~72% |

---

## 3. Технический план

### 3.1 Стек

```
Бэкенд:      FastAPI (Python 3.11)
БД:          SQLite → PostgreSQL при >500 заказов/месяц
ML:          Replicate API (flux-dev-lora-trainer)
Хранилище:   Yandex Object Storage (S3-совместимый, 152-ФЗ)
Платежи:     ЮКасса (основной), Робокасса (резерв)
Email:       Yandex SMTP (до 500/день бесплатно)
Хостинг:     Yandex Cloud Compute (VPS 2vCPU/4GB, ~500₽/мес)
Лендинги:    Tilda (отдельная страница загрузки — наш HTML)
```

### 3.2 Структура репозитория

```
photo-ai/
├── backend/
│   ├── main.py              # FastAPI app, роутеры
│   ├── config.py            # Настройки (env vars)
│   ├── models.py            # SQLite схема + Pydantic models
│   ├── pipeline.py          # ML pipeline (Replicate)
│   ├── prompts.py           # Промпты по стилям (КРИТИЧНО)
│   ├── storage.py           # Yandex S3 client
│   ├── payments.py          # ЮКасса webhook + создание платежа
│   ├── email_service.py     # SMTP email шаблоны
│   └── upsell.py            # Логика апсейл-триггеров
├── frontend/
│   ├── upload.html          # Страница загрузки фото
│   ├── success.html         # Страница успеха + апсейл
│   ├── status.html          # Страница статуса заказа
│   └── static/              # CSS, JS
├── tests/
│   ├── test_pipeline.py     # Тест пайплайна (с реальными $)
│   ├── test_payments.py     # Mock ЮКасса webhooks
│   └── conftest.py
├── scripts/
│   ├── test_realism.py      # Скрипт тестирования разных промптов
│   └── benchmark_models.py  # Сравнение моделей
├── .env.example
├── requirements.txt
└── Dockerfile
```

### 3.3 База данных (models.py)

```python
# Полная схема SQLite

CREATE TABLE orders (
    id           TEXT PRIMARY KEY,          -- UUID
    email        TEXT NOT NULL,
    phone        TEXT,
    package      TEXT NOT NULL,             -- 'corporate', 'dating', 'bundle', 'telegram'
    status       TEXT DEFAULT 'created',    -- created | paid | uploading | training |
                                            -- generating | packaging | done | failed
    payment_id   TEXT,                      -- ЮКасса payment ID
    photos_zip_s3_key  TEXT,               -- ключ в S3
    result_zip_s3_key  TEXT,
    lora_version TEXT,                      -- Replicate model version после тренинга
    replicate_training_id TEXT,
    error_message TEXT,
    upsell_shown    INTEGER DEFAULT 0,      -- Boolean
    upsell_package  TEXT,                   -- какой апсейл предложили
    upsell_paid     INTEGER DEFAULT 0,
    upsell_payment_id TEXT,
    created_at   TEXT DEFAULT (datetime('now')),
    paid_at      TEXT,
    completed_at TEXT
);

CREATE TABLE photo_uploads (
    id       TEXT PRIMARY KEY,
    order_id TEXT REFERENCES orders(id),
    s3_key   TEXT NOT NULL,
    filename TEXT,
    uploaded_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE generated_photos (
    id         TEXT PRIMARY KEY,
    order_id   TEXT REFERENCES orders(id),
    style      TEXT NOT NULL,
    s3_key     TEXT NOT NULL,
    seed       INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);
```

### 3.4 ML Pipeline (pipeline.py) — с акцентом на реализм

#### Проблема «пластиковых» AI-фото и её решение

Большинство AI-фото выглядят нереалистично по трём причинам:
1. Промпты используют слова «perfect», «professional», «flawless» → модель переусиливает
2. Слишком высокий guidance scale → потеря текстуры
3. Отсутствие фотографических артефактов (зерно, хроматические аберрации, несовершенства)

**Решение — встроено в промпты и параметры обучения**:

```python
# prompts.py — КРИТИЧЕСКИЙ ФАЙЛ

# Суффикс для реализма (добавляется ко ВСЕМ промптам)
REALISM_SUFFIX = (
    ", shot on Sony A7IV 85mm f/1.8, natural available light, "
    "slight skin texture visible, authentic expression, "
    "candid moment, raw photo unretouched, slight film grain, "
    "real person photography"
)

# Негативный промпт (добавляется ко всем генерациям)
NEGATIVE_PROMPT = (
    "plastic skin, airbrushed, oversmoothed, perfect skin texture, "
    "fake studio lighting, HDR, oversaturated, painted, CGI, "
    "rendered, cartoon, illustration, unrealistic, fashion magazine, "
    "retouched portrait, beauty filter"
)

# Параметры Flux для реализма
FLUX_PARAMS = {
    "guidance_scale": 3.5,          # КЛЮЧЕВО: низкий CFG = более реалистично
    "num_inference_steps": 28,      # Баланс качество/скорость
    "output_format": "jpeg",        # JPEG артефакты = более реалистично чем PNG
    "output_quality": 90,           # Не 100 — избегаем «рекламного» качества
}

# Параметры обучения LoRA для максимального сходства
LORA_TRAINING_PARAMS = {
    "steps": 1500,                  # Больше чем дефолт (1000), но не переобучение
    "lora_rank": 32,                # 32 вместо 16 — лучше сохраняет identity
    "optimizer": "adamw8bit",
    "learning_rate": 0.0004,        # Немного ниже дефолта
    "batch_size": 1,
    "caption_dropout_rate": 0.05,
    "trigger_word": "TOK",
}

# Стили корпоративного пакета
CORPORATE_STYLES = [
    {
        "name": "linkedin_business",
        "prompt": "TOK in business attire, linkedin profile photo, "
                  "soft neutral background, confident warm smile, "
                  "three-quarter shot",
        "count": 10,
    },
    {
        "name": "office_casual",
        "prompt": "TOK in smart casual clothes, modern office environment, "
                  "natural window light, relaxed professional expression, "
                  "environmental portrait",
        "count": 10,
    },
    {
        "name": "conference",
        "prompt": "TOK at business conference, subtle blurred audience background, "
                  "speaking or listening pose, engaged expression, "
                  "event documentary photography",
        "count": 10,
    },
    {
        "name": "executive",
        "prompt": "TOK executive portrait, dark suit, premium office interior, "
                  "authoritative yet approachable expression, "
                  "corporate headshot",
        "count": 10,
    },
    {
        "name": "resume_classic",
        "prompt": "TOK resume photo, neutral grey background, "
                  "front-facing portrait, professional attire, "
                  "clean simple headshot",
        "count": 10,
    },
    {
        "name": "smart_casual",
        "prompt": "TOK in smart casual, coffee shop or modern loft background, "
                  "relaxed pose, natural and approachable, "
                  "lifestyle professional portrait",
        "count": 10,
    },
    {
        "name": "outdoor_business",
        "prompt": "TOK outdoors in business casual, city street or park background, "
                  "golden hour natural light, dynamic candid moment",
        "count": 10,
    },
    {
        "name": "studio_neutral",
        "prompt": "TOK studio portrait, seamless backdrop, "
                  "classic professional headshot, even soft lighting, "
                  "timeless corporate photo",
        "count": 10,
    },
]

# Стили дейтинг-пакета
DATING_STYLES = [
    {
        "name": "casual_weekend",
        "prompt": "TOK casual weekend, park or street, relaxed smile, "
                  "natural outfit, golden hour sunlight, candid spontaneous",
        "count": 10,
    },
    {
        "name": "coffee_shop",
        "prompt": "TOK at coffee shop, warm ambient light, casual cozy vibe, "
                  "relaxed and comfortable, lifestyle portrait",
        "count": 10,
    },
    {
        "name": "evening_out",
        "prompt": "TOK evening out, restaurant or bar background, "
                  "stylish evening look, city lights bokeh, date night vibe",
        "count": 10,
    },
    {
        "name": "active_lifestyle",
        "prompt": "TOK active outdoor, sports casual wear, park or waterfront, "
                  "energetic healthy vibe, natural movement",
        "count": 10,
    },
    {
        "name": "travel_vibes",
        "prompt": "TOK travel photo, interesting architectural background, "
                  "explorer casual style, natural authentic travel moment",
        "count": 10,
    },
    {
        "name": "home_cozy",
        "prompt": "TOK at home, cozy interior, natural window light, "
                  "comfortable casual wear, warm and inviting atmosphere",
        "count": 10,
    },
    {
        "name": "urban_rooftop",
        "prompt": "TOK urban rooftop or city street, skyline background, "
                  "stylish casual, confident modern pose, street photography aesthetic",
        "count": 10,
    },
    {
        "name": "close_up_confidence",
        "prompt": "TOK close-up portrait outdoors, soft natural background, "
                  "genuine warm smile, direct eye contact, "
                  "compelling personal photo",
        "count": 10,
    },
]
```

#### Пайплайн выполнения

```python
# pipeline.py — основной поток

import asyncio
import replicate
import zipfile
import io
from models import Order, db
from storage import s3_upload, s3_presigned_url
from email_service import send_started_email, send_completed_email
from prompts import CORPORATE_STYLES, DATING_STYLES, REALISM_SUFFIX, NEGATIVE_PROMPT, FLUX_PARAMS, LORA_TRAINING_PARAMS

STYLE_MAP = {
    "corporate": CORPORATE_STYLES,
    "dating": DATING_STYLES,
    "bundle": CORPORATE_STYLES + DATING_STYLES,
}

async def run_pipeline(order_id: str):
    order = db.get_order(order_id)
    
    try:
        # Шаг 1: Обучение LoRA (~15-25 мин)
        db.update_status(order_id, "training")
        send_started_email(order.email, order_id)
        
        lora_version = await train_lora(order)
        db.update_lora(order_id, lora_version)
        
        # Шаг 2: Генерация (параллельно, ~20-30 мин)
        db.update_status(order_id, "generating")
        styles = STYLE_MAP[order.package]
        
        # Запускаем все стили параллельно (батчами по 10 запросов)
        all_photos = await generate_all_styles(order_id, lora_version, styles)
        
        # Шаг 3: Упаковка и загрузка
        db.update_status(order_id, "packaging")
        zip_key = await create_and_upload_zip(order_id, all_photos)
        
        db.update_result(order_id, zip_key)
        db.update_status(order_id, "done")
        
        # Шаг 4: Email с результатами + апсейл-трекер
        download_url = s3_presigned_url(zip_key, expires=7*24*3600)  # 7 дней
        send_completed_email(order.email, order_id, download_url, order.package)
        
        # Запустить апсейл email если не конвертировал на странице
        await schedule_upsell_email_if_needed(order_id)
        
    except Exception as e:
        db.update_status(order_id, "failed", error=str(e))
        # TODO: alert в Telegram


async def train_lora(order: Order) -> str:
    """Возвращает Replicate model version string для использования в генерации."""
    training = replicate.trainings.create(
        version="ostris/flux-dev-lora-trainer:4ffd32160efd92e956d39c5338a9b8fbafca58e03f791f6d8011f3e20e8ea6fa",
        input={
            "input_images": order.photos_zip_url,
            "trigger_word": "TOK",
            **LORA_TRAINING_PARAMS,
        },
        destination=f"{REPLICATE_USERNAME}/user-lora-{order.id}",
    )
    
    # Polling каждые 30 секунд
    while training.status not in ["succeeded", "failed", "canceled"]:
        await asyncio.sleep(30)
        training.reload()
    
    if training.status != "succeeded":
        raise Exception(f"LoRA training failed: {training.error}")
    
    return training.output["version"]


async def generate_all_styles(order_id: str, lora_version: str, styles: list) -> list:
    """Запускает генерацию всех стилей, возвращает список (style_name, image_bytes)."""
    
    semaphore = asyncio.Semaphore(10)  # Не более 10 параллельных запросов к Replicate
    
    async def generate_batch(style: dict) -> list:
        results = []
        async with semaphore:
            for i in range(style["count"]):
                output = await asyncio.to_thread(
                    replicate.run,
                    lora_version,
                    input={
                        "prompt": style["prompt"] + REALISM_SUFFIX,
                        "negative_prompt": NEGATIVE_PROMPT,
                        "seed": 1000 + i * 37,  # Разные seed = разные ракурсы
                        **FLUX_PARAMS,
                    }
                )
                results.append((style["name"], i, output[0]))
        return results
    
    tasks = [generate_batch(s) for s in styles]
    batches = await asyncio.gather(*tasks)
    return [item for batch in batches for item in batch]


async def create_and_upload_zip(order_id: str, photos: list) -> str:
    """Создаёт ZIP архив с папками по стилям и загружает в S3."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for style_name, idx, image_url in photos:
            image_bytes = await download_image(image_url)
            zf.writestr(f"{style_name}/{style_name}_{idx+1:02d}.jpg", image_bytes)
    
    buffer.seek(0)
    key = f"results/{order_id}/photos.zip"
    s3_upload(key, buffer.getvalue(), content_type="application/zip")
    return key
```

### 3.5 Платёжный flow (payments.py)

```python
# payments.py

from yookassa import Configuration, Payment
from fastapi import APIRouter, Request, BackgroundTasks
from models import db
from pipeline import run_pipeline
from upsell import trigger_upsell_page

router = APIRouter()

PACKAGES = {
    "corporate": {"price": 990, "name": "Профессиональный пакет — 80 фото"},
    "dating":    {"price": 990, "name": "Дейтинг / Lifestyle пакет — 80 фото"},
    "bundle":    {"price": 1490, "name": "Полный пакет — 160 фото"},
    "telegram":  {"price": 390, "name": "Telegram аватарки — 20 фото"},
    "upsell_dating":    {"price": 490, "name": "Дейтинг пакет (апсейл)"},
    "upsell_corporate": {"price": 490, "name": "Корпоративный пакет (апсейл)"},
}

@router.post("/api/orders")
async def create_order(email: str, package: str):
    order_id = db.create_order(email, package)
    pkg = PACKAGES[package]
    
    payment = Payment.create({
        "amount": {"value": str(pkg["price"]) + ".00", "currency": "RUB"},
        "confirmation": {
            "type": "redirect",
            "return_url": f"https://yoursite.ru/success?order_id={order_id}"
        },
        "capture": True,
        "description": pkg["name"],
        "metadata": {"order_id": order_id},
    })
    
    db.set_payment_id(order_id, payment.id)
    return {"payment_url": payment.confirmation.confirmation_url, "order_id": order_id}


@router.post("/api/webhooks/yukassa")
async def payment_webhook(request: Request, background_tasks: BackgroundTasks):
    data = await request.json()
    
    # TODO: верификация подписи ЮКасса (IP whitelist + HMAC)
    
    if data["event"] == "payment.succeeded":
        order_id = data["object"]["metadata"]["order_id"]
        order = db.get_order(order_id)
        
        if order and order.status == "created":
            db.update_status(order_id, "paid")
            db.update_paid_at(order_id)
            
            # Запустить пайплайн в фоне
            background_tasks.add_task(run_pipeline, order_id)
    
    return {"status": "ok"}


@router.get("/api/orders/{order_id}/status")
async def get_order_status(order_id: str):
    order = db.get_order(order_id)
    if not order:
        return {"error": "not found"}, 404
    
    status_messages = {
        "paid": "Ожидаем загрузки фотографий",
        "uploading": "Фотографии загружаются",
        "training": "Обучаем AI на твоих фото (~15-25 минут)",
        "generating": "Генерируем 80 фото (~20-30 минут)",
        "packaging": "Упаковываем архив",
        "done": "Готово! Проверь почту.",
        "failed": "Ошибка — мы уже разбираемся",
    }
    
    return {
        "status": order.status,
        "message": status_messages.get(order.status, ""),
        "download_url": order.download_url if order.status == "done" else None,
    }
```

### 3.6 Страница загрузки фото (frontend/upload.html)

Ключевые UX-требования:
- Инструкция: «Загрузи 15-25 фото. Разные позы, разное освещение, разные места. Без очков, без головных уборов, без масок. Фото за последние 2 года.»
- Примеры хороших vs плохих фото (drag & drop)
- Валидация: мин. 15, макс. 25, только JPEG/PNG, каждый файл < 10MB
- Прогресс загрузки с presigned S3 URLs (прямо в браузере, без нашего сервера)
- После загрузки — автоматический POST /api/orders/{id}/start-processing

```javascript
// Загрузка прямо в S3 (наш сервер не обрабатывает файлы)
async function uploadPhotos(files, orderId) {
    // 1. Получаем presigned URLs от нашего сервера
    const res = await fetch(`/api/orders/${orderId}/upload-urls`, {
        method: 'POST',
        body: JSON.stringify({ count: files.length }),
    });
    const { urls } = await res.json();
    
    // 2. Загружаем параллельно в S3
    await Promise.all(files.map((file, i) => 
        fetch(urls[i], { method: 'PUT', body: file })
    ));
    
    // 3. Сигнализируем серверу что загрузка завершена
    await fetch(`/api/orders/${orderId}/upload-complete`, { method: 'POST' });
}
```

### 3.7 API — полная спецификация

```
POST /api/orders
  Body: { email, package }
  Returns: { order_id, payment_url }

POST /api/webhooks/yukassa
  Body: ЮКасса webhook payload
  Returns: { status: "ok" }

POST /api/orders/{id}/upload-urls
  Body: { count: int }
  Returns: { urls: [presigned_url, ...] }

POST /api/orders/{id}/upload-complete
  Body: {}
  Action: создаёт ZIP из загруженных файлов, запускает пайплайн
  Returns: { status: "processing" }

GET /api/orders/{id}/status
  Returns: { status, message, download_url? }

POST /api/orders/{id}/upsell
  Body: { package: "upsell_dating" | "upsell_corporate" }
  Returns: { payment_url }

GET /health
  Returns: { status: "ok" }
```

### 3.8 Конфиг окружения (.env)

```env
# Replicate
REPLICATE_API_TOKEN=r8_...
REPLICATE_USERNAME=your-username

# Yandex Object Storage (S3)
YOS_ACCESS_KEY_ID=...
YOS_SECRET_ACCESS_KEY=...
YOS_BUCKET_NAME=photo-ai-prod
YOS_ENDPOINT=https://storage.yandexcloud.net
YOS_REGION=ru-central1

# ЮКасса
YUKASSA_SHOP_ID=...
YUKASSA_SECRET_KEY=...

# Email (Yandex SMTP)
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=587
SMTP_USER=noreply@yoursite.ru
SMTP_PASS=...
FROM_EMAIL=noreply@yoursite.ru

# App
BASE_URL=https://yoursite.ru
SECRET_KEY=...  # для подписи токенов
DATABASE_URL=sqlite:///./photo_ai.db
```

### 3.9 Деплой (Yandex Cloud)

```bash
# Минимальный VPS: 2vCPU, 4GB RAM, SSD 30GB — ~500₽/месяц
# ОС: Ubuntu 22.04

# Деплой через Docker
docker build -t photo-ai .
docker run -d \
  --name photo-ai \
  --env-file .env \
  -p 8000:8000 \
  -v ./data:/app/data \
  photo-ai

# Nginx reverse proxy с SSL (Let's Encrypt)
# Supervisor или systemd для auto-restart
```

---

## 4. Юридический и организационный план (пошагово)

### Фаза 0 — до старта (параллельно с разработкой)

**День 1: Выбор оргформы**

| Форма | За | Против | Вывод |
|---|---|---|---|
| Самозанятый | Просто, 4-6% налог, нет взносов | ЮКасса не работает с самозанятыми, лимит 2.4 млн/год | Не подходит для основного платёжного шлюза |
| ИП на УСН 6% | Работает со всеми платёжками, гибко | ~49,500₽ страховых взносов в год | **Оптимально** |
| ООО | Доп. доверие для B2B | Сложно, дорого открыть и вести | Не нужно на старте |

**→ Решение: ИП на УСН «Доходы» 6%**

**День 2-3: Регистрация ИП**
- Подать через Госуслуги (бесплатно, 0₽ госпошлины при подаче онлайн)
- ОКВЭД:
  - `62.01` — Разработка компьютерного ПО (основной)
  - `74.20` — Деятельность в области фотографии
  - `73.11` — Деятельность рекламных агентств
- Срок: 3 рабочих дня
- После получения: сразу открыть расчётный счёт (Тинькофф / Точка — онлайн за 1 день)

**День 4-6: Юридические документы (написать самому или через шаблон)**

Три обязательных документа — разместить на сайте до приёма платежей:

1. **Публичная оферта** (пользовательское соглашение)
   - Что продаём, сроки выполнения (90 минут — 24 часа)
   - Что не гарантируем (100% сходство — это AI)
   - Условия возврата: re-run если качество неудовлетворительное, возврат если технический сбой
   
2. **Политика конфиденциальности**
   - Какие данные собираем: email, фотографии
   - Цели обработки: оказание услуги AI-генерации
   - Сроки хранения: фотографии удаляем через 30 дней после выполнения заказа
   - **Трансграничная передача**: явно указать что фото передаются на сервера Replicate Inc. (США) для обработки AI-моделью
   
3. **Согласие на обработку персональных данных**
   - Чекбокс перед оплатой: «Я согласен с обработкой персональных данных, включая передачу фотографий третьим лицам для обработки AI»
   - Отдельный чекбокс для маркетинговых рассылок (необязательный)

**День 7-14: Регистрация оператора ПДн в РКН**
- Сайт: https://pd.rkn.gov.ru/operators-registry/notification/
- Бесплатно
- Срок рассмотрения: 10 рабочих дней
- Что понадобится: ИНН, наименование, список обрабатываемых ПДн, цели, сроки хранения, меры защиты
- **Важно**: зарегистрироваться ДО первого реального платежа

**День 14-21: Подключение ЮКасса**
- Заявка на сайте ЮКасса
- Нужно: данные ИП, расчётный счёт, сайт с офертой и политикой конфиденциальности
- Срок: 3-7 рабочих дней на верификацию
- Комиссия: 3.5% (физлица), ~2.8% (СБП)
- **Резерв**: Робокасса — принимает ИП, более быстрая верификация

**Параллельно: 54-ФЗ (онлайн-касса)**
- Нужна при приёме платежей от физлиц через интернет
- Облачная касса: ОФД Яндекс (2,500₽/год) или Атол.Онлайн
- ЮКасса интегрируется с большинством облачных касс «из коробки»

### Ключевой вопрос: 152-ФЗ и Replicate

**Статус**: данные пользователей (фото) уходят на американские сервера Replicate.

**Риск**: формально нарушение ст. 18.1 152-ФЗ (хранение ПДн в РФ).

**Практика**: при явном согласии пользователя на трансграничную передачу — риск минимален. РКН фокусируется на крупных нарушителях (TikTok, LinkedIn), а не на стартапах с правильно оформленной документацией.

**Путь минимизации риска**:
1. Хранить оригинальные фото в Yandex Object Storage (Россия) — ✅ локальное хранение
2. Для обработки — временно передавать на Replicate с явного согласия
3. Удалять оригиналы через 30 дней
4. При росте до >500 заказов/месяц — перейти на Selectel GPU inference (всё в России)

---

## 5. Пре-мортем

> Представляем: прошло 6 месяцев, проект провалился. Разбираемся почему и снижаем вероятности.

### Провал 1 (ВЫСОКАЯ ВЕРОЯТНОСТЬ): Качество фото неудовлетворительное — клиенты требуют возвраты

**Сценарий**: LoRA обучается плохо (мало фото, неправильные позы), результат — нет сходства с человеком. 30%+ негативных отзывов, возвраты, reputation damage.

**Почему это случится**: мы не протестировали на достаточной выборке людей до запуска.

**Митигация**:
- Протестировать на 10-15 разных людях (разного возраста, пола, этнических групп) ДО запуска
- Создать «гарантию re-run»: если клиент недоволен — делаем повтор бесплатно (себестоимость ~90₽, это дешевле возврата)
- Чёткая инструкция к загрузке фото (разные ракурсы, разное освещение) снижает процент неудачных LoRA
- Добавить ручную проверку первых 50 заказов перед отправкой

### Провал 2 (ВЫСОКАЯ ВЕРОЯТНОСТЬ): Replicate недоступен или работает нестабильно из РФ

**Сценарий**: в один день Replicate вводит географические ограничения или принимает оплату только с нероссийских карт. Весь пайплайн встаёт.

**Митигация**:
- Прямо сейчас: протестировать что Replicate доступен без VPN из российского IP
- Иметь зарубежный VPS (Hetzner, €5/мес) как proxy для API запросов
- Иметь заготовленный план Б: Selectel GPU Cloud + локальная установка ComfyUI + Flux
  - Стоимость: ~25₽/час GPU → за обработку одного заказа ~100-200₽ (дороже, но в РФ)

### Провал 3 (ВЫСОКАЯ ВЕРОЯТНОСТЬ): CAC выше 600₽, unit economics не сходятся

**Сценарий**: Яндекс.Директ стоит 800₽+ за клик в нужных запросах, конверсия лендинга 1%, CAC = 800₽. При цене 990₽ маржа после маркетинга = 190₽ — не масштабируется.

**Митигация**:
- Первую рекламу запускать с бюджетом 3,000₽ на каждый канал — меряем CAC ПРЕЖДЕ чем масштабироваться
- Параллельно запустить контент-маркетинг (до/после примеры) как органический канал
- Тестировать micro-influencer (IT/HR Telegram, 1,000-5,000 подписчиков) — часто дешевле
- Если CAC высокий — ставить упор на рефераллы (дай другу, получи 200₽ скидку)
- При плохом CAC: снизить цену до 690₽ и ориентироваться на объём

### Провал 4 (СРЕДНЯЯ ВЕРОЯТНОСТЬ): ЮКасса отказала, платёжка не подключена

**Сценарий**: ЮКасса отклоняет новое ИП без оборота, запуск задержан на 2-3 недели.

**Митигация**:
- Подавать заявку в ЮКасса на День 14 (не дожидаясь готовности продукта)
- Иметь готовую заявку в Робокасса как параллельный вариант
- На самый крайний случай: первые 10 заказов принимать вручную (СБП с QR-кодом) с ручной обработкой

### Провал 5 (СРЕДНЯЯ ВЕРОЯТНОСТЬ): Пользователи не понимают что загружать

**Сценарий**: загружают 10 фото в одной одежде, с одного ракурса → LoRA переобучается → результат плохой → возвраты.

**Митигация**:
- Подробная инструкция с примерами хороших/плохих фото (визуально)
- Минимальный валидатор: «Проверить загрузку» — смотрим что фото не слишком похожи (сравнение гистограмм)
- FAQ: «Почему важно разнообразие поз?» объяснение на языке пользователя

### Провал 6 (СРЕДНЯЯ ВЕРОЯТНОСТЬ): Продукт слишком нишевый — рынок меньше ожидаемого

**Сценарий**: запустили рекламу, потратили 15,000₽, получили 8 заказов — CAC 1,875₽. Рынок насыщен или аудитория не конвертируется.

**Митигация**:
- До запуска рекламы: вручную проверить спрос через Wordstat («корпоративное фото», «фото для linkedin» — сколько запросов в месяц в РФ)
- Тест-лендинг без бэкенда с «предзаказом»: собираем email, смотрим конверсию до разработки
- Если корпоративный не идёт — быстро перефокусироваться на дейтинг (другой лендинг, тот же бэкенд)

### Провал 7 (СРЕДНЯЯ ВЕРОЯТНОСТЬ): «Слишком идеальные» фото = клиенты разочарованы нереалистичностью

**Сценарий**: выполнили заказ, человек смотрит и говорит «это не я, это слишком красивый AI». Отрицательные отзывы.

**Митигация**:
- Это ГЛАВНЫЙ технический вызов — решать ДО запуска через промпт-инженерию (секция 3.4)
- Тестировать реалистичность на 10 людях, собирать feedback
- В процессе тестирования: слепой тест «AI vs реальное фото» — цель: >70% людей не могут отличить

### Провал 8 (НИЗКАЯ ВЕРОЯТНОСТЬ, ВЫСОКАЯ КРИТИЧНОСТЬ): Юридический риск — пользователь загрузил фото чужого человека

**Сценарий**: кто-то загружает фото знаменитости или бывшего партнёра и создаёт deepfake. Жалоба → уголовная статья для нас.

**Митигация**:
- В оферте: явная ответственность пользователя, мы не несём ответственности за misuse
- Технический: детектор «одно лицо» — если на фото несколько лиц → reject
- Модерация: первые 100 заказов вручную просматривать загрузки
- Хранить логи кто загружал что (для ответа на возможные запросы)

### Провал 9 (НИЗКАЯ ВЕРОЯТНОСТЬ): Конкурент запускает аналог на русском за 2 недели до нас

**Сценарий**: кто-то тоже читает про HeadshotPro и запускает Russian clone параллельно.

**Митигация**:
- Скорость важнее перфекционизма — лучше запуститься за 3 недели с MVP, чем за 6 недель с идеальным продуктом
- Дифференциация: реалистичность (vs «пластиковые AI-фото» у конкурентов) — это наш главный аргумент
- При появлении конкурента: смотреть что у них хуже, делать это лучше

### Провал 10 (НИЗКАЯ ВЕРОЯТНОСТЬ): GPT-4o или аналог делает то же самое бесплатно

**Сценарий**: OpenAI выкатывает «загрузи 10 фото, получи аватарки» в ChatGPT Plus.

**Митигация**:
- ChatGPT Plus стоит $20/мес = 1,800₽ — наши 990₽ за разовый результат конкурентоспособны
- Identity consistency в LoRA всё ещё лучше, чем у generic моделей
- Фокус на UX и простоте для non-tech аудитории (бабушки тоже хотят красивые аватарки)

### Сводная таблица рисков

| Риск | Вероятность | Критичность | Приоритет |
|---|---|---|---|
| Плохое качество/нереалистичность | Высокая | Критическая | **Решить до запуска** |
| Replicate недоступен из РФ | Высокая | Критическая | **Протестировать немедленно** |
| Высокий CAC | Высокая | Высокая | Метрика №1 первых 2 недель |
| Плохой UX загрузки | Средняя | Высокая | UX-тест перед запуском |
| ЮКасса отказала | Средняя | Средняя | Параллельная заявка в Робокасса |
| Пользователь загрузил чужие фото | Низкая | Критическая | Оферта + модерация |
| Конкурент запустился раньше | Низкая | Средняя | Скорость запуска |

---

## 6. Порядок реализации (недели)

### Неделя 0 (сейчас): Валидация технической гипотезы

**Цель**: убедиться что технология работает ДО любых инвестиций.

- [ ] Проверить доступность Replicate API из российского IP (и платёжная карта)
- [ ] Запустить тестовую LoRA на своих фото (~$3)
- [ ] Попробовать промпты из секции 3.4, сравнить реализм
- [ ] Слепой тест: 5 людей смотрят результат — могут ли отличить от реального фото?
- [ ] Если тест провален — исследовать альтернативы (Selectel GPU + ComfyUI)

**Критерий перехода**: >3 из 5 человек не могут отличить лучшие фото от настоящих.

### Неделя 1-2: MVP backend

- [ ] FastAPI skeleton: config, models, storage, email
- [ ] Webhook ЮКасса (с mock-тестом)
- [ ] Полный пайплайн: upload → train → generate → zip → email
- [ ] Страница загрузки фото (HTML, presigned S3)
- [ ] Страница статуса заказа (polling)
- [ ] Локальный тест E2E с реальными фото и реальной оплатой

**Параллельно (не блокирует код)**:
- [ ] Подать документы на ИП
- [ ] Написать оферту и политику конфиденциальности
- [ ] Подать заявку в ЮКасса

### Неделя 2-3: Страница апсейла + лендинги

- [ ] Страница успеха с апсейл-блоком
- [ ] Email для апсейла (через 45 минут)
- [ ] Tilda лендинг корпоративный
- [ ] Tilda лендинг дейтинг
- [ ] Подключить аналитику (Яндекс.Метрика)
- [ ] Регистрация оператора ПДн в РКН

### Неделя 3-4: Первые платные клиенты

- [ ] Запуск Яндекс.Директ (3,000₽/канал)
- [ ] Размещение в 5 Telegram-каналах (IT + HR + дейтинг)
- [ ] Первые 10 заказов — ручная проверка качества
- [ ] Сбор отзывов, корректировка промптов

---

## 7. Метрики и критерии решений

| Метрика | Плохо | OK | Хорошо |
|---|---|---|---|
| Конверсия лендинга (посетитель → оплата) | <1% | 1-3% | >3% |
| CAC | >700₽ | 300-700₽ | <300₽ |
| Апсейл конверсия (после корп. пакета) | <5% | 5-15% | >15% |
| Качество (клиент доволен без re-run) | <70% | 70-85% | >85% |
| Время обработки заказа | >120 мин | 60-120 мин | <60 мин |
| Возвраты | >15% | 5-15% | <5% |

**Решение «остановить / продолжить»** через 2 недели рекламы:
- Если CAC > 700₽ и нет тренда снижения → менять канал или оффер
- Если <5 заказов за 2 недели при бюджете 10,000₽ → пересматривать всю гипотезу
- Если апсейл >10% → масштабировать, апсейл — отдельный продукт

---

## 8. Примечание по маркетинговым материалам

При создании лендингов, рекламных текстов и офферов — использовать принципы из:
- **«$100M Offers» (Хормози)**: стак ценности, чёткий желаемый результат («80 фото за 90 минут за 990₽»), гарантия re-run
- **«Influence» (Чалдини)**: социальное доказательство (отзывы, «уже 500 человек»), дефицит/срочность (осторожно — только честный), авторитет
- **Blue Ocean (Ким/Моборн)**: позиционирование не против фотографов («дешевле фотографа»), а в отдельную категорию («мгновенные AI-аватарки — нет аналогов»)

**Важно для России**: излишне агрессивная западная маркетинговая механика («ТОЛЬКО СЕГОДНЯ! ПОСЛЕДНИЙ ШАНС!») вызывает обратную реакцию у российской аудитории — её воспринимают как лохотрон. Предпочтителен спокойный, честный тон с акцентом на конкретный результат и реальные примеры.

---

*Документ создан: 2026-06-23. Версия для перехода к написанию кода.*
