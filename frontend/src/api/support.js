import apiClient from './client';

export const supportApi = {
  // Public / Customer: Submit a new inquiry or support query
  submitTicket: async (ticketData) => {
    const response = await apiClient.post('/support', ticketData);
    return response.data;
  },

  // Owner: Get all support tickets with filtering, searching, and sorting
  getAllTickets: async (params = {}) => {
    const response = await apiClient.get('/support/all', { params });
    return response.data;
  },

  // Owner & Ticket Creator: Get single ticket details and conversation thread
  getTicketDetails: async (ticketId) => {
    const response = await apiClient.get(`/support/${ticketId}`);
    return response.data;
  },

  // Owner & Ticket Creator: Send reply to ticket
  replyToTicket: async (ticketId, replyData) => {
    const response = await apiClient.post(`/support/${ticketId}/reply`, replyData);
    return response.data;
  },

  // Owner: Update ticket status (Open, In Progress, Replied, Resolved)
  updateTicketStatus: async (ticketId, status) => {
    const response = await apiClient.put(`/support/${ticketId}/status`, { status });
    return response.data;
  },

  // Owner: Get unresolved and open ticket count for notification badge
  getUnreadCount: async () => {
    const response = await apiClient.get('/support/unread-count');
    return response.data;
  },

  // Customer: Get logged-in customer's tickets
  getMyTickets: async (params = {}) => {
    const response = await apiClient.get('/support/my-tickets', { params });
    return response.data;
  },
};

export default supportApi;
