#!/usr/bin/env python3
"""
Инструмент Недели 0. Де-рискует два критичных неизвестных ДО написания бэкенда:

  1. Доступен ли Replicate из РФ и работает ли оплата/токен.
  2. Достаточно ли реалистичны фото с нашими промптами (слепой тест).

Использование:
    # 0. Положи 15-25 своих фото в одну папку, затем:
    pip install -r requirements.txt
    cp .env.example .env        # впиши REPLICATE_API_TOKEN и REPLICATE_USERNAME

    # 1. Проверка связи и токена (бесплатно, мгновенно):
    python scripts/validate_replicate.py check

    # 2. Обучить LoRA на своих фото (~$1.5, ~20 мин):
    python scripts/validate_replicate.py train --images ./my_photos

    # 3. Сгенерировать тест-сет (~$0.5, ~5 мин). Версию печатает шаг train:
    python scripts/validate_replicate.py generate --version "<username/model:hash>"

    # Результаты -> ./data/validation_output/  — раздай 5 людям на слепой тест.
    # Критерий перехода к коду: >3 из 5 не отличают лучшие фото от настоящих.
"""
import argparse
import io
import os
import sys
import time
import zipfile
from pathlib import Path

# Импортируем ядро реализма из backend/, чтобы валидировать ровно те же константы,
# что пойдут в прод.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    import replicate
    import httpx
    from dotenv import load_dotenv
except ImportError:
    sys.exit("Сначала: pip install -r requirements.txt")

from backend.prompts import (  # noqa: E402
    FLUX_TRAINER,
    LORA_TRAINING_PARAMS,
    build_generation_input,
)

load_dotenv()

OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "validation_output"

# Небольшой репрезентативный набор стилей для теста реализма
# (по одному «строгому» и по одному «лайфстайл», где пластик заметнее всего).
TEST_PROMPTS = [
    ("linkedin", "TOK in business attire, linkedin profile photo, "
                  "soft neutral office background, confident warm half-smile, "
                  "three-quarter shot, looking at camera"),
    ("resume", "TOK resume photo, plain neutral grey background, front-facing, "
               "professional attire, clean simple headshot"),
    ("coffee", "TOK at a coffee shop, warm ambient light, cozy casual vibe, "
               "relaxed and comfortable, lifestyle portrait"),
    ("outdoor", "TOK on a casual weekend, park or street, relaxed smile, "
                "everyday outfit, golden hour sunlight, candid spontaneous"),
    ("closeup", "TOK close-up portrait outdoors, soft natural background, "
                "genuine warm smile, direct eye contact"),
]


def _require_token() -> None:
    if not os.getenv("REPLICATE_API_TOKEN"):
        sys.exit("Нет REPLICATE_API_TOKEN в .env")


def cmd_check(_: argparse.Namespace) -> None:
    """Проверка: токен валиден и Replicate отвечает с текущего IP."""
    _require_token()
    print("→ Проверяю связь с api.replicate.com ...")
    try:
        r = httpx.get(
            "https://api.replicate.com/v1/account",
            headers={"Authorization": f"Bearer {os.environ['REPLICATE_API_TOKEN']}"},
            timeout=15,
        )
    except Exception as e:
        sys.exit(f"✗ Сеть недоступна (нужен прокси/VPS как в плане): {e}")

    if r.status_code == 200:
        acc = r.json()
        print(f"✓ Replicate доступен. Аккаунт: {acc.get('username')}")
        print("✓ Токен валиден. Можно запускать train.")
    elif r.status_code == 401:
        sys.exit("✗ Токен невалиден (401). Проверь REPLICATE_API_TOKEN.")
    else:
        sys.exit(f"✗ Неожиданный ответ {r.status_code}: {r.text[:200]}")


def _zip_images(folder: Path) -> bytes:
    exts = {".jpg", ".jpeg", ".png", ".webp"}
    files = [p for p in folder.iterdir() if p.suffix.lower() in exts]
    if len(files) < 10:
        sys.exit(f"✗ Нужно минимум 10 фото, найдено {len(files)} в {folder}")
    print(f"→ Упаковываю {len(files)} фото в zip ...")
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in files:
            zf.write(p, p.name)
    buf.seek(0)
    return buf.getvalue()


def cmd_train(args: argparse.Namespace) -> None:
    """Обучает LoRA на локальной папке фото. Печатает version для шага generate."""
    _require_token()
    username = os.getenv("REPLICATE_USERNAME")
    if not username:
        sys.exit("Нет REPLICATE_USERNAME в .env (нужен для destination модели)")

    folder = Path(args.images)
    if not folder.is_dir():
        sys.exit(f"✗ Папка не найдена: {folder}")

    zip_bytes = _zip_images(folder)

    model_name = f"validation-{int(time.time())}"
    destination = f"{username}/{model_name}"
    print(f"→ Создаю модель назначения: {destination}")
    print(f"→ Запускаю обучение LoRA (rank={LORA_TRAINING_PARAMS['lora_rank']}, "
          f"steps={LORA_TRAINING_PARAMS['steps']}). Это ~20 минут и ~$1.5 ...")

    training = replicate.trainings.create(
        version=FLUX_TRAINER,
        destination=destination,
        input={
            "input_images": io.BytesIO(zip_bytes),
            **LORA_TRAINING_PARAMS,
        },
    )

    while training.status not in ("succeeded", "failed", "canceled"):
        time.sleep(30)
        training.reload()
        print(f"   статус: {training.status} ... ({time.strftime('%H:%M:%S')})")

    if training.status != "succeeded":
        sys.exit(f"✗ Обучение не удалось: {training.status} / {training.error}")

    version = training.output["version"]
    print("\n✓ LoRA обучена. Версия для генерации:")
    print(f"\n    {version}\n")
    print("Дальше:")
    print(f'    python scripts/validate_replicate.py generate --version "{version}"')


def cmd_generate(args: argparse.Namespace) -> None:
    """Генерирует тест-сет на обученной LoRA с продакшн-параметрами реализма."""
    _require_token()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    n = args.per_style

    print(f"→ Генерирую {n} фото × {len(TEST_PROMPTS)} стилей "
          f"с параметрами реализма из backend/prompts.py ...")

    saved = 0
    for label, prompt in TEST_PROMPTS:
        for i in range(n):
            gen_input = build_generation_input(prompt, seed=1000 + i * 37)
            try:
                output = replicate.run(args.version, input=gen_input)
            except Exception as e:
                print(f"   ✗ {label}#{i}: {e}")
                continue

            url = output[0] if isinstance(output, list) else output
            data = httpx.get(str(url), timeout=60).content
            path = OUT_DIR / f"{label}_{i+1:02d}.jpg"
            path.write_bytes(data)
            saved += 1
            print(f"   ✓ {path.name}")

    print(f"\n✓ Готово: {saved} фото в {OUT_DIR}")
    print("\nСЛЕПОЙ ТЕСТ: покажи лучшие 5-10 фото пяти людям вперемешку с "
          "настоящими. Вопрос: «какие из них — реальные фотографии?»")
    print("Критерий перехода к коду: >3 из 5 НЕ могут уверенно отличить.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Валидация Replicate + реализма (Неделя 0)")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("check", help="проверить токен и доступность из текущего IP")

    p_train = sub.add_parser("train", help="обучить LoRA на папке фото")
    p_train.add_argument("--images", required=True, help="папка с 15-25 фото")

    p_gen = sub.add_parser("generate", help="сгенерировать тест-сет")
    p_gen.add_argument("--version", required=True, help="version из шага train")
    p_gen.add_argument("--per-style", type=int, default=4, help="фото на стиль (по умолч. 4)")

    args = parser.parse_args()
    {"check": cmd_check, "train": cmd_train, "generate": cmd_generate}[args.cmd](args)


if __name__ == "__main__":
    main()
