"""Create Spanish/Latin subsets of the original, documented Kia Signature fonts."""
import json
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
folder=Path(__file__).resolve().parents[2]/'experiencia-video/fonts'
records=[]
for weight in ('Regular','Light','Bold'):
 original=folder/f'KiaSignature{weight}.woff2';font=TTFont(original);family=font['name'].getDebugName(1)
 assert 'Kia' in family
 options=subset.Options();options.flavor='woff2';worker=subset.Subsetter(options=options)
 worker.populate(unicodes=list(range(0x250))+list(range(0x2000,0x2070))+[0x20ac]);worker.subset(font)
 target=folder/f'KiaSignature{weight}-latin.woff2';font.save(target)
 records.append({'original':original.name,'file':target.name,'family':family,'bytes':target.stat().st_size})
(folder/'latin-subsets.json').write_text(json.dumps({'preserves_original_brand_glyphs':True,'languages':'Latin including Spanish accents','fonts':records},indent=2)+'\n')
