const mongoose = require('mongoose');

const corpusSchema = new mongoose.Schema({
  intent: { type: String, required: true, unique: true },
  utterances: [String],
  responses: [String],
  qValues: { type: [Number], default: [] } // Initialize qValues as an empty array
});

// Ensure qValues is initialized with zeros for each response
corpusSchema.pre('save', function(next) {
  // If qValues doesn't exist or has wrong length, initialize it properly
  if (!this.qValues || this.qValues.length !== this.responses.length) {
    this.qValues = new Array(this.responses.length).fill(0);
  }
  next();
});

const Corpus = mongoose.model('Intent', corpusSchema);

module.exports = Corpus;