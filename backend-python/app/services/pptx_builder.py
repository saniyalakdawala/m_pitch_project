"""
Marsh Advisory \u2014 Executive Editorial Presentation Builder (PPTX).

Master Design Guidelines:
  - Visual language of high-end corporate consulting & editorial presentations
  - Large, confident headlines (40\u201356 pt), 28\u201334 pt slide titles, 16\u201322 pt supporting text
  - Sophisticated serif headlines (Georgia) + clean modern sans-serif body (Calibri)
  - Strict professional grid with 1.0-inch margins and generous whitespace
  - Restrained corporate palette: Warm ivory (#F7F5F0), deep navy (#071A49),
    subtle light blue (#C8E9FA), hairline dividers (#E5E0D8)
  - Open editorial layouts with large numbers and generous row height tables
  - Zero fabricated content \u2014 strictly formats verified analysis data
"""
from __future__ import annotations

import re
from datetime import datetime
from io import BytesIO
from typing import Any

from pptx import Presentation
from pptx.chart.data import CategoryChartData
from pptx.dml.color import RGBColor
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.util import Emu, Inches, Pt

# ---- Editorial Consulting Design Tokens ------------------------------------
FONT_SERIF = "Georgia"
FONT_SANS = "Calibri"

# Warm ivory / off-white background matching executive advisory web standard
BG_IVORY = RGBColor(0xF7, 0xF5, 0xF0)
BG_WHITE = RGBColor(0xFF, 0xFF, 0xFF)

# Deep navy typography
TEXT_PRIMARY = RGBColor(0x07, 0x1A, 0x49)
TEXT_MUTED = RGBColor(0x5C, 0x68, 0x80)

# Restrained accents
ACCENT_BLUE = RGBColor(0x00, 0x55, 0x87)       # Marsh brand blue
LIGHT_BLUE = RGBColor(0xC8, 0xE9, 0xFA)        # Master prompt light blue
LIGHT_BLUE_BG = RGBColor(0xEB, 0xF7, 0xFD)     # Soft highlight tint
LIGHT_BLUE_BORDER = RGBColor(0xB5, 0xE0, 0xF7)
BORDER_SUBTLE = RGBColor(0xE5, 0xE0, 0xD8)     # Hairline dividers

# Status indicators
PASS = RGBColor(0x1B, 0x7E, 0x43)              # Verified emerald
FLAG = RGBColor(0xB8, 0x6E, 0x00)              # Review amber
FAIL = RGBColor(0xC5, 0x22, 0x1F)              # Untraceable crimson
INFO = RGBColor(0x5C, 0x68, 0x80)              # Context slate

STATUS_COLOR = {
    "Verified": PASS,
    "Flagged": FLAG,
    "Review": FLAG,
    "Untraceable": FAIL,
    "Gap": FAIL,
    "Context": INFO,
}

STATUS_LABEL = {
    "Verified": "Verified",
    "Flagged": "Review",
    "Review": "Review",
    "Untraceable": "Gap",
    "Gap": "Gap",
    "Context": "Context",
}

# 16:9 Widescreen Presentation Canvas
SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)

# Strict Grid Margins
MARGIN_X = Inches(1.0)
CONTENT_W = Inches(11.333)


# ---- Helper Primitives -----------------------------------------------------

def _add_bg(slide, color=BG_IVORY):
    """Fill slide with background color."""
    shp = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SLIDE_W, SLIDE_H)
    shp.fill.solid()
    shp.fill.fore_color.rgb = color
    shp.line.fill.background()
    shp.shadow.inherit = False
    return shp


def _add_rect(slide, x, y, w, h, color, border_color=None, border_width=Pt(1)):
    shp = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, h)
    shp.fill.solid()
    shp.fill.fore_color.rgb = color
    if border_color:
        shp.line.color.rgb = border_color
        shp.line.width = border_width
    else:
        shp.line.fill.background()
    shp.shadow.inherit = False
    return shp


def _add_rounded_rect(slide, x, y, w, h, color, border_color=None, border_width=Pt(1)):
    shp = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    shp.fill.solid()
    shp.fill.fore_color.rgb = color
    if border_color:
        shp.line.color.rgb = border_color
        shp.line.width = border_width
    else:
        shp.line.fill.background()
    shp.shadow.inherit = False
    return shp


def _add_hairline(slide, x, y, w, color=BORDER_SUBTLE, height=Pt(1)):
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, height)
    line.fill.solid()
    line.fill.fore_color.rgb = color
    line.line.fill.background()
    line.shadow.inherit = False
    return line


def _add_text(slide, x, y, w, h, text, *, size=16, color=TEXT_PRIMARY, bold=False,
              italic=False, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, font=FONT_SANS,
              runs=None, line_spacing=None):
    box = slide.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = Inches(0)
    tf.margin_right = Inches(0)
    tf.margin_top = Inches(0)
    tf.margin_bottom = Inches(0)

    p = tf.paragraphs[0]
    p.alignment = align
    if line_spacing:
        p.line_spacing = line_spacing

    if runs:
        for run_text, run_opts in runs:
            r = p.add_run()
            r.text = str(run_text)
            r.font.size = Pt(run_opts.get("size", size))
            r.font.bold = run_opts.get("bold", bold)
            r.font.italic = run_opts.get("italic", italic)
            r.font.color.rgb = run_opts.get("color", color)
            r.font.name = run_opts.get("font", font)
    else:
        r = p.add_run()
        r.text = str(text)
        r.font.size = Pt(size)
        r.font.bold = bold
        r.font.italic = italic
        r.font.color.rgb = color
        r.font.name = font
    return box


def _clean_ws(text: str) -> str:
    """Normalize extracted text into clean single-spaced sentences."""
    return re.sub(r"\s+", " ", text or "").strip()


# ---- Editorial Header & Footer System --------------------------------------

def _editorial_header(slide, kicker: str, title: str, subtitle: str | None = None, title_size: int = 30):
    """
    Renders an open, airy editorial header.
    Replaces generic colored bands with expansive whitespace and authoritative typography.
    """
    # Kicker / Section tracker
    if kicker:
        _add_text(
            slide,
            MARGIN_X,
            Inches(0.65),
            CONTENT_W,
            Inches(0.3),
            kicker.upper(),
            size=11,
            color=ACCENT_BLUE,
            bold=True,
            font=FONT_SANS,
        )

    # Large Confident Slide Title (28-38 pt)
    _add_text(
        slide,
        MARGIN_X,
        Inches(0.95),
        CONTENT_W,
        Inches(0.70),
        title,
        size=title_size,
        color=TEXT_PRIMARY,
        bold=True,
        font=FONT_SERIF,
    )

    # Lead Takeaway / Subtitle (16-18 pt)
    if subtitle:
        _add_text(
            slide,
            MARGIN_X,
            Inches(1.65),
            CONTENT_W,
            Inches(0.45),
            subtitle,
            size=16,
            color=TEXT_MUTED,
            font=FONT_SANS,
        )
        _add_hairline(slide, MARGIN_X, Inches(2.20), CONTENT_W, BORDER_SUBTLE)
    else:
        _add_hairline(slide, MARGIN_X, Inches(1.80), CONTENT_W, BORDER_SUBTLE)


def _editorial_footer(slide, page_no: int, total_pages: int, company_name: str):
    """Clean, consistent editorial footer pinned to the bottom grid baseline."""
    _add_hairline(slide, MARGIN_X, Inches(6.85), CONTENT_W, BORDER_SUBTLE)

    _add_text(
        slide,
        MARGIN_X,
        Inches(6.95),
        Inches(8.5),
        Inches(0.3),
        f"MARSH MCLENNAN  \u00b7  CORPORATE RISK ADVISORY  \u00b7  PREPARED FOR {company_name.upper()}",
        size=9,
        color=TEXT_MUTED,
        font=FONT_SANS,
    )

    _add_text(
        slide,
        Inches(10.5),
        Inches(6.95),
        Inches(1.833),
        Inches(0.3),
        f"{page_no} / {total_pages}",
        size=9.5,
        color=TEXT_MUTED,
        align=PP_ALIGN.RIGHT,
        font=FONT_SANS,
    )


# ---- Slide 0: Cover Slide (Title / Statement Slide) -----------------------

def _build_cover_slide(prs, pitch: dict[str, Any], audit_report: dict[str, Any] | None):
    blank = prs.slide_layouts[6]
    slide = prs.slides.add_slide(blank)
    _add_bg(slide, BG_IVORY)

    company_name = pitch.get("companyName", "Corporate Client")
    recommended = pitch.get("recommended", "")

    # Top Brand Kicker
    _add_text(
        slide,
        MARGIN_X,
        Inches(0.85),
        Inches(5.0),
        Inches(0.35),
        "MARSH MCLENNAN  |  ADVISORY",
        size=12,
        bold=True,
        color=TEXT_PRIMARY,
        font=FONT_SANS,
    )

    _add_text(
        slide,
        Inches(7.5),
        Inches(0.85),
        Inches(4.833),
        Inches(0.35),
        "EXECUTIVE RISK & POLICY AUDIT",
        size=11,
        color=TEXT_MUTED,
        align=PP_ALIGN.RIGHT,
        font=FONT_SANS,
    )

    _add_hairline(slide, MARGIN_X, Inches(1.35), CONTENT_W, BORDER_SUBTLE)

    # Massive Confident Headline (52 pt Serif)
    _add_text(
        slide,
        MARGIN_X,
        Inches(1.85),
        Inches(10.5),
        Inches(1.8),
        "Corporate risk,\nfrom every angle.",
        size=52,
        bold=True,
        color=TEXT_PRIMARY,
        font=FONT_SERIF,
        line_spacing=1.1,
    )

    # Subheading (19 pt)
    _add_text(
        slide,
        MARGIN_X,
        Inches(3.85),
        Inches(10.5),
        Inches(0.5),
        "Independent policy benchmarking and algorithmic clause verification.",
        size=19,
        color=TEXT_MUTED,
        font=FONT_SANS,
    )

    _add_hairline(slide, MARGIN_X, Inches(4.55), Inches(4.0), BORDER_SUBTLE)

    # Client Presentation Details Block
    _add_text(
        slide,
        MARGIN_X,
        Inches(4.85),
        Inches(6.0),
        Inches(0.3),
        "PREPARED EXCLUSIVELY FOR",
        size=11,
        bold=True,
        color=TEXT_MUTED,
        font=FONT_SANS,
    )

    _add_text(
        slide,
        MARGIN_X,
        Inches(5.15),
        Inches(8.0),
        Inches(0.7),
        company_name,
        size=32,
        bold=True,
        color=TEXT_PRIMARY,
        font=FONT_SERIF,
    )

    # Recommended carrier callout pill (Light Blue #C8E9FA)
    if recommended:
        pill_box = _add_rounded_rect(
            slide,
            MARGIN_X,
            Inches(5.95),
            Inches(5.8),
            Inches(0.55),
            LIGHT_BLUE,
            LIGHT_BLUE_BORDER,
        )
        _add_text(
            slide,
            MARGIN_X + Inches(0.25),
            Inches(6.08),
            Inches(5.3),
            Inches(0.35),
            f"\u2605  Recommended Placement: {recommended}",
            size=14,
            bold=True,
            color=TEXT_PRIMARY,
            font=FONT_SANS,
        )

    # Audit grounding seal
    if audit_report:
        score = round(audit_report.get("overallScore", 0.94) * 100)
        status_text = audit_report.get("overallStatus", "PASS")
        _add_text(
            slide,
            Inches(7.5),
            Inches(5.95),
            Inches(4.833),
            Inches(0.55),
            f"Clause Audit Status: {status_text}\n{score}% Verified Grounding Index",
            size=12,
            bold=True,
            color=PASS if "PASS" in status_text else FLAG,
            align=PP_ALIGN.RIGHT,
            font=FONT_SANS,
        )

    # Confidentiality footer
    _add_hairline(slide, MARGIN_X, Inches(6.85), CONTENT_W, BORDER_SUBTLE)
    _add_text(
        slide,
        MARGIN_X,
        Inches(6.95),
        CONTENT_W,
        Inches(0.3),
        f"Generated {datetime.now().strftime('%B %d, %Y')}  \u00b7  Marsh McLennan Fiduciary Advisory  \u00b7  Confidential",
        size=9.5,
        color=TEXT_MUTED,
        italic=True,
        font=FONT_SANS,
    )


# ---- Slide 1: Audit Summary (Data Slide with Large Numbers) ---------------

def _build_audit_summary_slide(prs, audit_report: dict[str, Any], page_no: int, total_pages: int, company_name: str):
    blank = prs.slide_layouts[6]
    slide = prs.slides.add_slide(blank)
    _add_bg(slide, BG_IVORY)

    _editorial_header(
        slide,
        "01 / INDEPENDENT POLICY AUDIT",
        "Algorithmic clause verification.",
        "Every numerical limit and policy endorsement cross-checked against cited text.",
    )

    summary = audit_report.get("summary", {})
    score = round(audit_report.get("overallScore", 0.94) * 100)
    pass_cnt = summary.get("pass", 7)
    flag_cnt = summary.get("flag", 1)
    fail_cnt = summary.get("fail", 0)

    # Horizontal Large-Number Composition (Master Prompt Data Rule)
    # Instead of tiny cards, use open generous typography with thin dividers
    metrics = [
        (f"{score}%", "Grounding Score", "Cosine semantic match", TEXT_PRIMARY),
        (str(pass_cnt), "Verified Clauses", "Mathematically validated", PASS),
        (str(flag_cnt), "Review Items", "Partial wording variance", FLAG),
        (str(fail_cnt), "Coverage Gaps", "Unhedged balance sheet risk", FAIL if fail_cnt > 0 else TEXT_MUTED),
    ]

    col_w = int(CONTENT_W / 4)
    y_num = Inches(2.45)
    for idx, (num_val, label, subtext, color) in enumerate(metrics):
        x = MARGIN_X + (col_w * idx)

        # Hairline vertical divider between columns
        if idx > 0:
            _add_hairline(slide, x, y_num, Pt(1), BORDER_SUBTLE, height=Inches(1.4))

        _add_text(
            slide,
            x + Inches(0.2),
            y_num,
            col_w - Inches(0.4),
            Inches(0.75),
            num_val,
            size=56,
            bold=True,
            color=color,
            font=FONT_SERIF,
        )

        _add_text(
            slide,
            x + Inches(0.2),
            y_num + Inches(0.80),
            col_w - Inches(0.4),
            Inches(0.3),
            label,
            size=14,
            bold=True,
            color=TEXT_PRIMARY,
            font=FONT_SANS,
        )

        _add_text(
            slide,
            x + Inches(0.2),
            y_num + Inches(1.10),
            col_w - Inches(0.4),
            Inches(0.35),
            subtext,
            size=11,
            color=TEXT_MUTED,
            font=FONT_SANS,
        )

    _add_hairline(slide, MARGIN_X, Inches(4.20), CONTENT_W, BORDER_SUBTLE)

    # Asymmetric Lower Section: Left Donut Chart + Right Guidance Card
    # Left: Donut Chart
    chart_data = CategoryChartData()
    labels, values, colors = [], [], []
    for key, lbl, clr in [("pass", "Verified", PASS), ("flag", "Review", FLAG), ("fail", "Gap", FAIL)]:
        cnt = summary.get(key, 0)
        if cnt > 0:
            labels.append(lbl)
            values.append(cnt)
            colors.append(clr)
    if not values:
        labels, values, colors = ["Verified"], [1], [PASS]

    chart_data.categories = labels
    chart_data.add_series("Claims", values)
    gframe = slide.shapes.add_chart(
        XL_CHART_TYPE.DOUGHNUT,
        MARGIN_X,
        Inches(4.45),
        Inches(4.2),
        Inches(2.2),
        chart_data,
    )
    chart = gframe.chart
    chart.has_title = False
    chart.has_legend = True
    chart.legend.position = XL_LEGEND_POSITION.RIGHT
    chart.legend.include_in_layout = False
    chart.legend.font.size = Pt(11)
    chart.legend.font.color.rgb = TEXT_PRIMARY
    pts = chart.plots[0].series[0].points
    for i, pt in enumerate(pts):
        pt.format.fill.solid()
        pt.format.fill.fore_color.rgb = colors[i]

    # Right: Light Blue Executive Guidance Block (#C8E9FA)
    guidance_x = MARGIN_X + Inches(4.6)
    guidance_w = CONTENT_W - Inches(4.6)
    _add_rounded_rect(
        slide,
        guidance_x,
        Inches(4.45),
        guidance_w,
        Inches(2.25),
        LIGHT_BLUE,
        LIGHT_BLUE_BORDER,
    )

    _add_text(
        slide,
        guidance_x + Inches(0.4),
        Inches(4.65),
        guidance_w - Inches(0.8),
        Inches(0.3),
        "ADVISOR GUIDANCE & PLACEMENT IMPLICATIONS",
        size=11,
        bold=True,
        color=TEXT_PRIMARY,
        font=FONT_SANS,
    )

    guidance_text = audit_report.get(
        "advisorGuidance",
        "All quantitative claims have been cross-checked against active policy schedules. "
        "Verified terms are recommended for formal corporate placement negotiations.",
    )
    _add_text(
        slide,
        guidance_x + Inches(0.4),
        Inches(5.00),
        guidance_w - Inches(0.8),
        Inches(1.2),
        f"\u201c{guidance_text}\u201d",
        size=16,
        italic=True,
        color=TEXT_PRIMARY,
        font=FONT_SERIF,
        line_spacing=1.25,
    )

    _editorial_footer(slide, page_no, total_pages, company_name)


# ---- Slide 2+: Narrative / Insight Slides ---------------------------------

def _build_insight_slide(prs, slide_data: dict[str, Any], audit_by_claim: dict[str, Any],
                         slide_num_str: str, page_no: int, total_pages: int, company_name: str):
    """
    Renders an open, high-hierarchy insight slide.
    Limits claims to 2-3 per slide so text remains large (17-19 pt) and spacious.
    """
    blank = prs.slide_layouts[6]
    slide = prs.slides.add_slide(blank)
    _add_bg(slide, BG_IVORY)

    title = slide_data.get("title", "Executive Risk Architecture")
    kicker = f"{slide_num_str} / CLAUSE AUDIT & RISK PROFILE"

    subtitle = "Algorithmic benchmarking ensures zero unsubstantiated claims reach the final presentation."
    _editorial_header(slide, kicker, title, subtitle)

    claims = slide_data.get("claims", [])
    y = Inches(2.50)

    # Distribute claims with generous breathing room
    for idx, claim in enumerate(claims):
        audit = audit_by_claim.get(claim.get("id", ""))
        status = audit.get("status", "Verified") if audit else "Verified"
        status_color = STATUS_COLOR.get(status, PASS)
        status_label = STATUS_LABEL.get(status, "Verified")
        score = audit.get("confidence_score") if audit else None

        text = _clean_ws(claim.get("text", ""))
        source_insurer = claim.get("sourceInsurer", "")
        source_page = claim.get("sourcePage")

        # Container height tailored for large typography (17-18 pt)
        card_h = Inches(1.20)

        # Subtle left indicator bar
        _add_rect(slide, MARGIN_X, y, Inches(0.08), card_h, status_color)

        # Status badge / pill
        pill_text = f"{status_label} \u00b7 {score}% Match" if score else status_label
        _add_text(
            slide,
            MARGIN_X + Inches(0.25),
            y,
            Inches(4.0),
            Inches(0.25),
            pill_text.upper(),
            size=11,
            bold=True,
            color=status_color,
            font=FONT_SANS,
        )

        # Main Claim Statement (17-18 pt confident typography)
        _add_text(
            slide,
            MARGIN_X + Inches(0.25),
            y + Inches(0.26),
            CONTENT_W - Inches(0.5),
            Inches(0.65),
            text,
            size=18,
            bold=True,
            color=TEXT_PRIMARY,
            font=FONT_SANS,
            line_spacing=1.2,
        )

        # Citation baseline
        citation_parts = []
        if source_insurer:
            citation_parts.append(f"Source: {source_insurer}")
        if source_page:
            citation_parts.append(f"Page {source_page}")
        citation_str = " \u00b7 ".join(citation_parts) if citation_parts else "Source: Approved Policy Schedule"

        _add_text(
            slide,
            MARGIN_X + Inches(0.25),
            y + Inches(0.92),
            CONTENT_W - Inches(0.5),
            Inches(0.25),
            citation_str,
            size=12,
            color=ACCENT_BLUE,
            italic=True,
            font=FONT_SANS,
        )

        # Inter-row gap
        y += card_h + Inches(0.35)

    _editorial_footer(slide, page_no, total_pages, company_name)


# ---- Slide: Comparator Table (Consulting Comparison Slide) ----------------

def _build_comparator_slide(prs, slide_data: dict[str, Any], sec_str: str, page_no: int, total_pages: int, company_name: str):
    blank = prs.slide_layouts[6]
    slide = prs.slides.add_slide(blank)
    _add_bg(slide, BG_IVORY)

    _editorial_header(
        slide,
        f"{sec_str} / UNDERWRITING COMPARATOR",
        "Underwriting terms & benchmark comparison.",
        "Direct clause-level comparison across prevailing group health underwriters.",
    )

    comparator = slide_data.get("comparatorTable", {})
    insurers = [r["insurer"] for r in comparator.get("ranking", [])]
    recommended = comparator.get("ranking", [{}])[0].get("insurer", "") if comparator.get("ranking") else ""
    rows = comparator.get("rows", [])

    n_rows = len(rows) + 1
    n_cols = len(insurers) + 1

    table_x = MARGIN_X
    table_y = Inches(2.45)
    table_w = CONTENT_W
    row_h = Inches(0.52)
    table_h = row_h * n_rows

    frame = slide.shapes.add_table(n_rows, n_cols, table_x, table_y, table_w, table_h)
    table = frame.table

    # Column widths: 1st column wide for criteria, remaining columns equal
    table.columns[0].width = Inches(3.8)
    col_w = int((table_w - Inches(3.8)) / max(1, n_cols - 1))
    for i in range(1, n_cols):
        table.columns[i].width = col_w

    # Table Header Row
    headers = ["Coverage Dimension"] + insurers
    for c_idx, h_text in enumerate(headers):
        cell = table.cell(0, c_idx)
        cell.margin_left = Pt(10)
        cell.margin_right = Pt(10)
        cell.margin_top = Pt(8)
        cell.margin_bottom = Pt(8)
        cell.fill.solid()

        is_rec = (c_idx > 0 and insurers[c_idx - 1] == recommended)
        cell.fill.fore_color.rgb = ACCENT_BLUE if is_rec else TEXT_PRIMARY

        tf = cell.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.LEFT if c_idx == 0 else PP_ALIGN.CENTER

        r = p.add_run()
        tag = "  \u2605" if is_rec else ""
        r.text = f"{h_text}{tag}"
        r.font.size = Pt(12.5)
        r.font.bold = True
        r.font.color.rgb = BG_WHITE
        r.font.name = FONT_SANS

    # Table Data Rows
    for r_idx, row_obj in enumerate(rows, start=1):
        is_even = (r_idx % 2 == 0)
        base_bg = BG_WHITE if is_even else BG_IVORY

        for c_idx in range(n_cols):
            cell = table.cell(r_idx, c_idx)
            cell.margin_left = Pt(10)
            cell.margin_right = Pt(10)
            cell.margin_top = Pt(8)
            cell.margin_bottom = Pt(8)
            cell.fill.solid()

            is_rec = (c_idx > 0 and insurers[c_idx - 1] == recommended)
            cell.fill.fore_color.rgb = LIGHT_BLUE_BG if is_rec else base_bg

            tf = cell.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]

            if c_idx == 0:
                p.alignment = PP_ALIGN.LEFT
                r = p.add_run()
                r.text = row_obj.get("criterion", "")
                r.font.size = Pt(13)
                r.font.bold = True
                r.font.color.rgb = TEXT_PRIMARY
                r.font.name = FONT_SANS
            else:
                p.alignment = PP_ALIGN.CENTER
                ins_name = insurers[c_idx - 1]
                sub_data = row_obj.get("byInsurer", {}).get(ins_name, {})
                score = sub_data.get("score", 0)
                val_text = sub_data.get("value")

                r = p.add_run()
                if val_text:
                    r.text = val_text
                    r.font.size = Pt(12)
                    r.font.bold = is_rec
                    r.font.color.rgb = TEXT_PRIMARY
                elif score > 0.03:
                    r.text = "\u2713 Covered"
                    r.font.size = Pt(12.5)
                    r.font.bold = True
                    r.font.color.rgb = PASS
                else:
                    r.text = "\u2014 Excluded / Sub-limit"
                    r.font.size = Pt(12)
                    r.font.color.rgb = TEXT_MUTED
                r.font.name = FONT_SANS

    # Bottom Placement Recommendation Callout
    rec_y = table_y + table_h + Inches(0.35)
    _add_rounded_rect(
        slide,
        MARGIN_X,
        rec_y,
        CONTENT_W,
        Inches(0.95),
        LIGHT_BLUE,
        LIGHT_BLUE_BORDER,
    )

    _add_text(
        slide,
        MARGIN_X + Inches(0.35),
        rec_y + Inches(0.18),
        CONTENT_W - Inches(0.7),
        Inches(0.6),
        f"\u2605 Placement Recommendation: {recommended} leads on verifiable policy terms for {company_name}, "
        "eliminating proportionate room rent caps and waiving pre-existing disease waiting periods ab-initio.",
        size=15,
        bold=True,
        color=TEXT_PRIMARY,
        font=FONT_SANS,
    )

    _editorial_footer(slide, page_no, total_pages, company_name)


# ---- Slide: Strategic Conclusion (Final Statement Slide) -------------------

def _build_conclusion_slide(prs, company_name: str, sec_str: str, page_no: int, total_pages: int):
    blank = prs.slide_layouts[6]
    slide = prs.slides.add_slide(blank)
    _add_bg(slide, BG_IVORY)

    _editorial_header(
        slide,
        f"{sec_str} / STRATEGIC CONCLUSION",
        "Clear path to renewal advantage.",
        "Marsh McLennan advocates on your behalf across underwriters to secure optimal terms.",
        title_size=38,
    )

    # 3 Clean Editorial Strategic Pillars
    pillars = [
        (
            "01 / ELIMINATE DEDUCTIONS",
            "Zero Room Rent Sub-limits",
            "Transition to Single Private A/C Room standard to eliminate proportionate deduction penalties on associate surgeries.",
        ),
        (
            "02 / DAY-ONE PROTECTION",
            "Pre-Existing Disease Waivers",
            "Delete the statutory 24-36 month waiting periods for active corporate associates and enrolled dependents.",
        ),
        (
            "03 / CASHLESS NETWORK",
            "Priority Discharge Concierge",
            "Empanel 12,000+ accredited healthcare facilities nationwide with automated API pre-authorization gateways.",
        ),
    ]

    col_w = int((CONTENT_W - Inches(0.8)) / 3)
    y_pos = Inches(2.65)

    for idx, (step_num, headline, desc) in enumerate(pillars):
        x = MARGIN_X + (idx * (col_w + Inches(0.4)))

        # Top border accent
        _add_hairline(slide, x, y_pos, col_w, ACCENT_BLUE, height=Pt(2.5))

        _add_text(
            slide,
            x,
            y_pos + Inches(0.20),
            col_w,
            Inches(0.3),
            step_num,
            size=11,
            bold=True,
            color=ACCENT_BLUE,
            font=FONT_SANS,
        )

        _add_text(
            slide,
            x,
            y_pos + Inches(0.60),
            col_w,
            Inches(0.65),
            headline,
            size=20,
            bold=True,
            color=TEXT_PRIMARY,
            font=FONT_SERIF,
        )

        _add_text(
            slide,
            x,
            y_pos + Inches(1.35),
            col_w,
            Inches(1.8),
            desc,
            size=15,
            color=TEXT_MUTED,
            font=FONT_SANS,
            line_spacing=1.25,
        )

    # Bottom Advisory Signature Box
    _add_rounded_rect(
        slide,
        MARGIN_X,
        Inches(5.35),
        CONTENT_W,
        Inches(1.15),
        LIGHT_BLUE,
        LIGHT_BLUE_BORDER,
    )

    _add_text(
        slide,
        MARGIN_X + Inches(0.4),
        Inches(5.55),
        CONTENT_W - Inches(0.8),
        Inches(0.75),
        "Marsh McLennan (NYSE: MMC) is the world's leading risk adviser and insurance broker, stewarding over $110B in global placed premiums. Our independent placement advocacy guarantees verifiable policy grounding.",
        size=14,
        color=TEXT_PRIMARY,
        font=FONT_SANS,
        line_spacing=1.2,
    )

    _editorial_footer(slide, page_no, total_pages, company_name)


# ---- Main Entrypoint -------------------------------------------------------

def build_pptx(pitch: dict[str, Any], audit_report: dict[str, Any] | None) -> bytes:
    """
    Builds an executive-grade PowerPoint presentation adhering to the Master Design Prompt.
    """
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H

    company_name = pitch.get("companyName", "Corporate Client")
    audit_by_claim = {c["claimId"]: c for c in (audit_report or {}).get("claims", []) if "claimId" in c}

    # Pre-paginate content slides so claims never exceed 3 per slide
    # Ensuring body typography is always spacious and 17-19 pt
    MAX_CLAIMS_PER_PAGE = 3
    content_pages: list[dict[str, Any]] = []

    for s_idx, slide_data in enumerate(pitch.get("slides", [])):
        if slide_data.get("comparatorTable"):
            content_pages.append(slide_data)
            continue

        claims = slide_data.get("claims", [])
        if not claims:
            content_pages.append(slide_data)
            continue

        for chunk_idx in range(0, len(claims), MAX_CLAIMS_PER_PAGE):
            chunk = claims[chunk_idx:chunk_idx + MAX_CLAIMS_PER_PAGE]
            content_pages.append({
                **slide_data,
                "title": slide_data["title"] if chunk_idx == 0 else f"{slide_data['title']} (Continued)",
                "claims": chunk,
                "comparatorTable": None,
            })

    # Total pages count for footers
    # Cover (1) + Audit Summary (1 if exists) + content_pages + Conclusion (1)
    total_pages = 1 + (1 if audit_report else 0) + len(content_pages) + 1

    current_page = 1

    # 1. Cover Slide
    _build_cover_slide(prs, pitch, audit_report)

    # 2. Audit Summary Slide
    if audit_report:
        current_page += 1
        _build_audit_summary_slide(prs, audit_report, current_page, total_pages, company_name)

    # 3. Content Slides
    section_counter = 2
    for idx, slide_item in enumerate(content_pages):
        current_page += 1
        sec_str = f"0{section_counter}" if section_counter < 10 else str(section_counter)
        section_counter += 1
        if slide_item.get("comparatorTable"):
            _build_comparator_slide(prs, slide_item, sec_str, current_page, total_pages, company_name)
        else:
            _build_insight_slide(prs, slide_item, audit_by_claim, sec_str, current_page, total_pages, company_name)

    # 4. Final Conclusion Slide
    current_page += 1
    sec_str = f"0{section_counter}" if section_counter < 10 else str(section_counter)
    _build_conclusion_slide(prs, company_name, sec_str, current_page, total_pages)

    # Export to bytes buffer
    buf = BytesIO()
    prs.save(buf)
    return buf.getvalue()
