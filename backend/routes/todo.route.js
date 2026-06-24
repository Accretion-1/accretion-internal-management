import express from "express";
import {
  createTodoController,
  getTodoByIdController,
  getTodosController,
} from "../controllers/todo.controller.js";
import { authGuard } from "../middlewares/guard.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  createTodoSchema,
  getTodosQuerySchema,
  todoIdParamSchema,
} from "../validations/todo.validation.js";

const router = express.Router();

router.use(authGuard);

router.get("/", validate(getTodosQuerySchema, "query"), getTodosController);
router.get("/:todo_id", validate(todoIdParamSchema, "params"), getTodoByIdController);
router.post("/add-todos", validate(createTodoSchema, "body"), createTodoController);

export default router;
