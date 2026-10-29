"""Create a labeled index of untouched browser captures; does not retouch renders."""
from pathlib import Path
from PIL import Image, ImageDraw
import argparse
p=argparse.ArgumentParser();p.add_argument('directory',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
files=sorted(a.directory.glob('orbit-*.png'))+sorted(a.directory.glob('elevated-*.png'))
if not files:raise SystemExit('No orbit captures')
w,h=400,282;sheet=Image.new('RGB',(w*4,h*((len(files)+3)//4)),(19,21,23));draw=ImageDraw.Draw(sheet)
for i,f in enumerate(files):
 image=Image.open(f).convert('RGB');image.thumbnail((w,260));x=(i%4)*w;y=(i//4)*h
 sheet.paste(image,(x,y+22));draw.text((x+12,y+6),f.stem,fill=(222,224,226))
a.output.parent.mkdir(parents=True,exist_ok=True);sheet.save(a.output,quality=94)
