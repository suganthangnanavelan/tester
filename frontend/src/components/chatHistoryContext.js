import React, { createContext, useState, useEffect } from 'react';

export const ChatHistoryContext = createContext();

export const ChatHistoryProvider = ({ children }) => {
  const [chatHistory, setChatHistory] = useState(() => {
    const savedHistory = localStorage.getItem('chatHistory');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
  }, [chatHistory]);

  const addToChatHistory = (message) => {
    setChatHistory((prevHistory) => [...prevHistory, message]);
  };

  const clearChatHistory = () => {
    setChatHistory([]);
    localStorage.removeItem('chatHistory');
  };

  return (
    <ChatHistoryContext.Provider value={{ chatHistory, addToChatHistory, clearChatHistory }}>
      {children}
    </ChatHistoryContext.Provider>
  );
};
