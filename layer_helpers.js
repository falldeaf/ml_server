const sharp = require('sharp');

module.exports = {
	getSource: (frame, results, classname) => {

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
	},

	//Check results for a classname and return the score (-1 for not found)
	classnameExists: (results, classname, conf) => {
		for(const result of results) {
			if(result.class == classname &&
				result.score >= conf) return result.score;
		}
		return -1;
	}
}