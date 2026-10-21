import json, sys, pandas as pd, numpy as np
from scipy.spatial import cKDTree
G='data/processed/gold_fabric/'; OUT=sys.argv[1]
c=pd.read_parquet(G+'carreaux.parquet'); o=pd.read_parquet(G+'offre_existante.parquet'); r=pd.read_parquet(G+'recommandations.parquet')
g=r[(r.perimetre=='citiz')&(r.budget_scenario==1000000)].sort_values('rang')
cc=c.set_index('id_carreau').loc[g.id_candidat.str.replace('citiz_','')]
d=cKDTree(cc[['x','y']].to_numpy()).query(c[['x','y']].to_numpy())[0]
c['nouveau']=(d<=400)&(~c.couvert_citiz)
X0,X1,Y0,Y1=3466700,3497500,2462500,2494700
W=X1-X0; H=Y1-Y0
def sx(x): return x-X0
def sy(y): return Y1-y
NAMES={'33063':'Bordeaux','33281':'Mérignac','33318':'Pessac','33522':'Talence','33039':'Bègles','33249':'Lormont','33119':'Cenon','33069':'Le Bouscat','33550':"Villenave-d'Ornon",'33056':'Blanquefort','33449':'Saint-Médard-en-Jalles','33167':'Floirac','33162':'Eysines','33075':'Bruges','33003':'Ambarès-et-Lagrave'}
pos={}
for k in NAMES:
    s=c[(c.code_commune==k)&(~c.donnee_masquee)]
    pos[k]=(np.average(s.x,weights=s.population),np.average(s.y,weights=s.population))
pos['33063']=(pos['33063'][0]-600,pos['33063'][1]+300)
def rects(df,fill,op=1):
    return f'<g fill="{fill}" opacity="{op}">'+''.join(f'<rect x="{sx(x)-90:.0f}" y="{sy(y)-90:.0f}" width="180" height="180"/>' for x,y in zip(df.x,df.y))+'</g>'
def labels(keys,color,size=620,halo='#f5f8f8'):
    return ''.join(f'<text x="{sx(pos[k][0]):.0f}" y="{sy(pos[k][1]):.0f}" text-anchor="middle" font-family="Fira Sans" font-weight="600" font-size="{size}" fill="{color}" stroke="{halo}" stroke-width="{size*0.28:.0f}" paint-order="stroke" stroke-linejoin="round">{NAMES[k]}</text>' for k in keys)
def page(svg,w):
    return f'<html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@500;600;700;800&display=swap"></head><body style="margin:0;background:transparent"><svg id="m" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{w}" height="{w*H/W:.0f}">{svg}</svg></body></html>'
cit=o[o.type=='citiz']
lab_main=['33063','33281','33318','33522','33039','33249','33119','33069','33056','33449','33162','33550']
# 1 contexte
s=rects(c,'#cfdcdc')+rects(c[c.couvert_citiz],'#9fdcdc')
s+=''.join(f'<circle cx="{sx(x):.0f}" cy="{sy(y):.0f}" r="210" fill="#11686c" stroke="#f5f8f8" stroke-width="70"/>' for x,y in zip(cit.x,cit.y))
s+=labels(lab_main,'#3d4848')
open(OUT+'/contexte.html','w').write(page(s,1400))
# 2 probleme (fond sombre)
s=rects(c[~c.couvert_citiz],'#ff8a7a',0.9)+rects(c[c.couvert_citiz],'#82d4d5')
s+=labels(['33063','33281','33318','33249','33449','33056'],'#f5f8f8',size=640,halo='#0d4c4f')
open(OUT+'/probleme.html','w').write(page(s,1400))
# 3 reco
s=rects(c,'#d5e0e0')+rects(c[c.couvert_citiz],'#a9dede')+rects(c[c.nouveau],'#2fac66')
pos2=dict(pos); pos['33063']=(pos['33063'][0]+300,pos['33063'][1]-1700)
s+=labels(['33063','33281','33318','33522','33039','33550','33162','33449','33056'],'#4a5656',size=560)
pos=pos2
for (_,row),(x,y) in zip(g.iterrows(),zip(cc.x,cc.y)):
    s+=f'<circle cx="{sx(x):.0f}" cy="{sy(y):.0f}" r="170" fill="#202020" stroke="#ffffff" stroke-width="60"/>'
for rk,(x,y),name,dx,dy in [(1,(cc.x.iloc[0],cc.y.iloc[0]),'Lormont',700,-250),(2,(cc.x.iloc[1],cc.y.iloc[1]),'Le Bouscat',-700,-400),(3,(cc.x.iloc[2],cc.y.iloc[2]),'Cenon',700,450)]:
    anchor='start' if dx>0 else 'end'
    s+=f'<circle cx="{sx(x):.0f}" cy="{sy(y):.0f}" r="520" fill="#202020" stroke="#ffffff" stroke-width="90"/><text x="{sx(x):.0f}" y="{sy(y)+230:.0f}" text-anchor="middle" font-family="Fira Sans" font-weight="800" font-size="640" fill="#ffffff">{rk}</text>'
    s+=f'<text x="{sx(x)+dx:.0f}" y="{sy(y)+dy+230:.0f}" text-anchor="{anchor}" font-family="Fira Sans" font-weight="700" font-size="680" fill="#202020" stroke="#f5f8f8" stroke-width="200" paint-order="stroke" stroke-linejoin="round">{name}</text>'
open(OUT+'/reco.html','w').write(page(s,1400))
# 4 garde : couverture + nouvelles stations, sans texte
s=rects(c,'#dbe4e4')+rects(c[c.couvert_citiz],'#32b4b5')+rects(c[c.nouveau],'#2fac66')
s+=''.join(f'<circle cx="{sx(x):.0f}" cy="{sy(y):.0f}" r="200" fill="#202020" stroke="#ffffff" stroke-width="70"/>' for x,y in zip(cc.x,cc.y))
open(OUT+'/garde.html','w').write(page(s,1600))
print('covered',c.couvert_citiz.sum(),'new',c.nouveau.sum(), 'ratio', W/H)

# 5 courbe budget
B=[(100,10122),(250,31275),(500,57606),(1000,106860)]
w,h=1200,520; L,R,T,Bt=40,60,70,70
X=lambda b: L+(b/1000)*(w-L-R); Y=lambda v: h-Bt-(v/120000)*(h-T-Bt)
svg=f'<line x1="{L}" y1="{h-Bt}" x2="{w-R}" y2="{h-Bt}" stroke="#c9d6d6" stroke-width="3"/>'
pts=' '.join(f'{X(b):.0f},{Y(v):.0f}' for b,v in [(0,0)]+B)
svg+=f'<polyline points="{pts}" fill="none" stroke="#11686c" stroke-width="7" stroke-linejoin="round"/>'
for b,v in B:
    col='#1d7a47' if b==1000 else '#11686c'
    svg+=f'<circle cx="{X(b):.0f}" cy="{Y(v):.0f}" r="13" fill="{col}" stroke="#f5f8f8" stroke-width="5"/>'
    svg+=f'<text x="{X(b):.0f}" y="{Y(v)-30:.0f}" text-anchor="middle" font-family="Fira Sans" font-weight="700" font-size="40" fill="{col}">+{round(v/1000)} k</text>'
    lab='1 M€' if b==1000 else f'{b} k€'
    svg+=f'<text x="{X(b):.0f}" y="{h-Bt+52:.0f}" text-anchor="middle" font-family="Fira Sans" font-weight="500" font-size="36" fill="#5d6767">{lab}</text>'
open(OUT+'/courbe.html','w').write(f'<html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@500;700&display=swap"></head><body style="margin:0;background:transparent"><svg id="m" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{svg}</svg></body></html>')
