import io
import logging
import os
import re
from typing import List, Optional, Union

from django.conf import settings
from reportlab.lib.colors import grey, lightgrey
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Paragraph, Table

from bibliography.models import BibliographyType
from documents.document_export.defs import (
    BIB_ID_CHUNK_ID_PATTERN,
    BIB_ID_CHUNK_ID_REFERENCE_PATTERN,
    COVER_PAGE_DATE_STRING,
    COVER_PAGE_DISCLAIMER_STRING,
    HYPERLINK_PATTERN,
    NORMAL_LEADING,
    PUBMED_URL_PATTERN,
    TITLE_LEADING,
    WEBSEARCH_REFERENCE_PATTERN,
    FontSizes,
)
from documents.document_export.defs import PDFPageSizes as sizes
from documents.document_export.utils import (
    format_author_str,
    format_file_name,
    format_inline_reference_for_websearch,
    get_formatted_references,
    get_mermaid_image_stream_and_size,
    is_markdown_heading,
    should_skip_section_title,
)
from documents.models import Document, Section

logger = logging.getLogger(__name__)


class PDFGenerator:
    def __init__(self, output_file: Union[str, io.BytesIO], document: Document) -> None:
        self.styles = self._get_styles()
        self.pdf_canvas = Canvas(output_file, pagesize=(sizes.PAGE_WIDTH, sizes.PAGE_HEIGHT))
        self.document = document
        self.bib_id_pmid_map = document.bib_id_pmid_map
        self.pdf_canvas.setTitle(document.title)
        self.paragraphs = []
        self.doc_bibliographies = document.get_bibliographies()
        self.bibliography_mapping = {bib["id"]: bib for bib in self.doc_bibliographies}

    def _get_resource_path(self, resource_name: str) -> str:
        return os.path.join(settings.BASE_DIR, "documents/document_export/resources", resource_name)

    def _get_styles(self) -> dict:
        pdfmetrics.registerFont(TTFont("Arial", self._get_resource_path("Arial-Regular.ttf")))
        pdfmetrics.registerFont(TTFont("Arial-Bold", self._get_resource_path("Arial-Bold.ttf")))
        pdfmetrics.registerFont(TTFont("Arial-Italic", self._get_resource_path("Arial-Italic.ttf")))
        pdfmetrics.registerFont(TTFont("Arial-BoldItalic", self._get_resource_path("Arial-BoldItalic.ttf")))
        pdfmetrics.registerFontFamily(
            "Arial",
            normal="Arial",
            bold="Arial-Bold",
            italic="Arial-Italic",
            boldItalic="Arial-BoldItalic",
        )
        styles = getSampleStyleSheet()
        for _, style in styles.byName.items():
            if style.name[:7] == "Heading" or style.name == "Title":
                style.fontName = "Arial-Bold"
            elif style.name == "Italic":
                style.fontName = "Arial-Italic"
            else:
                style.fontName = "Arial"
        styles["Normal"].fontSize = FontSizes.NORMAL
        styles["Normal"].leading = NORMAL_LEADING
        styles["Heading1"].fontSize = FontSizes.HEADING1
        styles["Heading2"].fontSize = FontSizes.HEADING2
        styles["Heading3"].fontSize = FontSizes.HEADING3
        styles["Heading4"].fontSize = FontSizes.HEADING4
        styles.add(
            ParagraphStyle(
                name="DoraTitle",
                parent=styles["Title"],
                fontSize=FontSizes.TITLE,
                alignment=TA_LEFT,
                leading=TITLE_LEADING,
            ),
            alias="doratitle",
        )
        styles.add(
            ParagraphStyle(name="DoraDisclaimer", parent=styles["Italic"], textColor=grey),
            alias="doradisclaimer",
        )
        styles.add(
            ParagraphStyle(name="DoraBlockQuote", parent=styles["Normal"], leftIndent=24, rightIndent=24),
            alias="dorablockquote",
        )
        styles.add(
            ParagraphStyle(
                name="Center",
                parent=styles["Normal"],
                alignment=TA_CENTER,
            )
        )
        styles.add(
            ParagraphStyle(
                name="SectionParagraph",
                parent=styles["Normal"],
                firstLineIndent=sizes.FIRST_LINE_INDENT,
                alignment=TA_JUSTIFY,
            )
        )
        return styles

    def _draw_image(self, image_name: str, width: int, height: int, x: int, y: int) -> None:
        return
        # TODO: remove this method if header/logo are no longer needed
        # image = Image(self._get_resource_path(image_name), width=width, height=height)
        # image.drawOn(self.pdf_canvas, x, y)

    def _wrap_draw_paragraph(self, paragraph_str: str, style: ParagraphStyle, x: int, y: int) -> None:
        # y is the top of the paragraph
        paragraph = Paragraph(paragraph_str, style)
        _, paragraph_height = paragraph.wrapOn(self.pdf_canvas, sizes.MAX_AVAILABLE_WIDTH, sizes.PAGE_HEIGHT)
        paragraph.drawOn(self.pdf_canvas, x, y - paragraph_height)
        return paragraph_height

    def _draw_new_page_header(self) -> None:
        self._draw_image(
            "header_image_2.jpg",
            sizes.PAGE_WIDTH,
            sizes.HEIGHT_HEADER,
            0,
            sizes.PAGE_HEIGHT - sizes.SPACE_ABOVE_HEADER - sizes.HEIGHT_HEADER,
        )

    def _draw_visual_summary(self) -> float:
        image_stream, image_size = get_mermaid_image_stream_and_size(self.document)
        if not image_stream:
            return 0

        actual_width, actual_height = image_size
        width_ratio = sizes.MAX_AVAILABLE_WIDTH / actual_width
        height_ratio = sizes.MAX_AVAILABLE_HEIGHT / actual_height
        scale_ratio = min(width_ratio, height_ratio)
        image_width = actual_width * scale_ratio
        image_height = actual_height * scale_ratio

        image = ImageReader(image_stream)
        self.pdf_canvas.drawImage(
            image,
            sizes.MARGIN_LEFT,
            sizes.PAGE_HEIGHT - sizes.SPACE_ABOVE_HEADER - sizes.HEIGHT_HEADER - image_height,
            image_width,
            image_height,
            mask="auto",
        )

        paragraph = Paragraph("Visual summary", self.styles["Center"])
        self.paragraphs.insert(0, paragraph)

        return image_height

    def _format_hyperlink(self, href: str, text: str) -> str:
        return HYPERLINK_PATTERN.format(href=href.replace("'", "%27"), text=text)

    def _get_formatted_paragraph(self, contents: Optional[List[dict]]) -> str:
        paragraph_text = ""
        if not contents:
            return "&nbsp;"
        for content_item in contents:
            if content_item["type"] == "hardBreak":
                paragraph_text += " <br/> "
            elif content_item["type"] == "text":
                text = content_item["text"]
                if "marks" in content_item:
                    for mark in content_item["marks"]:
                        mark_type = mark["type"]
                        if mark_type == "bold":
                            text = f"<b>{text}</b>"
                        elif mark_type == "italic":
                            text = f"<i>{text}</i>"
                        elif mark_type == "underline":
                            text = f"<u>{text}</u>"
                        elif mark_type == "link":
                            href = mark["attrs"].get("href")
                            bib_id = mark["attrs"].get("id")
                            link_type = mark["attrs"].get("data-type")
                            custom_text = mark["attrs"].get("data-custom_text")
                            if href[:4] == "http":
                                text = self._format_hyperlink(href=href, text=text)
                            elif href == "#" and bib_id:
                                if pmid := self.bib_id_pmid_map.get(bib_id):
                                    text = self._format_hyperlink(
                                        href=PUBMED_URL_PATTERN.format(pmid=pmid), text=text
                                    )
                                elif link_type == BibliographyType.WEBSEARCH and custom_text:
                                    text = self._format_hyperlink(href=custom_text, text=text)
                paragraph_text += text
            else:
                raise ValueError(f"Unsupported element type: {content_item['type']} in paragraph content")
        return paragraph_text

    def _generate_formatted_list_items(
        self, content: List[dict], is_ordered: bool, is_in_blockquote: bool = False
    ) -> None:
        item_number = 1
        style = self.styles["DoraBlockQuote"] if is_in_blockquote else self.styles["Normal"]
        for content_item in content:
            if content_item["type"] == "listItem":
                for list_item_content in content_item["content"]:
                    if list_item_content["type"] == "paragraph":
                        paragraph_text = self._get_formatted_paragraph(list_item_content.get("content"))
                        if is_ordered:
                            paragraph = Paragraph(f"{item_number}. {paragraph_text}", style)
                            item_number += 1
                        else:
                            paragraph = Paragraph(f"• {paragraph_text}", style)

                        self.paragraphs.append(paragraph)
                    elif list_item_content["type"] == "bulletList":
                        self._generate_formatted_list_items(list_item_content["content"], is_ordered=False)
                    elif list_item_content["type"] == "orderedList":
                        self._generate_formatted_list_items(list_item_content["content"], is_ordered=True)
                    elif list_item_content["type"] == "heading":
                        text_heading_level = list_item_content["attrs"].get("level", 1)
                        text_heading_level = min(text_heading_level, 4)
                        paragraph_text = self._get_formatted_paragraph(list_item_content.get("content"))
                        heading = Paragraph(paragraph_text, self.styles[f"Heading{text_heading_level}"])
                        self.paragraphs.append(heading)
                    else:
                        raise ValueError(
                            f"Unsupported element type: {list_item_content['type']} in listItem content"
                        )
            else:
                raise ValueError(
                    f"Unsupported element type: {content_item['type']} in bulletList/orderedList content"
                )

    def _convert_bibs_to_bib_links(self, paragraph_text: str) -> str:
        ref_matches = re.findall(BIB_ID_CHUNK_ID_REFERENCE_PATTERN, paragraph_text)
        for ref_text in ref_matches:
            after_texts = []
            matches = re.findall(BIB_ID_CHUNK_ID_PATTERN, ref_text)
            bib_ids = list(set([match[0] for match in matches]))
            for bib_id in bib_ids:
                bib_info = self.bibliography_mapping.get(bib_id)
                if not bib_info or not bib_info.get("metadata"):
                    continue
                metadata = bib_info["metadata"]
                after = None
                if bib_info["type"] == BibliographyType.PUBMED:
                    pmid = metadata.get("pubmed_id")
                    authors_str = format_author_str(metadata)
                    after = self._format_hyperlink(
                        href=PUBMED_URL_PATTERN.format(pmid=pmid), text=authors_str
                    )
                elif bib_info["type"] == BibliographyType.FILE:
                    after = format_file_name(metadata.get("file_name", ""))
                elif bib_info["type"] == BibliographyType.WEBSEARCH:
                    authors_str, hyperlink = format_inline_reference_for_websearch(metadata)
                    after = self._format_hyperlink(href=hyperlink, text=authors_str)

                if after:
                    after_texts.append(after)
            if after_texts:
                after_text = "; ".join(after_texts)
                paragraph_text = paragraph_text.replace(f"({ref_text})", f"({after_text})")
        return paragraph_text

    def _convert_markdown_formatting(self, text: str) -> str:
        """Convert markdown bold and italic syntax to HTML tags"""
        # Convert bold: **text** -> <b>text</b>
        text = re.sub(r"\*\*([^\*]+)\*\*", r"<b>\1</b>", text)

        # Convert italic: *text* -> <i>text</i>
        text = re.sub(r"\*([^\*]+)\*", r"<i>\1</i>", text)

        return text

    def _generate_paragraphs_from_sections(self, sections: List[Section], heading_level: int = 1) -> None:
        """Process document sections and generate paragraph objects"""
        heading_level = min(heading_level, 6)
        for section in sections:
            # Skip title only for top-level single section with main_text slug
            if not (heading_level == 1 and should_skip_section_title(sections, section)):
                section_title = Paragraph(section.title, self.styles[f"Heading{heading_level}"])
                self.paragraphs.append(section_title)

            if section.result is not None:
                if section.result.get("data_format"):
                    # Process content from user-edited document
                    self._process_data_format_content(section.result.get("data_format"))
                elif section.result.get("data"):
                    # Process content from newly generated document
                    self._process_data_raw_content(section.result.get("data"))
                # else - section result has neither data nor data_format - empty (custom) section

            # Recursively process subsections
            if section.get_sub_sections():
                self._generate_paragraphs_from_sections(section.get_sub_sections(), heading_level + 1)

    def _create_table_from_data_format(self, table_data: dict) -> Optional[Table]:
        """Convert data format table to ReportLab Table object"""
        rows = []
        # Process rows
        for row in table_data.get("content", []):
            if row["type"] not in ["tableRow"]:
                continue

            current_row = []
            for cell in row.get("content", []):
                cell_type = cell["type"]
                cell_content = ""
                if cell_type in ["tableHeader", "tableCell"]:
                    # Extract content from the paragraph inside the cell
                    for paragraph in cell.get("content", []):
                        if paragraph["type"] == "paragraph":
                            cell_content = self._get_formatted_paragraph(paragraph.get("content", []))

                # Convert cell content to Paragraph with appropriate style
                cell_style = self.styles["Normal"]
                if cell_type == "tableHeader":
                    cell_content = f"<b>{cell_content}</b>"

                current_row.append(Paragraph(cell_content, cell_style))

            if current_row:
                rows.append(current_row)

        if not rows:
            return None

        # Calculate column widths
        num_cols = len(rows[0]) if rows else 0
        col_widths = [sizes.MAX_AVAILABLE_WIDTH / num_cols] * num_cols

        # Create and style table
        table = Table(rows, colWidths=col_widths)
        table.setStyle(self._get_table_style())

        return table

    def _process_data_format_content(self, data_format: List[dict]) -> None:
        """Process structured data_format content"""
        for data_format_item in data_format:
            item_type = data_format_item["type"]

            if item_type == "table":
                table = self._create_table_from_data_format(data_format_item)
                if table:
                    self.paragraphs.append(table)

            elif item_type == "paragraph":
                paragraph_text = self._get_formatted_paragraph(data_format_item.get("content"))
                paragraph = Paragraph(paragraph_text, self.styles["SectionParagraph"])
                self.paragraphs.append(paragraph)

            elif item_type == "blockquote":
                self._process_blockquote_content(data_format_item["content"])

            elif item_type == "orderedList":
                self._generate_formatted_list_items(data_format_item["content"], is_ordered=True)

            elif item_type == "bulletList":
                self._generate_formatted_list_items(data_format_item["content"], is_ordered=False)

            elif item_type == "heading":
                text_heading_level = data_format_item["attrs"].get("level", 1)
                text_heading_level = min(text_heading_level, 4)
                paragraph_text = self._get_formatted_paragraph(data_format_item.get("content"))
                heading = Paragraph(paragraph_text, self.styles[f"Heading{text_heading_level}"])
                self.paragraphs.append(heading)

            else:
                # type not in ["paragraph", "blockquote", "orderedList", "bulletList", "heading", "table"]
                raise ValueError(f"Unsupported element type: {item_type} in data_format_item")

    def _process_blockquote_content(self, content: List[dict]) -> None:
        """Process blockquote content"""
        for content_item in content:
            content_type = content_item["type"]

            if content_type == "paragraph":
                paragraph_text = self._get_formatted_paragraph(content_item.get("content"))
                paragraph = Paragraph(paragraph_text, self.styles["DoraBlockQuote"])
                self.paragraphs.append(paragraph)

            elif content_type == "orderedList":
                self._generate_formatted_list_items(
                    content_item["content"], is_ordered=True, is_in_blockquote=True
                )

            elif content_type == "bulletList":
                self._generate_formatted_list_items(
                    content_item["content"], is_ordered=False, is_in_blockquote=True
                )

            else:
                raise ValueError(f"Unsupported element type: {content_type} in blockquote content")

    def _process_data_raw_content(self, data: str) -> None:
        """Process raw text content, including Markdown formatting"""
        paragraph_texts = [paragraph_text for paragraph_text in data.split("\n") if paragraph_text.strip()]
        current_index = 0
        while current_index < len(paragraph_texts):
            paragraph_text = paragraph_texts[current_index]

            # Check if this is a Markdown table row
            if self._is_markdown_table_row(paragraph_text):
                current_index = self._process_markdown_table(paragraph_texts, current_index)
            else:
                # Process regular paragraph or heading
                current_index = self._process_regular_paragraph(paragraph_texts, current_index)

    def _is_markdown_table_row(self, text: str) -> bool:
        """Determine if text is a Markdown table row"""
        return text.strip().startswith("|") and "|" in text[1:]

    def _process_markdown_table(self, paragraph_texts: List[str], start_index: int) -> int:
        """Process Markdown table and return the next index to process"""
        table_rows = [paragraph_texts[start_index]]
        next_row_index = start_index + 1

        # Collect all rows of the table
        while next_row_index < len(paragraph_texts) and self._is_markdown_table_row(
            paragraph_texts[next_row_index]
        ):
            table_rows.append(paragraph_texts[next_row_index])
            next_row_index += 1

        # Parse and create the table
        table = self._create_table_from_markdown(table_rows)
        if table:
            self.paragraphs.append(table)

        # Return the index of the next paragraph to process
        return next_row_index

    def _process_regular_paragraph(self, paragraph_texts: List[str], index: int) -> int:
        """Process regular paragraph or heading and return the next index to process"""
        paragraph_text = paragraph_texts[index]

        is_heading, text_heading_level = is_markdown_heading(paragraph_text)
        if is_heading:
            paragraph_text = paragraph_text.strip("# ")
            style_name = f"Heading{text_heading_level}"
        else:
            style_name = "SectionParagraph"

        paragraph_text = self._convert_bibs_to_bib_links(paragraph_text)
        paragraph_text = self._convert_markdown_formatting(paragraph_text)

        section_content = Paragraph(paragraph_text, self.styles[style_name])
        self.paragraphs.append(section_content)

        return index + 1

    def _get_table_style(self) -> list:
        """Return the standard table style used across the document"""
        return [
            ("BACKGROUND", (0, 0), (-1, 0), lightgrey),  # Header background
            ("GRID", (0, 0), (-1, -1), 0.5, grey),  # Table grid
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),  # Vertical alignment
            ("PADDING", (0, 0), (-1, -1), 6),  # Cell padding
        ]

    def _split_paragraph_and_draw(self, paragraph: Union[Paragraph, Table], remaining_height: int) -> int:
        """Draw a paragraph or table on the canvas, splitting across pages if necessary.

        Args:
            paragraph: The paragraph or table to draw
            remaining_height: Available height on the current page

        Returns:
            int: The remaining height after drawing
        """
        if isinstance(paragraph, Table):
            return self._draw_table(paragraph, remaining_height)
        else:
            return self._draw_paragraph(paragraph, remaining_height)

    def _draw_table(self, table: Table, remaining_height: int) -> int:
        """Draw a table on the canvas, splitting across pages if necessary."""
        _, table_height = table.wrapOn(self.pdf_canvas, sizes.MAX_AVAILABLE_WIDTH, remaining_height)

        # If table fits on current page, just draw it
        if table_height <= remaining_height:
            table.drawOn(
                self.pdf_canvas,
                sizes.MARGIN_LEFT,
                sizes.MARGIN_DOWN + remaining_height - table_height - sizes.SPACE_BETWEEN_PARAGRAPHS,
            )
            return remaining_height - table_height - sizes.SPACE_BETWEEN_PARAGRAPHS

        # If table would fit on a complete new page, move to next page
        if table_height <= sizes.MAX_AVAILABLE_HEIGHT:
            self.pdf_canvas.showPage()
            self._draw_new_page_header()
            return self._draw_table(table, sizes.MAX_AVAILABLE_HEIGHT)

        # Table is too large for a single page - split it across multiple pages
        data = table._cellvalues
        if not data or len(data) <= 1:  # No data or just header
            # Edge case: force draw the table even if it might be clipped
            table.drawOn(
                self.pdf_canvas,
                sizes.MARGIN_LEFT,
                sizes.MARGIN_DOWN,
            )
            return 0

        # Get header row and content rows
        header_row = data[0]
        content_rows = data[1:]

        # Special case: if we have just one content row, force it to this page
        if len(content_rows) == 1:
            table.drawOn(
                self.pdf_canvas,
                sizes.MARGIN_LEFT,
                sizes.MARGIN_DOWN + remaining_height - table_height,
            )
            return remaining_height - table_height - sizes.SPACE_BETWEEN_PARAGRAPHS

        # Step 1: Use binary search to find maximum number of rows that fit on current page
        def can_fit_rows(num_rows):
            # Check if header + num_rows can fit on current page
            test_data = [header_row] + content_rows[:num_rows]
            test_table = Table(test_data, colWidths=table._colWidths)
            test_table.setStyle(self._get_table_style())
            _, test_height = test_table.wrapOn(self.pdf_canvas, sizes.MAX_AVAILABLE_WIDTH, sizes.PAGE_HEIGHT)
            return test_height <= remaining_height

        # Binary search to find max rows that fit
        lo, hi = 0, len(content_rows)
        rows_that_fit = 0

        while lo <= hi:
            mid = (lo + hi) // 2
            if can_fit_rows(mid):
                rows_that_fit = mid
                lo = mid + 1
            else:
                hi = mid - 1

        # Ensure we have at least 1 row on the page (unless we have no content rows)
        rows_that_fit = max(1, rows_that_fit) if content_rows else 0

        # Step 2: Draw first part (header + rows_that_fit rows)
        first_part_data = [header_row] + content_rows[:rows_that_fit]
        first_table = Table(first_part_data, colWidths=table._colWidths)
        first_table.setStyle(self._get_table_style())

        _, first_table_height = first_table.wrapOn(
            self.pdf_canvas, sizes.MAX_AVAILABLE_WIDTH, remaining_height
        )
        first_table.drawOn(
            self.pdf_canvas,
            sizes.MARGIN_LEFT,
            sizes.MARGIN_DOWN + remaining_height - first_table_height - sizes.SPACE_BETWEEN_PARAGRAPHS,
        )

        # Step 3: If we have more rows, continue on next page (without header)
        if rows_that_fit < len(content_rows):
            self.pdf_canvas.showPage()
            self._draw_new_page_header()

            # Create a new table with remaining rows only (no header)
            remaining_data = content_rows[rows_that_fit:]

            # Check if we have any data left to process
            if not remaining_data:
                return sizes.MAX_AVAILABLE_HEIGHT

            remaining_table = Table(remaining_data, colWidths=table._colWidths)

            # Create special style for continuation table (without header styling)
            continuation_style = [
                ("GRID", (0, 0), (-1, -1), 0.5, grey),  # Table grid
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),  # Vertical alignment
                ("PADDING", (0, 0), (-1, -1), 6),  # Cell padding
            ]
            remaining_table.setStyle(continuation_style)

            # Process the remaining table
            _, remaining_table_height = remaining_table.wrapOn(
                self.pdf_canvas, sizes.MAX_AVAILABLE_WIDTH, sizes.MAX_AVAILABLE_HEIGHT
            )

            # If remaining table fits on the current page
            if remaining_table_height <= sizes.MAX_AVAILABLE_HEIGHT:
                remaining_table.drawOn(
                    self.pdf_canvas,
                    sizes.MARGIN_LEFT,
                    sizes.MARGIN_DOWN
                    + sizes.MAX_AVAILABLE_HEIGHT
                    - remaining_table_height
                    - sizes.SPACE_BETWEEN_PARAGRAPHS,
                )
                return sizes.MAX_AVAILABLE_HEIGHT - remaining_table_height - sizes.SPACE_BETWEEN_PARAGRAPHS
            else:
                # Remaining table still needs pagination - handle recursively
                return self._draw_table_continuation(remaining_table, sizes.MAX_AVAILABLE_HEIGHT)
        else:
            return remaining_height - first_table_height - sizes.SPACE_BETWEEN_PARAGRAPHS

    def _draw_table_continuation(self, table: Table, remaining_height: int) -> int:
        """Process continuation part of a table, without headers"""
        _, table_height = table.wrapOn(self.pdf_canvas, sizes.MAX_AVAILABLE_WIDTH, remaining_height)

        # If table fits on current page
        if table_height <= remaining_height:
            table.drawOn(
                self.pdf_canvas,
                sizes.MARGIN_LEFT,
                sizes.MARGIN_DOWN + remaining_height - table_height - sizes.SPACE_BETWEEN_PARAGRAPHS,
            )
            return remaining_height - table_height - sizes.SPACE_BETWEEN_PARAGRAPHS

        # Table is too large, needs another page break
        data = table._cellvalues
        if not data:
            return remaining_height

        # Calculate how many rows can fit on the current page
        # Use binary search to determine this
        def can_fit_rows(num_rows):
            if num_rows <= 0:
                return True

            test_data = data[:num_rows]
            test_table = Table(test_data, colWidths=table._colWidths)
            test_table.setStyle(
                [
                    ("GRID", (0, 0), (-1, -1), 0.5, grey),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("PADDING", (0, 0), (-1, -1), 6),
                ]
            )
            _, test_height = test_table.wrapOn(self.pdf_canvas, sizes.MAX_AVAILABLE_WIDTH, sizes.PAGE_HEIGHT)
            return test_height <= remaining_height

        lo, hi = 0, len(data)
        rows_that_fit = 0

        while lo <= hi:
            mid = (lo + hi) // 2
            if can_fit_rows(mid):
                rows_that_fit = mid
                lo = mid + 1
            else:
                hi = mid - 1

        # Ensure at least one row is drawn
        rows_that_fit = max(1, rows_that_fit)

        # Safety check - make sure we don't exceed array bounds
        rows_that_fit = min(rows_that_fit, len(data))

        # Draw the table portion for the current page
        first_part_data = data[:rows_that_fit]

        # Check if we have any data to process
        if not first_part_data:
            return remaining_height

        first_table = Table(first_part_data, colWidths=table._colWidths)
        first_table.setStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.5, grey),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )

        _, first_table_height = first_table.wrapOn(
            self.pdf_canvas, sizes.MAX_AVAILABLE_WIDTH, remaining_height
        )
        first_table.drawOn(
            self.pdf_canvas,
            sizes.MARGIN_LEFT,
            sizes.MARGIN_DOWN + remaining_height - first_table_height - sizes.SPACE_BETWEEN_PARAGRAPHS,
        )

        # If more rows remain, continue to next page
        if rows_that_fit < len(data):
            self.pdf_canvas.showPage()
            self._draw_new_page_header()

            # Create new table with remaining rows
            remaining_data = data[rows_that_fit:]

            # Safety check - make sure we have data
            if not remaining_data:
                return sizes.MAX_AVAILABLE_HEIGHT

            remaining_table = Table(remaining_data, colWidths=table._colWidths)
            remaining_table.setStyle(
                [
                    ("GRID", (0, 0), (-1, -1), 0.5, grey),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("PADDING", (0, 0), (-1, -1), 6),
                ]
            )

            # Recursively process the remaining portion
            return self._draw_table_continuation(remaining_table, sizes.MAX_AVAILABLE_HEIGHT)
        else:
            return remaining_height - first_table_height - sizes.SPACE_BETWEEN_PARAGRAPHS

    def _draw_paragraph(self, paragraph: Paragraph, remaining_height: int) -> int:
        """Draw a paragraph on the canvas, splitting across pages if necessary.

        Args:
            paragraph: The paragraph to draw
            remaining_height: Available height on the current page

        Returns:
            int: The remaining height after drawing
        """
        # Skip the paragraph without content
        if not paragraph.text and not paragraph.frags:
            return remaining_height

        # Split paragraph if necessary
        paragraphs = paragraph.split(sizes.MAX_AVAILABLE_WIDTH, remaining_height)

        # If not enough space for even one line, move to next page
        if len(paragraphs) == 0:
            self.pdf_canvas.showPage()
            self._draw_new_page_header()
            remaining_height = sizes.MAX_AVAILABLE_HEIGHT
            return self._draw_paragraph(paragraph, remaining_height)

        # If paragraph needs to be split across pages
        elif len(paragraphs) == 2:
            first_part, second_part = paragraphs

            # Draw first part on current page
            _, first_height = first_part.wrapOn(self.pdf_canvas, sizes.MAX_AVAILABLE_WIDTH, remaining_height)
            first_part.drawOn(
                self.pdf_canvas,
                sizes.MARGIN_LEFT,
                sizes.MARGIN_DOWN + remaining_height - first_height - sizes.SPACE_BETWEEN_PARAGRAPHS,
            )

            # Continue on next page with second part
            self.pdf_canvas.showPage()
            self._draw_new_page_header()
            remaining_height = sizes.MAX_AVAILABLE_HEIGHT
            return self._draw_paragraph(second_part, remaining_height)

        # Paragraph fits on current page
        else:
            _, paragraph_height = paragraph.wrapOn(
                self.pdf_canvas, sizes.MAX_AVAILABLE_WIDTH, remaining_height
            )
            paragraph.drawOn(
                self.pdf_canvas,
                sizes.MARGIN_LEFT,
                sizes.MARGIN_DOWN + remaining_height - paragraph_height - sizes.SPACE_BETWEEN_PARAGRAPHS,
            )
            return remaining_height - paragraph_height - sizes.SPACE_BETWEEN_PARAGRAPHS

    def _create_table_from_markdown(self, table_rows: List[str]) -> Optional[Table]:
        if len(table_rows) < 2:  # Need at least header and separator
            return None

        # Process rows to get data
        table_data = []
        header_separator = False

        for row in table_rows:
            # Skip separator row (like |---|---|---)
            if not header_separator and all(cell.strip().startswith("-") for cell in row.split("|")[1:-1]):
                header_separator = True
                continue

            # Process cells
            cells = row.split("|")[1:-1]  # Remove first and last empty cell
            cells = [cell.strip() for cell in cells]
            table_data.append(cells)

        if not table_data:
            return None

        # Ensure all rows have the same number of columns by padding shorter rows
        max_cols = max(len(row) for row in table_data)
        for row in table_data:
            while len(row) < max_cols:
                row.append("")

        # Convert cell content to Paragraph objects for proper text rendering
        for row_index in range(len(table_data)):
            for col_index in range(len(table_data[row_index])):
                cell_content = table_data[row_index][col_index]
                # Convert bibs links and apply styling
                cell_content = self._convert_bibs_to_bib_links(cell_content)
                cell_style = self.styles["Normal"]
                # Use bold style for header row
                if row_index == 0:
                    cell_content = f"<b>{cell_content}</b>"
                table_data[row_index][col_index] = Paragraph(cell_content, cell_style)

        # Create table with appropriate styling
        col_widths = [sizes.MAX_AVAILABLE_WIDTH / max_cols] * max_cols
        table = Table(table_data, colWidths=col_widths)
        table.setStyle(self._get_table_style())

        return table

    def generate_cover_page(self) -> None:
        title_str = self.document.title
        template_name_str = self.document.template.name
        formatted_date = self.document.updated_at.strftime("%b %d, %Y")

        remaining_height = sizes.PAGE_HEIGHT - sizes.SPACE_ABOVE_HEADER - sizes.HEIGHT_HEADER
        self._draw_image("header_image_1.jpg", sizes.PAGE_WIDTH, sizes.HEIGHT_HEADER, 0, remaining_height)

        remaining_height -= sizes.SPACE_BELOW_HEADER + sizes.HEIGHT_LOGO
        self._draw_image(
            "logo_image.jpg",
            sizes.WIDTH_LOGO,
            sizes.HEIGHT_LOGO,
            (sizes.PAGE_WIDTH - sizes.WIDTH_LOGO) / 2,
            remaining_height,
        )

        template_name_height = self._wrap_draw_paragraph(
            template_name_str, self.styles["Normal"], sizes.MARGIN_LEFT, remaining_height
        )
        remaining_height = remaining_height - template_name_height - sizes.SPACE_ABOVE_TITLE
        title_height = self._wrap_draw_paragraph(
            title_str, self.styles["DoraTitle"], sizes.MARGIN_LEFT, remaining_height
        )
        remaining_height = remaining_height - title_height - sizes.SPACE_ABOVE_DATE
        self._wrap_draw_paragraph(
            COVER_PAGE_DATE_STRING.format(date=formatted_date),
            self.styles["Normal"],
            sizes.MARGIN_LEFT,
            remaining_height,
        )

        self._wrap_draw_paragraph(
            COVER_PAGE_DISCLAIMER_STRING,
            self.styles["DoraDisclaimer"],
            sizes.MARGIN_LEFT,
            sizes.MARGIN_DOWN_COVER_PAGE,
        )
        self.pdf_canvas.showPage()

    def generate_main_pages(self) -> None:
        self._generate_paragraphs_from_sections(self.document.get_sections())
        self._draw_new_page_header()
        diagram_height = self._draw_visual_summary()

        remaining_height = sizes.MAX_AVAILABLE_HEIGHT - diagram_height

        for paragraph in self.paragraphs:
            remaining_height = self._split_paragraph_and_draw(paragraph, remaining_height)
        self.pdf_canvas.showPage()

    def generate_references_pages(self) -> None:
        references = get_formatted_references(self.doc_bibliographies)
        if not references:
            return
        self._draw_new_page_header()
        remaining_height = sizes.MAX_AVAILABLE_HEIGHT
        reference_heading_height = self._wrap_draw_paragraph(
            "References",
            self.styles["Heading1"],
            sizes.MARGIN_LEFT,
            sizes.PAGE_HEIGHT - sizes.SPACE_ABOVE_HEADER - sizes.HEIGHT_HEADER - sizes.SPACE_BELOW_HEADER,
        )

        remaining_height = remaining_height - reference_heading_height - sizes.SPACE_BETWEEN_PARAGRAPHS
        for reference in references:
            if reference["type"] == BibliographyType.WEBSEARCH:
                reference_text = WEBSEARCH_REFERENCE_PATTERN.format(
                    url=reference["url"],
                    title=reference["title"],
                    domain=reference["domain"],
                )
            else:
                reference_text = reference["text"]
            reference_paragraph = Paragraph(reference_text, self.styles["Normal"])
            _, reference_paragraph_height = reference_paragraph.wrapOn(
                self.pdf_canvas, sizes.MAX_AVAILABLE_WIDTH, sizes.PAGE_HEIGHT
            )
            if remaining_height - reference_paragraph_height > 0:
                reference_paragraph.drawOn(
                    self.pdf_canvas,
                    sizes.MARGIN_LEFT,
                    sizes.MARGIN_DOWN + remaining_height - reference_paragraph_height,
                )
            else:
                self.pdf_canvas.showPage()
                self._draw_new_page_header()
                remaining_height = sizes.MAX_AVAILABLE_HEIGHT
                reference_paragraph.drawOn(
                    self.pdf_canvas,
                    sizes.MARGIN_LEFT,
                    sizes.MARGIN_DOWN + remaining_height - reference_paragraph_height,
                )
            remaining_height = remaining_height - reference_paragraph_height - sizes.SPACE_BETWEEN_REFERENCES
        self.pdf_canvas.showPage()

    def generate_pdf(self) -> None:
        self.generate_cover_page()
        self.generate_main_pages()
        self.generate_references_pages()
        self.pdf_canvas.save()
