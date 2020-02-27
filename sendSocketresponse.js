const AWS = require('aws-sdk');

module.exports.sendSocketresponse = (event, connectionId, message) => {
	const endpoint = event.requestContext.domainName + '/' + event.requestContext.stage;
	const apigwManagementApi = new AWS.ApiGatewayManagementApi({
		apiVersion: '2018-11-29',
		endpoint: endpoint
	});

	const params = {
		ConnectionId: connectionId,
		Data: message
	};
	return apigwManagementApi.postToConnection(params).promise();
};
