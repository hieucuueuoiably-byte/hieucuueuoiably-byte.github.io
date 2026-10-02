"""Split approved hero-v5 into registered animation layers; no AI regeneration.

Visible pixels are extracted with geometric masks and a narrow GrabCut edge
refinement. Occluded backgrounds are repaired locally, not recovered originals.
Run with Python + Pillow + numpy + opencv-python.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'home-ai' / 'layers'
OUT.mkdir(parents=True, exist_ok=True)
source = Image.open(ROOT / 'public/home-ai/hero-v5.png').convert('RGB')
W, H = source.size
rgb = np.asarray(source)
bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
sx, sy = W / 1672, H / 941

def poly(points):
    result = np.zeros((H, W), np.uint8)
    pts = np.array([(round(x*sx), round(y*sy)) for x,y in points], np.int32)
    cv2.fillPoly(result, [pts], 255)
    return result

def ellipse(x,y,rx,ry):
    result = np.zeros((H,W),np.uint8)
    cv2.ellipse(result,(round(x*sx),round(y*sy)),(round(rx*sx),round(ry*sy)),0,0,360,255,-1)
    return result

def refine(mask, cores, color_seed=None):
    # Only the silhouette's 4px edge band can change. Interiors stay registered.
    mask = cv2.dilate(mask, np.ones((3,3),np.uint8))
    labels = np.full((H,W),cv2.GC_BGD,np.uint8)
    labels[mask>0]=cv2.GC_PR_FGD
    for core in cores: labels[core>0]=cv2.GC_FGD
    if color_seed is not None: labels[(color_seed)&(mask>0)]=cv2.GC_FGD
    if not cores:
        labels[cv2.erode(mask,np.ones((9,9),np.uint8))>0]=cv2.GC_FGD
    bg=np.zeros((1,65),np.float64); fg=bg.copy()
    cv2.grabCut(bgr,labels,None,bg,fg,4,cv2.GC_INIT_WITH_MASK)
    alpha=np.where((labels==cv2.GC_FGD)|(labels==cv2.GC_PR_FGD),255,0).astype(np.uint8)
    return np.array(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(.35)))

center = poly([(576,395),(570,378),(583,365),(611,366),(621,341),(638,334),(653,337),(669,355),(685,379),(695,410),(727,420),(733,393),(719,382),(725,361),(739,343),(758,338),(764,312),(767,288),(783,265),(805,250),(832,244),(861,245),(885,259),(904,283),(911,305),(902,332),(935,315),(960,297),(990,295),(1013,305),(1027,322),(1038,345),(1040,369),(1032,396),(1018,419),(990,431),(963,432),(963,452),(944,480),(954,492),(974,475),(994,468),(1012,474),(1019,488),(1038,497),(1044,511),(1037,528),(1025,530),(1024,546),(1008,551),(990,544),(973,535),(950,548),(927,539),(914,564),(893,580),(910,626),(944,629),(975,642),(995,668),(968,676),(909,675),(884,666),(850,587),(828,589),(790,634),(807,655),(805,673),(718,675),(710,660),(717,645),(745,630),(781,553),(769,525),(720,514),(665,526),(630,529),(605,513),(576,511),(570,497),(598,482),(657,484),(724,461),(705,441),(680,423),(655,439),(639,447),(624,441),(617,424),(596,425),(579,419),(569,408)])
# The film curls remain with the central director and receive their own UV rig.
center = np.maximum(center, poly([(626,569),(638,552),(665,552),(698,572),(738,580),(787,580),(842,567),(902,563),(950,569),(982,556),(1033,568),(1051,592),(1065,634),(1081,670),(1077,688),(1054,702),(1008,712),(1001,694),(1042,682),(1058,667),(1047,635),(1034,604),(1019,586),(1000,580),(973,596),(933,594),(888,580),(836,586),(791,599),(740,598),(692,587),(663,571),(644,577),(639,610),(653,625),(687,630),(737,651),(739,667),(691,650),(643,638),(627,616)]))
octopus = poly([(168,576),(170,558),(183,546),(204,543),(201,514),(212,490),(240,473),(276,466),(299,463),(328,463),(352,467),(356,446),(370,441),(394,446),(411,464),(437,467),(462,479),(478,489),(490,509),(505,524),(512,548),(517,565),(525,581),(554,595),(588,608),(610,630),(622,652),(615,684),(596,712),(568,721),(545,710),(565,689),(576,665),(566,646),(549,642),(541,680),(521,714),(527,742),(565,730),(604,736),(635,750),(658,745),(675,726),(697,712),(719,714),(743,728),(761,746),(778,773),(787,796),(801,794),(805,777),(824,778),(836,798),(832,822),(818,843),(791,844),(770,825),(749,801),(729,783),(706,780),(683,798),(670,819),(644,829),(606,813),(573,807),(541,803),(525,784),(490,785),(448,802),(415,800),(389,783),(346,783),(318,768),(300,744),(271,745),(241,747),(216,731),(198,708),(180,685),(173,655),(174,631),(159,618),(158,597),(160,582)])
bird = poly([(1092,536),(1092,497),(1102,464),(1116,449),(1141,448),(1155,436),(1155,421),(1174,416),(1191,435),(1196,418),(1207,423),(1217,442),(1238,448),(1272,458),(1311,476),(1352,500),(1397,523),(1430,548),(1433,560),(1393,551),(1351,532),(1301,514),(1256,510),(1214,510),(1209,524),(1227,536),(1215,549),(1201,558),(1199,587),(1244,599),(1281,620),(1295,647),(1303,667),(1350,699),(1362,718),(1383,712),(1393,718),(1404,710),(1415,716),(1425,736),(1421,757),(1399,758),(1364,753),(1338,741),(1337,794),(1354,800),(1367,813),(1347,821),(1307,820),(1283,829),(1264,840),(1250,835),(1257,820),(1280,805),(1283,762),(1221,757),(1202,740),(1190,751),(1167,752),(1148,735),(1122,737),(1094,719),(1097,702),(1096,680),(1111,654),(1136,641),(1163,624),(1150,591),(1132,566),(1114,564),(1098,550)])
pole = poly([(1135,822),(1174,747),(1222,651),(1266,558),(1314,467),(1364,376),(1378,351),(1393,355),(1392,368),(1378,382),(1369,392),(1348,436),(1364,446),(1385,451),(1398,474),(1400,493),(1388,511),(1363,516),(1355,503),(1336,497),(1316,506),(1299,533),(1300,553),(1291,571),(1278,581),(1260,595),(1244,644),(1209,715),(1167,804),(1150,828)])
mic = poly([(1357,342),(1373,329),(1390,324),(1401,315),(1423,316),(1439,303),(1454,305),(1471,294),(1488,299),(1505,294),(1522,302),(1544,297),(1561,309),(1583,309),(1598,319),(1617,329),(1626,350),(1621,369),(1607,380),(1595,399),(1577,403),(1558,419),(1539,420),(1522,431),(1502,430),(1485,435),(1467,428),(1445,425),(1423,414),(1404,403),(1389,390),(1378,380),(1367,370)])
bird=np.maximum(bird,pole)
bird=np.maximum(bird,mic)
# Correct registered outlines from the source's pixel grid (the revised picture
# moved the beret, right hand and feet relative to earlier concept versions).
octopus=np.maximum(octopus,poly([(401,464),(406,441),(421,442),(438,455),(452,450),(458,430),(469,431),(478,463),(504,478),(521,499),(523,520),(510,532),(483,525),(451,512),(428,492)]))
bird_main=poly([(1093,484),(1103,458),(1128,445),(1152,437),(1167,430),(1188,420),(1212,433),(1228,442),(1236,457),(1266,463),(1292,472),(1330,487),(1370,513),(1410,540),(1429,558),(1388,548),(1340,527),(1295,510),(1250,495),(1223,496),(1218,510),(1208,528),(1197,543),(1189,565),(1207,585),(1240,609),(1265,628),(1292,654),(1311,678),(1320,703),(1314,727),(1297,743),(1278,751),(1252,753),(1238,770),(1218,774),(1208,760),(1193,775),(1175,773),(1168,760),(1152,768),(1136,758),(1130,738),(1115,731),(1110,709),(1102,704),(1110,682),(1124,665),(1164,644),(1200,636),(1220,638),(1226,631),(1202,606),(1172,579),(1138,563),(1115,566),(1098,550),(1090,525)])
bird_hand=poly([(1255,571),(1272,562),(1291,566),(1306,568),(1322,581),(1333,600),(1337,616),(1345,624),(1346,639),(1334,643),(1321,638),(1317,626),(1306,629),(1294,614),(1278,603),(1268,605),(1255,597),(1243,590)])
bird_leg=poly([(1280,746),(1320,732),(1356,715),(1376,713),(1388,735),(1386,751),(1378,765),(1370,762),(1364,734),(1330,760),(1290,776)])
bird_foot=poly([(1252,754),(1244,779),(1227,803),(1228,818),(1210,820),(1190,831),(1188,838),(1202,840),(1220,834),(1240,839),(1248,832),(1246,816),(1243,805),(1263,770),(1271,752)])
gear=poly([(1266,648),(1313,646),(1330,665),(1340,702),(1323,730),(1287,750),(1261,725),(1249,693)])
pole=poly([(1135,823),(1152,828),(1400,372),(1383,367)])
bird=np.maximum.reduce([bird_main,bird_hand,bird_leg,bird_foot,gear,pole,mic])
r,g,b=rgb[:,:,0].astype(int),rgb[:,:,1].astype(int),rgb[:,:,2].astype(int)
cream=(r>175)&(g>140)&(b>85)&(g-b>8)&(r>=g)&(r>b)
purple=(r-g>12)&(b-r>4)&(b-g>30)
green=(g-b>32)&(r<g+30)&(r>45)&(g>95)
yellow=(r>190)&(g>182)&(b<125)
# Registered balloon bodies. Their original thin ropes are removed from the base;
# runtime cubic curves reconnect them as they float.
balloons=[ellipse(1142,131,45,50),ellipse(1098,214,34,37),ellipse(1216,162,39,44)]
def box(x0,y0,x1,y1): return poly([(x0,y0),(x1,y0),(x1,y1),(x0,y1)])
def visible_mask(seed,roi,solid=None):
    m=((seed)&(roi>0)).astype(np.uint8)*255
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
    # Recover dark ink within 4px of identified figure colors. Do not absorb
    # dark skyline pixels in the gaps between a character's limbs.
    near=cv2.dilate(m,np.ones((9,9),np.uint8))
    dark=(r<140)&(g<140)&(b<160)
    m=np.maximum(m,((near>0)&dark&(roi>0)).astype(np.uint8)*255)
    if solid is not None: m=np.maximum(m,solid)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
    # Restore enclosed face paint and black prop details without filling the
    # teal scenery between limbs. A color classifier alone loses black pupils,
    # cheek paint and clapperboard stripes.
    contours,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    filled=np.zeros_like(m);cv2.drawContours(filled,contours,-1,255,cv2.FILLED)
    teal=(g-r>12)&(g-b<35)
    redground=(r>170)&(g<65)&(b<100)
    holes=(filled>0)&(m==0)&(~teal)&(~redground)
    m[holes]=255
    count,comp,stats,_=cv2.connectedComponentsWithStats(m)
    for i in range(1,count):
        if stats[i,cv2.CC_STAT_AREA]<12: m[comp==i]=0
    return np.asarray(Image.fromarray(m).filter(ImageFilter.GaussianBlur(.35)))

center_roi=box(560,235,1055,678)
lower=box(560,540,1055,678)
legs_roi=np.maximum.reduce([poly([(801,528),(842,549),(793,649),(749,649)]),poly([(834,529),(868,544),(944,651),(895,660)]),box(705,610,825,678),box(879,610,1005,678)])
center_roi[(lower>0)&(legs_roi==0)]=0
limbs=np.zeros((H,W),np.uint8)
for a,z,width in [((674,416),(751,478),21),((888,508),(973,510),17),((815,548),(777,641),18),((854,548),(915,642),18)]:
    cv2.line(limbs,a,z,255,width)
head_lens=ellipse(859,428,67,67)
reels=np.maximum(ellipse(843,304,67,61),ellipse(978,361,69,64))
scarf_roi=box(570,460,880,545)
scarfs=((r>165)&(g<125)&(b<125)&(scarf_roi>0)).astype(np.uint8)*255
director_solid=np.maximum.reduce([limbs,head_lens,reels,scarfs])
dark_limb=(r<110)&(g<100)&(b<135)&(r>=g-5)
director_solid=np.maximum.reduce([((limbs>0)&dark_limb).astype(np.uint8)*255,head_lens,reels,scarfs])
director=visible_mask(cream,center_roi,director_solid)

octopus_roi=box(148,436,840,864)
# No rectangular clipping: the right tentacle rises above y=720 at x>620.
board_roi=box(320,550,566,746)
hat=poly([(401,464),(406,441),(421,442),(438,455),(452,450),(458,430),(469,431),(478,463),(504,478),(521,499),(523,520),(510,532),(483,525),(451,512),(428,492)])
octocolor=purple|((cream)&(board_roi>0))
purple_near=cv2.dilate((purple&(octopus_roi>0)).astype(np.uint8),np.ones((25,25),np.uint8))
octocolor|=yellow&(purple_near>0)
octopus_alpha=visible_mask(octocolor,octopus_roi,hat)

bird_roi=box(1085,411,1443,849)
headphones_roi=box(1085,428,1200,582)
eyes_roi=box(1178,428,1248,510)
beak=box(1205,440,1435,574);legs=box(1175,705,1395,849)
leg_yellow=(r>185)&(g>100)&(g<230)&(b<140)
bird_color=green|((yellow)&(beak>0))|((leg_yellow)&(legs>0))|((purple)&(headphones_roi>0))|((cream)&(eyes_roi>0))
gear_dark=(r<100)&(g<105)&(b<145)
bird_solid=np.maximum.reduce([((gear>0)&gear_dark).astype(np.uint8)*255,((pole>0)&gear_dark).astype(np.uint8)*255,mic])
bird_alpha=visible_mask(bird_color,bird_roi,bird_solid)

# Thin limbs and shaded props are not separable by a skin-color threshold.
# Preserve registered, closed foreground silhouettes, refining only their edge.
# Every interior pixel remains the original source pixel (no generated repaint).
director_shapes = [
    ellipse(846,305,69,64),
    poly([(905,351),(916,329),(934,312),(954,302),(974,295),(993,298),(1011,307),(1027,322),(1037,344),(1040,365),(1035,387),(1024,407),(1007,421),(987,428),(968,429),(946,423),(927,412),(916,391),(905,370)]),
    poly([(798,352),(819,340),(843,334),(868,334),(888,336),(905,343),(920,353),(941,366),(950,385),(956,406),(964,430),(965,446),(960,464),(950,478),(935,488),(919,494),(902,491),(885,486),(860,476),(831,476),(808,470),(785,466),(759,457),(742,445),(733,432),(731,420),(733,408),(739,398),(748,389),(741,380),(739,368),(742,355),(750,346),(763,340),(775,338),(786,341)]),
    poly([(571,394),(571,384),(578,375),(591,370),(610,368),(633,370),(651,376),(635,355),(632,343),(638,336),(646,332),(655,333),(666,342),(674,358),(678,380),(686,388),(690,401),(697,408),(698,417),(691,426),(681,430),(668,428),(653,433),(640,433),(627,429),(619,424),(606,435),(592,443),(580,439),(575,432),(576,422),(585,413),(600,401),(584,403),(575,402)]),
    poly([(682,409),(701,425),(724,438),(748,450),(770,456),(792,461),(802,475),(779,479),(750,475),(727,466),(701,451),(683,437),(675,425)]),
    poly([(643,502),(653,489),(677,481),(706,481),(729,486),(755,486),(776,482),(792,470),(805,468),(818,476),(833,478),(849,479),(864,485),(866,493),(856,499),(842,501),(826,498),(814,490),(803,488),(790,498),(775,515),(758,525),(738,530),(720,526),(705,528),(693,534),(679,535),(666,529),(659,516),(650,508)]),
    poly([(801,498),(818,501),(845,502),(850,511),(858,522),(861,535),(855,547),(838,554),(819,555),(801,551),(788,546),(782,535),(783,523),(789,511),(796,507)]),
    poly([(851,487),(867,492),(886,501),(908,508),(932,511),(946,508),(950,525),(932,532),(909,531),(887,522),(868,512),(856,509)]),
    poly([(940,509),(944,498),(953,490),(964,486),(971,472),(979,462),(987,463),(993,469),(991,480),(984,492),(1001,491),(1021,494),(1035,500),(1038,508),(1033,515),(1019,518),(998,517),(1008,525),(1008,534),(1001,541),(991,544),(981,540),(975,533),(968,534),(958,530),(948,524)]),
    poly([(793,544),(820,548),(814,622),(790,632),(789,610)]),
    poly([(851,539),(869,546),(888,561),(907,581),(920,602),(924,620),(911,635),(895,628),(886,605),(874,581),(853,566),(842,558)]),
    poly([(712,666),(716,650),(725,636),(739,626),(755,620),(773,620),(794,626),(791,620),(803,615),(819,614),(834,620),(841,627),(838,634),(831,638),(838,646),(841,665),(840,670),(717,669)]),
    poly([(873,672),(876,650),(885,635),(900,626),(893,623),(892,615),(901,610),(916,611),(928,618),(938,618),(947,615),(960,619),(973,629),(980,643),(984,672)]),
]
director_region = np.maximum.reduce(director_shapes)

bird_shapes = [
    poly([(1150,453),(1164,444),(1179,435),(1192,430),(1204,429),(1214,433),(1227,436),(1237,451),(1240,464),(1239,478),(1231,488),(1226,500),(1218,514),(1205,538),(1201,550),(1207,568),(1222,582),(1237,595),(1250,613),(1256,630),(1244,646),(1230,643),(1223,625),(1217,610),(1205,594),(1189,581),(1174,573),(1164,568),(1151,564),(1136,556),(1125,537),(1128,516),(1131,493),(1138,474)]),
    poly([(1239,474),(1234,465),(1247,450),(1261,449),(1284,455),(1309,464),(1336,475),(1360,489),(1388,509),(1407,527),(1429,552),(1409,541),(1385,526),(1357,513),(1329,503),(1302,497),(1278,493),(1255,489),(1242,485),(1235,482)]),
    poly([(1124,455),(1146,441),(1165,437),(1183,436),(1185,429),(1162,433),(1140,437),(1123,447),(1112,456),(1101,468),(1088,476),(1076,489),(1070,505),(1075,518),(1069,529),(1068,547),(1072,562),(1084,576),(1100,584),(1116,581),(1124,587),(1141,591),(1151,585),(1162,575),(1170,558),(1173,538),(1168,514),(1158,499),(1145,490),(1127,487),(1121,490),(1117,479),(1119,467)]),
    poly([(1236,489),(1250,496),(1255,510),(1253,524),(1248,534),(1235,540),(1218,541),(1228,512)]),
    poly([(1193,639),(1212,635),(1230,638),(1257,645),(1283,664),(1299,692),(1306,714),(1303,735),(1287,750),(1269,756),(1258,757),(1246,769),(1237,772),(1236,764),(1221,780),(1214,782),(1211,776),(1216,760),(1200,776),(1193,777),(1189,772),(1199,757),(1181,768),(1171,768),(1168,763),(1179,752),(1167,753),(1155,749),(1150,741),(1150,724),(1163,697),(1178,666)]),
    poly([(1191,654),(1207,655),(1227,661),(1248,672),(1259,687),(1265,702),(1260,713),(1251,720),(1241,722),(1238,732),(1228,741),(1213,745),(1196,743),(1182,739),(1173,744),(1157,741),(1143,735),(1136,734),(1132,738),(1121,735),(1110,726),(1099,725),(1094,714),(1090,711),(1093,698),(1084,705),(1085,695),(1097,681),(1108,668),(1125,657),(1149,650),(1171,648)]),
    poly([(1253,575),(1261,568),(1274,565),(1286,566),(1296,572),(1308,580),(1317,593),(1324,610),(1326,626),(1333,636),(1337,650),(1335,658),(1327,665),(1312,664),(1306,656),(1299,650),(1290,648),(1286,637),(1277,629),(1262,627),(1250,621),(1245,611),(1253,604),(1246,602),(1246,592),(1257,588),(1250,585)]),
    poly([(1270,634),(1295,637),(1309,646),(1318,651),(1324,649),(1334,654),(1341,672),(1338,680),(1342,686),(1340,698),(1327,713),(1315,728),(1301,741),(1287,740),(1276,729),(1260,725),(1255,733),(1244,730),(1234,719),(1237,704),(1242,696),(1240,687),(1245,677),(1241,668),(1246,655),(1254,656),(1251,647),(1256,639)]),
    poly([(1279,754),(1294,749),(1296,798),(1302,808),(1300,823),(1291,825),(1287,820),(1277,829),(1262,825),(1252,829),(1247,826),(1255,822),(1267,820),(1266,814),(1273,812),(1280,815)]),
    poly([(1290,741),(1303,745),(1368,713),(1380,706),(1387,708),(1389,715),(1397,713),(1402,722),(1403,734),(1420,780),(1408,788),(1390,754),(1384,741),(1380,730),(1305,764),(1296,763),(1289,753)]),
]
bird_region = np.maximum.reduce(bird_shapes)

# Flood the original closed ink contours instead of retaining a polygon's
# background pixels. Polygon regions are only seed/ink bounds, never the alpha.
ink_edges=((r<65)&(g<65)&(b<85)).astype(np.uint8)
ink_edges=cv2.morphologyEx(ink_edges,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
region_count,region_labels,region_stats,_=cv2.connectedComponentsWithStats(1-ink_edges,4)

def outlined_actor(seed, region, props=None, points=()):
    counts=np.bincount(region_labels[seed],minlength=region_count)
    areas=region_stats[:,cv2.CC_STAT_AREA]
    chosen=(counts>2)&(counts/np.maximum(1,areas)>.2)&(areas<35000)
    if props is not None:
        inside=np.bincount(region_labels[props>0],minlength=region_count)
        chosen|=(inside/np.maximum(1,areas)>.92)&(areas<35000)&(areas>1)
    for x,y in points:
        label=region_labels[y,x]
        if label and areas[label]<35000: chosen[label]=True
    chosen[0]=False
    selected=chosen[region_labels].astype(np.uint8)*255
    near=cv2.dilate(selected,np.ones((7,7),np.uint8))
    ink_color=((r>=g-8)|(np.maximum.reduce([r,g,b])<45))
    outlines=((ink_edges>0)&(near>0)).astype(np.uint8)*255
    links=((ink_edges>0)&ink_color&(region>0)).astype(np.uint8)*255
    result=np.maximum.reduce([selected,outlines,links])
    contours,_=cv2.findContours(result,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    closed=np.zeros_like(result);cv2.drawContours(closed,contours,-1,255,cv2.FILLED)
    # Restore enclosed black pupils/prop shadows, preserving scenic gaps.
    shadow=(np.maximum.reduce([r,g,b])<90)&((r>=g-8)|(np.maximum.reduce([r,g,b])<45))
    result[(closed>0)&shadow]=255
    return np.asarray(Image.fromarray(result).filter(ImageFilter.GaussianBlur(.35)))

scarf_red=(r>150)&(g<100)&(b<100)&(scarf_roi>0)
director_seed=(cream|scarf_red)&(cv2.erode(director_region,np.ones((3,3),np.uint8))>0)
director_props=np.maximum.reduce([ellipse(846,305,71,66),ellipse(976,362,71,68),ellipse(885,395,71,71)])
director=outlined_actor(director_seed,director_region,director_props)

phone=(purple)&(box(1090,420,1200,596)>0)
white_eye=cream&(box(1170,425,1255,511)>0)
gold=(r>185)&(g>145)&(b<125)
gold_parts=gold&((box(1180,410,1450,563)>0)|(box(1250,725,1430,845)>0))
blue_gear=(b>g+4)&(g>r+8)&(box(1240,635,1400,758)>0)
bird_seed=phone|white_eye|gold_parts|blue_gear
bird_alpha=outlined_actor(bird_seed,bird_region,points=[(1200,525),(1240,590),(1300,590),(1190,681),(1220,750),(1260,650),(1260,730)])
# The dark case paint merges with the ink barrier. Keep its registered front
# face solid, with edge-only refinement, instead of deleting blue/grey paint.
case_face=poly([(1330,651),(1368,689),(1329,736),(1281,696)])
case_grip=poly([(1287,680),(1297,688),(1302,706),(1300,716),(1290,722),(1287,733),(1278,734),(1270,723),(1276,710),(1276,697),(1280,686)])
case_back=poly([(1315,718),(1344,715),(1347,728),(1334,739),(1321,744),(1315,740)])
bird_alpha=np.maximum(bird_alpha,refine(np.maximum.reduce([case_face,case_grip,case_back]),[]))
# Recover the actual boom and cable from source ink, with no fake neck underlay.
boom_roi=poly([(1128,817),(1152,831),(1393,411),(1380,396)])
ink=(r<110)&(g<105)&(b<140)&(b>g-25)
boom_ink=((boom_roi>0)&ink).astype(np.uint8)*255
cord=np.zeros((H,W),np.uint8)
cv2.polylines(cord,[np.array([(1151,586),(1158,603),(1154,624),(1145,642),(1125,659),(1097,676),(1081,692),(1075,707),(1084,719),(1103,720),(1122,715)],np.int32)],False,255,10)
cord_ink=((cord>0)&ink).astype(np.uint8)*255
fur_color=((r<254)&(g<225)&(b<190)&(r-g<100)&(b>30))|((r<90)&(g<90)&(b<120))
fur=((mic>0)&fur_color).astype(np.uint8)*255
fur=cv2.morphologyEx(fur,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
bird_alpha=np.maximum.reduce([bird_alpha,boom_ink,cord_ink,fur])
coupling_ink=((box(1350,340,1430,440)>0)&(r<110)&(g<100)&(b<135)).astype(np.uint8)*255
bird_alpha=np.maximum(bird_alpha,coupling_ink)
# Keep the connected actors/props, dropping unrelated lamp/window fragments.
count,components,component_stats,_=cv2.connectedComponentsWithStats((bird_alpha>100).astype(np.uint8))
keep={components[y,x] for x,y in [(1200,525),(1300,590),(1190,681),(1220,750),(1330,690),(1500,360)]}
keep.discard(0)
bird_alpha[~np.isin(components,list(keep))]=0
parts={'director':director,'octopus':octopus_alpha,'bird':bird_alpha}
balloons=[ellipse(1143,125,43,44),ellipse(1116,211,37,37),ellipse(1216,164,41,40)]
for i,m in enumerate(balloons): parts[f'balloon-{i+1}']=refine(m,[])

# Main foreground cloud is a connected pink component touching the bottom.
pink=((rgb[:,:,0]>175)&(rgb[:,:,0].astype(int)-rgb[:,:,1]>38)&
      (rgb[:,:,2].astype(int)-rgb[:,:,1]>15)&(rgb[:,:,2]>120)).astype(np.uint8)
pink[:int(H*.65)]=0
pink=cv2.morphologyEx(pink,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
n, labels, stats,_=cv2.connectedComponentsWithStats(pink)
cloud=np.zeros((H,W),np.uint8)
for index in range(1,n):
    if stats[index,cv2.CC_STAT_AREA]>W*10 and np.any(labels[-3:]==index): cloud[labels==index]=255
cloud=cv2.dilate(cloud,np.ones((3,3),np.uint8))
parts['clouds']=np.asarray(Image.fromarray(cloud).filter(ImageFilter.GaussianBlur(.35)))

def save_layer(name,alpha):
    rgba=np.dstack([rgb,alpha])
    rgba[alpha==0,:3]=0
    im=Image.fromarray(rgba,'RGBA')
    im.save(OUT/f'{name}.png')
    im.save(OUT/f'{name}.webp',lossless=True)

for name,alpha in parts.items(): save_layer(name,alpha)
removed=np.maximum.reduce(list(parts.values()))
# Erase the old ropes, keeping new strings fully independent of the base.
for points in [[(1145,177),(1152,211),(1186,250)],[(1111,246),(1149,266),(1185,299)],[(1220,205),(1246,246),(1250,270)]]:
    cv2.polylines(removed,[np.array(points,np.int32)],False,255,7)
repair=cv2.dilate(removed,np.ones((11,11),np.uint8))
background=cv2.inpaint(bgr,repair,5,cv2.INPAINT_TELEA)
base=Image.fromarray(cv2.cvtColor(background,cv2.COLOR_BGR2RGB))
base.save(OUT/'background.webp',quality=94)
base.save(OUT/'background.png')

# Rebuild at exact registration, and a visual contact sheet for mask inspection.
rebuild=base.convert('RGBA')
for name in ['balloon-1','balloon-2','balloon-3','director','octopus','bird','clouds']:
    rebuild.alpha_composite(Image.open(OUT/f'{name}.png'))
rebuild.save(OUT/'rebuild.png')
contact=Image.new('RGB',(900,4*220),'#eeeeee')
names=['background',*parts.keys()]
for i,name in enumerate(names):
    im=Image.open(OUT/f'{name}.png').convert('RGBA'); im.thumbnail((440,200))
    tile=Image.new('RGBA',(450,220),'#ccccdd')
    tile.alpha_composite(im,((450-im.width)//2,20))
    ImageDraw.Draw(tile).text((10,3),name,fill='#171717')
    contact.paste(tile.convert('RGB'),((i%2)*450,(i//2)*220))
contact.save(OUT/'contact-sheet.jpg',quality=90)
manifest={'source':'/home-ai/hero-v5.png','width':W,'height':H,'method':'registered palette/contour masks + dark-outline recovery; local background repair for QA only; runtime scenery is code-painted',
 'layers':list(parts),'anchors':{'director':[835,515],'octopus':[360,665],'bird':[1260,660]},
 'backgroundRepair':'Occluded background is approximated for small animation movements; no original hidden layers are claimed.'}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'dimensions':[W,H],'layers':list(parts),'output':str(OUT)},ensure_ascii=False))
