import base64
import cv2
import numpy as np


def decode_base64_image(base64_string: str):
    if "," in base64_string:
        base64_string = base64_string.split(",", 1)[1]

    image_data = base64.b64decode(base64_string)

    np_arr = np.frombuffer(
        image_data,
        np.uint8
    )

    image = cv2.imdecode(
        np_arr,
        cv2.IMREAD_COLOR
    )

    if image is None:
        raise ValueError(
            "Unable to decode image data"
        )

    return image


def convert_to_grayscale(image):
    if image is None:
        raise ValueError(
            "No image data provided"
        )

    gray = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2GRAY
    )

    # light contrast boost for better face details
    gray = cv2.equalizeHist(gray)

    return gray


def resize_image(image, width):
    if image is None:
        raise ValueError(
            "No image provided for resize"
        )

    height, original_width = image.shape[:2]

    adjusted_height = max(
        1,
        int(
            height *
            width /
            original_width *
            0.50
        )
    )

    return cv2.resize(
        image,
        (width, adjusted_height),
        interpolation=cv2.INTER_AREA
    )


def apply_edge_effect(image):
    gray = convert_to_grayscale(
        image
    )

    blurred = cv2.GaussianBlur(
        gray,
        (3, 3),
        0
    )

    edges = cv2.Canny(
        blurred,
        80,
        150
    )

    return cv2.bitwise_not(
        edges
    )


def dodge_blend(base, blend):
    return cv2.divide(
        base,
        255 - blend,
        scale=256
    )


def apply_sketch_effect(image):
    gray = convert_to_grayscale(
        image
    )

    inverted = cv2.bitwise_not(
        gray
    )

    blurred = cv2.GaussianBlur(
        inverted,
        (21, 21),
        0
    )

    sketch = dodge_blend(
        gray,
        blurred
    )

    return sketch