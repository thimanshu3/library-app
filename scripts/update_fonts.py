import os

def update_file(path):
    with open(path, 'r') as f:
        content = f.read()

    new_content = content.replace('font-playfair', 'font-syne')

    if new_content != content:
        with open(path, 'w') as f:
            f.write(new_content)

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts') or file.endswith('.css'):
            update_file(os.path.join(root, file))
