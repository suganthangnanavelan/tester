import React, { createContext, useState, useEffect } from 'react';

// Create the ChatHistory context
export const ChatHistoryContext = createContext();

// Create a provider for the context
export const ChatHistoryProvider = ({ children }) => {
  const [chatHistory, setChatHistory] = useState(() => {
    // Retrieve from localStorage if available
    const savedHistory = localStorage.getItem('chatHistory');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  useEffect(() => {
    // Store the chat history to localStorage when it changes
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
  }, [chatHistory]);

  // Function to add new messages to chat history
  const addToChatHistory = (message) => {
    setChatHistory((prevHistory) => [...prevHistory, message]);
  };

  // Function to clear chat history
  const clearChatHistory = () => {
    setChatHistory([]); // Clear the history
    localStorage.removeItem('chatHistory'); // Remove from localStorage
  };

  return (
    <ChatHistoryContext.Provider value={{ chatHistory, addToChatHistory, clearChatHistory }}>
      {children}
    </ChatHistoryContext.Provider>
  );
};
