var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// See http://mongoosejs.com/docs/schematypes.html

var ufoSchema = new Schema({
	city: String,
	date: Date,
	url: {type: String, unique: true},
	state: String,
	summary: String,
	duration: String,
	shape: String,
	loc: {
	    type: [Number],  // [<longitude>, <latitude>]
	    index: '2dsphere'      // create the geospatial index
		},
	dateAdded : { type: Date, default: Date.now },
})

// export 'Ufo' model so we can interact with it in other files
module.exports = mongoose.model('Ufo', ufoSchema);
