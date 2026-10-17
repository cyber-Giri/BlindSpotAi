import io
from typing import List, Dict, Any
from fastapi import UploadFile, HTTPException
import pymupdf  # PyMuPDF
from docx import Document


class DocumentParser:
    SUPPORTED_EXTENSIONS = {"pdf", "docx", "txt"}
    MAX_FILE_BYTES = 20 * 1024 * 1024  # 20MB

    @classmethod
    def validate_file(cls, filename: str, content: bytes):
        if len(content) == 0:
            raise HTTPException(status_code=400, detail=f"File '{filename}' is empty.")
        if len(content) > cls.MAX_FILE_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"File '{filename}' exceeds maximum allowed size of {cls.MAX_FILE_BYTES // (1024*1024)}MB."
            )
        ext = filename.split(".")[-1].lower() if "." in filename else ""
        if ext not in cls.SUPPORTED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file extension '.{ext}'. Supported: {', '.join(cls.SUPPORTED_EXTENSIONS)}"
            )

    @classmethod
    async def parse_file(cls, file: UploadFile) -> Dict[str, Any]:
        """
        Parses PDF, DOCX, or TXT file into extracted passages and page-aware structures.
        """
        filename = file.filename or "unknown"
        content = await file.read()
        cls.validate_file(filename, content)

        ext = filename.split(".")[-1].lower() if "." in filename else ""
        passages: List[Dict[str, Any]] = []
        full_text = ""

        try:
            if ext == "pdf":
                doc = pymupdf.open(stream=content, filetype="pdf")
                if len(doc) == 0:
                    raise HTTPException(status_code=400, detail=f"PDF '{filename}' contains no pages.")
                for page_num in range(len(doc)):
                    page = doc[page_num]
                    text = page.get_text("text").strip()
                    if text:
                        passages.append({
                            "page": page_num + 1,
                            "text": text,
                            "section": f"Page {page_num + 1}"
                        })
                        full_text += f"\n--- Page {page_num + 1} ---\n" + text
                doc.close()

            elif ext == "docx":
                doc_stream = io.BytesIO(content)
                doc = Document(doc_stream)
                current_section = "General"
                section_texts = []
                for p in doc.paragraphs:
                    t = p.text.strip()
                    if not t:
                        continue
                    # Check if paragraph is heading
                    if p.style.name.startswith("Heading"):
                        if section_texts:
                            passages.append({
                                "section": current_section,
                                "text": "\n".join(section_texts)
                            })
                            section_texts = []
                        current_section = t
                    else:
                        section_texts.append(t)
                if section_texts:
                    passages.append({
                        "section": current_section,
                        "text": "\n".join(section_texts)
                    })
                full_text = "\n\n".join([f"[{p.get('section', 'Section')}]: {p['text']}" for p in passages])

            elif ext == "txt":
                try:
                    text = content.decode("utf-8")
                except UnicodeDecodeError:
                    text = content.decode("latin-1", errors="replace")
                
                text = text.strip()
                if not text:
                    raise HTTPException(status_code=400, detail=f"Text file '{filename}' contains no readable text.")
                passages.append({
                    "section": "Full Document",
                    "text": text
                })
                full_text = text

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse document '{filename}': {str(e)}")

        if not full_text.strip():
            raise HTTPException(status_code=400, detail=f"No readable text could be extracted from '{filename}'.")

        return {
            "filename": filename,
            "passages": passages,
            "full_text": full_text,
            "char_count": len(full_text)
        }
