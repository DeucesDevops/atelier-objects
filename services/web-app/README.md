# Web App

React storefront for the commerce platform demo. It uses the API Gateway by default at `http://localhost:8080` and presents the shared microservices workload as a polished, realistic retail experience.

## Run locally

```bash
npm install
npm --workspace @commerce/web-app run dev
```

Open `http://localhost:5173`.

Set `VITE_API_URL` if the gateway is running somewhere other than `http://localhost:8080`.

## Main flows

- Browse and filter the collection, open product detail pages, and save favourites.
- Register or sign in through a dedicated account experience.
- Manage a persistent shopping bag and complete delivery and payment forms.
- Place a demo order with `demo-card`, then track, cancel, and refund it.
- Use `decline` to demonstrate payment failure and inventory release.
- Open **Live system** to inspect inventory, notifications, and analytics without exposing operational data in the customer journey.
- Save products to a persistent favourites page and keep cart contents across reloads.
