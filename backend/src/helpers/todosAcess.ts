import * as AWS from 'aws-sdk'
// import * as AWSXRay from 'aws-xray-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
// import { createLogger } from '../utils/logger'
import { TodoItem } from '../models/TodoItem'
import { UpdateTodoRequest } from '../requests/UpdateTodoRequest'
// import { TodoUpdate } from '../models/TodoUpdate'
const AWSXRay = require('aws-xray-sdk')

const XAWS = AWSXRay.captureAWS(AWS)
const todosTable = process.env.TODOS_TABLE
const index = process.env.TODOS_CREATED_AT_INDEX

// const logger = createLogger('TodosAccess')
const docClient: DocumentClient = createDynamoDBClient()

// TODO: Implement the dataLayer logic
export const createTodo = async (todo: TodoItem): Promise<TodoItem> => {
  await docClient
    .put({
      TableName: todosTable,
      Item: todo
    })
    .promise()

  return todo
}

export const getAllTodosByUserId = async (
  userId: string
): Promise<TodoItem[]> => {
  const result = await docClient
    .query({
      TableName: todosTable,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    })
    .promise()

  return result.Items as TodoItem[]
}

export const getTodoById = async (todoId: string): Promise<TodoItem> => {
  const result = await docClient
    .query({
      TableName: todosTable,
      IndexName: index,
      KeyConditionExpression: 'todoId = :todoId',
      ExpressionAttributeValues: {
        ':todoId': todoId
      }
    })
    .promise()

  const items = result.Items
  if (!items.length) return null

  return items[0] as TodoItem
}

export const updateTodoWithAttachmentUrl = async (
  todo: TodoItem
): Promise<TodoItem> => {
  const result = await docClient
    .update({
      TableName: todosTable,
      Key: { userId: todo.userId, todoId: todo.todoId },
      UpdateExpression: 'set attachmentUrl = :attachmentUrl',
      ExpressionAttributeValues: {
        ':attachmentUrl': todo.attachmentUrl
      }
    })
    .promise()

  return result.Attributes as TodoItem
}

export const updateTodo = async (
  userId: string,
  todoId: string,
  todo: UpdateTodoRequest
): Promise<TodoItem> => {
  const result = await docClient
    .put({
      TableName: todosTable,
      ConditionExpression: 'todoId = :todoId',
      Item: {
        todoId: todoId,
        userId: userId,
        ...todo
      },
      ExpressionAttributeValues: {
        ':todoId': todoId
      }
    })
    .promise()

  console.log('update todo : ', result)

  return result.Attributes as TodoItem
}

export const deleteTodo = async (
  todoId: string,
  userId: string
): Promise<TodoItem> => {
  const result = await docClient
    .delete({
      TableName: todosTable,
      Key: {
        todoId: todoId,
        userId: userId
      },
      ConditionExpression: 'todoId = :todoId',
      ExpressionAttributeValues: {
        ':todoId': todoId
      }
    })
    .promise()

  console.log('Delete Todo : ', result)

  return result.Attributes as Promise<TodoItem>
}

function createDynamoDBClient() {
  if (process.env.IS_OFFLINE) {
    console.log('Creating a local DynamoDB instance')
    return new XAWS.DynamoDB.DocumentClient({
      region: 'localhost',
      endpoint: 'http://localhost:8000'
    })
  }

  return new XAWS.DynamoDB.DocumentClient()
}
