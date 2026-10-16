# Local development and verification

These are instructions based on existing project files, not a record of a fresh test run. Docker with Compose and `curl` are required for the container demo. Node 22+, Java 21/Maven and Python are required for the native test suites.

## Start and inspect

From the repository root, copy `.env.example` to `.env` if you have not configured it already. Preserve any existing file. The example contains development-only credentials; use independent generated values for a non-disposable environment and never commit them.

```sh
docker compose config --quiet
docker compose up --build -d
docker compose ps
./commerce-demo/seed.sh
./commerce-demo/demo-flow.sh
```

Open the UI at `http://localhost:5173`; the gateway is `http://localhost:8080`. Its public routes are listed in the root README. A port conflict must be resolved in local Compose overrides or by choosing another project/port mapping; do not stop unrelated workloads.

```sh
curl --fail http://localhost:8080/health
curl --fail http://localhost:8085/health
docker compose logs --tail=100 api-gateway order-service payment-service
```

Use the browser to verify registration/login, catalog, successful checkout and notifications/analytics. Create an order with `paymentMethod: "decline"` to test the failure path; compare stock before and after. Cancel a successful order and verify the simulated refund and stock release. These additional cases need their own evidence; the existing happy-path script does not prove all of them.

## Run existing tests

```sh
make install
make validate
make test
npm run build
mvn -B -f services/payment-service/pom.xml -DskipTests package
```

`make install` uses the root npm lockfile and creates `.venv` for the Python suites. Check actual environment prerequisites before running. Review failing tests rather than assuming that a health route proves checkout correctness.

**Use `make smoke` only in a disposable checkout/environment.** Its current cleanup calls `docker compose down --volumes --remove-orphans` using this project's Compose identity. It can remove local demo data. The plan requires separate CI project names and ports before making this safe beside developer stacks.

## Persistence check

Record known order IDs, product and inventory values. Recreate the relevant service/database containers while retaining their volumes, then query the same records and verify behavior. Normal stop/removal preserves the six PostgreSQL volumes:

```sh
docker compose stop
docker compose start
# Remove containers/network while retaining database volumes:
docker compose down
```

Do not add `--volumes` for routine stopping. Redpanda currently has no declared volume, and Notification's delivery list is process memory. Neither has the PostgreSQL persistence guarantee.

## Troubleshooting

| Symptom | Inspect |
| --- | --- |
| UI loads but API requests fail | Compiled `VITE_API_URL`; gateway host port; browser network requests; CORS and TLS |
| Gateway returns 502 | Owning service logs and `*_SERVICE_URL`; health of its dependencies |
| Order fails | Inventory reservation and Payment responses; order state and attempted compensation |
| No notifications/analytics | Broker connectivity, topic traffic, consumer group/offsets and consumer logs; `/health` alone is insufficient |
| Login fails after changing a secret | Auth/Orders JWT agreement; stale browser token; restart affected services |
| Database authentication fails after editing `.env` | Existing PostgreSQL users keep their old passwords; update users and configuration through a rotation procedure |
| Events disappear after recreation | Missing broker persistence; record the limitation rather than assuming automatic replay |

Logs can include request and customer information. Inspect them locally and redact credentials/tokens before sharing evidence.
