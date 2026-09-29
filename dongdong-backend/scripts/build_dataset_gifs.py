#!/usr/bin/env python3
"""给数据集动作 E* 画循环示意 GIF。

人物造型固定（线稿、白背心、黑短裤），每个动作只改变姿势。
自有动作 A001–A030 已有单独绘制的 GIF，这里不覆盖。
"""
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / ".cache" / "pylibs"))
from PIL import Image, ImageDraw  # noqa: E402

OUT = ROOT.parent / "dongdong-demo" / "dist" / "assets" / "actions"
SEED = ROOT / "supabase" / "seed_dataset.sql"

W = H = 400
CX = 200
BG = (221, 239, 252)
INK = (28, 32, 36)
SKIN = (255, 250, 246)
HAIR = (46, 40, 38)
SHORTS = (32, 36, 40)
TANK = (255, 255, 255)
BLUSH = (255, 206, 206)


def osc(t):
    return 0.5 - 0.5 * math.cos(t * math.tau)


def dest(origin, length, deg):
    rad = math.radians(deg)
    return (origin[0] + math.sin(rad) * length, origin[1] + math.cos(rad) * length)


def bone(draw, a, b, width, fill):
    draw.line([a, b], fill=INK, width=width + 6)
    draw.line([a, b], fill=fill, width=width)
    for point in (a, b):
        r = width / 2 + 1
        x, y = point
        draw.ellipse((x - r - 2, y - r - 2, x + r + 2, y + r + 2), fill=INK)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=fill)


def draw_head(draw, center, tilt=0, side=False):
    cx, cy = center
    r = 27
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=SKIN, outline=INK, width=4)
    bun = (cx + math.sin(math.radians(tilt)) * 6, cy - r + 2)
    draw.ellipse((bun[0] - 11, bun[1] - 16, bun[0] + 11, bun[1] + 6), fill=HAIR, outline=INK, width=3)
    draw.arc((cx - 18, cy - r + 2, cx + 18, cy - 4), 200, 340, fill=HAIR, width=4)
    shift = math.sin(math.radians(tilt)) * 7
    if side:
        eye = (cx + 8, cy - 2)
        draw.ellipse((eye[0] - 2.4, eye[1] - 3, eye[0] + 2.4, eye[1] + 3), fill=INK)
        draw.arc((cx + 2, cy + 6, cx + 14, cy + 16), 20, 140, fill=INK, width=2)
    else:
        for sign in (-1, 1):
            eye = (cx + sign * 9 + shift, cy - 1)
            draw.ellipse((eye[0] - 2.3, eye[1] - 2.8, eye[0] + 2.3, eye[1] + 2.8), fill=INK)
        draw.arc((cx - 9 + shift, cy + 4, cx + 9 + shift, cy + 16), 15, 165, fill=INK, width=2)
        draw.ellipse((cx - 16, cy + 4, cx - 10, cy + 9), fill=BLUSH)
        draw.ellipse((cx + 10, cy + 4, cx + 16, cy + 9), fill=BLUSH)


def front_points(hip_y=232, lean=0, fold=0, tilt=0, squat=0, rise=0, twist=0,
                 arm_l=(-8, -8), arm_r=(8, 8), lift_l=0, lift_r=0, knees=None):
    hip_y = hip_y + squat * 46 - rise
    hip_l = (CX - 16, hip_y)
    hip_r = (CX + 16, hip_y)
    shoulder_y = hip_y - (76 - fold * 34)
    shift = lean * 1.2
    shoulder_l = (CX - 38 + shift - twist * 10, shoulder_y + twist * 8)
    shoulder_r = (CX + 38 + shift + twist * 10, shoulder_y - twist * 8)
    head = (CX + shift * 1.25 + tilt * 0.55, shoulder_y - 42 + fold * 16)
    neck = (CX + shift, shoulder_y - 8)

    def leg(hip, side, lift, custom):
        if custom:
            return custom
        if lift > 0.02:
            knee = (hip[0] + side * 12, hip[1] + 54 * (1 - lift) + 6)
            foot = (knee[0] + side * 8, knee[1] + 48)
            return knee, foot
        spread = 10 + squat * 28
        knee = (hip[0] + side * spread, hip[1] + 56 - squat * 16)
        foot = (knee[0] + side * (2 - squat * 8), knee[1] + 52 - squat * 8)
        return knee, foot

    custom_l = knees[0] if knees else None
    custom_r = knees[1] if knees else None
    knee_l, foot_l = leg(hip_l, -1, lift_l, custom_l)
    knee_r, foot_r = leg(hip_r, 1, lift_r, custom_r)
    elbow_l, hand_l = dest(shoulder_l, 48, arm_l[0]), None
    elbow_l = dest(shoulder_l, 48, arm_l[0])
    hand_l = dest(elbow_l, 40, arm_l[1])
    elbow_r = dest(shoulder_r, 48, arm_r[0])
    hand_r = dest(elbow_r, 40, arm_r[1])
    return {
        "kind": "front",
        "head": head, "tilt": tilt, "neck": neck,
        "shoulder_l": shoulder_l, "shoulder_r": shoulder_r,
        "hip_l": hip_l, "hip_r": hip_r, "hip_y": hip_y,
        "knee_l": knee_l, "knee_r": knee_r, "foot_l": foot_l, "foot_r": foot_r,
        "elbow_l": elbow_l, "elbow_r": elbow_r, "hand_l": hand_l, "hand_r": hand_r,
        "rise": rise,
    }


def draw_front(draw, pose):
    shadow_y = 348
    draw.ellipse((CX - 54, shadow_y, CX + 54, shadow_y + 16), fill=(198, 220, 236))
    for hip, knee, foot in (
        (pose["hip_l"], pose["knee_l"], pose["foot_l"]),
        (pose["hip_r"], pose["knee_r"], pose["foot_r"]),
    ):
        bone(draw, hip, knee, 16, SKIN)
        bone(draw, knee, foot, 14, SKIN)
        x, y = foot
        draw.ellipse((x - 12, y - 6, x + 16, y + 8), fill=SKIN, outline=INK, width=3)
    waist_l = (pose["hip_l"][0] - 6, pose["hip_y"] - 4)
    waist_r = (pose["hip_r"][0] + 6, pose["hip_y"] - 4)
    draw.polygon([pose["shoulder_l"], pose["shoulder_r"], waist_r, waist_l], fill=TANK, outline=INK)
    draw.line([pose["shoulder_l"], pose["shoulder_r"], waist_r, waist_l, pose["shoulder_l"]], fill=INK, width=4)
    shorts_top = pose["hip_y"] - 8
    draw.rounded_rectangle((CX - 28, shorts_top, CX + 28, shorts_top + 34), radius=10, fill=SHORTS, outline=INK, width=3)
    bone(draw, pose["neck"], ((pose["shoulder_l"][0] + pose["shoulder_r"][0]) / 2, pose["shoulder_l"][1] - 4), 10, SKIN)
    for shoulder, elbow, hand in (
        (pose["shoulder_l"], pose["elbow_l"], pose["hand_l"]),
        (pose["shoulder_r"], pose["elbow_r"], pose["hand_r"]),
    ):
        bone(draw, shoulder, elbow, 13, SKIN)
        bone(draw, elbow, hand, 12, SKIN)
        x, y = hand
        draw.ellipse((x - 8, y - 8, x + 8, y + 8), fill=SKIN, outline=INK, width=3)
    draw_head(draw, pose["head"], pose["tilt"])


def draw_side(draw, pose):
    draw.ellipse((150, 332, 300, 348), fill=(198, 220, 236))
    order = pose.get("behind", [])
    front = pose.get("front", [])
    for a, b, width in order:
        bone(draw, a, b, width, SKIN)
    if pose.get("torso"):
        draw.polygon(pose["torso"], fill=TANK, outline=INK)
        draw.line(pose["torso"] + [pose["torso"][0]], fill=INK, width=4)
    if pose.get("shorts"):
        x0, y0, x1, y1 = pose["shorts"]
        draw.rounded_rectangle((x0, y0, x1, y1), radius=8, fill=SHORTS, outline=INK, width=3)
    for a, b, width in front:
        bone(draw, a, b, width, SKIN)
    for point in pose.get("hands", []):
        x, y = point
        draw.ellipse((x - 8, y - 8, x + 8, y + 8), fill=SKIN, outline=INK, width=3)
    for point in pose.get("feet", []):
        x, y = point
        draw.ellipse((x - 8, y - 6, x + 16, y + 8), fill=SKIN, outline=INK, width=3)
    draw_head(draw, pose["head"], pose.get("tilt", 0), side=True)


def side_pose(head, shoulder, hip, knee, foot, elbow, hand, knee2=None, foot2=None, prone=False):
    torso = [shoulder, (shoulder[0] + 8, shoulder[1] + 16), (hip[0] + 10, hip[1] - 8), (hip[0] - 18, hip[1] - 16)]
    if prone:
        torso = [shoulder, (shoulder[0] - 4, shoulder[1] + 18), hip, (hip[0], hip[1] - 22)]
    behind = []
    if knee2 and foot2:
        behind.append((hip, knee2, 14))
        behind.append((knee2, foot2, 12))
    return {
        "kind": "side",
        "head": head, "torso": torso,
        "shorts": (hip[0] - 16, hip[1] - 18, hip[0] + 18, hip[1] + 12),
        "behind": behind,
        "front": [(hip, knee, 15), (knee, foot, 13), (shoulder, elbow, 12), (elbow, hand, 11)],
        "hands": [hand], "feet": [foot] + ([foot2] if foot2 else []),
    }


def mix(a, b, t):
    return a + (b - a) * t


def pt(x0, y0, x1, y1, t):
    return (mix(x0, x1, t), mix(y0, y1, t))


# --- 正面动作 ---------------------------------------------------------------

def neck_press(t):
    a = osc(t)
    side = 1 if t < 0.5 else -1
    amount = osc(t * 2 if t < 0.5 else (t - 0.5) * 2)
    reach = (150 * amount * side, 70 * amount)
    rest_l, rest_r = (-8, -8), (8, 8)
    if side > 0:
        arms = (mix(rest_l[0], -reach[0], 1), mix(rest_l[1], -40, amount)), rest_r
        arm_l = (-20 * (1 - amount) - 150 * amount, -30 * amount)
        arm_r = (8, 8)
        tilt = 22 * amount
    else:
        arm_l = (-8, -8)
        arm_r = (20 * (1 - amount) + 150 * amount, 30 * amount)
        tilt = -22 * amount
    return front_points(tilt=tilt, arm_l=arm_l, arm_r=arm_r)


def rear_delt(t):
    a = osc(t)
    return front_points(arm_l=(-70 * a, 55 * a), arm_r=(18, 8), tilt=-6 * a)


def lat_stretch(t):
    a = osc(t)
    return front_points(arm_l=(-100 * a, -20 * a), arm_r=(100 * a, 20 * a), fold=0.15 * a)


def kneel_side(t):
    a = osc(t)
    return front_points(hip_y=268, lean=20 * a, tilt=8 * a, arm_l=(-40, 20), arm_r=(168 * a, 20),
                        knees=(((CX - 52, 304), (CX - 70, 346)), ((CX + 24, 310), (CX + 40, 348))))


def seated_fold(t):
    a = osc(t)
    return front_points(hip_y=250, fold=0.55 * a, arm_l=(-20 - 10 * a, -8), arm_r=(20 + 10 * a, 8),
                        knees=(((CX - 46, 296), (CX - 78, 344)), ((CX + 46, 296), (CX + 78, 344))))


def pelvic(t):
    a = osc(t)
    return front_points(hip_y=232 + 8 * a, squat=0.12 * a, arm_l=(-16, -10), arm_r=(16, 10))


def chest_open(t):
    a = osc(t)
    return front_points(arm_l=(-108 * a, -108 * a), arm_r=(108 * a, 108 * a), rise=4 * a)


def chest_squeeze(t):
    a = osc(t)
    return front_points(arm_l=(-70 + 50 * a, 30 * a), arm_r=(70 - 50 * a, -30 * a))


def wrist(t):
    a = math.sin(t * math.tau)
    return front_points(arm_l=(-78, -78 + 36 * a), arm_r=(78, 78 + 36 * a))


def overhead_tri(t):
    a = osc(t)
    return front_points(tilt=8 * a, arm_l=(-168, -70 * a), arm_r=(40 + 30 * a, 10))


def ankle(t):
    spin = math.sin(t * math.tau)
    return front_points(hip_y=246, arm_l=(-20, 16), arm_r=(16, 8),
                        knees=(((CX - 58, 286), (CX - 36 + spin * 18, 340)), ((CX + 42, 300), (CX + 62, 346))))


def calf_wall(t):
    a = osc(t)
    return front_points(lean=-6, arm_l=(-82, -20), arm_r=(82, 20),
                        lift_l=0, squat=0.35 * a)


def hamstring(t):
    a = osc(t)
    return front_points(hip_y=246, fold=0.45 * a, arm_l=(-24, -8), arm_r=(24, 8),
                        knees=(((CX - 78, 304 - 18 * a), (CX - 108, 346)), ((CX + 36, 300), (CX + 54, 348))))


def lunge(t, twist=0):
    a = osc(t)
    return front_points(hip_y=240 + 8 * a, twist=twist * a, arm_l=(-36, -8), arm_r=(28 + 20 * a, 8),
                        knees=(((CX - 58, 308), (CX - 74, 350)), ((CX + 36, 262 + 16 * a), (CX + 58, 346))))


def butterfly(t):
    a = osc(t)
    return front_points(hip_y=246, fold=0.28 * a, arm_l=(-46, 24), arm_r=(46, -24),
                        knees=(((CX - 82, 300), (CX - 14, 336)), ((CX + 82, 300), (CX + 14, 336))))


def figure4(t):
    a = osc(t)
    return front_points(hip_y=248, arm_l=(-20, 12), arm_r=(34, 18),
                        knees=(((CX - 40, 308), (CX - 18, 348)), ((CX + 6, 270 - 10 * a), (CX - 8, 308))))


def wide_sit(t):
    a = osc(t)
    return front_points(hip_y=250, fold=0.35 * a, lean=16 * math.sin(t * math.tau),
                        arm_l=(-48, -12), arm_r=(48, 12),
                        knees=(((CX - 90, 312), (CX - 118, 352)), ((CX + 90, 312), (CX + 118, 352))))


def squat(t, reach=0):
    a = osc(t)
    up = 160 * a * reach
    return front_points(squat=0.95 * a, arm_l=(-70 * a - up * 0.2, -70 * a - up), arm_r=(70 * a + up * 0.2, 70 * a + up))


def march(t):
    left = max(0, math.sin(t * math.tau))
    right = max(0, -math.sin(t * math.tau))
    return front_points(lift_l=left, lift_r=right, arm_l=(28 * right - 20, 10), arm_r=(-28 * left + 20, -10))


def ski(t):
    lean = 18 * math.sin(t * math.tau)
    return front_points(lean=lean, squat=0.28, arm_l=(-50 - lean, -20), arm_r=(50 - lean, 20))


def side_bend(t):
    lean = 22 * math.sin(t * math.tau)
    if lean >= 0:
        arms = ((-30, -10), (150, 20))
    else:
        arms = ((-150, -20), (30, 10))
    return front_points(lean=lean, tilt=lean * 0.4, arm_l=arms[0], arm_r=arms[1])


def toe_touch(t):
    lean = 20 * math.sin(t * math.tau)
    a = abs(math.sin(t * math.tau))
    return front_points(lean=lean, fold=0.25 * a, arm_l=(-40 - 30 * a, -8), arm_r=(40 + 30 * a, 8))


def swing(t):
    deg = -160 + 320 * (0.5 - 0.5 * math.cos(t * math.tau))
    return front_points(twist=10 * math.sin(t * math.tau), arm_l=(deg, deg), arm_r=(deg * 0.3, deg * 0.3))


def shoulder_roll(t):
    deg = -20 - 140 * osc(t)
    return front_points(arm_l=(deg, deg), arm_r=(-deg, -deg))


def seated_kick(t):
    a = max(0, math.sin(t * math.tau))
    return front_points(hip_y=250, arm_l=(-18, 10), arm_r=(18, -8),
                        knees=(((CX - 72, 304 - 30 * a), (CX - 108, 344 - 8 * a)), ((CX + 48, 304), (CX + 74, 348))))


def russian(t):
    twist = 16 * math.sin(t * math.tau)
    return front_points(hip_y=256, fold=0.2, twist=twist, arm_l=(-70 + twist, -16), arm_r=(70 + twist, 16),
                        knees=(((CX - 54, 300), (CX - 78, 346)), ((CX + 54, 300), (CX + 78, 346))))


def wall_sit(t):
    left = max(0, math.sin(t * math.tau))
    return front_points(hip_y=250, squat=0.85, arm_l=(-36, 8), arm_r=(36, -8), lift_l=0.45 * left, lift_r=0.45 * max(0, -math.sin(t * math.tau)))


# --- 侧面 / 地面 ------------------------------------------------------------

def bridge(t, march=False, single=False):
    a = osc(t)
    hip = (230, mix(268, 214, a))
    shoulder = (150, 250)
    head = (118, 246)
    knee = (286, 268)
    foot = (318, 312)
    hand = (132, 286)
    elbow = (142, 268)
    knee2 = foot2 = None
    if single:
        knee2 = (270, mix(270, 210, a))
        foot2 = (300, mix(300, 230, a))
    elif march:
        lift = max(0, math.sin(t * math.tau))
        knee2 = (268, 250 - 30 * lift)
        foot2 = (292, 292 - 36 * lift)
    return side_pose(head, shoulder, hip, knee, foot, elbow, hand, knee2, foot2)


def crunch(t, amount=1, cross=False):
    a = osc(t) * amount
    shoulder = (mix(168, 196, a), mix(246, 210, a))
    head = (shoulder[0] - 34, shoulder[1] - 8)
    hip = (250, 262)
    knee = (300, 230)
    foot = (286, 286)
    elbow = (shoulder[0] + 10, shoulder[1] + 28)
    hand = (elbow[0] + 16, elbow[1] + 8) if not cross else (elbow[0] + 28, elbow[1] - 10 * a)
    return side_pose(head, shoulder, hip, knee, foot, elbow, hand)


def reverse_crunch(t):
    a = osc(t)
    hip = (236, mix(262, 236, a))
    shoulder = (160, 250)
    head = (126, 246)
    knee = (mix(292, 250, a), mix(236, 210, a))
    foot = (knee[0] + 8, knee[1] + 36)
    return side_pose(head, shoulder, hip, knee, foot, (148, 270), (136, 292))


def pushup(t, kneel=False):
    a = osc(t)
    shoulder = (168, mix(188, 214, a))
    head = (132, shoulder[1] - 6)
    hip = (268, 196 if not kneel else 214)
    knee = (318, 230 if not kneel else 268)
    foot = (348, 300 if not kneel else 300)
    elbow = (176, mix(210, 236, a))
    hand = (168, 300)
    return side_pose(head, shoulder, hip, knee, foot, elbow, hand, prone=True)


def sphinx(t, updog=False):
    a = osc(t)
    shoulder = (176, mix(214, 188, a if not updog else a))
    head = (142, shoulder[1] - 16)
    hip = (270, 236 if not updog else mix(236, 214, a))
    knee = (318, 250)
    foot = (346, 292)
    elbow = (160, 268)
    hand = (148, 304)
    return side_pose(head, shoulder, hip, knee, foot, elbow, hand, prone=True)


def prone_lift(t):
    a = osc(t)
    shoulder = (170, mix(230, 214, a))
    head = (136, shoulder[1] - 8)
    hip = (262, 240)
    knee = (314, 252)
    foot = (340, 300)
    elbow = (186, mix(250, 214, a))
    hand = (176, elbow[1] - 8)
    return side_pose(head, shoulder, hip, knee, foot, elbow, hand, prone=True)


def plank_tap(t, kneel=False):
    a = max(0, math.sin(t * math.tau))
    shoulder = (170, 196)
    head = (134, 188)
    hip = (270, 200 if not kneel else 220)
    knee = (320, 236 if not kneel else 276)
    foot = (348, 300)
    elbow = (178, mix(230, 188, a))
    hand = (168, mix(300, 200, a))
    return side_pose(head, shoulder, hip, knee, foot, elbow, hand, prone=True)


def climber(t):
    a = max(0, math.sin(t * math.tau * 2))
    shoulder = (168, 198)
    head = (132, 190)
    hip = (272, 202)
    knee = (mix(318, 236, a), mix(240, 210, a))
    foot = (340, 300)
    return side_pose(head, shoulder, hip, knee, foot, (176, 248), (166, 302), prone=True)


def side_leg(t, adduct=False):
    a = osc(t)
    lift = -50 * a if not adduct else 28 * a
    shoulder = (150, 236)
    head = (116, 230)
    hip = (230, 250)
    knee = (300, 258)
    foot = (340, 270)
    knee2 = (292, 236 + lift)
    foot2 = (338, 228 + lift)
    return side_pose(head, shoulder, hip, knee, foot, (156, 270), (150, 304), knee2, foot2)


def side_quad(t):
    a = osc(t)
    shoulder = (150, 230)
    head = (116, 224)
    hip = (236, 246)
    knee = (292, 268)
    foot = (330, 300)
    knee2 = (286, 210)
    foot2 = (250, mix(250, 210, a))
    return side_pose(head, shoulder, hip, knee, foot, (170, 250), (188, 236), knee2, foot2)


def hip_raise(t):
    return bridge(t)


def inchworm(t):
    a = osc(t)
    if a < 0.5:
        return front_points(fold=0.7 * (a / 0.5), arm_l=(-12, -4), arm_r=(12, 4), squat=0.2)
    return plank_tap(0, kneel=False)


def frog(t):
    a = osc(t)
    return front_points(hip_y=270, lean=12 * math.sin(t * math.tau), arm_l=(-36, 28), arm_r=(36, -28),
                        knees=(((CX - 78 - 8 * a, 318), (CX - 18, 348)), ((CX + 78 + 8 * a, 318), (CX + 18, 348))))


MOTIONS = {
    "neck_press": neck_press,
    "rear_delt": rear_delt,
    "lat_stretch": lat_stretch,
    "kneel_side": kneel_side,
    "seated_fold": seated_fold,
    "pelvic": pelvic,
    "chest_open": chest_open,
    "chest_squeeze": chest_squeeze,
    "wrist": wrist,
    "overhead_tri": overhead_tri,
    "ankle": ankle,
    "calf_wall": calf_wall,
    "hamstring": hamstring,
    "lunge": lunge,
    "lunge_twist": lambda t: lunge(t, twist=14),
    "butterfly": butterfly,
    "figure4": figure4,
    "wide_sit": wide_sit,
    "squat": squat,
    "squat_reach": lambda t: squat(t, reach=1),
    "march": march,
    "ski": ski,
    "side_bend": side_bend,
    "toe_touch": toe_touch,
    "swing": swing,
    "shoulder_roll": shoulder_roll,
    "seated_kick": seated_kick,
    "russian": russian,
    "wall_sit": wall_sit,
    "bridge": bridge,
    "bridge_march": lambda t: bridge(t, march=True),
    "bridge_single": lambda t: bridge(t, single=True),
    "crunch": crunch,
    "crunch_small": lambda t: crunch(t, amount=0.45),
    "crunch_cross": lambda t: crunch(t, cross=True),
    "reverse_crunch": reverse_crunch,
    "pushup": pushup,
    "pushup_kneel": lambda t: pushup(t, kneel=True),
    "sphinx": sphinx,
    "updog": lambda t: sphinx(t, updog=True),
    "prone_lift": prone_lift,
    "plank_tap": plank_tap,
    "plank_kneel": lambda t: plank_tap(t, kneel=True),
    "climber": climber,
    "side_leg": side_leg,
    "side_adduct": lambda t: side_leg(t, adduct=True),
    "side_quad": side_quad,
    "hip_raise": hip_raise,
    "inchworm": inchworm,
    "frog": frog,
}


def motion_for(name, en):
    text = f"{name} {en}"
    rules = [
        ("手推颈", "neck_press"),
        ("三角肌", "rear_delt"),
        ("跪姿背阔", "kneel_side"),
        ("背阔", "lat_stretch"),
        ("坐姿下背", "seated_fold"),
        ("脊柱前屈", "seated_fold"),
        ("仰卧骨盆", "bridge"),
        ("骨盆倾斜", "pelvic"),
        ("斯芬克斯", "sphinx"),
        ("上犬", "updog"),
        ("下背卷曲", "prone_lift"),
        ("肩胛俯卧撑", "pushup"),
        ("反向抬肘", "prone_lift"),
        ("动态扩胸", "chest_open"),
        ("胸部挤压", "chest_squeeze"),
        ("胸部", "chest_open"),
        ("斜面俯卧撑", "pushup"),
        ("跪姿俯卧撑", "pushup_kneel"),
        ("俯卧撑加推", "pushup"),
        ("手腕", "wrist"),
        ("三头", "overhead_tri"),
        ("脚踝", "ankle"),
        ("坐姿小腿", "ankle"),
        ("小腿", "calf_wall"),
        ("腘绳", "hamstring"),
        ("跑者", "lunge"),
        ("蝴蝶", "butterfly"),
        ("梨状肌", "figure4"),
        ("臀部拉伸", "figure4"),
        ("宽角", "wide_sit"),
        ("椅上伸腿", "hamstring"),
        ("交替抬腿", "bridge_march"),
        ("单腿臀桥", "bridge_single"),
        ("臀桥", "bridge"),
        ("髋外展", "side_leg"),
        ("髋内收", "side_adduct"),
        ("青蛙", "frog"),
        ("世界最佳", "lunge_twist"),
        ("行走弓步", "lunge"),
        ("前弓步", "lunge"),
        ("分腿蹲", "squat"),
        ("屈膝礼", "squat"),
        ("股四头", "side_quad"),
        ("静蹲", "wall_sit"),
        ("扶撑深蹲", "squat"),
        ("深蹲上举", "squat_reach"),
        ("坐姿踢腿", "seated_kick"),
        ("仰卧骨盆", "bridge"),
        ("麦吉尔", "crunch_small"),
        ("四分之一", "crunch_small"),
        ("半程仰卧", "crunch"),
        ("反向卷腹", "reverse_crunch"),
        ("侧腹", "crunch_cross"),
        ("交叉卷腹", "crunch_cross"),
        ("肘碰膝", "climber"),
        ("抬髋", "hip_raise"),
        ("俄罗斯", "russian"),
        ("坐姿抬腿", "seated_kick"),
        ("侧卷腹", "crunch_cross"),
        ("跪姿平板", "plank_kneel"),
        ("平板拍肩", "plank_tap"),
        ("毛毛虫", "inchworm"),
        ("体侧屈", "side_bend"),
        ("触脚", "toe_touch"),
        ("踏步", "march"),
        ("滑雪", "ski"),
        ("高抬腿行走", "lunge"),
        ("高抬腿", "march"),
        ("登山", "climber"),
        ("摆臂", "swing"),
        ("卷腹", "crunch"),
        ("俯卧撑", "pushup"),
    ]
    for key, motion in rules:
        if key in text:
            return motion
    return "shoulder_roll"


def load_rows():
    text = SEED.read_text()
    return re.findall(r"\('(E\d+)', '([^']+)', '([^']+)'", text)


def render(motion_name, frames=16):
    fn = MOTIONS[motion_name]
    images = []
    for index in range(frames):
        image = Image.new("RGB", (W, H), BG)
        draw = ImageDraw.Draw(image)
        pose = fn(index / frames)
        if pose.get("kind") == "side":
            draw_side(draw, pose)
        else:
            draw_front(draw, pose)
        images.append(image)
    return images


def save_gif(frames, path):
    palette = frames[0].quantize(colors=32, method=Image.Quantize.MEDIANCUT)
    quantized = [palette]
    for frame in frames[1:]:
        quantized.append(frame.quantize(palette=palette, dither=Image.Dither.NONE))
    quantized[0].save(path, save_all=True, append_images=quantized[1:], duration=90, loop=0, optimize=False, disposal=1)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rows = load_rows()
    missing = []
    for code, name, en in rows:
        motion = motion_for(name, en)
        if motion not in MOTIONS:
            missing.append(f"{code} {motion}")
            continue
        save_gif(render(motion), OUT / f"{code}.gif")
        print(f"{code} {motion} {name}")
    if missing:
        raise SystemExit("未映射：" + ", ".join(missing))
    print(f"完成 {len(rows)} 个 -> {OUT}")


if __name__ == "__main__":
    main()
