import zipfile
import xml.etree.ElementTree as ET

with zipfile.ZipFile('textCopy.docx') as z:
    doc = ET.parse(z.open('word/document.xml'))

ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
paragraphs = doc.findall('.//w:p', ns)

lines = []
for p in paragraphs:
    texts = [t.text or '' for t in p.findall('.//w:t', ns)]
    lines.append(''.join(texts))

with open('textCopy.extracted.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
