.PHONY: up down logs test seed

up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

test:
	npm test
	mvn -f services/payment-service/pom.xml test
	cd services/notification-service && pytest
	cd services/analytics-service && pytest

seed:
	./commerce-demo/seed.sh
