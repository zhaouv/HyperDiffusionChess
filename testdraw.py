import matplotlib.pyplot as plt
import json
fig, ax = plt.subplots(figsize=(11, 11))
with open('./Heptagonal.json') as fid:
    robj=json.load(fid)

for ii in range(robj['length']):
    x1,y1=robj['center'][ii]
    plt.scatter(x1, y1, s=(1-x1**2-y1**2)**2 * 20000, marker='o', c='#ddd')

for ii in range(robj['length']):
    x1,y1=robj['center'][ii]
    for jj in robj['link'][ii]:
        if ii<jj:
            x2,y2=robj['center'][jj]
            plt.plot([x1,x2],[y1,y2])

plt.show()