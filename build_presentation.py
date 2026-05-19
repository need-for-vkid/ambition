"""
Presentation: Профессии будущего (которые появятся и пропадут)
Frameworks: TED Structure + Duarte Sparkline (presentation-master)
Design: Tech Keynote Dark + Creative Bold (elite-powerpoint-designer)
Duration: 12-15 minutes | 13 slides
"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.oxml.ns import qn
from pptx.oxml import parse_xml
from lxml import etree
import copy

prs = Presentation()
prs.slide_width = Inches(13.33)
prs.slide_height = Inches(7.5)

W = prs.slide_width
H = prs.slide_height

# ── Color Palette ──────────────────────────────────────────────────────────────
BG         = RGBColor(0x08, 0x0C, 0x24)   # Deep navy
BG2        = RGBColor(0x10, 0x14, 0x35)   # Slightly lighter navy
WHITE      = RGBColor(0xFF, 0xFF, 0xFF)
PURPLE     = RGBColor(0x7C, 0x4D, 0xFF)
CYAN       = RGBColor(0x00, 0xD4, 0xFF)
RED        = RGBColor(0xFF, 0x47, 0x57)
GREEN      = RGBColor(0x2E, 0xD5, 0x73)
AMBER      = RGBColor(0xFF, 0xA5, 0x02)
GRAY       = RGBColor(0x8A, 0x94, 0xAD)
LIGHT_GRAY = RGBColor(0xC8, 0xD0, 0xE0)
DARK_CARD  = RGBColor(0x16, 0x1B, 0x40)
RED_CARD   = RGBColor(0x2A, 0x0A, 0x12)
GREEN_CARD = RGBColor(0x08, 0x22, 0x18)


# ── Helpers ────────────────────────────────────────────────────────────────────

def blank_slide(prs):
    blank_layout = prs.slide_layouts[6]
    return prs.slides.add_slide(blank_layout)


def fill_bg(slide, color=BG):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color


def add_rect(slide, left, top, width, height, fill_color, alpha=None):
    shape = slide.shapes.add_shape(1, left, top, width, height)
    shape.line.fill.background()
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    if alpha is not None:
        shape.fill.fore_color.theme_color = None
    return shape


def add_text(slide, text, left, top, width, height,
             font_size=32, bold=False, color=WHITE,
             align=PP_ALIGN.LEFT, italic=False, wrap=True):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = wrap
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = Pt(font_size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    run.font.name = "Calibri"
    return txBox


def add_multiline_text(slide, lines, left, top, width, height,
                       font_size=28, bold=False, color=WHITE,
                       align=PP_ALIGN.LEFT, spacing_after=12):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.space_after = Pt(spacing_after)
        run = p.add_run()
        run.text = line
        run.font.size = Pt(font_size)
        run.font.bold = bold
        run.font.color.rgb = color
        run.font.name = "Calibri"
    return txBox


def add_accent_line(slide, left, top, width, height, color=PURPLE):
    return add_rect(slide, left, top, width, height, color)


def add_notes(slide, notes_text):
    notes_slide = slide.notes_slide
    tf = notes_slide.notes_text_frame
    tf.text = notes_text


def add_card(slide, left, top, width, height, bg_color, title, title_color,
             body_lines, body_color=LIGHT_GRAY, title_size=22, body_size=18,
             icon=None):
    """Add a rounded card with title and body."""
    # Card background
    card = add_rect(slide, left, top, width, height, bg_color)
    # Accent top border
    add_rect(slide, left, top, width, Pt(3), title_color)
    # Title
    y_offset = Pt(14)
    if icon:
        add_text(slide, icon, left + Inches(0.15), top + y_offset,
                 Inches(0.5), Inches(0.4), font_size=title_size + 2,
                 color=title_color, bold=True)
        add_text(slide, title, left + Inches(0.55), top + y_offset,
                 width - Inches(0.7), Inches(0.4), font_size=title_size,
                 bold=True, color=title_color)
    else:
        add_text(slide, title, left + Inches(0.2), top + y_offset,
                 width - Inches(0.4), Inches(0.4), font_size=title_size,
                 bold=True, color=title_color)
    # Body
    y_body = top + Inches(0.55)
    for line in body_lines:
        add_text(slide, line, left + Inches(0.2), y_body,
                 width - Inches(0.4), Inches(0.35),
                 font_size=body_size, color=body_color)
        y_body += Inches(0.32)
    return card


def add_slide_number(slide, num, total=13):
    add_text(slide, f"{num} / {total}",
             W - Inches(1.2), H - Inches(0.4), Inches(1.0), Inches(0.3),
             font_size=11, color=GRAY, align=PP_ALIGN.RIGHT)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 1  —  TITLE SLIDE
# ══════════════════════════════════════════════════════════════════════════════
slide = blank_slide(prs)
fill_bg(slide, BG)

# Large gradient-style accent blob (top-right)
add_rect(slide, W - Inches(3.5), Inches(0), Inches(3.5), Inches(3.5), PURPLE)
# Overlay to darken/blend
add_rect(slide, W - Inches(3.5), Inches(0), Inches(3.5), Inches(3.5), BG)

# Purple glow circle (decorative)
circ = slide.shapes.add_shape(9, W - Inches(2.8), Inches(0.2), Inches(2.4), Inches(2.4))
circ.fill.solid()
circ.fill.fore_color.rgb = PURPLE
circ.line.fill.background()

# Cyan accent circle
circ2 = slide.shapes.add_shape(9, W - Inches(4.0), Inches(2.0), Inches(1.4), Inches(1.4))
circ2.fill.solid()
circ2.fill.fore_color.rgb = CYAN
circ2.line.fill.background()

# Accent line
add_accent_line(slide, Inches(0.8), Inches(1.8), Inches(5.5), Pt(3), CYAN)

# Main title
add_text(slide, "Профессии будущего",
         Inches(0.8), Inches(2.0), Inches(7.5), Inches(1.8),
         font_size=68, bold=True, color=WHITE)

# Subtitle
add_text(slide, "Что появится, что исчезнет\nи как к этому подготовиться",
         Inches(0.8), Inches(3.85), Inches(7.0), Inches(1.2),
         font_size=28, bold=False, color=CYAN)

# Bottom meta
add_accent_line(slide, Inches(0.8), H - Inches(1.2), Inches(10.0), Pt(1), GRAY)
add_text(slide, "2025–2040  •  Рынок труда будущего",
         Inches(0.8), H - Inches(1.1), Inches(8.0), Inches(0.4),
         font_size=16, color=GRAY)

add_notes(slide, """ВСТУПЛЕНИЕ (1 минута)

Добро пожаловать. Сегодня мы поговорим о том, как кардинально изменится рынок труда в ближайшие 10–15 лет. Некоторые профессии исчезнут. Появятся абсолютно новые. И ни одна из них не будет похожа на то, что мы знаем сегодня.

Прежде чем начать — поднимите руку те, кто уверен, что их профессия не изменится за следующие 10 лет. Пауза. Посмотрим, поменяете ли вы мнение к концу.

[Начинайте энергично, с прямым зрительным контактом с залом. Не благодарите за приглашение — сразу в тему.]""")

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 2  —  HOOK STAT
# ══════════════════════════════════════════════════════════════════════════════
slide = blank_slide(prs)
fill_bg(slide, BG)

# Big number background
add_rect(slide, Inches(0), Inches(0), W, H, BG)

# Decorative accent squares
add_rect(slide, Inches(0), Inches(0), Inches(0.15), H, PURPLE)
add_rect(slide, W - Inches(0.15), Inches(0), Inches(0.15), H, CYAN)

# Big stat
add_text(slide, "85%",
         Inches(1.0), Inches(0.8), W - Inches(2.0), Inches(3.0),
         font_size=160, bold=True, color=PURPLE, align=PP_ALIGN.CENTER)

# Underline the stat
add_accent_line(slide, Inches(3.5), Inches(4.0), Inches(6.3), Pt(4), CYAN)

# Caption
add_text(slide, "профессий 2035 года ещё не существует",
         Inches(1.0), Inches(4.2), W - Inches(2.0), Inches(0.8),
         font_size=36, bold=False, color=WHITE, align=PP_ALIGN.CENTER)

# Source
add_text(slide, "Источник: Институт будущего (IFTF) / Всемирный экономический форум",
         Inches(1.0), H - Inches(0.7), W - Inches(2.0), Inches(0.4),
         font_size=14, color=GRAY, align=PP_ALIGN.CENTER)

add_slide_number(slide, 2)
add_notes(slide, """ХУК — ЗАХВАТИТЬ ВНИМАНИЕ (1 минута)

Восемьдесят пять процентов. Запомните эту цифру.

По данным Института будущего и ВЭФ, 85% профессий, которые будут существовать в 2035 году, сегодня просто не существуют. Ещё десять лет — и большинство рабочих мест изменится до неузнаваемости.

Это не научная фантастика. Это уже происходит: в 2020 году у нас не было "специалиста по промпт-инжинирингу". В 2025-м это уже реальная профессия с реальными зарплатами.

Вопрос не в том, изменится ли ваша работа. Вопрос — готовы ли вы к этому?

[Держите паузу после цифры 85%. Дайте залу осознать это.]""")

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 3  —  ДВИЖУЩИЕ СИЛЫ (What IS — The Catalyst)
# ══════════════════════════════════════════════════════════════════════════════
slide = blank_slide(prs)
fill_bg(slide, BG)

add_accent_line(slide, Inches(0.7), Inches(1.05), Inches(0.5), Pt(3), AMBER)
add_text(slide, "Что движет переменами",
         Inches(1.4), Inches(0.75), Inches(9.0), Inches(0.6),
         font_size=44, bold=True, color=WHITE)
add_text(slide, "Три силы, которые перекраивают рынок труда прямо сейчас",
         Inches(1.4), Inches(1.35), Inches(9.0), Inches(0.45),
         font_size=22, color=CYAN)

# Three force cards
card_w = Inches(3.6)
card_h = Inches(4.2)
gap = Inches(0.3)
start_x = Inches(0.7)
card_y = Inches(2.1)

forces = [
    (PURPLE, "🤖", "Автоматизация",
     ["К 2030 г. — до 30%", "рутинных задач", "выполняют машины"]),
    (CYAN,   "🧠", "Искусственный\nинтеллект",
     ["ChatGPT, Gemini, Claude —", "ИИ уже конкурирует", "с людьми в 100+ сферах"]),
    (AMBER,  "🌐", "Глобализация\n+ удалёнка",
     ["Ваш конкурент теперь", "живёт в любой", "точке планеты"]),
]

for i, (color, icon, title, body) in enumerate(forces):
    x = start_x + i * (card_w + gap)
    card_bg = DARK_CARD
    add_rect(slide, x, card_y, card_w, card_h, card_bg)
    add_accent_line(slide, x, card_y, card_w, Pt(4), color)
    add_text(slide, icon, x + Inches(0.25), card_y + Inches(0.25),
             Inches(0.8), Inches(0.7), font_size=36, color=color)
    add_text(slide, title, x + Inches(0.25), card_y + Inches(0.95),
             card_w - Inches(0.5), Inches(0.75),
             font_size=24, bold=True, color=color)
    y_b = card_y + Inches(1.75)
    for line in body:
        add_text(slide, line, x + Inches(0.25), y_b,
                 card_w - Inches(0.5), Inches(0.4),
                 font_size=19, color=LIGHT_GRAY)
        y_b += Inches(0.38)

add_slide_number(slide, 3)
add_notes(slide, """КОНТЕКСТ — ДВИЖУЩИЕ СИЛЫ (1 минута)

Перемены не случайны. За ними стоят три мощные силы, которые уже сегодня переписывают правила.

Первая — автоматизация. Роботы и программы забирают физический и монотонный труд. По оценкам McKinsey, к 2030 году до 30% рутинных задач будет автоматизировано.

Вторая — искусственный интеллект. ИИ уже сегодня пишет тексты, ставит медицинские диагнозы, рисует логотипы. Он конкурирует с людьми в том, что раньше казалось исключительно человеческим.

Третья — глобализация и удалёнка. Если вы дизайнер или программист, ваш конкурент теперь живёт в Бангалоре или Варшаве и работает за треть вашей ставки.

Эти три силы работают одновременно. Это не волна — это цунами.""")

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 4  —  SECTION BREAK: ЧТО ИСЧЕЗНЕТ
# ══════════════════════════════════════════════════════════════════════════════
slide = blank_slide(prs)
fill_bg(slide, BG)

# Full-width red accent bar on left
add_rect(slide, Inches(0), Inches(0), Inches(0.5), H, RED)

# Background glow
circ_bg = slide.shapes.add_shape(9, Inches(3.5), Inches(1.0), Inches(6.0), Inches(5.5))
circ_bg.fill.solid()
circ_bg.fill.fore_color.rgb = RED_CARD
circ_bg.line.fill.background()

add_text(slide, "ЧАСТЬ I",
         Inches(1.5), Inches(1.5), Inches(10.0), Inches(0.7),
         font_size=20, bold=True, color=RED, align=PP_ALIGN.CENTER)

add_text(slide, "Профессии,\nкоторые исчезнут",
         Inches(1.0), Inches(2.2), Inches(11.0), Inches(2.5),
         font_size=72, bold=True, color=WHITE, align=PP_ALIGN.CENTER)

add_accent_line(slide, Inches(4.0), Inches(4.85), Inches(5.2), Pt(3), RED)

add_text(slide, "К 2030–2035 году",
         Inches(1.0), Inches(5.1), Inches(11.0), Inches(0.6),
         font_size=26, color=RED, align=PP_ALIGN.CENTER)

add_slide_number(slide, 4)
add_notes(slide, """ПЕРЕХОД К ЧАСТИ I (30 секунд)

Начнём с неудобной правды.

Некоторые профессии, которые существуют сегодня, исчезнут в течение следующих 10 лет. Не ослабнут — исчезнут. И это не предположение — это уже происходит в пилотных проектах по всему миру.

[Пауза. Сделайте паузу здесь — пусть слайд "подышит". Затем переходите дальше.]""")

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 5  —  ПРОФЕССИИ КОТОРЫЕ ИСЧЕЗНУТ (детали)
# ══════════════════════════════════════════════════════════════════════════════
slide = blank_slide(prs)
fill_bg(slide, BG)

add_accent_line(slide, Inches(0.7), Inches(1.05), Inches(0.5), Pt(3), RED)
add_text(slide, "Под угрозой исчезновения",
         Inches(1.4), Inches(0.75), Inches(10.0), Inches(0.6),
         font_size=40, bold=True, color=WHITE)
add_text(slide, "Роботы и ИИ делают это быстрее, дешевле и без ошибок",
         Inches(1.4), Inches(1.38), Inches(10.0), Inches(0.45),
         font_size=20, color=RED)

dying = [
    ("🚗", "Водитель (грузовик/такси)", "Беспилотные авто — Tesla, Waymo уже везут грузы"),
    ("💰", "Кассир / оператор банка", "Самообслуживание и финтех-автоматизация"),
    ("📞", "Оператор call-центра", "ИИ-боты обрабатывают 80% обращений"),
    ("📝", "Базовый переводчик",    "DeepL, Google Translate, GPT-4o — точнее и мгновенно"),
    ("🏭", "Рабочий на конвейере",  "Промышленные роботы: ROI за 18 месяцев"),
    ("📊", "Бухгалтер (рутина)",    "ИИ-учёт: Xero, QuickBooks AI, 1С-нейросети"),
]

col_w = Inches(5.8)
col_h = Inches(0.82)
gap_v = Inches(0.1)
start_y = Inches(2.1)

for i, (icon, title, desc) in enumerate(dying):
    col = i % 2
    row = i // 2
    x = Inches(0.55) + col * (col_w + Inches(0.6))
    y = start_y + row * (col_h + gap_v)

    add_rect(slide, x, y, col_w, col_h, RED_CARD)
    add_accent_line(slide, x, y, col_w, Pt(3), RED)
    add_text(slide, icon, x + Inches(0.15), y + Inches(0.15),
             Inches(0.5), Inches(0.5), font_size=22, color=RED)
    add_text(slide, title, x + Inches(0.7), y + Inches(0.1),
             col_w - Inches(0.85), Inches(0.38),
             font_size=18, bold=True, color=WHITE)
    add_text(slide, desc, x + Inches(0.7), y + Inches(0.44),
             col_w - Inches(0.85), Inches(0.32),
             font_size=14, color=GRAY)

add_text(slide, "⚠  Риск не означает полное исчезновение — но роль кардинально изменится",
         Inches(0.55), H - Inches(0.7), W - Inches(1.1), Inches(0.4),
         font_size=15, color=AMBER, italic=True)

add_slide_number(slide, 5)
add_notes(slide, """ПРОФЕССИИ ПОД УГРОЗОЙ (2 минуты)

Давайте посмотрим конкретно. Вот шесть категорий, которые сократятся или полностью трансформируются.

Водители. Waymo, Tesla и китайские беспилотники уже возят пассажиров и грузы без человека за рулём в нескольких городах. В 2023 году Waymo перевезла 700 000 человек без водителя в Сан-Франциско.

Кассиры и операторы банков. Amazon Go работает полностью без кассиров. Онлайн-банкинг убил большую часть клиентского персонала физических отделений.

Операторы call-центров. Сегодня ИИ-боты типа Intercom или Dialogflow закрывают до 80% стандартных обращений. Человек нужен только для сложных случаев.

Переводчики — только базового уровня. Художественный и юридический перевод пока держится, но технический и бытовой — уже нет.

Конвейерные рабочие. Промышленный робот Fanuc окупается за 18 месяцев. После этого работает 24/7 без больничных.

Рутинная бухгалтерия. Не стратегическая — а ввод данных, проверка чеков, формирование отчётов.

ВАЖНО: Это не значит, что все эти люди потеряют работу. Это значит, что их роль изменится — или исчезнет её рутинная часть. Выживут те, кто адаптируется.""")

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 6  —  ПОЧЕМУ (Duarte's "What IS" #2 — Why it happens)
# ══════════════════════════════════════════════════════════════════════════════
slide = blank_slide(prs)
fill_bg(slide, BG)

add_accent_line(slide, Inches(0.7), Inches(1.05), Inches(0.5), Pt(3), AMBER)
add_text(slide, "Закономерность: что автоматизируется в первую очередь",
         Inches(1.4), Inches(0.75), Inches(10.5), Inches(0.6),
         font_size=36, bold=True, color=WHITE)

# Pyramid / funnel concept as layered rectangles
labels = [
    (RED,    "Физический повторяющийся труд",         "Конвейер, кассир, складской рабочий"),
    (AMBER,  "Когнитивный повторяющийся труд",        "Ввод данных, базовый анализ, перевод"),
    (CYAN,   "Когнитивный нестандартный труд",        "Аналитика, программирование, дизайн"),
    (GREEN,  "Социально-эмоциональный труд",          "Терапия, менторство, переговоры"),
]

bar_w_base = Inches(10.5)
bar_h = Inches(1.0)
bar_start_x = Inches(0.8)
bar_y = Inches(1.85)

for i, (color, title, subtitle) in enumerate(labels):
    bar_w = bar_w_base - i * Inches(1.1)
    offset_x = i * Inches(0.55)
    add_rect(slide, bar_start_x + offset_x, bar_y + i * (bar_h + Inches(0.05)),
             bar_w, bar_h, DARK_CARD)
    add_accent_line(slide, bar_start_x + offset_x,
                    bar_y + i * (bar_h + Inches(0.05)),
                    bar_w, Pt(4), color)
    add_text(slide, title,
             bar_start_x + offset_x + Inches(0.2),
             bar_y + i * (bar_h + Inches(0.05)) + Inches(0.08),
             bar_w - Inches(0.4), Inches(0.45),
             font_size=20, bold=True, color=color)
    add_text(slide, subtitle,
             bar_start_x + offset_x + Inches(0.2),
             bar_y + i * (bar_h + Inches(0.05)) + Inches(0.52),
             bar_w - Inches(0.4), Inches(0.35),
             font_size=16, color=GRAY)

# Arrow label
add_text(slide, "↑ Труднее автоматизировать",
         Inches(0.0), Inches(2.3), Inches(0.7), Inches(3.5),
         font_size=13, color=GRAY)

add_text(slide, "Вывод: автоматизируется снизу вверх. Чем выше ваш навык — тем дольше вы в игре.",
         Inches(0.8), H - Inches(0.7), Inches(11.5), Inches(0.4),
         font_size=16, color=AMBER, italic=True)

add_slide_number(slide, 6)
add_notes(slide, """ЗАКОНОМЕРНОСТЬ АВТОМАТИЗАЦИИ (1 минута)

Есть простой принцип, который объясняет всё.

Автоматизация идёт снизу вверх. Первыми уходят задачи физические и повторяющиеся — там, где нужна точность, а не творчество. Потом — когнитивные рутинные задачи: анализ данных по шаблону, стандартные тексты.

Сложнее всего автоматизировать то, что требует эмоционального интеллекта, нестандартного мышления и настоящего человеческого взаимодействия.

Вывод очень практический: если хотите быть нужным — поднимайтесь по этой пирамиде. Думайте нестандартно, общайтесь, создавайте, убеждайте.

[Это ключевой аналитический слайд. Убедитесь, что аудитория считала логику пирамиды.]""")

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 7  —  SECTION BREAK: ЧТО ПОЯВИТСЯ
# ══════════════════════════════════════════════════════════════════════════════
slide = blank_slide(prs)
fill_bg(slide, BG)

add_rect(slide, Inches(0), Inches(0), Inches(0.5), H, GREEN)

circ_bg2 = slide.shapes.add_shape(9, Inches(3.5), Inches(1.0), Inches(6.0), Inches(5.5))
circ_bg2.fill.solid()
circ_bg2.fill.fore_color.rgb = GREEN_CARD
circ_bg2.line.fill.background()

add_text(slide, "ЧАСТЬ II",
         Inches(1.5), Inches(1.5), Inches(10.0), Inches(0.7),
         font_size=20, bold=True, color=GREEN, align=PP_ALIGN.CENTER)

add_text(slide, "Профессии,\nкоторые появятся",
         Inches(1.0), Inches(2.2), Inches(11.0), Inches(2.5),
         font_size=72, bold=True, color=WHITE, align=PP_ALIGN.CENTER)

add_accent_line(slide, Inches(4.0), Inches(4.85), Inches(5.2), Pt(3), GREEN)

add_text(slide, "2025–2040  •  Новые возможности уже открываются",
         Inches(1.0), Inches(5.1), Inches(11.0), Inches(0.6),
         font_size=26, color=GREEN, align=PP_ALIGN.CENTER)

add_slide_number(slide, 7)
add_notes(slide, """ПЕРЕХОД К ЧАСТИ II (30 секунд)

А теперь — хорошая новость.

История труда никогда не заканчивалась исчезновением профессий. Каждый раз, когда технологии убирали одни задачи, они создавали другие. Промышленная революция убрала ткачей — но создала инженеров. Компьютер убил машинисток — но создал миллионы программистов.

Давайте посмотрим, что появляется сейчас.

[Смените тон с тревожного на воодушевлённый. Эта часть — о возможностях.]""")

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 8  —  ПРОФЕССИИ БУДУЩЕГО (ближайшая волна 2025-2030)
# ══════════════════════════════════════════════════════════════════════════════
slide = blank_slide(prs)
fill_bg(slide, BG)

add_accent_line(slide, Inches(0.7), Inches(1.05), Inches(0.5), Pt(3), GREEN)
add_text(slide, "Первая волна: уже сейчас",
         Inches(1.4), Inches(0.75), Inches(10.0), Inches(0.6),
         font_size=40, bold=True, color=WHITE)
add_text(slide, "2025–2030  •  Эти профессии уже существуют или появятся в ближайшие 3–5 лет",
         Inches(1.4), Inches(1.38), Inches(10.5), Inches(0.45),
         font_size=19, color=GREEN)

new_jobs_1 = [
    ("🤖", "Промпт-инженер / ИИ-тренер",  "Обучает и настраивает ИИ-модели"),
    ("🔒", "Специалист по кибербезопасности", "Защита от атак в мире гиперсвязи"),
    ("⚖️", "Этик данных и ИИ",             "Следит за справедливостью алгоритмов"),
    ("🥽", "Разработчик XR / метавселенных","VR/AR опыт для бизнеса и образования"),
    ("🧬", "Биоинформатик",                 "На стыке биологии, ИИ и Big Data"),
    ("♻️", "ESG-консультант",               "Устойчивое развитие — требование рынка"),
]

col_w = Inches(5.8)
col_h = Inches(0.82)
gap_v = Inches(0.1)
start_y = Inches(2.1)

for i, (icon, title, desc) in enumerate(new_jobs_1):
    col = i % 2
    row = i // 2
    x = Inches(0.55) + col * (col_w + Inches(0.6))
    y = start_y + row * (col_h + gap_v)
    add_rect(slide, x, y, col_w, col_h, GREEN_CARD)
    add_accent_line(slide, x, y, col_w, Pt(3), GREEN)
    add_text(slide, icon, x + Inches(0.15), y + Inches(0.15),
             Inches(0.5), Inches(0.5), font_size=22, color=GREEN)
    add_text(slide, title, x + Inches(0.7), y + Inches(0.1),
             col_w - Inches(0.85), Inches(0.38),
             font_size=18, bold=True, color=WHITE)
    add_text(slide, desc, x + Inches(0.7), y + Inches(0.44),
             col_w - Inches(0.85), Inches(0.32),
             font_size=14, color=GRAY)

add_text(slide, "💡 Промпт-инженеры в 2024 г. зарабатывают $150 000–$300 000/год в США",
         Inches(0.55), H - Inches(0.7), W - Inches(1.1), Inches(0.4),
         font_size=15, color=CYAN, italic=True)

add_slide_number(slide, 8)
add_notes(slide, """ПЕРВАЯ ВОЛНА НОВЫХ ПРОФЕССИЙ (2 минуты)

Вот первая волна — то, что уже существует или появится в ближайшие 3-5 лет.

Промпт-инженер или ИИ-тренер. В 2022 году такой профессии не было. В 2024-м в США средняя зарплата — $150-300 тысяч в год. Это человек, который знает, как правильно "разговаривать" с ИИ и получать нужный результат.

Специалист по кибербезопасности. С каждым годом атак становится больше. Нехватка кадров — 3.5 миллиона незакрытых вакансий по всему миру.

Этик данных и ИИ. Когда алгоритм принимает решение об отказе в кредите или постановке диагноза — кто отвечает? Новая профессия.

Разработчик XR — это VR, AR и смешанная реальность. Apple Vision Pro, Meta Quest — индустрия набирает обороты.

Биоинформатик — на стыке биологии, компьютерных наук и ИИ. Пандемия показала, как важны такие люди.

ESG-консультант. Устойчивое развитие — теперь обязательное требование для бизнеса в Европе и мире.""")

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 9  —  ПРОФЕССИИ БУДУЩЕГО (вторая волна 2030-2040)
# ══════════════════════════════════════════════════════════════════════════════
slide = blank_slide(prs)
fill_bg(slide, BG)

add_accent_line(slide, Inches(0.7), Inches(1.05), Inches(0.5), Pt(3), PURPLE)
add_text(slide, "Вторая волна: горизонт 2030–2040",
         Inches(1.4), Inches(0.75), Inches(10.0), Inches(0.6),
         font_size=40, bold=True, color=WHITE)
add_text(slide, "Профессии, которые сегодня звучат как фантастика — но уже проектируются",
         Inches(1.4), Inches(1.38), Inches(10.5), Inches(0.45),
         font_size=19, color=PURPLE)

new_jobs_2 = [
    ("🚀", "Архитектор космической инфраструктуры", "SpaceX, Blue Origin — реальные объекты"),
    ("🧓", "Консультант по долголетию",  "Рынок «100-летней жизни» — $600 млрд"),
    ("🌱", "Инженер по декарбонизации",  "Зелёная экономика — требование закона ЕС"),
    ("🪞", "Менеджер цифрового двойника","Виртуальные копии заводов, городов, людей"),
    ("🧪", "Генетический диетолог",      "Питание на основе ДНК-профиля"),
    ("🏙️", "Дизайнер умных городов",     "IoT + ИИ + урбанистика нового поколения"),
]

for i, (icon, title, desc) in enumerate(new_jobs_2):
    col = i % 2
    row = i // 2
    x = Inches(0.55) + col * (col_w + Inches(0.6))
    y = start_y + row * (col_h + gap_v)
    add_rect(slide, x, y, col_w, col_h, DARK_CARD)
    add_accent_line(slide, x, y, col_w, Pt(3), PURPLE)
    add_text(slide, icon, x + Inches(0.15), y + Inches(0.15),
             Inches(0.5), Inches(0.5), font_size=22, color=PURPLE)
    add_text(slide, title, x + Inches(0.7), y + Inches(0.1),
             col_w - Inches(0.85), Inches(0.38),
             font_size=17, bold=True, color=WHITE)
    add_text(slide, desc, x + Inches(0.7), y + Inches(0.44),
             col_w - Inches(0.85), Inches(0.32),
             font_size=14, color=GRAY)

add_text(slide, "🌌 К 2040 году у нас будет профессий, которые мы даже не можем вообразить сегодня",
         Inches(0.55), H - Inches(0.7), W - Inches(1.1), Inches(0.4),
         font_size=15, color=LIGHT_GRAY, italic=True)

add_slide_number(slide, 9)
add_notes(slide, """ВТОРАЯ ВОЛНА — ГОРИЗОНТ 2030-2040 (1.5 минуты)

А теперь поднимем горизонт до 2040 года.

Архитектор космической инфраструктуры. Илон Маск строит базу на Марсе. Это не метафора — это бизнес-план SpaceX. Кто-то должен проектировать эти объекты.

Консультант по долголетию. Технологии продления жизни — geroscience — уже привлекают миллиарды долларов. Когда люди начнут жить до 120 лет, им понадобятся специалисты, которые помогут это спланировать.

Инженер по декарбонизации. Евросоюз обязал компании достичь углеродной нейтральности. Это миллионы рабочих мест.

Менеджер цифрового двойника. Siemens уже делает цифровые копии заводов. В 2035-м будут цифровые двойники городов — и людей.

Генетический диетолог. Ваша ДНК определяет, как вы усваиваете витамины. Персонализированная медицина — следующий шаг.

И наконец — дизайнер умных городов. Где каждый светофор, здание и тротуар подключены к единой системе ИИ.

[Можно добавить лёгкую улыбку — это захватывающее будущее!]""")

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 10  —  TIMELINE
# ══════════════════════════════════════════════════════════════════════════════
slide = blank_slide(prs)
fill_bg(slide, BG)

add_accent_line(slide, Inches(0.7), Inches(1.05), Inches(0.5), Pt(3), CYAN)
add_text(slide, "Когда это произойдёт?",
         Inches(1.4), Inches(0.75), Inches(10.0), Inches(0.6),
         font_size=44, bold=True, color=WHITE)

# Timeline bar
tl_y = Inches(2.5)
tl_h = Pt(6)
tl_x = Inches(0.8)
tl_w = W - Inches(1.6)
add_rect(slide, tl_x, tl_y, tl_w, tl_h, GRAY)

events = [
    (0.0,  "Сейчас\n2025",   CYAN,   "Выше"),
    (0.25, "2027–2028",       AMBER,  "Ниже"),
    (0.5,  "2030",            RED,    "Выше"),
    (0.75, "2035",            PURPLE, "Ниже"),
    (1.0,  "2040+",           GREEN,  "Выше"),
]

desc_above = [
    "ИИ-ассистент у каждого",
    "Беспилотники\nна дорогах",
    "30% рутины\nавтоматизировано",
    "",
    "Новые профессии\nдоминируют",
]
desc_below = [
    "",
    "Массовые сокращения\nоператоров call-центров",
    "",
    "Исчезают профессии\nI-волны",
    "",
]

for j, (pos, label, color, side) in enumerate(events):
    dot_x = tl_x + pos * tl_w
    dot_r = Inches(0.12)
    dot = slide.shapes.add_shape(9, dot_x - dot_r, tl_y - dot_r + tl_h / 2,
                                 dot_r * 2, dot_r * 2)
    dot.fill.solid()
    dot.fill.fore_color.rgb = color
    dot.line.fill.background()

    if side == "Выше":
        line_y_top = tl_y - Inches(0.7)
        add_rect(slide, dot_x - Pt(1), line_y_top, Pt(2), Inches(0.7), color)
        add_text(slide, label, dot_x - Inches(0.9), line_y_top - Inches(0.55),
                 Inches(1.8), Inches(0.5), font_size=14, bold=True,
                 color=color, align=PP_ALIGN.CENTER)
        if desc_above[j]:
            add_text(slide, desc_above[j],
                     dot_x - Inches(1.1), line_y_top - Inches(1.1),
                     Inches(2.2), Inches(0.5), font_size=13,
                     color=LIGHT_GRAY, align=PP_ALIGN.CENTER)
    else:
        line_y_bot = tl_y + tl_h
        add_rect(slide, dot_x - Pt(1), line_y_bot, Pt(2), Inches(0.7), color)
        add_text(slide, label, dot_x - Inches(0.9), line_y_bot + Inches(0.72),
                 Inches(1.8), Inches(0.5), font_size=14, bold=True,
                 color=color, align=PP_ALIGN.CENTER)
        if desc_below[j]:
            add_text(slide, desc_below[j],
                     dot_x - Inches(1.1), line_y_bot + Inches(1.25),
                     Inches(2.2), Inches(0.55), font_size=13,
                     color=LIGHT_GRAY, align=PP_ALIGN.CENTER)

add_text(slide, "→ Темп изменений ускоряется с каждым годом",
         Inches(0.8), H - Inches(0.75), W - Inches(1.6), Inches(0.4),
         font_size=16, color=AMBER, italic=True)

add_slide_number(slide, 10)
add_notes(slide, """ВРЕМЕННАЯ ШКАЛА (1 минута)

Давайте привяжем всё это к конкретным датам.

2025 — уже сейчас. ИИ-ассистент есть у каждого. Промпт-инженеры уже работают.

2027-2028. Беспилотные грузовики появятся на трассах США и Китая. Операторы call-центров начнут массово терять работу.

2030 — переломный момент. По оценкам McKinsey, к этому году 30% всех рутинных задач будет автоматизировано. Исчезнут первые профессии I-волны.

2035 — следующий горизонт. Большинство профессий I-волны уже трансформированы. Начинается доминирование новых специальностей.

2040 и далее. Нам сложно предсказать, что именно появится — потому что темп изменений нарастает. Каждые 5 лет — новая реальность.

Вывод: у нас есть 5-10 лет, чтобы подготовиться. Это немало — если начать сейчас.""")

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 11  —  НАВЫКИ БУДУЩЕГО
# ══════════════════════════════════════════════════════════════════════════════
slide = blank_slide(prs)
fill_bg(slide, BG)

add_accent_line(slide, Inches(0.7), Inches(1.05), Inches(0.5), Pt(3), CYAN)
add_text(slide, "Навыки, которые не устареют",
         Inches(1.4), Inches(0.75), Inches(9.5), Inches(0.6),
         font_size=44, bold=True, color=WHITE)
add_text(slide, "Что ИИ не умеет и не сможет делать как человек",
         Inches(1.4), Inches(1.38), Inches(9.5), Inches(0.45),
         font_size=22, color=CYAN)

skills = [
    (PURPLE, "💡", "Критическое мышление",
     "Задавать правильные вопросы, находить нестандартные решения"),
    (GREEN,  "❤️", "Эмоциональный интеллект",
     "Эмпатия, переговоры, лидерство — чисто человеческое"),
    (AMBER,  "🎨", "Творчество и инновации",
     "Создавать то, чего ещё нет, менять правила игры"),
    (CYAN,   "🔄", "Адаптивность / обучаемость",
     "Учиться быстро — главный метанавык XXI века"),
]

sk_w = Inches(5.8)
sk_h = Inches(1.3)
sk_gap = Inches(0.18)
sk_start_y = Inches(2.1)

for i, (color, icon, title, desc) in enumerate(skills):
    col = i % 2
    row = i // 2
    x = Inches(0.55) + col * (sk_w + Inches(0.6))
    y = sk_start_y + row * (sk_h + sk_gap)
    add_rect(slide, x, y, sk_w, sk_h, DARK_CARD)
    add_accent_line(slide, x, y, sk_w, Pt(4), color)
    add_text(slide, icon, x + Inches(0.2), y + Inches(0.2),
             Inches(0.6), Inches(0.6), font_size=30, color=color)
    add_text(slide, title, x + Inches(0.9), y + Inches(0.15),
             sk_w - Inches(1.1), Inches(0.45),
             font_size=20, bold=True, color=color)
    add_text(slide, desc, x + Inches(0.9), y + Inches(0.58),
             sk_w - Inches(1.1), Inches(0.55),
             font_size=16, color=LIGHT_GRAY)

add_text(slide, "+  техническая грамотность (базовый ИИ, данные) — уже обязательна для всех",
         Inches(0.55), H - Inches(0.7), W - Inches(1.1), Inches(0.4),
         font_size=15, color=AMBER)

add_slide_number(slide, 11)
add_notes(slide, """НАВЫКИ БУДУЩЕГО (1 минута)

Теперь — самое важное: какие навыки защитят вас от автоматизации?

Критическое мышление. ИИ выполняет инструкции — он не задаёт правильные вопросы. Умение мыслить аналитически, видеть проблему целиком — это человеческое.

Эмоциональный интеллект. Люди хотят общаться с людьми. В кризисных ситуациях, в воспитании детей, в терапии, в переговорах — робот не заменит живого человека.

Творчество и инновации. ИИ генерирует вариации. Создать радикально новое — культуру, движение, продукт, который меняет правила — пока за нами.

Адаптивность. Ключевой метанавык. Тот, кто умеет быстро учиться новому, всегда будет востребован — просто в другой роли.

И добавлю пятый пункт: базовая техническая грамотность. Не нужно уметь программировать — но понимать, что такое ИИ, данные, автоматизация — уже обязательно для всех.""")

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 12  —  КАК ПОДГОТОВИТЬСЯ (Call to Action)
# ══════════════════════════════════════════════════════════════════════════════
slide = blank_slide(prs)
fill_bg(slide, BG)

add_accent_line(slide, Inches(0.7), Inches(1.05), Inches(0.5), Pt(3), AMBER)
add_text(slide, "Три шага к профессии будущего",
         Inches(1.4), Inches(0.75), Inches(10.0), Inches(0.6),
         font_size=44, bold=True, color=WHITE)
add_text(slide, "Не нужно знать ответ — нужно начать двигаться",
         Inches(1.4), Inches(1.38), Inches(10.0), Inches(0.45),
         font_size=22, color=AMBER)

steps = [
    (CYAN,   "01",
     "Изучайте ИИ-инструменты",
     "ChatGPT, Midjourney, Copilot — потратьте 30 мин/день.\nЧем раньше начнёте, тем больше преимущество."),
    (GREEN,  "02",
     "Развивайте гибкие навыки",
     "Запишитесь на курс по публичным выступлениям,\nвозглавьте проект, найдите ментора."),
    (PURPLE, "03",
     "Смотрите на стык дисциплин",
     "Биология + ИТ. Дизайн + психология. Право + ИИ.\nСамые востребованные специалисты — на пересечении."),
]

step_w = W - Inches(1.4)
step_h = Inches(1.35)
step_x = Inches(0.7)
step_gap = Inches(0.18)
step_start_y = Inches(2.0)

for i, (color, num, title, body) in enumerate(steps):
    y = step_start_y + i * (step_h + step_gap)
    add_rect(slide, step_x, y, step_w, step_h, DARK_CARD)
    add_accent_line(slide, step_x, y, step_w, Pt(4), color)
    # Number badge
    badge = slide.shapes.add_shape(9,
                                    step_x + Inches(0.2), y + Inches(0.3),
                                    Inches(0.6), Inches(0.6))
    badge.fill.solid()
    badge.fill.fore_color.rgb = color
    badge.line.fill.background()
    add_text(slide, num, step_x + Inches(0.2), y + Inches(0.3),
             Inches(0.6), Inches(0.6), font_size=18, bold=True,
             color=WHITE, align=PP_ALIGN.CENTER)
    add_text(slide, title, step_x + Inches(1.05), y + Inches(0.12),
             step_w - Inches(1.25), Inches(0.45),
             font_size=22, bold=True, color=color)
    add_text(slide, body, step_x + Inches(1.05), y + Inches(0.58),
             step_w - Inches(1.25), Inches(0.65),
             font_size=17, color=LIGHT_GRAY)

add_slide_number(slide, 12)
add_notes(slide, """ПРИЗЫВ К ДЕЙСТВИЮ (1.5 минуты)

Итак, что конкретно делать?

Шаг первый — прямо сейчас. Откройте ChatGPT, Copilot или любой ИИ-инструмент в вашей сфере. Посвящайте ему 30 минут в день. Через месяц вы будете понимать ИИ лучше 90% коллег.

Шаг второй — в ближайшие полгода. Развивайте soft skills. Не те, что написаны в резюме, а настоящие. Публичные выступления. Умение убеждать. Умение слушать. Эти навыки будут ценнее диплома.

Шаг третий — долгосрочная стратегия. Посмотрите на стык дисциплин. Юрист, который понимает ИИ, стоит в 3 раза дороже просто юриста. Дизайнер, который знает нейронауки, незаменим. Ищите свой уникальный стык.

[Будьте конкретны и энергичны. Дайте людям ощущение, что они могут действовать прямо сегодня.]""")

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 13  —  ЗАКРЫТИЕ (Full Circle)
# ══════════════════════════════════════════════════════════════════════════════
slide = blank_slide(prs)
fill_bg(slide, BG)

# Top accent line
add_rect(slide, Inches(0), Inches(0), W, Pt(5), PURPLE)

# Background circles (decorative, layered)
for r, col in [(5.0, RGBColor(0x1A, 0x10, 0x40)), (3.5, RGBColor(0x10, 0x1A, 0x38)),
               (2.0, DARK_CARD)]:
    cx = Inches(10.5)
    cy = Inches(1.5)
    shape = slide.shapes.add_shape(9, cx - Inches(r / 2), cy - Inches(r / 2),
                                   Inches(r), Inches(r))
    shape.fill.solid()
    shape.fill.fore_color.rgb = col
    shape.line.fill.background()

# Big 85% again — bookend
add_text(slide, "85%",
         Inches(7.5), Inches(0.3), Inches(5.3), Inches(2.5),
         font_size=88, bold=True, color=PURPLE, align=PP_ALIGN.CENTER)

add_text(slide, "Профессий будущего\nещё не существует.",
         Inches(0.7), Inches(1.5), Inches(7.0), Inches(1.5),
         font_size=40, bold=True, color=WHITE)

add_accent_line(slide, Inches(0.7), Inches(3.2), Inches(6.0), Pt(3), CYAN)

add_text(slide, "Это значит, что лучшие из них\nможет создать именно ты.",
         Inches(0.7), Inches(3.45), Inches(8.0), Inches(1.4),
         font_size=32, bold=False, color=CYAN)

add_text(slide, "Будущее не случается с нами. Мы его создаём.",
         Inches(0.7), Inches(5.05), Inches(10.5), Inches(0.55),
         font_size=20, bold=False, color=GRAY, italic=True)

# Bottom bar
add_rect(slide, Inches(0), H - Inches(0.8), W, Inches(0.8), DARK_CARD)
add_text(slide, "Вопросы?  •  Профессии будущего: что появится и что исчезнет",
         Inches(0.5), H - Inches(0.65), W - Inches(1.0), Inches(0.5),
         font_size=18, color=GRAY, align=PP_ALIGN.CENTER)

add_slide_number(slide, 13)
add_notes(slide, """ФИНАЛЬНЫЙ АККОРД (1 минута)

Помните слайд в самом начале? 85%.

85% профессий 2035 года ещё не существует.

Это звучит пугающе. Но есть другой способ это услышать.

Это значит, что список лучших профессий будущего — ещё открыт. Он не написан. Его пишем мы — прямо сейчас.

История показывает: каждый технологический переворот создавал больше рабочих мест, чем уничтожал. Паровая машина, электричество, интернет — всё это вызывало страх. И всё это создавало миллионы новых возможностей.

Будущее не случается с нами. Мы его создаём.

[Заканчивайте с силой и уверенностью. Прямой зрительный контакт. Пауза. Ни слова "спасибо" — пусть последнее слово останется за идеей.]

---
СТРУКТУРА ПРЕЗЕНТАЦИИ (резюме для спикера):
Слайд 1 — Название (1 мин)
Слайд 2 — Хук: 85% (1 мин)
Слайд 3 — Движущие силы (1 мин)
Слайд 4 — Переход: Исчезнут (30 сек)
Слайд 5 — Профессии под угрозой (2 мин)
Слайд 6 — Закономерность автоматизации (1 мин)
Слайд 7 — Переход: Появятся (30 сек)
Слайд 8 — Первая волна (2 мин)
Слайд 9 — Вторая волна (1.5 мин)
Слайд 10 — Таймлайн (1 мин)
Слайд 11 — Навыки будущего (1 мин)
Слайд 12 — Призыв к действию (1.5 мин)
Слайд 13 — Финал (1 мин)
ИТОГО: ~15 минут""")

# ── Save ───────────────────────────────────────────────────────────────────────
output_path = "/home/user/ambition/Профессии_будущего.pptx"
prs.save(output_path)
print(f"✅ Saved: {output_path}")
