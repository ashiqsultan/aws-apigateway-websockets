'use strict';

const AWS = require('aws-sdk');
let dynamo = new AWS.DynamoDB.DocumentClient();

require('aws-sdk/clients/apigatewaymanagementapi');
const { sendSocketresponse } = require('./sendSocketresponse');

const CHATCONNECTION_TABLE = 'chatIdTable';

const successfullResponse = {
	statusCode: 200,
	body: 'everything is alright'
};

module.exports.connectionHandler = (event, context, callback) => {
	console.log(event);

	if (event.requestContext.eventType === 'CONNECT') {
		// Handle connection
		addConnection(event.requestContext.connectionId)
			.then(() => {
				callback(null, successfullResponse);
			})
			.catch(err => {
				console.log(err);
				callback(null, JSON.stringify(err));
			});
	} else if (event.requestContext.eventType === 'DISCONNECT') {
		// Handle disconnection
		deleteConnection(event.requestContext.connectionId)
			.then(() => {
				callback(null, successfullResponse);
			})
			.catch(err => {
				console.log(err);
				callback(null, {
					statusCode: 500,
					body: 'Failed to connect: ' + JSON.stringify(err)
				});
			});
	}
};

// THIS ONE DOESNT DO ANYHTING
module.exports.defaultHandler = (event, context, callback) => {
	console.log('defaultHandler was called');
	console.log(event);

	callback(null, {
		statusCode: 200,
		body: 'defaultHandler'
	});
};

module.exports.sendMessageHandler = (event, context, callback) => {
	sendMessageToAllConnected(event)
		.then(() => {
			callback(null, successfullResponse);
		})
		.catch(err => {
			callback(null, JSON.stringify(err));
		});
};

module.exports.setDeviceIDHandler = (event, context, callback) => {
	try {
		const connectionID = event.requestContext.connectionId;
		const body = JSON.parse(event.body);
		const deviceID = body.deviceID;
		addDeviceIDToConnectionID(connectionID, deviceID);
		sendSocketresponse(event, connectionID, 'update done');
	} catch (error) {
		console.error(error);
		callback(null, JSON.stringify(error));
	}
};

module.exports.sendResultHandler = (event, context, callback) => {
	// This route will be used by the device to send the result
	try {
		const body = JSON.parse(event.body);
		const deviceID = body.deviceID;
		getConnectionIdsBasedOnDeviceId(deviceID).then(connectionIdArray => {
			connectionIdArray.forEach(id => {
				sendSocketresponse(event, id, 'this is a result');
			});
		});
	} catch (error) {
		console.error(error);
		callback(null, JSON.stringify(error));
	}
};


const sendMessageToAllConnected = event => {
	return getConnectionIds().then(connectionData => {
		return connectionData.Items.map(connectionId => {
			return send(event, connectionId.connectionId);
		});
	});
};

const getConnectionIds = () => {
	const params = {
		TableName: CHATCONNECTION_TABLE,
		ProjectionExpression: 'connectionId'
	};

	return dynamo.scan(params).promise();
};

const addConnection = connectionId => {
	const params = {
		TableName: CHATCONNECTION_TABLE,
		Item: {
			connectionId: connectionId,
			deviceId: null
		}
	};

	return dynamo.put(params).promise();
};

const deleteConnection = connectionId => {
	const params = {
		TableName: CHATCONNECTION_TABLE,
		Key: {
			connectionId: connectionId
		}
	};

	return dynamo.delete(params).promise();
};

const send = (event, connectionId) => {
	const body = JSON.parse(event.body);
	const postData = body.data;

	const endpoint = event.requestContext.domainName + '/' + event.requestContext.stage;
	const apigwManagementApi = new AWS.ApiGatewayManagementApi({
		apiVersion: '2018-11-29',
		endpoint: endpoint
	});

	const params = {
		ConnectionId: connectionId,
		Data: postData
	};
	return apigwManagementApi.postToConnection(params).promise();
};

const addDeviceIDToConnectionID = (connectionID, deviceID) => {
	console.log(deviceID);
	var params = {
		TableName: CHATCONNECTION_TABLE,
		Key: {
			connectionId: connectionID
		},
		UpdateExpression: 'set deviceId = :deviceId',
		ExpressionAttributeValues: {
			':deviceId': deviceID
		},
		ReturnValues: 'UPDATED_NEW'
	};

	try {
		dynamo.update(params, function(err, data) {
			if (err) {
				console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
			} else {
				console.log('UpdateItem succeeded:', JSON.stringify(data, null, 2));
				return 'dynamo update ok';
			}
		});
	} catch (error) {
		console.error(error);
		return error;
	}
};

const getConnectionIdsBasedOnDeviceId = deviceId => {
	const params = {
		TableName: CHATCONNECTION_TABLE,
		FilterExpression: '#deviceId = :deviceId',
		ExpressionAttributeNames: {
			'#deviceId': 'deviceId'
		},
		ExpressionAttributeValues: {
			':deviceId': deviceId
		}
	};
	return new Promise((resolve, reject) => {
		dynamo.scan(params, function(err, data) {
			if (err) {
				console.error(JSON.stringify(err));
				reject(err);
			} else {
				// console.log(JSON.stringify(data));
				const connectionIdArray = data.Items.map(item => item.connectionId);
				console.log(connectionIdArray);
				resolve(connectionIdArray);
			}
		});
	});
};
