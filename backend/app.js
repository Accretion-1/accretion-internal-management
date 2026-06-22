import express from "express";
import cors from "cors";
import { CORS_ORIGIN, PORT } from "./constants.js";
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

app.use("/api", routes);

app.use("/", (req, res) => {
  res.send("Server is running On Port " + PORT);
});

export default app;
