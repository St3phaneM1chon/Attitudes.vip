const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

class WeddingAPI {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method for API calls
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, try to refresh
          const refreshed = await this.refreshToken();
          if (refreshed) {
            // Retry the request with new token
            return this.request(endpoint, options);
          }
        }
        
        const error = await response.json();
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  // Wedding endpoints
  async getWeddingData(weddingId) {
    return this.request(`/weddings/${weddingId}`);
  }

  async updateWedding(weddingId, data) {
    return this.request(`/weddings/${weddingId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  // Tasks endpoints
  async getTasks(weddingId) {
    return this.request(`/weddings/${weddingId}/tasks`);
  }

  async createTask(weddingId, task) {
    return this.request(`/weddings/${weddingId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(task)
    });
  }

  async updateTask(taskId, updates) {
    return this.request(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  async deleteTask(taskId) {
    return this.request(`/tasks/${taskId}`, {
      method: 'DELETE'
    });
  }

  // Vendors endpoints
  async getVendors(weddingId) {
    return this.request(`/weddings/${weddingId}/vendors`);
  }

  async addVendor(weddingId, vendor) {
    return this.request(`/weddings/${weddingId}/vendors`, {
      method: 'POST',
      body: JSON.stringify(vendor)
    });
  }

  async updateVendor(vendorId, updates) {
    return this.request(`/vendors/${vendorId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  async removeVendor(vendorId) {
    return this.request(`/vendors/${vendorId}`, {
      method: 'DELETE'
    });
  }

  // Guests endpoints
  async getGuests(weddingId) {
    return this.request(`/weddings/${weddingId}/guests`);
  }

  async addGuest(weddingId, guest) {
    return this.request(`/weddings/${weddingId}/guests`, {
      method: 'POST',
      body: JSON.stringify(guest)
    });
  }

  async updateGuest(guestId, updates) {
    return this.request(`/guests/${guestId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  async removeGuest(guestId) {
    return this.request(`/guests/${guestId}`, {
      method: 'DELETE'
    });
  }

  async importGuests(weddingId, file) {
    const formData = new FormData();
    formData.append('file', file);

    return this.request(`/weddings/${weddingId}/guests/import`, {
      method: 'POST',
      headers: {
        // Don't set Content-Type, let browser set it with boundary
      },
      body: formData
    });
  }

  // Budget endpoints
  async getBudget(weddingId) {
    return this.request(`/weddings/${weddingId}/budget`);
  }

  async updateBudget(weddingId, budget) {
    return this.request(`/weddings/${weddingId}/budget`, {
      method: 'PUT',
      body: JSON.stringify(budget)
    });
  }

  async addExpense(weddingId, expense) {
    return this.request(`/weddings/${weddingId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(expense)
    });
  }

  async updateExpense(expenseId, updates) {
    return this.request(`/expenses/${expenseId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  async deleteExpense(expenseId) {
    return this.request(`/expenses/${expenseId}`, {
      method: 'DELETE'
    });
  }

  // Emergency broadcast
  async sendEmergencyBroadcast(weddingId, message) {
    return this.request(`/weddings/${weddingId}/emergency`, {
      method: 'POST',
      body: JSON.stringify({ message, priority: 'urgent' })
    });
  }

  // Analytics
  async getWeddingAnalytics(weddingId) {
    return this.request(`/weddings/${weddingId}/analytics`);
  }

  // Timeline
  async getTimeline(weddingId) {
    return this.request(`/weddings/${weddingId}/timeline`);
  }

  async updateTimeline(weddingId, timeline) {
    return this.request(`/weddings/${weddingId}/timeline`, {
      method: 'PUT',
      body: JSON.stringify(timeline)
    });
  }
}

// Export singleton instance
const weddingAPI = new WeddingAPI();

export const getWeddingData = (weddingId) => weddingAPI.getWeddingData(weddingId);
export const updateWedding = (weddingId, data) => weddingAPI.updateWedding(weddingId, data);
export const getTasks = (weddingId) => weddingAPI.getTasks(weddingId);
export const createTask = (weddingId, task) => weddingAPI.createTask(weddingId, task);
export const updateTask = (taskId, updates) => weddingAPI.updateTask(taskId, updates);
export const getVendors = (weddingId) => weddingAPI.getVendors(weddingId);
export const addVendor = (weddingId, vendor) => weddingAPI.addVendor(weddingId, vendor);
export const getGuests = (weddingId) => weddingAPI.getGuests(weddingId);
export const addGuest = (weddingId, guest) => weddingAPI.addGuest(weddingId, guest);
export const sendEmergencyBroadcast = (weddingId, message) => weddingAPI.sendEmergencyBroadcast(weddingId, message);

export default weddingAPI;