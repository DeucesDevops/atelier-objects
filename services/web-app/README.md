# Web App

React frontend for the commerce platform demo. It uses the API Gateway by default at `http://localhost:8080` and gives a shopper-facing way to register, browse products, manage a cart, place orders, inspect notifications, and see analytics events.

## Run locally

```bash
npm install
npm --workspace @commerce/web-app run dev
```

Open `http://localhost:5173`.

Set `VITE_API_URL` if the gateway is running somewhere other than `http://localhost:8080`.

## Main flows

- Register or sign in.
- Add catalog products to the cart.
- Place a demo order with `demo-card`.
- Use `decline` to simulate a failed payment and inventory release.
- Review order status, inventory, notifications, and analytics.
