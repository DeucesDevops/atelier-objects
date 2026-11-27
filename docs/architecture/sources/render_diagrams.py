#!/usr/bin/env python3
"""Render the documentation diagrams as SVG and PNG. Requires Python 3 + Pillow.

Run from any directory: python3 docs/architecture/sources/render_diagrams.py
SVG is editable vector artwork. Geometry and text share one source for both formats.
"""
from pathlib import Path
from html import escape
import math
import os
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1]
W, H = 1800, 1200
BG, PANEL, LINE = '#08111f', '#111f33', '#334761'
WHITE, MUTED = '#f1f5f9', '#a7b8ce'
CYAN, PURPLE, AMBER, GREEN = '#71d6ff', '#b79bff', '#ffcc6b', '#7ee3bb'


def font(size, bold=False):
    candidates = [os.getenv('DIAGRAM_FONT_BOLD' if bold else 'DIAGRAM_FONT', ''),
                  '/System/Library/Fonts/Supplemental/Arial Bold.ttf' if bold else '/System/Library/Fonts/Supplemental/Arial.ttf',
                  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']
    for p in candidates:
        if p and Path(p).exists():
            return ImageFont.truetype(p, size)
    raise RuntimeError('Install DejaVu Sans or set DIAGRAM_FONT and DIAGRAM_FONT_BOLD.')


class Diagram:
    def __init__(self, filename, title, subtitle, status):
        self.filename = filename
        self.img = Image.new('RGB', (W, H), BG)
        self.draw = ImageDraw.Draw(self.img)
        self.svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc">',
                    f'<title id="title">{escape(title)}</title>', f'<desc id="desc">{escape(subtitle)}. {escape(status)}</desc>',
                    f'<rect width="{W}" height="{H}" fill="{BG}"/>']
        self.rect(56, 42, 6, 92, CYAN, CYAN, 0)
        self.text(82, 44, 'ATELIER OBJECTS  /  COMMERCE PLATFORM', 16, CYAN, True)
        self.text(80, 76, title, 40, WHITE, True)
        self.text(80, 132, subtitle, 20, MUTED)
        self.line([(60, 1108), (1740, 1108)], LINE, arrow=False)
        self.text(70, 1130, status, 18, MUTED)
        self.text(70, 1160, '16 OCT 2026  |  Solid: request / data   Dashed: event / control   |  Details: docs/architecture/README.md', 16, MUTED)

    def text(self, x, y, value, size=22, color=WHITE, bold=False):
        assert 0 <= x < W and 0 <= y < H, (self.filename, value)
        measured = self.draw.textbbox((0, 0), value, font=font(size, bold))
        assert x + measured[2] <= W - 30, (self.filename, value, measured)
        self.draw.text((x, y), value, font=font(size, bold), fill=color, anchor='lt')
        self.svg.append(f'<text x="{x}" y="{y}" dominant-baseline="text-before-edge" font-family="Arial,DejaVu Sans,sans-serif" font-size="{size}" font-weight="{700 if bold else 400}" fill="{color}">{escape(value)}</text>')

    def rect(self, x, y, w, h, fill=PANEL, stroke=LINE, radius=14):
        self.draw.rounded_rectangle((x, y, x+w, y+h), radius=radius, fill=fill, outline=stroke, width=2)
        self.svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>')

    def group(self, x, y, w, h, label, color=LINE):
        self.rect(x, y, w, h, '#0c1829', color, 18)
        self.text(x+22, y+18, label, 19, MUTED, True)

    def card(self, x, y, w, h, title, lines=(), color=CYAN, size=25):
        assert self.draw.textlength(title, font=font(size, True)) < w-48, (self.filename, title, 'title width')
        self.rect(x, y, w, h, PANEL, color)
        self.rect(x+15, y+19, 4, 26, color, color, 1)
        self.text(x+30, y+20, title, size, WHITE, True)
        for n, line in enumerate(lines):
            assert y+58+n*28+22 < y+h, (self.filename, title, line, 'height')
            assert self.draw.textlength(line, font=font(20)) < w-48, (self.filename, title, line, 'width')
            self.text(x+25, y+58+n*28, line, 20, MUTED)

    def line(self, points, color=CYAN, dashed=False, arrow=True):
        self.svg.append(f'<polyline points="{" ".join(f"{x},{y}" for x,y in points)}" fill="none" stroke="{color}" stroke-width="3" stroke-linejoin="round"'+(' stroke-dasharray="10 8"' if dashed else '')+'/>')
        for a, b in zip(points, points[1:]):
            if not dashed:
                self.draw.line((a,b), fill=color, width=3)
            else:
                dx,dy=b[0]-a[0],b[1]-a[1]
                length=math.hypot(dx,dy)
                for t in range(0, int(length), 18):
                    end=min(t+10,length)
                    self.draw.line(((a[0]+dx*t/length,a[1]+dy*t/length),(a[0]+dx*end/length,a[1]+dy*end/length)),fill=color,width=3)
        if arrow:
            a,b=points[-2:]; angle=math.atan2(b[1]-a[1],b[0]-a[0])
            p=[b]+[(b[0]-13*math.cos(angle+t),b[1]-13*math.sin(angle+t)) for t in (-.45,.45)]
            self.draw.polygon(p,fill=color)
            self.svg.append(f'<polygon points="{" ".join(f"{x:.1f},{y:.1f}" for x,y in p)}" fill="{color}"/>')

    def save(self):
        (OUT/f'{self.filename}.svg').write_text('\n'.join(self.svg+['</svg>'])+'\n')
        self.img.save(OUT/f'{self.filename}.png', optimize=True)
        print(f'{self.filename}: SVG + PNG')


def docker():
    d=Diagram('01-docker-architecture','Local Docker architecture','Nine application containers + six PostgreSQL containers + Redis + Redpanda = 17 services',
              'CURRENT CONFIGURATION  |  Based on compose.yml and source; runtime was not retested for this documentation task.')
    d.card(70,200,300,120,'Shopper browser',['UI: localhost:5173','API: localhost:8080'])
    d.card(565,200,420,120,'web-app',['React build served by Nginx','Host :5173 → container :8080'])
    d.card(1210,200,510,120,'api-gateway',['NestJS :8080','Routes all seven domain APIs'])
    d.line([(370,240),(565,240)])
    d.text(408,209,'HTML / JS',18,CYAN)
    d.line([(220,320),(220,365),(1465,365),(1465,320)])
    d.text(585,337,'Browser fetches API directly; Nginx currently has no /api proxy',19,CYAN)
    d.group(45,405,1710,285,'APPLICATION NETWORK  /  Gateway routes by /api/{service}')
    d.line([(1650,320),(1650,462),(180,462)],arrow=False)
    services=[('Auth',':3001 / NestJS'),('Catalog',':3002 / NestJS'),('Orders',':3003 / NestJS'),('Inventory',':3004 / NestJS'),('Payment',':8085 / Java'),('Notification',':8001 / Python'),('Analytics',':8002 / Python')]
    for i,(name,stack) in enumerate(services):
        x=70+i*240
        d.line([(x+110,462),(x+110,505)])
        d.card(x,505,220,135,name,[stack,'GET /health'],size=23)
    d.group(45,725,1710,270,'BACKING SERVICES  /  Shared Compose network; service-specific connection URLs')
    d.card(70,785,900,155,'Six isolated PostgreSQL databases',['auth • catalog • inventory • orders • payments • analytics','Six named volumes; host ports 5433–5438 bind to 127.0.0.1','Each container listens on :5432'],GREEN)
    d.card(1000,785,300,155,'Redis :6379',['Auth session hints','Catalog cache','No named volume'],GREEN)
    d.card(1330,785,390,155,'Redpanda :9092',['Topic: commerce.domain-events','Host Kafka port :19092','No persistent volume in Compose'],AMBER,size=24)
    d.text(70,1025,'Compose publishes domain-service ports, Redis and Kafka on host interfaces; this is a local demo configuration.',21,AMBER)
    d.text(70,1060,'Persistent today: PostgreSQL only. Notification delivery history is memory-only.',20,MUTED)
    d.save()


def checkout():
    d=Diagram('04-checkout-and-events','Checkout, compensation and domain events','Synchronous checkout coordinates independent databases; asynchronous consumers build notifications and analytics',
              'CURRENT APPLICATION FLOW  |  Publishing is best effort; this design does not provide atomic database + event commits.')
    cards=[(70,'1 · Create order',['Gateway → Orders','Save PENDING to orders DB']),
           (500,'2 · Reserve stock',['Orders → Inventory','Transactional reservation']),
           (930,'3 · Simulated payment',['Orders → Payment','Authorize, then capture']),
           (1360,'4 · Confirm order',['Orders saves CONFIRMED','Return to shopper'])]
    for x,title,lines in cards:
        d.card(x,220,370,140,title,lines,size=24)
    for x in (440,870,1300):
        d.line([(x,290),(x+60,290)])
    d.card(70,425,800,165,'Failure path · tested scenario to demonstrate',['Payment method "decline" → order marked FAILED','Orders attempts inventory release and emits order.failed','Failure compensation is best effort; reconciliation is a future task'],AMBER,size=26)
    d.card(920,425,800,165,'Cancellation path',['Request refund if paymentId exists; attempt stock release','Save CANCELLED and emit order.cancelled','Payment and order writes are not one distributed transaction'],AMBER,size=26)
    d.group(45,645,1710,415,'ASYNCHRONOUS PATH  /  One Kafka-compatible topic; independent consumer groups')
    d.card(70,710,780,120,'Producers: Catalog, Inventory, Orders, Payment',['Plus Notification publishes notification.sent','Event envelope: id, type, source, occurredAt, data'],AMBER,size=23)
    d.card(1020,710,700,120,'Redpanda / commerce.domain-events',['Consumer groups: notification-service + analytics-service','Local Compose broker has no persistent volume'],AMBER,size=24)
    d.line([(850,770),(1020,770)],AMBER,True)
    d.card(70,910,780,115,'Notification :8001',['Simulated deliveries in process memory; can duplicate on replay'],PURPLE,size=25)
    d.card(1020,910,700,115,'Analytics :8002 → analytics database',['Event IDs deduplicate saved rows'],GREEN,size=25)
    d.line([(1240,830),(1240,870),(460,870),(460,910)],AMBER,True)
    d.line([(1450,830),(1450,910)],AMBER,True)
    d.save()


if __name__ == '__main__':
    for render in (docker, checkout):
        render()
