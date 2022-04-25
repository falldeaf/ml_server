//Problems tensorflow lib (https://github.com/tensorflow/tfjs/issues/4761)
require('dotenv').config();
const ml = require('./ml');
const MjpegDecoder = require('mjpeg-decoder');
const sharp = require('sharp');
//const sftpClient = require('ssh2-sftp-client');
//const dateformat = require('dateformat');
const fetch = require('node-fetch');

const lowDb = require("lowdb");

const lodashId = require("lodash-id");
const FileSync = require("lowdb/adapters/FileSync");
const bodyParser = require("body-parser");

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require("cors");
const { exit } = require('process');

const app = express();
const PORT = process.env.PORT || 3000

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const http = require('http').Server(app);
const io = require('socket.io')(http, {
	cors: {
		origin: "http://localhost:8082",
		methods: ["GET", "POST"],
		credentials: true,
		transports: ['websocket', 'polling'],
	},
	allowEIO3: true
});

//Load layer Plugins
var layer_plugins = {}; //Store layer plugins here
layer_plugins.schema_json = JSON.parse(fs.readFileSync("./layers/schema-stack.json"));
var files = fs.readdirSync('./layers/');
for(file of files) {
	const basename = path.basename(file,'.js');
	if(basename.startsWith('layer-')) {
		var barray = basename.split('-');
		//console.log(barray[1]);
		layer_plugins[barray[1]] = require('./layers/' + basename);
		layer_plugins.schema_json.properties.layers.items.anyOf.push(layer_plugins[barray[1]].schema);
		console.log("Loading Plugin: " + layer_plugins[barray[1]].name);
	}
}


let decoders = {}; //Save decoder handles here;

const db = lowDb(new FileSync('db.json'))
db.defaults({ stacks: [], devices: [] }).write()
db._.mixin(lodashId);

//Init Devices from DB
let stacks = db.get("stacks").value();
let devices = db.get("devices").value();

for (let device of devices) {
	//device.decoder = null;
	//device.socket = null;
	if(!('stackname' in device)) device.stackname = "";

	if(device.active) startDevice(device.id);
}

//Allow clients to listen in on Prediction events based on device
io.sockets.on('connection', (socket)=> {
	console.log("Client connected");
	//Allow client to specify which device they want to listen in on predictions for
	socket.on('deviceid', function(deviceid) {
		console.log("Client connecting to: " + deviceid);
		socket.leaveAll();
		socket.join(deviceid);
	});
});

app.get('device/start/:cid', async(req, res) => {

	//TODO Handle stack already attached
	//TODO return early if: cid doesn't exist, device doesn't contain stack or interval
	const cid = req.params.cid;
	startDevice(cid);

	res.send('started.');
});

app.get('device/stop/:cid', async(req, res) => {
	const cid = req.params.cid;
	const cam = devices.find(obj => obj.id == cid);

	//devices.decoder.stop();
	cam.stack = null;
	res.send('stopped.');
});

app.get('/iconlist', async(req, res) => {
	const files = fs.readdirSync('static/recog_icons');

	var filelist = [];
	for (const file of files) {
		//console.log(file)
		if( path.extname(file) === ".png" ) {
			filelist.push(path.basename(file, path.extname(file)));
		}
	}
	res.json({icons: filelist});
});

app.get('/devices/list', async(req, res) => {
	res.json(devices); 
});

app.get('/device/arm/:cid/:flag', async(req, res) => {
		const cid = req.params.cid;
		const flag = req.params.flag;
		const device = devices.find(obj => obj.id == cid);

		device.armed = (flag == true);

		res.send(res.json({success:true}));
});

app.post('/devices/upsert/', async(req, res) => {
	var new_device = req.body;
	new_device.active = false;
	new_device.capabilities = JSON.parse(new_device.capabilities);
	//new_device.id = 2; //TODO figure out how to find latest ID
	console.log(new_device);
	
	//var collection = db.get('devices').push(new_device).write();

	//console.log(collection);
	//const newPost = collection.insert(new_device).write()
	db.get('devices').upsert(new_device).write();


	res.json(new_device);
});

app.get('/devices/set/stack/:stackname', async(req, res) => {
	res.json({status:''});
});

app.get('/stacks/list', async(req, res) => {
	const data = db.get("stacks").value();
	return res.json(data);
	//res.json(stacks);
});

app.get('/stacks/schema', async(req, res) => {
	return res.json(layer_plugins.schema_json);
});

app.get('/stacks/add/:json', async(req, res) => {
	res.json({status:''});
});

app.use(express.static('static'));

/*
app.post('/detect_image/:model', upload.single('img'), async (req, res) => {
	const data = fs.readFileSync(req.file.path);
	console.log(data)
	//res.json({success:1})
	//return
	//const data = req.body.data;
	const objectDetect = new ObjectDetectors(data);
	const results = await objectDetect.process();
	console.log(results);
	res.json(results);
});
*/

http.listen(PORT, () => {
	console.log('http://localhost:' + PORT + "/");
});

function startDevice(cid) {
	const device = devices.find(obj => obj.id == cid); //get the ID of this device
	//TODO: return with error if no stack specified
	const stack = stacks.find(obj => obj.stackname == device.stackname); //Find the stack referenced

	console.log(`Starting ${device.name}(${cid}) with stack ${stack.stackname} every ${stack.interval} ms`);

	//http://192.168.1.200/mjpeg/1
	const decoder = new MjpegDecoder(device.url, { interval: stack.interval });
	//device.decoder = decoder;
	decoders[device.name] = decoder;
	//device.stack = stack;
	decoder.on('frame', async (frame, seq) => {
		try {
			var results = await runStack(device, frame, stack.layers);
			io.sockets.in(cid.toString()).emit('result', results);
		} catch (error) {
			console.log(error);
		}
	});
	decoder.start();
	device.active = true;
	//TODO write active value to DB
}

function getSource(frame, results, classname) {

	var source = null;
	if(classname === "frame") {
		return frame;
	} else {
		//For now, just return the first matching result
		for(const result of results) {
			if(result.class == classname) {
				return sharp(frame)
				.extract({ left: parseInt(result.bbox[0]), top: parseInt(result.bbox[1]), width: parseInt(result.bbox[2]), height: parseInt(result.bbox[3]) })
				//.resize(width, height)
			}
		};
	}
	return null;
}

function classnameExists(results, classname, conf) {
	for(const result of results) {
		if(result.class == classname &&
			result.score >= conf) return true;
	}
	return false;
}

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

async function runStack(device, frame, layers, instanceid) {
	results = [];

	var source = null;
	for(const layer of layers) {
		results = layer_plugins[layer.layername].run(device, frame, await results, layer, instanceid);
	}

	return results;
}