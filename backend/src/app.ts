import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import { workflowsRouter } from "./routes/workflows.routes.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/workflows", workflowsRouter);

app.use(errorHandler);
