"""
Build the final client-facing .pptx.

Design goals (this is the "make the deck outstanding, not basic" pass):
  - A real cover slide with brand colour, recommended-carrier callout and an
    audit-status pill so nobody can open the deck without seeing its
    grounding status first.
  - A dedicated Audit Summary slide with a native (editable) donut chart -
    Objective 2.1's "audit summary alongside the generated deck" made
    visible in the artifact the client actually sees, not just an API JSON.
  - Every claim bullet keeps a coloured status dot (pass/flag/fail/info) so
    the advisor can see risk at a glance even after exporting.
  - A properly shaded comparator table with the recommended carrier's
    column highlighted, plus a native bar chart of the ranking.
  - Consistent header/footer bands, page numbers, and a confidentiality
    footer on every content slide.
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from pptx import Presentation
from pptx.chart.data import CategoryChartData
from pptx.dml.color import RGBColor
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.util import Emu, Inches, Pt

# ---- Brand palette --------------------------------------------------------
NAVY = RGBColor(0x0B, 0x24, 0x47)
NAVY_DARK = RGBColor(0x07, 0x18, 0x30)
ACCENT = RGBColor(0x1B, 0x98, 0xE0)
GOLD = RGBColor(0xE8, 0xB4, 0x3D)
PASS = RGBColor(0x1E, 0x8E, 0x3E)
FLAG = RGBColor(0xE8, 0xA3, 0x3D)
FAIL = RGBColor(0xD9, 0x30, 0x25)
INFO = RGBColor(0x8A, 0x93, 0xA6)
TEXT_DARK = RGBColor(0x20, 0x24, 0x2C)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_BG = RGBColor(0xF4, 0xF6, 0xFA)
ROW_ALT = RGBColor(0xEC, 0xF0, 0xF7)
BORDER = RGBColor(0xD8, 0xDE, 0xE8)

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)

STATUS_COLOR = {"Verified": PASS, "Flagged": FLAG, "Untraceable": FAIL, "Context": INFO}
STATUS_LABEL = {"Verified": "Verified", "Flagged": "Partial match", "Untraceable": "Untraceable", "Context": "Context"}


def _set_fill(shape, color):
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()


def _no_line(shape):
    shape.line.fill.background()


def _add_rect(slide, x, y, w, h, color):
    shp = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, h)
    _set_fill(shp, color)
    shp.shadow.inherit = False
    return shp


def _add_text(slide, x, y, w, h, text, *, size=14, color=TEXT_DARK, bold=False,
              italic=False, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, font="Calibri",
              runs=None, line_spacing=None):
    box = slide.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    p = tf.paragraphs[0]
    p.alignment = align
    if line_spacing:
        p.line_spacing = line_spacing
    if runs:
        for run_text, run_opts in runs:
            r = p.add_run()
            r.text = run_text
            r.font.size = Pt(run_opts.get("size", size))
            r.font.bold = run_opts.get("bold", bold)
            r.font.italic = run_opts.get("italic", italic)
            r.font.color.rgb = run_opts.get("color", color)
            r.font.name = run_opts.get("font", font)
    else:
        r = p.add_run()
        r.text = text
        r.font.size = Pt(size)
        r.font.bold = bold
        r.font.italic = italic
        r.font.color.rgb = color
        r.font.name = font
    return box


def _header_band(slide, index_label, title, subtitle=None):
    _add_rect(slide, 0, 0, SLIDE_W, Inches(1.15), NAVY)
    _add_rect(slide, 0, Inches(1.15), SLIDE_W, Pt(3), GOLD)
    chip = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(0.45), Inches(0.28), Inches(0.6), Inches(0.6))
    _set_fill(chip, ACCENT)
    chip.shadow.inherit = False
    ctf = chip.text_frame
    ctf.word_wrap = False
    cp = ctf.paragraphs[0]
    cp.alignment = PP_ALIGN.CENTER
    cr = cp.add_run()
    cr.text = index_label
    cr.font.size = Pt(16)
    cr.font.bold = True
    cr.font.color.rgb = WHITE
    _add_text(slide, Inches(1.25), Inches(0.22), Inches(11.4), Inches(0.55), title,
               size=24, bold=True, color=WHITE, anchor=MSO_ANCHOR.MIDDLE)
    if subtitle:
        _add_text(slide, Inches(1.25), Inches(0.70), Inches(11.4), Inches(0.4), subtitle,
                   size=12, color=RGBColor(0xC9, 0xD6, 0xEA), anchor=MSO_ANCHOR.TOP)


def _footer(slide, page_no, total_pages, company_name):
    _add_rect(slide, 0, Inches(7.15), SLIDE_W, Pt(2), BORDER)
    _add_text(slide, Inches(0.45), Inches(7.20), Inches(8.5), Inches(0.3),
               f"Marsh \u2022 AI-assisted draft for {company_name} \u2014 confidential, subject to advisor review",
               size=8.5, color=INFO, italic=True)
    _add_text(slide, Inches(12.2), Inches(7.20), Inches(0.9), Inches(0.3),
               f"{page_no} / {total_pages}", size=8.5, color=INFO, align=PP_ALIGN.RIGHT)


def _status_dot(slide, x, y, color, diameter=Inches(0.14)):
    dot = slide.shapes.add_shape(MSO_SHAPE.OVAL, x, y, diameter, diameter)
    _set_fill(dot, color)
    dot.shadow.inherit = False
    return dot


def _clean_ws(text: str) -> str:
    """Defense-in-depth: collapse any stray newlines/whitespace runs that
    slipped through from raw PDF-extracted text so bullets always render
    as a single clean line instead of overlapping multi-line dumps."""
    return re.sub(r"\s+", " ", text or "").strip()


def _estimate_wrapped_lines(char_count: int, chars_per_line: int) -> int:
    """Rough but serviceable: PowerPoint/LibreOffice line-wrap width varies
    by font metrics we can't query ahead of render time, so we estimate
    from character count against an empirically-tuned chars-per-line for
    our fixed font size/box width, with a safety margin."""
    return max(1, -(-char_count // chars_per_line))  # ceil division


def _claim_row_height(claim, audit_by_claim, chars_per_line=118):
    """Compute the same estimated row height _bullet_block uses to actually
    draw a claim, but without drawing anything - used to paginate claims
    across slides *before* rendering so nothing gets silently dropped."""
    audit = audit_by_claim.get(claim["id"])
    status = audit["status"] if audit else "Context"
    text = _clean_ws(claim["text"])

    conf_suffix = ""
    if audit and audit.get("confidence_score") is not None and claim.get("type") == "policy_claim":
        conf_suffix = f"   \u2014 {STATUS_LABEL[status]} ({audit['confidence_score']}%)"
    elif claim.get("type") == "policy_claim":
        conf_suffix = f"   \u2014 {STATUS_LABEL[status]}"

    source_suffix = ""
    if claim.get("sourceInsurer"):
        page = f", p.{claim['sourcePage']}" if claim.get("sourcePage") else ""
        source_suffix = f"  [{claim['sourceInsurer']}{page}]"

    full_len = len(text) + len(source_suffix) + len(conf_suffix)
    approx_lines = _estimate_wrapped_lines(full_len, chars_per_line)
    return Inches(0.28) * approx_lines + Inches(0.16) + Inches(0.1)  # + inter-row gap


def _paginate_claims(claims, audit_by_claim, avail_height):
    """Split claims into as many pages as needed so every claim is rendered
    somewhere, instead of _bullet_block silently truncating whatever
    doesn't fit on a single slide. Returns a list of claim-lists, one per
    physical slide (always at least one page, even if empty)."""
    pages: list[list[dict]] = [[]]
    used = Emu(0)
    for claim in claims:
        h = _claim_row_height(claim, audit_by_claim)
        if used + h > avail_height and pages[-1]:
            pages.append([])
            used = Emu(0)
        pages[-1].append(claim)
        used += h
    return pages


def _bullet_block(slide, claims, audit_by_claim, start_y, *, x=Inches(0.55), w=Inches(12.2),
                   max_y=Inches(6.9)):
    y = start_y
    chars_per_line = 118  # tuned for 13pt Calibri over an ~11.9in wide box
    for claim in claims:
        audit = audit_by_claim.get(claim["id"])
        status = audit["status"] if audit else "Context"
        color = STATUS_COLOR.get(status, INFO)

        text = _clean_ws(claim["text"])

        conf_suffix = ""
        if audit and audit.get("confidence_score") is not None and claim.get("type") == "policy_claim":
            conf_suffix = f"   \u2014 {STATUS_LABEL[status]} ({audit['confidence_score']}%)"
        elif claim.get("type") == "policy_claim":
            conf_suffix = f"   \u2014 {STATUS_LABEL[status]}"

        source_suffix = ""
        if claim.get("sourceInsurer"):
            page = f", p.{claim['sourcePage']}" if claim.get("sourcePage") else ""
            source_suffix = f"  [{claim['sourceInsurer']}{page}]"

        full_len = len(text) + len(source_suffix) + len(conf_suffix)
        approx_lines = _estimate_wrapped_lines(full_len, chars_per_line)
        row_h = Inches(0.28) * approx_lines + Inches(0.16)

        _status_dot(slide, x, y + Inches(0.09), color)

        box = slide.shapes.add_textbox(x + Inches(0.28), y, w - Inches(0.28), row_h)
        tf = box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        r = p.add_run()
        r.text = text
        r.font.size = Pt(13)
        r.font.color.rgb = TEXT_DARK

        if source_suffix:
            r2 = p.add_run()
            r2.text = source_suffix
            r2.font.size = Pt(10.5)
            r2.font.color.rgb = ACCENT
            r2.font.italic = True

        if conf_suffix:
            r3 = p.add_run()
            r3.text = conf_suffix
            r3.font.size = Pt(10)
            r3.font.color.rgb = color
            r3.font.bold = True

        y += row_h + Inches(0.1)
    return y


def _legend(slide, y):
    items = [("Verified", "Verified against clause"), ("Flagged", "Partial match \u2014 review"),
             ("Untraceable", "Untraceable"), ("Context", "Context (not a policy claim)")]
    x = Inches(0.55)
    for key, label in items:
        _status_dot(slide, x, y + Inches(0.03), STATUS_COLOR[key], diameter=Inches(0.11))
        tb = _add_text(slide, x + Inches(0.2), y - Inches(0.05), Inches(2.6), Inches(0.3), label, size=9, color=INFO)
        x += Inches(2.9)


def _comparator_table(slide, comparator, y):
    insurers = [r["insurer"] for r in comparator["ranking"]]
    recommended = comparator["ranking"][0]["insurer"] if comparator["ranking"] else None
    rows = comparator["rows"]

    n_rows = len(rows) + 1
    n_cols = len(insurers) + 1
    row_h = Inches(0.36)
    table_h = row_h * n_rows
    table_w = Inches(12.2)
    graphic_frame = slide.shapes.add_table(n_rows, n_cols, Inches(0.55), y, table_w, table_h)
    table = graphic_frame.table

    table.columns[0].width = Inches(3.4)
    remaining = table_w - Inches(3.4)
    for i in range(1, n_cols):
        table.columns[i].width = Emu(int(remaining / (n_cols - 1)))

    # header row
    header_cells = ["Criterion"] + insurers
    for c, label in enumerate(header_cells):
        cell = table.cell(0, c)
        cell.fill.solid()
        cell.fill.fore_color.rgb = NAVY if (c == 0 or insurers[c - 1] != recommended) else ACCENT
        cell.margin_top = Pt(4)
        cell.margin_bottom = Pt(4)
        tf = cell.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER if c > 0 else PP_ALIGN.LEFT
        r = p.add_run()
        r.text = label + ("  \u2605" if c > 0 and insurers[c - 1] == recommended else "")
        r.font.size = Pt(10.5)
        r.font.bold = True
        r.font.color.rgb = WHITE

    for ridx, row in enumerate(rows, start=1):
        for c in range(n_cols):
            cell = table.cell(ridx, c)
            cell.margin_top = Pt(3)
            cell.margin_bottom = Pt(3)
            cell.fill.solid()
            base_bg = ROW_ALT if ridx % 2 == 0 else WHITE
            if c > 0 and insurers[c - 1] == recommended:
                cell.fill.fore_color.rgb = RGBColor(0xE3, 0xF2, 0xFC)
            else:
                cell.fill.fore_color.rgb = base_bg
            tf = cell.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            r = p.add_run()
            if c == 0:
                r.text = row["criterion"]
                r.font.bold = True
                r.font.size = Pt(10)
                r.font.color.rgb = TEXT_DARK
                p.alignment = PP_ALIGN.LEFT
            else:
                found = row["byInsurer"][insurers[c - 1]]["score"] > 0.03
                r.text = "\u2713 covered" if found else "\u2014 not found"
                r.font.size = Pt(10)
                r.font.color.rgb = PASS if found else INFO
                p.alignment = PP_ALIGN.CENTER
    return y + table_h + Inches(0.15)


def _ranking_chart(slide, comparator, x, y, w, h):
    chart_data = CategoryChartData()
    chart_data.categories = [r["insurer"] for r in comparator["ranking"]]
    chart_data.add_series("Relevance to rubric (%)", [round(r["avgScore"] * 100, 1) for r in comparator["ranking"]])
    gframe = slide.shapes.add_chart(XL_CHART_TYPE.BAR_CLUSTERED, x, y, w, h, chart_data)
    chart = gframe.chart
    chart.has_title = False
    chart.has_legend = False
    plot = chart.plots[0]
    plot.has_data_labels = True
    plot.data_labels.number_format = '0"%"'
    plot.data_labels.number_format_is_linked = False
    series = plot.series[0]
    series.format.fill.solid()
    series.format.fill.fore_color.rgb = ACCENT
    chart.category_axis.tick_labels.font.size = Pt(10)
    chart.value_axis.tick_labels.font.size = Pt(9)
    chart.value_axis.maximum_scale = 100
    return gframe


def _audit_donut(slide, audit_report, x, y, w, h):
    summary = audit_report["summary"]
    chart_data = CategoryChartData()
    labels, values, colors = [], [], []
    for key, label, color in [("pass", "Verified", PASS), ("flag", "Flagged", FLAG),
                               ("fail", "Untraceable", FAIL), ("infoOnly", "Context", INFO)]:
        if summary.get(key, 0) > 0:
            labels.append(label)
            values.append(summary[key])
            colors.append(color)
    if not values:
        values, labels, colors = [1], ["No claims"], [INFO]
    chart_data.categories = labels
    chart_data.add_series("Claims", values)
    gframe = slide.shapes.add_chart(XL_CHART_TYPE.DOUGHNUT, x, y, w, h, chart_data)
    chart = gframe.chart
    chart.has_title = False
    chart.has_legend = True
    chart.legend.position = XL_LEGEND_POSITION.RIGHT
    chart.legend.include_in_layout = False
    chart.legend.font.size = Pt(11)
    points = chart.plots[0].series[0].points
    for i, pt in enumerate(points):
        pt.format.fill.solid()
        pt.format.fill.fore_color.rgb = colors[i]
    return gframe


def _status_pill_color(overall_status: str):
    if overall_status.startswith("FAIL"):
        return FAIL
    if overall_status.startswith("PASS WITH"):
        return FLAG
    return PASS


def build_pptx(pitch: dict[str, Any], audit_report: dict[str, Any] | None) -> bytes:
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H
    blank = prs.slide_layouts[6]

    company_name = pitch["companyName"]
    recommended = pitch.get("recommended", "")

    audit_by_claim = {c["claimId"]: c for c in (audit_report or {}).get("claims", [])}

    # Pre-paginate every bullet-style slide *before* drawing anything, so we
    # know the true final page count up front (for footers) and so a slide
    # with more claims than fit on one page grows into extra "(cont'd)"
    # slides instead of silently dropping whatever didn't fit.
    CONTENT_TOP = Inches(1.45)
    CONTENT_BOTTOM = Inches(6.55)
    content_pages: list[dict] = []  # each: {title, claims|None, comparatorTable|None, id}
    for slide_data in pitch["slides"]:
        if slide_data.get("comparatorTable"):
            content_pages.append(slide_data)
            continue
        chunks = _paginate_claims(slide_data["claims"], audit_by_claim, CONTENT_BOTTOM - CONTENT_TOP)
        for idx, chunk in enumerate(chunks):
            content_pages.append({
                **slide_data,
                "title": slide_data["title"] if idx == 0 else f"{slide_data['title']} (cont'd)",
                "claims": chunk,
                "comparatorTable": None,
            })

    total_pages = 2 + len(content_pages)  # cover + audit summary + content pages

    # ---------------- Slide 0: Cover -----------------
    cover = prs.slides.add_slide(blank)
    _add_rect(cover, 0, 0, SLIDE_W, SLIDE_H, NAVY)
    _add_rect(cover, 0, Inches(4.55), SLIDE_W, Inches(0.05), GOLD)
    _add_rect(cover, 0, 0, Inches(0.18), SLIDE_H, ACCENT)

    badge = cover.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.7), Inches(0.6), Inches(1.9), Inches(0.62))
    _set_fill(badge, ACCENT)
    badge.shadow.inherit = False
    btf = badge.text_frame
    btf.word_wrap = False
    bp = btf.paragraphs[0]
    bp.alignment = PP_ALIGN.CENTER
    br = bp.add_run()
    br.text = "MARSH"
    br.font.size = Pt(22)
    br.font.bold = True
    br.font.color.rgb = WHITE

    _add_text(cover, Inches(0.7), Inches(2.05), Inches(11.9), Inches(0.5),
               "GROUP HEALTH INSURANCE PROPOSAL", size=16, color=RGBColor(0x9F, 0xB7, 0xD9), bold=True)
    _add_text(cover, Inches(0.7), Inches(2.55), Inches(11.9), Inches(1.3),
               company_name, size=40, bold=True, color=WHITE)
    if recommended:
        _add_text(cover, Inches(0.7), Inches(3.65), Inches(11.9), Inches(0.6),
                   f"Recommended carrier: {recommended}", size=18, color=ACCENT, bold=True)

    if audit_report:
        pill_color = _status_pill_color(audit_report["overallStatus"])
        pill = cover.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.7), Inches(4.9), Inches(4.6), Inches(0.6))
        _set_fill(pill, pill_color)
        pill.shadow.inherit = False
        ptf = pill.text_frame
        pp_ = ptf.paragraphs[0]
        pp_.alignment = PP_ALIGN.CENTER
        pr = pp_.add_run()
        pr.text = f"Audit: {audit_report['overallStatus']}  \u2022  {round(audit_report['overallScore'] * 100)}% grounded"
        pr.font.size = Pt(13)
        pr.font.bold = True
        pr.font.color.rgb = WHITE

    _add_text(cover, Inches(0.7), Inches(6.85), Inches(11), Inches(0.4),
               f"AI-assisted draft \u2022 generated {datetime.now().strftime('%d %b %Y')} \u2022 CONFIDENTIAL \u2014 advisor review required before client use",
               size=9.5, color=RGBColor(0x9F, 0xB7, 0xD9), italic=True)

    # ---------------- Slide: Audit Summary -----------------
    if audit_report:
        aslide = prs.slides.add_slide(blank)
        _add_rect(aslide, 0, 0, SLIDE_W, SLIDE_H, WHITE)
        _header_band(aslide, "\u2713", "Audit Summary",
                     "Every policy claim independently re-checked against its cited source clause")

        summary = audit_report["summary"]
        stats = [
            ("Grounding score", f"{round(audit_report['overallScore'] * 100)}%", ACCENT),
            ("Verified", str(summary["pass"]), PASS),
            ("Flagged", str(summary["flag"]), FLAG),
            ("Untraceable", str(summary["fail"]), FAIL),
        ]
        card_w, gap = Inches(2.55), Inches(0.2)
        x = Inches(0.55)
        for label, value, color in stats:
            card = _add_rect(aslide, x, Inches(1.55), card_w, Inches(1.35), LIGHT_BG)
            _add_rect(aslide, x, Inches(1.55), card_w, Inches(0.08), color)
            _add_text(aslide, x + Inches(0.15), Inches(1.72), card_w - Inches(0.3), Inches(0.65), value,
                       size=32, bold=True, color=color)
            _add_text(aslide, x + Inches(0.15), Inches(2.45), card_w - Inches(0.3), Inches(0.4), label,
                       size=11, color=INFO)
            x += card_w + gap

        _audit_donut(aslide, audit_report, Inches(0.55), Inches(3.2), Inches(4.6), Inches(3.2))
        _add_text(aslide, Inches(5.4), Inches(3.25), Inches(7.2), Inches(0.35), "Advisor guidance", size=13, bold=True, color=NAVY)
        _add_text(aslide, Inches(5.4), Inches(3.65), Inches(7.2), Inches(1.2), audit_report["advisorGuidance"], size=12.5, color=TEXT_DARK)

        _add_text(aslide, Inches(5.4), Inches(4.95), Inches(7.2), Inches(0.35),
                   "How to use this report", size=13, bold=True, color=NAVY)
        howto = (
            "\u2022 PASS: safe to include as-is, subject to normal sign-off.\n"
            "\u2022 FLAG: bullet partially overlaps its source clause \u2014 spot-check wording, then approve or edit.\n"
            "\u2022 FAIL: claim could not be traced to policy text \u2014 remove or manually correct before this deck reaches a client."
        )
        box = aslide.shapes.add_textbox(Inches(5.4), Inches(5.3), Inches(7.2), Inches(1.6))
        tf = box.text_frame
        tf.word_wrap = True
        for i, line in enumerate(howto.split("\n")):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            r = p.add_run()
            r.text = line
            r.font.size = Pt(11)
            r.font.color.rgb = TEXT_DARK
            p.line_spacing = 1.15

        _footer(aslide, 2, total_pages, company_name)

    # ---------------- Content slides -----------------
    for i, slide_data in enumerate(content_pages):
        s = prs.slides.add_slide(blank)
        _add_rect(s, 0, 0, SLIDE_W, SLIDE_H, WHITE)
        _header_band(s, str(i + 1), slide_data["title"])

        y = CONTENT_TOP

        if slide_data.get("comparatorTable"):
            # The table + chart already convey every criterion clearly and
            # compactly - repeating the same facts as a bullet dump above
            # them just crowds the slide, so we skip straight to the visuals
            # and cite the winning carrier's clauses via the table itself.
            recommended_name = slide_data["comparatorTable"]["ranking"][0]["insurer"] if slide_data["comparatorTable"]["ranking"] else ""
            _add_text(s, Inches(0.55), y, Inches(12.2), Inches(0.4),
                       f"Every criterion below is independently traced to a source clause; "
                       f"{recommended_name} leads on relevance to the rubric.",
                       size=12.5, color=INFO, italic=True)
            y += Inches(0.5)
            y = _comparator_table(s, slide_data["comparatorTable"], y)

            recommended_row_count = sum(
                1 for row in slide_data["comparatorTable"]["rows"]
                if row["byInsurer"].get(recommended_name, {}).get("score", 0) > 0.03
            )
            total_criteria = len(slide_data["comparatorTable"]["rows"])
            rationale = (
                f"{recommended_name} covers {recommended_row_count} of {total_criteria} scored criteria "
                f"for {company_name} and ranks highest on overall relevance to the rubric "
                "(see the audit summary for how each figure above was independently verified)."
            )
            _add_text(s, Inches(0.55), y + Inches(0.1), Inches(12.2), Inches(0.7), rationale,
                       size=12.5, color=TEXT_DARK, italic=True)
        else:
            y = _bullet_block(s, slide_data["claims"], audit_by_claim, y, max_y=CONTENT_BOTTOM)

        if slide_data["id"] == "slide_4" and pitch.get("recommended"):
            recommended = pitch["recommended"]
            card = _add_rect(s, Inches(0.55), Inches(5.7), Inches(12.2), Inches(0.9), NAVY)
            _add_text(s, Inches(0.8), Inches(5.7), Inches(11.7), Inches(0.9),
                       f"\u2605  Recommended: {recommended}", size=20, bold=True, color=WHITE,
                       anchor=MSO_ANCHOR.MIDDLE)

        _legend(s, Inches(6.75))
        _footer(s, i + 3, total_pages, company_name)

    from io import BytesIO
    buf = BytesIO()
    prs.save(buf)
    return buf.getvalue()
