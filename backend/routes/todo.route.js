import express from "express";
import {
  completeLoggedInUserTodoController,
  completeAdminManagerTodoController,
  createTodoController,
  getLoggedInUserTodoByIdController,
  getLoggedInUserTodosController,
  getTodoCompletionsController,
  getTodoByIdController,
  getTodosController,
  updateTodoController,
  getAdminManagerTodayTodosController,
  getAdminManagerTodayUniqueTodosController,
  getStockCompletionReportController,
} from "../controllers/todo.controller.js";
import { authGuard } from "../middlewares/guard.middleware.js";
import { fields as uploadFields } from "../middlewares/multer.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  completeTodoSchema,
  createTodoSchema,
  getTodoCompletionsQuerySchema,
  getTodosQuerySchema,
  getUserTodosQuerySchema,
  todoIdParamSchema,
  todoLocationCompleteParamSchema,
  updateTodoSchema,
  getAdminManagerTodayTodosQuerySchema,
  getStockCompletionReportQuerySchema,
} from "../validations/todo.validation.js";

const router = express.Router();

router.use(authGuard);

router.get("/", validate(getTodosQuerySchema, "query"), getTodosController);
router.get("/my", validate(getUserTodosQuerySchema, "query"), getLoggedInUserTodosController);
router.post(
  "/my/:todo_id/complete",
  validate(todoIdParamSchema, "params"),
  uploadFields("", [
    { name: "photos", maxCount: 10 },
    { name: "videos", maxCount: 10 },
    { name: "files", maxCount: 10 },
  ]),
  validate(completeTodoSchema, "body"),
  completeLoggedInUserTodoController,
);
router.post(
  "/:todo_id/location/:location_id/complete",
  validate(todoLocationCompleteParamSchema, "params"),
  uploadFields("", [
    { name: "photos", maxCount: 10 },
    { name: "videos", maxCount: 10 },
    { name: "files", maxCount: 10 },
  ]),
  validate(completeTodoSchema, "body"),
  completeAdminManagerTodoController,
);
router.get(
  "/my/:todo_id",
  validate(todoIdParamSchema, "params"),
  validate(getUserTodosQuerySchema, "query"),
  getLoggedInUserTodoByIdController,
);
router.get(
  "/today-tasks",
  validate(getAdminManagerTodayTodosQuerySchema, "query"),
  getAdminManagerTodayTodosController,
);
router.get(
  "/today-unique-tasks",
  getAdminManagerTodayUniqueTodosController,
);
router.get(
  "/reports/stock-completions",
  validate(getStockCompletionReportQuerySchema, "query"),
  getStockCompletionReportController,
);
router.get(
  "/:todo_id/completions",
  validate(todoIdParamSchema, "params"),
  validate(getTodoCompletionsQuerySchema, "query"),
  getTodoCompletionsController,
);
router.get("/:todo_id", validate(todoIdParamSchema, "params"), getTodoByIdController);
router.post("/add-todos", validate(createTodoSchema, "body"), createTodoController);
router.put(
  "/:todo_id",
  validate(todoIdParamSchema, "params"),
  validate(updateTodoSchema, "body"),
  updateTodoController,
);

export default router;
