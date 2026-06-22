import axios from 'axios';

const API_TIMEOUT = process.env.TABLET_API_TIMEOUT || 30000;

export class TabletClient {
  constructor(tabletUrl) {
    this.baseURL = tabletUrl;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async pullLogs(readMark = 0) {
    try {
      const response = await this.client.post('/api/device/pull-logs', {
        readMark,
      });
      return response.data;
    } catch (error) {
      console.error('Error pulling logs from tablet:', error.message);
      throw error;
    }
  }

  async addUser(userId, name) {
    try {
      const response = await this.client.post('/api/device/users', {
        userId,
        name,
      });
      return response.data;
    } catch (error) {
      console.error('Error adding user to device:', error.message);
      throw error;
    }
  }

  async deleteUser(userId) {
    try {
      const response = await this.client.delete(`/api/device/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting user from device:', error.message);
      throw error;
    }
  }

  async getDeviceStatus() {
    try {
      const response = await this.client.get('/api/device/status');
      return response.data;
    } catch (error) {
      console.error('Error getting device status:', error.message);
      throw error;
    }
  }

  async connectDevice(ip, port, license) {
    try {
      const response = await this.client.post('/api/device/connect', {
        ipAddress: ip,
        port,
        license,
      });
      return response.data;
    } catch (error) {
      console.error('Error connecting device:', error.message);
      throw error;
    }
  }

  async disconnectDevice() {
    try {
      const response = await this.client.post('/api/device/disconnect');
      return response.data;
    } catch (error) {
      console.error('Error disconnecting device:', error.message);
      throw error;
    }
  }

  async getUsers() {
    try {
      const response = await this.client.get('/api/device/users');
      return response.data;
    } catch (error) {
      console.error('Error getting users from device:', error.message);
      throw error;
    }
  }

  async health() {
    try {
      const response = await this.client.get('/api/health');
      return response.data;
    } catch (error) {
      console.error('Error checking tablet health:', error.message);
      throw error;
    }
  }
}
