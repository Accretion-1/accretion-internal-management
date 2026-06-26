import express from "express";
import cors from "cors";
import path from "path";
import { CORS_ORIGIN, PORT, __dirname } from "./constants.js";
import routes from "./routes/index.js";

const app = express();

app.use(cors({ credentials: true, origin: CORS_ORIGIN }));
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use("/public", express.static(path.join(__dirname, "public")));

app.use("/", routes);

app.get("/", (req, res) => {
  res.send(`Server is running On Port ${PORT}`);
});

// 404 handler (must be last)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});
export default app;
