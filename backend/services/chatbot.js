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
    const intentName = response.intent;
    
    // Fetch the intent document from the database
    const intentDoc = await Intent.findOne({ intent: intentName });
    
    if (!intentDoc) {
      return { 
        reply: response.answer || "Sorry, I didn't understand that. Could you please clarify?", 
        responseId: null,
        intentName 
      };
    }
    
    // Select response based on Q-values
    let responseIndex = 0;
    
    // If we have Q-values, use them to select the best response
    if (intentDoc.qValues && intentDoc.qValues.length > 0) {
      // Find the index of the maximum Q-value
      responseIndex = intentDoc.qValues.indexOf(Math.max(...intentDoc.qValues));
      
      // Fallback if the index is invalid
      if (responseIndex < 0 || responseIndex >= intentDoc.responses.length) {
        responseIndex = 0;
      }
    }
    
    // Get the selected response
    const selectedResponse = intentDoc.responses[responseIndex];
    
    // Return the response along with the intent ID and the response index
    // This will be used for feedback
    return { 
      reply: selectedResponse || response.answer || "I'm not sure how to respond to that.",
      responseId: `${intentDoc._id}:${responseIndex}`, // Format: intentId:responseIndex
      intentName
    };
    
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
    // Parse the responseId to extract intentId and responseIndex
    const [intentId, responseIndex] = responseId.split(':');
    
    if (!intentId || responseIndex === undefined) {
      console.error('Invalid responseId format:', responseId);
      return;
    }
    
    // Find the intent by ID
    const intent = await Intent.findById(intentId);
    
    if (!intent) {
      console.error('Intent not found for intentId:', intentId);
      return;
    }
    
    // Initialize qValues if it doesn't exist or has wrong length
    if (!intent.qValues || intent.qValues.length !== intent.responses.length) {
      intent.qValues = new Array(intent.responses.length).fill(0);
    }
    
    // Update the Q-value based on feedback
    let reward = 0;
    if (feedback === 'thumbs_up') reward = 1;      // Positive feedback
    else if (feedback === 'thumbs_down') reward = -1; // Negative feedback
    else reward = 0;                              // Neutral feedback
    
    // Convert responseIndex to a number to ensure proper indexing
    const indexNum = parseInt(responseIndex, 10);
    
    // Ensure valid index
    if (indexNum >= 0 && indexNum < intent.qValues.length) {
      // Apply reward to the Q-value
      intent.qValues[indexNum] += reward;
      
      // Save updated intent with new qValues
      await intent.save();
      console.log('Q-values updated for intent:', intentId, 'response index:', indexNum, 'New Q-values:', intent.qValues);
    } else {
      console.error('Response index out of bounds:', indexNum, 'Max:', intent.qValues.length - 1);
    }
  } catch (error) {
    console.error('Error updating feedback:', error);
  }
};

trainModel();

module.exports = { handleUserInput, trainModel, updateFeedback };