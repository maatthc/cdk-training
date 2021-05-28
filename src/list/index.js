const AWS = require('aws-sdk')
const docClient = new AWS.DynamoDB.DocumentClient()
exports.handler = async event => {
  // Not checking the event, only return scan from Table

  const result = await docClient
    .scan({
      TableName: process.env.TABLE_NAME,
    })
    .promise()

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
    },
    body: JSON.stringify(result.Items),
  }
}
