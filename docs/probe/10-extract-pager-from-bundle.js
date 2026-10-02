import re, io

js = io.open('ponpon_main.js', encoding='utf-8', errors='replace').read()

i = js.find('class IQ')
print("class IQ at", i)
depth = 0
j = i
while j < len(js):
    if js[j] == '{':
        depth += 1
    elif js[j] == '}':
        depth -= 1
        if depth == 0 and j > i + 10:
            break
    j += 1
cls = js[i:j + 1]
print("LEN", len(cls))
print(cls)
print()
print("=" * 70)
print("=== Ne 帮助函数（边界回弹用） ===")
for m in re.finditer(r'function Ne\(', js):
    k = m.start()
    d = 0; p = k
    while p < len(js):
        if js[p] == '{': d += 1
        elif js[p] == '}':
            d -= 1
            if d == 0 and p > k + 5: break
        p += 1
    print(js[k:p + 1])
    print('---')

print()
print("=" * 70)
print("=== velocityTracker 类 al ===")
k = js.find('class al')
print("at", k)
if k > 0:
    d = 0; p = k
    while p < len(js):
        if js[p] == '{': d += 1
        elif js[p] == '}':
            d -= 1
            if d == 0 and p > k + 5: break
        p += 1
    print(js[k:p + 1])
