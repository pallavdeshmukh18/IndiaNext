import sys
from PIL import Image

def remove_black_bg(input_path, output_path):
    try:
        img = Image.open(input_path).convert("RGBA")
    except Exception as e:
        print(f"Failed to open {input_path}: {e}")
        return
        
    data = img.getdata()
    
    new_data = []
    for r, g, b, a in data:
        max_c = max(r, g, b)
        if max_c < 15:
            # Pure black or very dark noise -> fully transparent
            new_data.append((0, 0, 0, 0))
        elif max_c < 80:
            # Transition zone: scale alpha to avoid jagged edges on the glow
            alpha = int(((max_c - 15) / 65.0) * 255)
            # We can optionally boost the color slightly to prevent it looking washed out
            # when alpha is applied, but keeping original color is safest.
            new_data.append((r, g, b, alpha))
        else:
            new_data.append((r, g, b, 255))
            
    img.putdata(new_data)
    img.save(output_path, "PNG")

files = [
    "src/assets/images/hand_left.png", 
    "src/assets/images/hand_right.png", 
    "src/assets/images/central_shape.png"
]

for f in files:
    remove_black_bg(f, f)
    print(f"Processed {f}")
