const lh = require('../layer_helpers');
const fetch = require('node-fetch');
//const { delete } = require('vue/types/umd');

exports.name = 'classalert';
exports.schema = {
	"$id": "#/properties/layers/items/anyOf/1",
	"type": "object",
	"title": "Class Alert",
	"description": "Send Alert to HTTP Endpoint based on class and ",
	"required": [
		"layername",
		"class",
		"score",
		"repeats",
		"image",
		"endpoint"
	],
	"properties": {
		"layername": {
			"$id": "#/properties/layers/items/anyOf/1/properties/layername",
			"type": "string",
			"title": "Layer Name",
			"default": "classalert",
			"readOnly": true
		},
		"class": {
			"$id": "#/properties/layers/items/anyOf/1/properties/class",
			"type": "string",
			"title": "Class",
			"description": "Classname to send alert on"
		},
		"score": {
			"$id": "#/properties/layers/items/anyOf/1/properties/score",
			"type": "integer",
			"title": "Score",
			"description": "Certainty Score Threshold (0-100) Will trigger if score is higher than threshold.",
			"default": 60
		},
		"repeats": {
			"$id": "#/properties/layers/items/anyOf/1/properties/repeats",
			"type": "integer",
			"title": "Repeats",
			"description": "Number of snapshots in a row to trigger",
			"default": 1
		},
		"cooldown": {
			"$id": "#/properties/layers/items/anyOf/1/properties/repeats",
			"type": "integer",
			"title": "Cooldown",
			"description": "Minutes to wait after being triggered.",
			"default": 5
		},
		"image": {
			"$id": "#/properties/layers/items/anyOf/1/properties/image",
			"type": "boolean",
			"title": "Send Image?",
			"description": "If data is Jpeg, should image data be posted to endpoint?",
			"default": false
		},
		"endpoint": {
			"$id": "#/properties/layers/items/anyOf/1/properties/endpoint",
			"type": "string",
			"title": "Endpoint",
			"description": "HTTP endpoint to call. Replacement Variables [ (Device Name){dname} (Class Name){class} (Confidence Score){score} (Date){date} ]"
		}
	}
};

class Counter {
	constructor() {
		this.obj = {};
		this.triggered = {};
	}

	increment(dname, repeat, cooldown) {

		var currenttime = Math.round(Date.now() / 1000);

		if (dname in this.triggered && currenttime < this.triggered[dname]) return false;

		if(dname in this.triggered) delete(this.triggered[dname]);

		if (dname in this.obj) {
			console.log(`increment ${dname} | ${this.obj[dname]}`);
			this.obj[dname]++;
		} else {
			console.log(`create ${dname}`);
			this.obj[dname] = 1;
		}

		if (this.obj[dname] >= repeat) {
			this.triggered[dname] = currenttime + (cooldown * 60)
			delete(this.obj[dname]);
			return true;
		} else {
			return false;
		}
	}

	decrement(dname) {
		if (dname in this.obj) {
			console.log(`decrement ${dname} | ${this.obj[dname]}`);
			this.obj[dname]--;
			if (this.obj[dname] < 0) {
				console.log(`delete ${dname} | ${this.obj[dname]}`);
				delete(this.obj[dname]);
			}
		} else {
			console.log(`!${dname}`)
		}
	}
}

var count = new Counter();

exports.run = (device, data, results, layer) => {

	var score = lh.classnameExists(results, layer.class, layer.score);
	if (score >= layer.score) {

		if(count.increment(dname+layer.class, layer.repeat, layer.cooldown)) {
			console.log(`Saw a ${layer.class} on ${device.name}!`);
			counter[device.name] = 0;
	
			if (layer.image) {
				//TODO: Post jpeg data
			} else {
				fetch(layer.endpoint.replace("{dname}", device.name).replace("{score}", score).replace("{date}", new Date().toISOString()).replace("{class}", layer.class));
			}
		}

	} else {
		count.decrement(dname+layer.class);
	}

	return results;
};