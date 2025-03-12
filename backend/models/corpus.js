const mongoose = require('mongoose');

const corpusSchema = new mongoose.Schema({
  intent: { type: String, required: true, unique: true },
  utterances: [String],
  responses: [String],
  qValues: { type: [Number], default: [] } // Initialize qValues as an empty array
});

const Corpus = mongoose.model('Intent', corpusSchema);

module.exports = Corpus;
