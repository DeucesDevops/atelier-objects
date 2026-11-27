# Local development

Docker with Compose and `curl` are required for the container demo. Node.js 22+, Java 21 with Maven, and Python 3 are required for the test suites.

## Start and inspect

From the repository root:

```sh
docker compose config --quiet
docker compose up --build -d
docker compose ps
./commerce-demo/seed.sh
./commerce-demo/demo-flow.sh
```

Open the UI at `http://localhost:5173`. The gateway is `http://localhost:8080`. Public routes are listed in the root README.

`.env.example` lists variable names only. Compose uses its local defaults when those variables are unset or empty. To override a name, assign it in an untracked `.env`. Do not commit that file.

```sh
curl --fail http://localhost:8080/health
curl --fail http://localhost:8085/health
docker compose logs --tail=100 api-gateway order-service payment-service
```

Use the browser to verify registration and login, the catalog, a successful checkout, and notifications or analytics. Create an order with payment method `decline` to test the failure path. Cancel a successful order and verify the simulated refund and stock release. The happy-path script does not cover those cases.

## Tests

```sh
make install
make test
npm run build
mvn -f services/payment-service/pom.xml -DskipTests package
```

`make install` uses the root npm lockfile and creates `.venv` for the Python suites. `make validate` checks Compose configuration and the demo scripts.

## Persistence

Record known order IDs, product rows, and inventory values. Recreate the relevant containers while retaining their volumes, then query the same records. A normal stop keeps the six PostgreSQL volumes:

```sh
docker compose stop
docker compose start
docker compose down
```

Do not add `--volumes` for a routine stop. Redpanda has no declared volume, and Notification's delivery list is process memory. Neither has the PostgreSQL persistence guarantee.

## Troubleshooting

| Symptom | Inspect |
| --- | --- |
| UI loads but API requests fail | Compiled `VITE_API_URL`; gateway host port; browser network requests |
| Gateway returns 502 | Owning service logs and `*_SERVICE_URL`; health of its dependencies |
| Order fails | Inventory reservation and Payment responses; order state and attempted compensation |
| No notifications or analytics | Broker connectivity, topic traffic, consumer group offsets, and consumer logs |
| Login fails after changing `JWT_SECRET` | Auth and Orders must share the same value; stale browser token; restart the affected services |
| Database authentication fails after editing `.env` | Existing PostgreSQL volumes keep the user created at first start |
| Events disappear after recreation | Redpanda has no volume in Compose, so broker data is not retained |

Logs can include request and customer information. Inspect them locally.
