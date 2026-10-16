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
    d.text(70,1060,'Persistent today: PostgreSQL only. Notification delivery history is memory-only. Event and recovery paths are shown separately.',20,MUTED)
    d.save()


def aws():
    d=Diagram('02-aws-architecture','AWS architecture · kOps on EC2','Proposed learning environment: two AZs for the network; one control-plane node; no high-availability claim',
              'PROPOSED TARGET  |  Terraform owns AWS resources; cloud infrastructure is not deployed by this documentation.')
    d.card(600,195,700,110,'Shopper + Route 53',['DNS resolves the application domain; browser sends HTTPS'])
    d.card(70,195,460,120,'Supporting AWS resources',['ECR / Secrets Manager / IAM + OIDC','State stores + etcd backups'],PURPLE)
    d.group(45,345,1710,730,'VPC  /  Public subnets across AZ A + AZ B; private compute + isolated data subnets')
    d.card(600,405,700,110,'Public ALB + ACM',['HTTPS :443  |  /api and /api/* → gateway  |  /* → web'],AMBER)
    d.card(1350,405,370,110,'Public egress',['NAT Gateway + IGW','Outbound private-node access'],AMBER)
    d.line([(950,305),(950,405)])
    d.card(75,600,390,140,'Private control plane',['kOps-managed EC2 + etcd','One node in AZ A for learning','Restricted Kubernetes API access'],PURPLE)
    d.card(535,600,1185,140,'Private workers · EC2 instance groups across AZ A + AZ B',['web + gateway + seven domain services; Redpanda StatefulSet → EBS PVC','Application ALB sends HTTP to worker NodePort targets','NAT provides outbound access; workers pull application images from ECR'])
    d.line([(950,515),(950,600)])
    d.text(970,550,'HTTP to worker targets',17,CYAN)
    d.line([(465,670),(535,670)],PURPLE,True)
    d.line([(1550,600),(1550,515)],AMBER)
    d.line([(865,740),(865,800),(480,800),(480,855)],GREEN)
    d.line([(865,800),(1260,800),(1260,855)],GREEN)
    d.text(885,765,'Application data connections',20,GREEN)
    d.card(75,855,950,165,'Private RDS PostgreSQL',['One instance; six logical databases and separate service users','Backups + restore rehearsal; single-instance learning baseline','Subnet group spans AZs; the instance is not automatically Multi-AZ'],GREEN)
    d.card(1080,855,640,165,'Private ElastiCache Redis',['Auth hints + catalog cache; single-node learning baseline','TLS/auth client setup must be implemented and tested','Separate secrets and data for each environment'],GREEN)
    d.save()


def kubernetes():
    d=Diagram('03-kubernetes-cluster','Kubernetes cluster · kOps','One application Helm chart; private EC2 workers; external PostgreSQL and Redis; in-cluster Redpanda',
              'PROPOSED TARGET  |  Single control plane and single broker are deliberate learning limitations.')
    d.card(70,195,430,145,'Restricted management API',['CI runner: network access + RBAC','kOps definitions → generated .tf','Terraform apply → cluster resources'],PURPLE,size=24)
    d.card(650,195,1070,130,'Terraform ALB + target groups → TargetGroupBinding',['/* → web NodePort Service → web pods :8080','/api and /api/* → gateway NodePort Service → gateway pods :8080'],AMBER,size=24)
    d.group(45,365,1710,415,'NAMESPACE PER ENVIRONMENT  /  commerce-dev and commerce-prod; namespace isolation is not a separate cluster')
    d.card(70,425,380,125,'web + gateway',['React / Nginx + NestJS','Helm Deployments + Services'])
    d.card(500,425,720,125,'Seven domain Deployments + ClusterIP Services',['auth :3001  •  catalog :3002  •  orders :3003  •  inventory :3004','payment :8085  •  notification :8001  •  analytics :8002'],size=24)
    d.line([(450,490),(500,490)])
    d.line([(1650,325),(1650,408),(270,408),(270,425)],AMBER)
    d.card(1270,425,450,125,'Redpanda StatefulSet',['Internal Kafka Service :9092','One broker + EBS gp3 PVC'],AMBER,size=24)
    d.line([(1220,490),(1270,490)],AMBER,True)
    d.line([(1270,520),(1220,520)],AMBER,True)
    d.card(70,615,530,115,'External Secrets Operator',['Secrets Manager → Kubernetes Secrets','Service identity uses OIDC / IAM'],PURPLE,size=24)
    d.card(650,615,570,115,'ConfigMaps + secret references',['Per-service URLs and runtime environment','No database, JWT or broker secret in values'],PURPLE,size=24)
    d.card(1270,615,450,115,'Platform addons',['Load Balancer Controller + EBS CSI','Metrics / logs collectors'],PURPLE,size=24)
    d.line([(600,672),(650,672)],PURPLE,True)
    d.line([(850,615),(850,550)],PURPLE,True)
    d.card(70,865,780,165,'External RDS + ElastiCache',['Six PostgreSQL databases; access limited by service credentials','Redis used by Auth and Catalog only','No PostgreSQL StatefulSets in this target'],GREEN,size=25)
    d.card(910,865,810,165,'Probes, lifecycle and placement',['Current /health is a basic process check; add dependency readiness','Allow startup time; implement and test graceful shutdown','EBS broker volume is AZ-bound; replacement capacity must exist there'],GREEN,size=25)
    d.line([(850,780),(850,820),(460,820),(460,865)],GREEN)
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
    d.card(1020,910,700,115,'Analytics :8002 → analytics database',['Event IDs deduplicate saved rows; rebuild depends on retained events'],GREEN,size=25)
    d.line([(1240,830),(1240,870),(460,870),(460,910)],AMBER,True)
    d.line([(1450,830),(1450,910)],AMBER,True)
    d.save()


def delivery():
    d=Diagram('05-delivery-pipeline','Build, publish and deploy','Current Docker workflow and proposed Kubernetes workflow are shown as separate paths',
              'CURRENT + PROPOSED  |  Workflow files exist; no successful remote pipeline or cloud deployment was verified in this task.')
    d.group(45,200,1710,300,'CURRENT REPOSITORY  /  GitHub Actions; Jenkins provides an alternative validation + EC2 path')
    for x,title,lines in [(70,'Source + tests',['Node / Java / Python','Compose + script validation']),
                          (500,'Build + Compose smoke',['Nine application images','Seed + checkout demo']),
                          (930,'Docker Hub publishing',['GitHub Actions on main','Commit SHA + latest tags']),
                          (1360,'EC2 Compose option',['Existing SSH deployment path','Enablement / secrets required'])]:
        d.card(x,270,370,155,title,lines,size=23)
    for x in (440,870,1300): d.line([(x,345),(x+60,345)])
    d.group(45,545,1710,300,'PROPOSED KOPS DELIVERY  /  One verified release manifest contains all nine ECR image digests')
    for x,title,lines in [(70,'Required gates',['Tests + build + scans','Disposable integration stack']),
                          (500,'ECR immutable release',['Build once; record digests','Verify images on AWS CPU']),
                          (930,'Helm development',['Consume Terraform outputs','Rollout + checkout smoke']),
                          (1360,'Promote / roll back',['Same digests in next env','Previous Helm revision'])]:
        d.card(x,615,370,155,title,lines,PURPLE,size=23)
    for x in (440,870,1300): d.line([(x,690),(x+60,690)],PURPLE)
    d.card(70,915,1000,130,'Infrastructure lifecycle · separate from application release',['Terraform foundation → kOps YAML → generated Terraform → apply → validate cluster','ALB, DNS, RDS, Redis, state, IAM and runner access are infrastructure outputs'],GREEN,size=25)
    d.card(1120,915,600,130,'Readiness before automation',['Relative frontend API base + ALB /api routes','Secrets, migrations, probes and broker persistence'],AMBER,size=24)
    d.save()


def operations():
    d=Diagram('06-runtime-and-recovery','Runtime configuration, visibility and recovery','Plan secret delivery, operational signals and restoration separately for each stateful component',
              'PROPOSED OPERATIONS  |  Current code has basic /health endpoints; full metrics, readiness and restore evidence remain work.')
    d.group(45,200,1710,245,'RUNTIME SECRET DELIVERY  /  Values arrive when processes start, never through image build arguments')
    d.card(70,265,460,120,'AWS Secrets Manager',['Terraform creates secret resources','Values stored outside tracked files'],PURPLE,size=25)
    d.card(655,265,490,120,'External Secrets Operator',['OIDC / IAM identity reads scoped paths','Synchronizes Kubernetes Secrets'],PURPLE,size=25)
    d.card(1270,265,450,120,'Application pods',['DATABASE_URL / JWT_SECRET / Redis','Restart after secret refresh'],PURPLE,size=25)
    d.line([(530,325),(655,325)],PURPLE,True)
    d.line([(1145,325),(1270,325)],PURPLE,True)
    d.group(45,490,1710,245,'VISIBILITY  /  Planned collection; emitting logs is not the same as retaining and querying them')
    d.card(70,555,460,120,'Services + infrastructure',['Add metrics / dependency readiness','Instrument HTTP and event consumers'],CYAN,size=25)
    d.card(655,555,490,120,'Collectors',['Prometheus + log agent','Broker lag, DB and node signals'],CYAN,size=25)
    d.card(1270,555,450,120,'Dashboards + alerts',['Grafana + chosen log backend','Exercise alerts with controlled failures'],CYAN,size=25)
    d.line([(530,615),(655,615)])
    d.line([(1145,615),(1270,615)])
    d.group(45,780,1710,300,'RECOVERY PLAN  /  A Helm rollback, a database restore and a cluster restore solve different problems')
    recovery=[('PostgreSQL',['Six databases + service users','Backups; rehearse isolated restore','Cross-service consistency needs a plan']),
              ('Kafka + consumers',['Persist Redpanda data with EBS','Retain offsets and event history','Replay can duplicate notifications']),
              ('Cluster + application',['Private kOps state + etcd backups','Terraform state + Git + image digests','Recreate infra; Helm restores workloads'])]
    for i,(title,lines) in enumerate(recovery):
        d.card(70+i*565,845,520,175,title,lines,GREEN,size=25)
    d.save()


def roadmap():
    d=Diagram('07-implementation-roadmap','Ten-stage implementation roadmap','Adapted from the linked AgriBridge plan to the Atelier Objects commerce workload',
              'PLANNING VIEW  |  Stages 1–3 have existing artifacts; completion requires recorded verification, not folder presence.')
    items=[('01','Baseline application','Map services, checkout and event contracts'),
           ('02','Versioned images','Nine images; traceable, non-root runtimes'),
           ('03','Local integration','Compose, persistence and failure evidence'),
           ('04','AWS foundation','Terraform network, IAM, registry and data'),
           ('05','kOps cluster','Generate Terraform; apply and validate'),
           ('06','One Helm chart','Services, runtime secrets, probes and storage'),
           ('07','CI gates','Node, Java, Python and full-stack checks'),
           ('08','Release automation','ECR digests → dev → promotion → rollback'),
           ('09','Observability','Collect metrics, logs and event-consumer lag'),
           ('10','Recovery + demonstration','Restore data; recreate infra; record evidence')]
    for i,(number,title,line) in enumerate(items):
        row,col=divmod(i,2);x=70+col*850;y=205+row*170
        d.card(x,y,800,130,f'{number}  {title}',[line,'Acceptance checks: docs/plans/implementation-plan.md'],CYAN if i<3 else PURPLE,size=25)
        if col==0: d.line([(x+800,y+65),(x+850,y+65)])
    d.save()


if __name__ == '__main__':
    for render in (docker,aws,kubernetes,checkout,delivery,operations,roadmap):
        render()
