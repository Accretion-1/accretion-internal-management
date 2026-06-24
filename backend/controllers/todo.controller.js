import * as todoService from "../services/todo.service.js";
import { apiHandler, apiResponse } from "../utils/api.util.js";
import { ADD_SUCCESS, FETCH, UPDATE_SUCCESS } from "../utils/message.util.js";

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

export const updateTodoController = apiHandler(async (req, res) => {
  const todo = await todoService.updateTodoService(req.params.todo_id, req.body);
  return apiResponse(UPDATE_SUCCESS, "Todo", todo, res, "object");
});

export const getLoggedInUserTodosController = apiHandler(async (req, res) => {
  const todos = await todoService.getLoggedInUserTodosService(req.query, req.user);
  return apiResponse(FETCH, "User Todos", todos, res, "object");
});

export const getLoggedInUserTodoByIdController = apiHandler(async (req, res) => {
  const todo = await todoService.getLoggedInUserTodoByIdService(
    req.params.todo_id,
    req.query,
    req.user,
  );
  return apiResponse(FETCH, "User Todo", todo, res, "object");
});
