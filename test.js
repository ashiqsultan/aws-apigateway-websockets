const res = {
	Items: [
		{
			connectionId: 'IgO9hdHpoAMCIEA=',
			deviceId: 'abcd1235678910'
		},
		{
			connectionId: 'IgO7hdZnIAMCI5Q=',
			deviceId: 'abcd1235678910'
		}
	],
	Count: 2,
	ScannedCount: 2
};

const connectionIdArray = res.Items.map(item => item.connectionId);
console.log(connectionIdArray);
connectionIdArray.forEach(id => {
	console.log(`${id}this is result`);
});
