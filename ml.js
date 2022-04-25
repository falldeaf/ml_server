const tf = require('@tensorflow/tfjs-node-gpu');
const toUint8Array = require('base64-to-uint8array');
//Models
const cocossd = require('@tensorflow-models/coco-ssd');
const blazeface = require('@tensorflow-models/blazeface');

var models = [
	{
		name: "cocossd",
		require: "@tensorflow-models/coco-ssd"
	},
	{
		name: "blazeface",
		require: "@tensorflow-models/blazeface"
	}
];
var models_in_use = [];

var model = null;
(async () => {
	//load COCO model
	model = await cocossd.load()
	console.log('Models ready');
	//const model = await blazeface.load();
})();

function addModels(model_names) {
	for (let model_name of model_names) {
		models_in_use.push(model_name);
	}
}

function remModels(model_names) {
	for(let model_name of model_names) {
		for(let i in models_in_use) {
			if(models_in_use[i] == model_name) {
				models_in_use.splice(i, 1);
				break;
			}
		}
	}
}

async function loadModel(model_name, model_require) {
	//const cocossd = require('@tensorflow-models/coco-ssd');
	//models.cocossd = await cocossd.load();
	const temp = require(model_require);
	models[model_name] = await temp.load();
}

async function unloadModel(model_name, model_require) {
	//const name = require.resolve('@tensorflow-models/coco-ssd');
	//delete require.cache[name];
	//delete models.cocossd;
	const temp = require.resolve('require');
	delete require.cache[temp];
	delete models[model_name];
}

class ObjectDetectors {

	constructor(image) {
		this.img = image;
	}

	getTensor3dObject(num_channels) {
		//const imageData = this.inputImage.replace('data:image/jpeg;base64','').replace('data:image/png;base64','');
		const image_array = toUint8Array(this.img);
		const tensor3d = tf.node.decodeJpeg( image_array, num_channels );
		return tensor3d;
	}

	async process() {
		let predictions = null;
		const tensor3D = this.getTensor3dObject(3);
		predictions = await model.detect(tensor3D);
		tensor3D.dispose();
		return predictions;
	}
}

async function cocoDetect(jpeg_data_binary) {
	if(model === null) return []; //Model not ready

	const objectDetect = new ObjectDetectors(jpeg_data_binary);
	const results = await objectDetect.process();
	//console.log(results);
	return results;
}

module.exports = { cocoDetect, addModels, remModels };