import express from "express";
import cookieParser from "cookie-parser";
import "dotenv/config";
import helloRouter from "./src/routes/hello.ts";
import authRouter from "./src/routes/auth.ts";
import incidentRouter from "./src/routes/incidents.ts";
import usersRouter from "./src/routes/users.ts";
import adminRouter from "./src/routes/admin.ts";
import teamsRouter from "./src/routes/teams.ts";
import dashboardRouter from "./src/routes/dashboard.ts";
import pool from "./src/db/dbPool.ts";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/hello", helloRouter);
app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/teams", teamsRouter);
app.use("/dashboard", dashboardRouter);
app.use("/", incidentRouter);
app.use("/", usersRouter);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
