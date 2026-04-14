import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("settings", "routes/settings.tsx"),
  route("expenses", "routes/expenses.tsx"),
  route("budgets", "routes/budgets.tsx"),
] satisfies RouteConfig;
