# AI Photo Avatars — backend

Реализация по `../PHOTO_AI_PLAN.md`. Весь код проекта изолирован в этой папке;
React Native приложение в корне репозитория не затрагивается.

## Статус

- [x] Структура проекта
- [x] Ядро реализма (`backend/prompts.py`)
- [x] Скрипт валидации Недели 0 (`scripts/validate_replicate.py`)
- [ ] FastAPI бэкенд (`backend/main.py`, после прохождения валидации)
- [ ] Платежи (Робокасса), storage (Yandex S3), email
- [ ] Frontend (загрузка фото, успех+апсейл, статус)

## Неделя 0: сначала валидация (текущий шаг)

Прежде чем писать бэкенд — проверяем, что Replicate доступен из РФ и что
фотографии достаточно реалистичны. Это два самых критичных риска из пре-мортема.

```bash
cd photo-ai
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # вписать REPLICATE_API_TOKEN и REPLICATE_USERNAME

python scripts/validate_replicate.py check                    # связь + токен
python scripts/validate_replicate.py train --images ./my_photos   # ~$1.5, ~20 мин
python scripts/validate_replicate.py generate --version "<...>"   # ~$0.5, ~5 мин
```

Результаты в `data/validation_output/`. Слепой тест на 5 людях.
**Критерий перехода к бэкенду: >3 из 5 не отличают от настоящих фото.**

Если тест провален — тюним `backend/prompts.py` (REALISM_SUFFIX, guidance_scale,
NEGATIVE_PROMPT) и повторяем `generate`, не переобучая LoRA.
