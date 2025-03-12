import React, { useState, useContext, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaThumbsUp, FaThumbsDown, FaRegMeh } from 'react-icons/fa';
import { ChatHistoryContext } from './chatHistoryContext';

const ChatbotPage = () => {
  const { chatHistory, addToChatHistory, clearChatHistory } = useContext(ChatHistoryContext);
  const [userMessage, setUserMessage] = useState('');
  const messageListRef = useRef(null);
  const [lastResponseId, setLastResponseId] = useState(null);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userMessage.trim()) return;

    const newUserMessage = { sender: 'user', text: userMessage };
    addToChatHistory(newUserMessage);  // Add the user message to chat history
    setUserMessage('');

    try {
      const response = await axios.post('http://localhost:5000/api/chat', { message: userMessage });
      const botReply = response.data.reply;
      const responseId = response.data.responseId;  // Capture responseId from the response data
      const intentName = response.data.intentName; // Capture the intent name

      // Add the bot's response to the chat history
      addToChatHistory({
        sender: 'bot',
        text: botReply,
        responseId: responseId, // Store the responseId with the message
        intentName: intentName  // Store the intent name if needed
      });
      
      setLastResponseId(responseId);  // Store the responseId for future use
    } catch (error) {
      console.error('Error sending message:', error);
      // Add an error message to the chat
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

      // Send the feedback to the server
      await axios.post('http://localhost:5000/api/chat/feedback', { responseId, feedback });
      console.log('Feedback submitted:', feedback, 'for responseId:', responseId);
      
      // Optionally, you could provide visual feedback that the rating was recorded
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const handleClearHistory = () => {
    clearChatHistory();  // Use context function to clear the history
  };

  return (
    <div className="chat-container">
      <button onClick={handleClearHistory} className="clear-button">Clear History</button>

      <ul ref={messageListRef} className="message-list">
        {chatHistory.map((message, index) => (
          <li key={index} className={message.sender === 'user' ? 'user-message' : 'bot-message'}>
            <div>{message.text}</div>

            {message.sender === 'bot' && message.responseId && (
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