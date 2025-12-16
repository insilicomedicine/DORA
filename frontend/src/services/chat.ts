import { ChatCot, ChatMessage } from 'components/Chatbot/types';
import { HttpService as axios } from './HttpService';

//send message to chatbot
const sendMessage = async (documentId: string, message: string) => {
  const response = await axios.post(`/chat/message/${documentId}/`, {
    message
  });
  return response.data;
};

//get chat cot logs
const getChatCotLogs = async (documentId: string): Promise<ChatCot[]> => {
  const response = await axios.get(`/documents/${documentId}/cot/`);
  return response.data;
};

//get chat history
const getChatHistory = async (documentId: string): Promise<ChatMessage[]> => {
  const response = await axios.get(`/documents/${documentId}/chat_history/`);
  return response.data;
};

export { sendMessage, getChatCotLogs, getChatHistory };
