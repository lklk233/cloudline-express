"""Bake editable OpenVDB clouds and matching WebGL density bricks in Blender."""
from pathlib import Path
import gzip
import bpy
import numpy as np
import openvdb as vdb

root = Path(__file__).resolve().parents[1]
source = root / "assets/source/blender/clouds"
source.mkdir(parents=True, exist_ok=True)
runtime = root / "assets/runtime/cloud-density.bin"
n = 96
axis = (np.arange(n) + .5) * 2 / n - 1
x, y, z = np.meshgrid(axis, axis, axis, indexing="ij")  # Blender Z is up
bpy.ops.wm.read_factory_settings(use_empty=True)

def noise(x, y, z, frequency, rng):
    lattice = rng.random((32, 32, 32))
    coords = [(a + 3) * frequency for a in (x, y, z)]
    base = [np.floor(a).astype(int) for a in coords]
    weights = [a - b for a, b in zip(coords, base)]
    u, v, w = [a*a*(3-2*a) for a in weights]
    field = 0
    for i in range(2):
        for j in range(2):
            for k in range(2):
                field += lattice[(base[0]+i)%32,(base[1]+j)%32,(base[2]+k)%32] * (u if i else 1-u) * (v if j else 1-v) * (w if k else 1-w)
    return field - .5

# Distinct envelopes for a rising tower, long shelf, twin summit and torn wisp.
profiles = [
    [(-.47,.04,-.27,.41,.52,.33),(-.26,.12,.17,.35,.45,.62),
     (-.18,.08,.56,.22,.32,.29),(.08,-.14,.06,.40,.46,.44),
     (.35,-.06,-.13,.31,.43,.36),(.64,.10,-.25,.29,.31,.21)],
    [(-.55,.10,-.16,.37,.43,.29),(-.26,.07,.12,.37,.43,.43),
     (.03,-.06,.19,.36,.52,.44),(.36,.02,.03,.34,.40,.31),
     (.61,.11,.17,.24,.28,.20),(.80,.18,.29,.14,.21,.12)],
    [(-.55,.06,-.24,.37,.40,.28),(-.37,.12,.06,.37,.50,.51),
     (-.09,-.14,-.13,.48,.46,.37),(.24,.03,.21,.35,.42,.56),
     (.50,.12,-.01,.30,.38,.35),(.69,.17,-.18,.20,.27,.18)],
    [(-.61,.20,-.18,.23,.30,.22),(-.23,-.07,-.03,.31,.39,.34),
     (.07,.08,.04,.29,.32,.26),(.48,.15,.22,.23,.26,.18),(.78,.21,.38,.12,.18,.12)],
]
# Each silhouette is drawn as rows of (horizontal position, height, width, height radius).
# Successive rows sit at different depths; overlapping shelves cast distinct shadows.
studies = {
    "Citadel": [[(-.52,-.34,.40,.24),(0,-.32,.54,.28),(.50,-.34,.37,.21)],
                [(-.28,.04,.40,.55),(-.18,.45,.25,.40),(.22,.09,.33,.36)]],
    "Crown": [[(-.46,-.27,.43,.28),(.06,-.22,.52,.39),(.56,-.22,.32,.22)],
              [(-.30,.24,.30,.45),(.02,.47,.27,.40),(.28,.24,.27,.36)]],
    "Anvil": [[(-.42,-.42,.42,.26),(.10,-.43,.54,.22),(.54,-.41,.34,.20)],
              [(-.15,-.08,.29,.38),(-.42,.26,.44,.24),(.12,.30,.52,.26),(.60,.39,.32,.15)]],
    "Breaking wave": [[(-.50,-.36,.42,.22),(.07,-.33,.50,.25),(.54,-.39,.32,.20)],
                      [(-.27,-.03,.34,.40),(-.10,.29,.33,.36),(.22,.47,.37,.21),(.59,.51,.24,.12)]],
    "Wind stair": [[(-.56,-.35,.35,.23),(-.20,-.17,.43,.32),(.24,.06,.35,.38),(.56,.30,.30,.29),(.78,.48,.15,.14)]],
    "Triple crown": [[(-.52,-.27,.42,.29),(.03,-.28,.52,.30),(.56,-.24,.35,.25)],
                     [(-.49,.14,.29,.41),(-.04,.29,.29,.47),(.49,.11,.28,.36)]],
    "Overhang": [[(-.38,-.38,.48,.24),(.26,-.39,.48,.20)],
                 [(.26,-.03,.30,.41),(.17,.28,.46,.32),(-.43,.31,.42,.18),(.58,.21,.29,.23)]],
    "Long reef": [[(-.70,-.13,.23,.13),(-.39,-.06,.38,.21),(.03,.04,.40,.28),(.43,-.04,.38,.18),(.76,-.11,.18,.10)]],
    "Split ridge": [[(-.58,-.22,.36,.25),(-.39,.12,.27,.42),(-.03,-.21,.31,.20),(.37,.08,.32,.34),(.62,-.16,.32,.20)]],
    "Banner": [[(-.56,-.21,.37,.32),(-.29,.03,.30,.38),(.04,.08,.37,.23),(.41,.19,.32,.15),(.73,.32,.20,.09)]],
    "Stacked decks": [[(-.53,-.40,.39,.15),(0,-.36,.55,.22),(.59,-.40,.31,.12)],
                      [(-.33,.02,.47,.18),(.17,.09,.46,.22),(.61,.06,.27,.11)],[(.06,.30,.31,.22)]],
    "Low archipelago": [[(-.69,-.18,.21,.13),(-.30,-.05,.30,.24),(.10,-.11,.28,.16),(.47,.10,.23,.24),(.78,.02,.13,.09)]],
}
names = ["Tower","Shelf","Twin summit","Wisp",*studies]
for rows in studies.values():
    profiles.append([(cx, .22-layer*.29, cz, rx, min(.56,.18+rx*.70), rz)
                     for layer,row in enumerate(rows) for cx,cz,rx,rz in row])
with gzip.GzipFile(str(runtime.with_suffix(".tmp")), "wb", compresslevel=6, mtime=0) as out:
    for idx, lobes in enumerate(profiles):
        rng = np.random.default_rng(20261118 + idx)
        px, py, pz = [a + .10*noise(x,y,z,3,rng)+.042*noise(x,y,z,9,rng) for a in (x,y,z)]
        envelope = np.full(x.shape,-3.)
        for cx,cy,cz,rx,ry,rz in lobes:
            for j in range(14):
                shift = rng.uniform(-.65,.65,3) if j else np.zeros(3)
                radius = rng.uniform(.32,.61) if j else .83
                d = radius - np.sqrt(((px-cx)/rx-shift[0])**2+((py-cy)/ry-shift[1])**2+((pz-cz)/rz-shift[2])**2)
                envelope = np.maximum(envelope,d)
        erosion = sum(a*noise(x,y,z,f,rng) for f,a in [(5,.26),(11,.19),(23,.11)])
        edge = np.minimum.reduce([1-abs(x),1-abs(y),1-abs(z)])
        density = np.clip((envelope+erosion+.045)*7.5,0,1)*np.clip(edge*15-.45,0,1)
        # WebGL X,Y,Z = Blender X,Z,-Y. X is fastest in the binary.
        out.write(np.ascontiguousarray((density[:,::-1,:].transpose(1,2,0)*255).round(),dtype=np.uint8).tobytes())
        grid = vdb.FloatGrid()
        grid.name = "density"
        grid.gridClass = vdb.GridClass.FOG_VOLUME
        grid.transform = vdb.createLinearTransform(voxelSize=2/n)
        grid.transform.postTranslate(tuple([float(axis[0])]*3))
        grid.copyFromArray(np.ascontiguousarray(density,dtype=np.float32))
        name = names[idx]
        path = source / (name + ".vdb")
        vdb.write(str(path),grids=[grid])
        obj = bpy.data.objects.new(name,bpy.data.volumes.new(name))
        bpy.context.collection.objects.link(obj)
        obj.data.filepath = "//" + path.name
        obj.location = ((idx%4-1.5)*2.2, 0, (1.5-idx//4)*2.1)
        obj["shape_seed"] = 20261118 + idx
        obj.data.display.density = 2
runtime.with_suffix(".tmp").replace(runtime)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(source / "Cloud studies.blend"),relative_remap=False)

