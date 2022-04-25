const lh = require('../layer_helpers');
const sftpClient = require('ssh2-sftp-client');
const dateformat = require('dateformat');

exports.name = 'sftp';
exports.schema = {
	"$id": "#/properties/layers/items/anyOf/1",
	"type": "object",
	"title": "SFTP Upload Utility",
	"description": "Save data to an SFTP location",
	"required": [
		"layername",
		"source",
		"dir"
	],
	"properties": {
		"layername": {
			"$id": "#/properties/layers/items/anyOf/1/properties/layername",
			"type": "string",
			"title": "Layer Name",
			"default": "sftp",
			"readOnly": true
		},
		"source": {
			"$id": "#/properties/layers/items/anyOf/1/properties/source",
			"type": "string",
			"title": "Source",
			"description": "Source of data for the prediction (frame for original or 'classname' for partial)",
			"default": "frame"
		},
		"dir": {
			"$id": "#/properties/layers/items/anyOf/1/properties/dir",
			"type": "string",
			"title": "Directory",
			"description": "Directory to save data to"
		}
	}
};

exports.run = (device, data, results, layer)=>{
	var source = lh.getSource(data, results, layer.source);
	if(source !== null) uploadImage(source, layer.dir);

	return results;
};

function uploadImage(data, dir) {
	let client = new sftpClient();

	const config = {
		host: process.env.sftphost,
		port: 22,
		username: process.env.sftpuser,
		password: process.env.sftppass
	};

	const filename = dateformat(new Date(), 'dd-m-yy_H-MM-ss-l') + ".jpg";

	//let data = fs.createReadStream('./file.jpg');
	let remote = dir + filename;
	
	client.connect(config)
		.then(() => {
		return client.put(data, remote);
		})
		.then(() => {
		return client.end();
		})
		.catch(err => {
		console.error(err.message);
		});
}