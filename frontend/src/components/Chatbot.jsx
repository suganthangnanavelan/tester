import React, { useState, useContext, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaThumbsUp, FaThumbsDown, FaRegMeh } from 'react-icons/fa';
import { ChatHistoryContext } from './chatHistoryContext';

const ChatbotPage = () => {
  const { chatHistory, addToChatHistory, clearChatHistory } = useContext(ChatHistoryContext);
  const [userMessage, setUserMessage] = useState('');
  const messageListRef = useRef(null);
  const [lastResponseId, setLastResponseId] = useState(null);
  const [rlhfMode, setRlhfMode] = useState(false);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userMessage.trim()) return;

    const newUserMessage = { sender: 'user', text: userMessage };
    addToChatHistory(newUserMessage);
    setUserMessage('');

    try {
      const response = await axios.post('http://localhost:5000/api/chat', { message: userMessage });
      const botReply = response.data.reply;
      const responseId = response.data.responseId;
      const intentName = response.data.intentName;

      addToChatHistory({
        sender: 'bot',
        text: botReply,
        responseId: responseId,
        intentName: intentName
      });
      
      setLastResponseId(responseId);
    } catch (error) {
      console.error('Error sending message:', error);
      addToChatHistory({
        sender: 'bot',
        text: 'Sorry, there was an error processing your request. Please try again.'
      });
    }
  };

  const handleFeedback = async (responseId, feedback) => {
    try {
      if (!responseId) {
        console.error('No responseId provided for feedback');
        return;
      }

      await axios.post('http://localhost:5000/api/chat/feedback', { responseId, feedback });
      console.log('Feedback submitted:', feedback, 'for responseId:', responseId);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const handleClearHistory = () => {
    clearChatHistory();
  };

  const toggleRlhfMode = () => {
    setRlhfMode(!rlhfMode);
  };

  return (
    <div className="chat-container">
      <div className="chatbot-controls">
        <button onClick={handleClearHistory} className="clear-button">Clear History</button>
        <button 
          onClick={toggleRlhfMode} 
          className={`rlhf-toggle ${rlhfMode ? 'rlhf-active' : ''}`}
        >
          {rlhfMode ? 'Disable Feedback' : 'Enable Feedback'}
        </button>
      </div>

      <ul ref={messageListRef} className="message-list">
        {chatHistory.map((message, index) => (
          <li key={index} className={message.sender === 'user' ? 'user-message' : 'bot-message'}>
            <div>{message.text}</div>

            {message.sender === 'bot' && message.responseId && rlhfMode && (
              <div className="feedback-buttons">
                <label className="thumbs-up-label">
                  <input
                    type="radio"
                    name={`feedback-${index}`}
                    onClick={() => handleFeedback(message.responseId, 'thumbs_up')}
                  />
                  <FaThumbsUp />
                </label>

                <label className="thumbs-down-label">
                  <input
                    type="radio"
                    name={`feedback-${index}`}
                    onClick={() => handleFeedback(message.responseId, 'thumbs_down')}
                  />
                  <FaThumbsDown />
                </label>

                <label className="neutral-label">
                  <input
                    type="radio"
                    name={`feedback-${index}`}
                    onClick={() => handleFeedback(message.responseId, 'neutral')}
                  />
                  <FaRegMeh />
                </label>
              </div>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={handleSendMessage} className="chat-form">
        <input
          type="text"
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          placeholder="Type your message..."
          className="message-input"
        />
        <button type="submit" className="send-button">Send</button>
      </form>
    </div>
  );
};

export default ChatbotPage;