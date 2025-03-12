import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import CorpusManager from './components/CorpusManager';
import ProductManager from './components/ProductManager';
import ChatbotPage from './components/Chatbot';
import axios from 'axios';
import { ChatHistoryProvider } from './components/chatHistoryContext'; // Import the context provider

const App = () => {
  const handleTrainModel = async () => {
    try {
      const response = await axios.post("http://localhost:5000/api/train");
      console.log("Training started:", response.data);
      alert("Model training started successfully!");
    } catch (error) {
      console.error("Error training model:", error);
      alert("Failed to start model training.");
    }
  };

  return (
    <ChatHistoryProvider> {/* Wrap the app with the provider */}
      <Router>
        <div>
          <nav>
            <ul>
              <li>
                <button className="nav-btn" onClick={handleTrainModel}>
                  Train Model
                </button>
              </li>
              <li>
                <Link to="/intents">
                  <button className="nav-btn">Manage Intents</button>
                </Link>
              </li>
              <li>
                <Link to="/products">
                  <button className="nav-btn">Manage Products</button>
                </Link>
              </li>
              <li>
                <Link to="/chatbot">
                  <button className="nav-btn">Go to Chatbot</button>
                </Link>
              </li>
            </ul>
          </nav>

          <Routes>
            <Route path="/intents" element={<CorpusManager />} />
            <Route path="/products" element={<ProductManager />} />
            <Route path="/chatbot" element={<ChatbotPage />} />
          </Routes>
        </div>
      </Router>
    </ChatHistoryProvider>
  );
};

export default App;
