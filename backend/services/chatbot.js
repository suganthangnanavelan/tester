require('dotenv').config();
const { dockStart } = require('@nlpjs/basic');
const Intent = require('../models/corpus');
const Product = require('../models/product');
const axios = require('axios');
const mongoose = require('mongoose');

let nlp;

const trainModel = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/restaurant');
    console.log("Connected to MongoDB");

    const dock = await dockStart({ use: ['Basic'] });
    nlp = dock.get('nlp');
    nlp.addLanguage('en');

    const intents = await Intent.find();

    intents.forEach(intent => {
      intent.utterances.forEach(utterance => {
        nlp.addDocument('en', utterance, intent.intent);
      });

      intent.responses.forEach(response => {
        nlp.addAnswer('en', intent.intent, response);
      });
    });

    await nlp.train();
    nlp.save();
    console.log("NLP model trained and saved");
    return "Loaded Intents and Trained Model Successfully";
  } catch (error) {
    console.error("Error connecting to MongoDB or training model:", error);
  }
};

const getProducts = async () => {
  try {
    const products = await Product.find({});        
    return products.map((product) => product.name);
  } catch (error) {
    console.error('Error fetching products:', error.message);
    return [];
  }
};

const placeOrder = async (product, quantity) => {
  try {
    const response = await axios.post('http://localhost:5000/api/place-order', {
      product,
      quantity,
    });
    return response.data.reply;
  } catch (error) {
    console.error('Error placing order:', error.message);
    return 'There was an issue placing your order. Please try again later.';
  }
};

let selectedProduct = null;
let selectedQuantity = null;

const handleUserInput = async (input) => {
  try {
    if (!nlp) {
      console.error('NLP Manager is not initialized.');
      return { reply: 'Sorry, the chatbot is currently not ready. Please try again later.' };
    }

    const response = await nlp.process('en', input);
    const intent = response.intent;

    // Create a unique responseId for each response
    const responseId = new mongoose.Types.ObjectId(); // Generate a new unique ObjectId for response

    // Fetch the intent from the database to access the responses and their Q-values
    const intentFromDB = await Intent.findOne({ intent });

    if (intentFromDB) {
      // Pick the response with the highest Q-value (if available)
      const bestResponseIndex = intentFromDB.qValues.indexOf(Math.max(...intentFromDB.qValues));
      const bestResponse = intentFromDB.responses[bestResponseIndex];

      return { reply: bestResponse, responseId, intentName: intent };
    } else {
      return { reply: response.answer || "Sorry, I didn't understand that. Could you please clarify?", responseId, intentName: intent };
    }
  } catch (error) {
    console.error('Error handling user input:', error.message);
    return { reply: 'An error occurred while processing your input. Please try again.' };
  }
};

const updateFeedback = async (responseId, feedback) => {
  if (!responseId) {
    console.error('No responseId provided for feedback');
    return;
  }

  try {
    const intent = await Intent.findOne({ 'responses._id': responseId });
    if (!intent) {
      console.error('Intent not found for responseId:', responseId);
      return;
    }

    const responseIndex = intent.responses.findIndex(response => response._id.toString() === responseId);
    if (responseIndex === -1) {
      console.error('Response not found in intent:', responseId);
      return;
    }

    // Initialize qValues if empty
    if (!intent.qValues || intent.qValues.length === 0) {
      intent.qValues = new Array(intent.responses.length).fill(0); // Fill qValues with zeros if empty
    }

    // Update the Q-value based on feedback
    let reward = 0;
    if (feedback === 'thumbs_up') reward = 1;  // Positive feedback
    else if (feedback === 'thumbs_down') reward = -1; // Negative feedback
    else reward = 0; // Neutral feedback

    // Reinforcement learning step: Update the Q-value for the response
    intent.qValues[responseIndex] += reward;  // Modify the Q-value based on the feedback

    // Save updated intent with new qValues
    await intent.save();
    console.log('Q-values updated for responseId:', responseId, 'New Q-values:', intent.qValues);
  } catch (error) {
    console.error('Error updating feedback:', error);
  }
};

trainModel();

module.exports = { handleUserInput, trainModel, updateFeedback };
