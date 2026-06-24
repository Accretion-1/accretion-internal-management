import * as todoService from "../services/todo.service.js";
import { apiHandler, apiResponse } from "../utils/api.util.js";
import { ADD_SUCCESS, FETCH } from "../utils/message.util.js";

export const createTodoController = apiHandler(async (req, res) => {
  const todo = await todoService.createTodoService(req.body, req.user);
  return apiResponse(ADD_SUCCESS, "Todo", todo, res, "object");
});

export const getTodosController = apiHandler(async (req, res) => {
  const todos = await todoService.getTodosService(req.query);
  return apiResponse(FETCH, "Todos", todos, res);
});

export const getTodoByIdController = apiHandler(async (req, res) => {
  const todo = await todoService.getTodoByIdService(req.params.todo_id);
  return apiResponse(FETCH, "Todo", todo, res, "object");
});
