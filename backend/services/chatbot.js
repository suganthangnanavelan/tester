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
    
    switch (intentName) {
      case 'menu.showAllItems': {
        const products = await Product.find({});
        if (products.length > 0) {
          const productDetails = products.map(product => 
            `${product.name} (${product.category}) - $${product.price}: ${product.description}`
          ).join('\n');
          return { 
            reply: `Here is our menu:\n${productDetails}`, 
            responseId: null,
            intentName 
          };
        } else {
          return { 
            reply: "Sorry, we currently do not have any items on our menu.", 
            responseId: null,
            intentName 
          };
        }
      }
      case 'order.selectProduct': {
        const products = await getProducts();
        selectedProduct = products.find((product) => input.toLowerCase().includes(product.toLowerCase()));
        if (selectedProduct) {
          return { 
            reply: `You selected ${selectedProduct}. How many would you like to order?`, 
            responseId: null,
            intentName 
          };
        } else {
          return { 
            reply: `Sorry, we do not have that product. Here is our menu: ${products.join(', ')}`, 
            responseId: null,
            intentName 
          };
        }
      }
      case 'order.specifyQuantity': {
        if (!selectedProduct) {
          return { 
            reply: "Please specify the product you'd like to order first.", 
            responseId: null,
            intentName 
          };
        }
        selectedQuantity = input.match(/\d+/)?.[0];
        if (selectedQuantity) {
          return { 
            reply: `You want ${selectedQuantity} ${selectedProduct}. Shall I place the order?`, 
            responseId: null,
            intentName 
          };
        } else {
          return { 
            reply: "I didn't catch the quantity. Could you please specify how many you'd like to order?", 
            responseId: null,
            intentName 
          };
        }
      }
      case 'order.placeOrder': {
        if (selectedProduct && selectedQuantity) {
          const apiResponse = await placeOrder(selectedProduct, selectedQuantity);
          const reply = `Great! I am placing your order for ${selectedQuantity} ${selectedProduct}. ${apiResponse}`;

          selectedProduct = null;
          selectedQuantity = null;
          return { 
            reply, 
            responseId: null,
            intentName 
          };
        } else {
          return { 
            reply: "Sorry, I need to know what product and quantity you want before placing the order.", 
            responseId: null,
            intentName 
          };
        }
      }
    }
    
    const intentDoc = await Intent.findOne({ intent: intentName });
    
    if (!intentDoc) {
      return { 
        reply: response.answer || "Sorry, I didn't understand that. Could you please clarify?", 
        responseId: null,
        intentName 
      };
    }
  
    if (!intentDoc.qValues || intentDoc.qValues.length !== intentDoc.responses.length) {
      intentDoc.qValues = new Array(intentDoc.responses.length).fill(0);
      await intentDoc.save();
    }
    
    const epsilon = 0.2;
    let responseIndex;
    
    if (Math.random() < epsilon) {
      responseIndex = Math.floor(Math.random() * intentDoc.responses.length);
      console.log(`Exploring: Chose random response ${responseIndex} for intent ${intentName}`);
    } 
    else {
      responseIndex = intentDoc.qValues.indexOf(Math.max(...intentDoc.qValues));
      if (responseIndex < 0 || responseIndex >= intentDoc.responses.length) {
        responseIndex = 0;
      }
      console.log(`Exploiting: Chose best response ${responseIndex} for intent ${intentName} with Q-value ${intentDoc.qValues[responseIndex]}`);
    }

    const selectedResponse = intentDoc.responses[responseIndex];
    
    return { 
      reply: selectedResponse || response.answer || "I'm not sure how to respond to that.",
      responseId: `${intentDoc._id}:${responseIndex}`,
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
    const [intentId, responseIndex] = responseId.split(':');
    
    if (!intentId || responseIndex === undefined) {
      console.error('Invalid responseId format:', responseId);
      return;
    }

    const intent = await Intent.findById(intentId);
    
    if (!intent) {
      console.error('Intent not found for intentId:', intentId);
      return;
    }

    if (!intent.qValues || intent.qValues.length !== intent.responses.length) {
      intent.qValues = new Array(intent.responses.length).fill(0);
    }
    
    let reward = 0;
    if (feedback === 'thumbs_up') reward = 1;
    else if (feedback === 'thumbs_down') reward = -1;
    else reward = 0;
    
    const indexNum = parseInt(responseIndex, 10);
    
    if (indexNum >= 0 && indexNum < intent.qValues.length) {
      intent.qValues[indexNum] += reward;
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