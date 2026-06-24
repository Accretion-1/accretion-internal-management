import express from "express";
import {
  createTodoController,
  getLoggedInUserTodoByIdController,
  getLoggedInUserTodosController,
  getTodoByIdController,
  getTodosController,
  updateTodoController,
} from "../controllers/todo.controller.js";
import { authGuard } from "../middlewares/guard.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  createTodoSchema,
  getTodosQuerySchema,
  getUserTodosQuerySchema,
  todoIdParamSchema,
  updateTodoSchema,
} from "../validations/todo.validation.js";

const router = express.Router();

router.use(authGuard);

router.get("/", validate(getTodosQuerySchema, "query"), getTodosController);
router.get("/my", validate(getUserTodosQuerySchema, "query"), getLoggedInUserTodosController);
router.get(
  "/my/:todo_id",
  validate(todoIdParamSchema, "params"),
  validate(getUserTodosQuerySchema, "query"),
  getLoggedInUserTodoByIdController,
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
