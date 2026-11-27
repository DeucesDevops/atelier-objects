.PHONY: up down logs install test build validate seed plan apply kubeconfig teardown

ENV ?= production

up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

install:
	npm ci
	python3 -m venv .venv
	.venv/bin/pip install -r services/notification-service/requirements.txt -r services/analytics-service/requirements.txt

test:
	npm test
	mvn -f services/payment-service/pom.xml test
	cd services/notification-service && ../../.venv/bin/python -m pytest
	cd services/analytics-service && ../../.venv/bin/python -m pytest

build:
	npm run build
	mvn -f services/payment-service/pom.xml -DskipTests package
	docker compose build

validate:
	docker compose config --quiet
	bash -n commerce-demo/*.sh
	./scripts/terraform-validate.sh
	shellcheck scripts/*.sh scripts/lib/*.sh
	helm lint helm/atelier
	helm lint helm/atelier-argocd-application
	helm template atelier helm/atelier >/dev/null
	helm template atelier helm/atelier -f helm/atelier/values.yaml -f helm/atelier/values-production.yaml --set domain=example.com --set ingress.certificateArn=arn:aws:acm:us-east-1:123456789012:certificate/example >/dev/null
	helm template atelier-argocd-application helm/atelier-argocd-application >/dev/null

seed:
	./commerce-demo/seed.sh

plan:
	terraform -chdir=terraform/environments/$(ENV) init -input=false -backend-config=backend.hcl
	terraform -chdir=terraform/environments/$(ENV) plan -input=false -var-file=terraform.tfvars

apply:
	./scripts/apply-environment.sh $(ENV)

kubeconfig:
	./scripts/update-kubeconfig.sh $(ENV)

teardown:
	./scripts/teardown-environment.sh $(ENV)
