.PHONY: up down logs install test build validate smoke seed

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
	bash -n scripts/*.sh commerce-demo/*.sh

smoke:
	./scripts/ci-smoke-test.sh

seed:
	./commerce-demo/seed.sh
