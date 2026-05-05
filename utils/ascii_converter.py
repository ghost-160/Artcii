import cv2
import html
import numpy as np


def pixel_to_ascii(pixel: int, charset: str) -> str:
    if not charset:
        charset = "@%#*+=-:. "

    pixel = max(0, min(255, int(pixel)))
    num_chars = len(charset)
    normalized = pixel / 255.0
    index = int(normalized * (num_chars - 1))
    return charset[index]


def build_ascii_string(ascii_matrix: np.ndarray) -> str:
    return "\n".join("".join(row) for row in ascii_matrix)


def frame_to_ascii(gray_frame: np.ndarray, charset: str) -> str:
    if gray_frame is None or gray_frame.size == 0:
        return ""

    height, width = gray_frame.shape
    ascii_matrix = np.empty((height, width), dtype="U1")

    for y in range(height):
        for x in range(width):
            ascii_matrix[y, x] = pixel_to_ascii(int(gray_frame[y, x]), charset)

    return build_ascii_string(ascii_matrix)


def escape_html_char(char: str) -> str:
    return html.escape(char)


def frame_to_colored_ascii(color_frame: np.ndarray, gray_frame: np.ndarray, charset: str) -> str:
    if color_frame is None or gray_frame is None or color_frame.size == 0 or gray_frame.size == 0:
        return ""

    if color_frame.ndim != 3 or color_frame.shape[2] != 3:
        raise ValueError("Color frame must have 3 channels")

    rgb_frame = cv2.cvtColor(color_frame, cv2.COLOR_BGR2RGB)
    height, width = gray_frame.shape
    rows = []

    for y in range(height):
        row_chars = []
        for x in range(width):
            char = pixel_to_ascii(int(gray_frame[y, x]), charset)
            r, g, b = rgb_frame[y, x]
            row_chars.append(
                f'<span style="color: rgb({r},{g},{b});">{escape_html_char(char)}</span>'
            )
        rows.append("".join(row_chars))

    return "<br>".join(rows)
