import os
import re

def update_file(path):
    with open(path, 'r') as f:
        content = f.read()

    # Change all primary buttons to bg-[#171b2e]
    # In Tailwind, we often see `bg-indigo-600` on buttons
    # We will just replace `bg-indigo-600` and `bg-indigo-500` with `bg-[#171b2e]`
    # if it's a primary button, or `bg-accent` for other interactive elements.
    
    # Actually, simpler: replace all indigo with accent globally
    content = content.replace('indigo-600', 'accent')
    content = content.replace('indigo-500', 'accent')
    content = content.replace('indigo-400', 'accent-dim')
    content = content.replace('indigo-100', 'accent-container')
    content = content.replace('indigo-50', 'accent-container')
    
    # Then for buttons specifically, we can find buttons with `bg-accent` and change them to `bg-[#171b2e]`
    # Let's use regex to find button tags and replace classes inside them
    def button_replacer(match):
        button_tag = match.group(0)
        # Pill shape
        button_tag = re.sub(r'rounded-(?:md|lg|xl|2xl|3xl)', 'rounded-full', button_tag)
        # Button color
        button_tag = button_tag.replace('bg-accent', 'bg-[#171b2e]')
        button_tag = button_tag.replace('hover:bg-accent', 'hover:bg-[#171b2e]/90')
        # Remove colored shadow
        button_tag = re.sub(r'shadow-accent/\d+', 'shadow-black/10', button_tag)
        return button_tag

    content = re.sub(r'<button\b[^>]*>', button_replacer, content)

    with open(path, 'w') as f:
        f.write(content)

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            update_file(os.path.join(root, file))
