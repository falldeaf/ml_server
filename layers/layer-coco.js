const lh = require('../layer_helpers');
const ml = require('../ml');

exports.name = 'coco';
exports.schema = {
	"$id": "#/properties/layers/items/anyOf/0",
	"type": "object",
	"title": "CocoSSD Object Detection",
	"description": "Find objects in image with the CocoSSD Model",
	"required": [
		"layername",
		"type",
		"source"
	],
	"properties": {
		"layername": {
			"$id": "#/properties/layers/items/anyOf/0/properties/layername",
			"type": "string",
			"title": "Layer Name",
			"default": "coco",
			"readOnly": true
		},
		"type": {
			"$id": "#/properties/layers/items/anyOf/0/properties/type",
			"type": "string",
			"default": "detector",
			"readOnly": true
		},
		"source": {
			"$id": "#/properties/layers/items/anyOf/0/properties/source",
			"type": "string",
			"title": "Source",
			"description": "Source of data for the prediction (frame for original or 'classname' for partial)",
			"default": "frame"
		}
	}
}

exports.run = async (device, data, results, layer)=>{
	var source = lh.getSource(data, results, layer.source);
	if(source !== null) {
		var new_results = await ml.cocoDetect(source);
		results = results.concat(new_results);
	}

	return results;
};