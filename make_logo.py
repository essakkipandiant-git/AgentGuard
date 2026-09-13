from PIL import Image, ImageDraw

size = 192
image = Image.new('RGBA', (size, size), (255, 255, 255, 0))
draw = ImageDraw.Draw(image)
draw.ellipse((0, 0, size - 1, size - 1), fill=(255, 255, 255, 255))
shield = [(size // 2, 40), (142, 58), (142, 94), (size // 2, 152), (50, 94), (50, 58)]
draw.polygon(shield, fill=(17, 17, 17, 255))
draw.line((78, 96, 91, 109, 120, 79), fill=(255, 255, 255, 255), width=12, joint='curve')
image.save('client/public/assets/logo.webp', 'WEBP', quality=95, method=6)
