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

export const completeLoggedInUserTodoController = apiHandler(async (req, res) => {
  const completion = await todoService.completeLoggedInUserTodoService(
    req.params.todo_id,
    req.body,
    req.files,
    req.user,
  );
  return apiResponse(UPDATE_SUCCESS, "Todo completed", completion, res, "object");
});

export const completeAdminManagerTodoController = apiHandler(async (req, res) => {
  const completion = await todoService.completeAdminManagerTodoService(
    req.params.todo_id,
    req.params.location_id,
    req.body,
    req.files,
    req.user,
  );
  return apiResponse(UPDATE_SUCCESS, "Todo completed", completion, res, "object");
});

export const getTodoCompletionsController = apiHandler(async (req, res) => {
  const completions = await todoService.getTodoCompletionsService(
    req.params.todo_id,
    req.query,
    req.user,
  );
  return apiResponse(FETCH, "Todo Completions", completions, res, "object");
});

export const getAdminManagerTodayTodosController = apiHandler(async (req, res) => {
  const result = await todoService.getAdminManagerTodayTodosService(req.query, req.user);
  return apiResponse(FETCH, "Today Todos", result, res, "object");
});

export const getAdminManagerTodayUniqueTodosController = apiHandler(async (req, res) => {
  const result = await todoService.getAdminManagerTodayUniqueTodosService(req.query, req.user);
  return apiResponse(FETCH, "Today Unique Todos", result, res);
});

export const getStockCompletionReportController = apiHandler(async (req, res) => {
  const result = await todoService.getStockCompletionReportService(req.query, req.user);
  return apiResponse(FETCH, "Stock Completion Report", result, res, "object");
});
