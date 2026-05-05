import base64
import cv2
import numpy as np


def decode_base64_image(base64_string: str):
    if "," in base64_string:
        base64_string = base64_string.split(",", 1)[1]

    image_data = base64.b64decode(base64_string)
    np_arr = np.frombuffer(image_data, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Unable to decode image data")

    return image


def convert_to_grayscale(image, equalize=False):
    if image is None:
        raise ValueError("No image data provided")

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
    if equalize:
        gray = cv2.equalizeHist(gray)
    return gray


def crop_black_margins(image, threshold=10, min_area_ratio=0.05, crop_ratio=0.92):
    if image is None:
        return image

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
    mask = gray > threshold
    if np.count_nonzero(mask) == 0:
        return image

    coords = np.column_stack(np.where(mask))
    y0, x0 = coords.min(axis=0)
    y1, x1 = coords.max(axis=0)
    crop_area = (y1 - y0 + 1) * (x1 - x0 + 1)
    total_area = gray.size

    if crop_area / total_area < crop_ratio and crop_area / total_area > min_area_ratio:
        return image[y0 : y1 + 1, x0 : x1 + 1]

    return image


def resize_image(image, width):
    if image is None:
        raise ValueError("No image provided for resize")

    height, original_width = image.shape[:2]
    if width <= 0:
        raise ValueError("Width must be greater than zero")

    image = crop_black_margins(image)
    height, original_width = image.shape[:2]
    adjusted_height = max(1, int(height * width / original_width * 0.55))
    return cv2.resize(image, (width, adjusted_height), interpolation=cv2.INTER_AREA)


def apply_edge_effect(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)
    edges = cv2.Canny(blurred, 80, 150)
    return cv2.bitwise_not(edges)


def dodge_blend(base, blend):
    base = base.astype(float)
    blend = blend.astype(float)
    result = cv2.divide(base, 255.0 - blend, scale=256.0)
    return np.clip(result, 0, 255).astype(np.uint8)


def apply_sketch_effect(image):
    gray = convert_to_grayscale(image, equalize=True)
    inverted = cv2.bitwise_not(gray)
    blurred = cv2.GaussianBlur(inverted, (21, 21), 0)
    sketch = dodge_blend(gray, blurred)
    _, sketch = cv2.threshold(sketch, 10, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return sketch
