import axios from 'axios';

// Use the current hostname to allow access from other devices on the network
const hostname = window.location.hostname;
const BASE_URL = `http://${hostname}:8000/api`;
export const API_BASE_URL = BASE_URL;

// Interceptors are now configured in index.js globally

export const register = (data) => axios.post(`${BASE_URL}/register`, null, { params: data });
export const login = (data) => axios.post(`${BASE_URL}/login`, null, { params: data });
export const recoverPassword = (data) => axios.post(`${BASE_URL}/recover-password`, null, { params: data });
export const backupDB = () => axios.get(`${BASE_URL}/backup-db`);
export const getExpiringDrugs = () => axios.get(`${BASE_URL}/expiring-drugs`);
// سایر API ها را به همین صورت اضافه کنید

export const getWarehouses = () => axios.get(`${BASE_URL}/warehouses`);
export const addWarehouse = (data) => axios.post(`${BASE_URL}/warehouses`, data);
export const getDrugs = () => axios.get(`${BASE_URL}/drugs`);
export const addDrug = (data) => axios.post(`${BASE_URL}/drugs`, data);
export const getSuppliers = () => axios.get(`${BASE_URL}/suppliers`);
export const addSupplier = (data) => axios.post(`${BASE_URL}/suppliers`, data);
export const getConsumers = () => axios.get(`${BASE_URL}/consumers`);
export const addConsumer = (data) => axios.post(`${BASE_URL}/consumers`, data);
export const getInventory = () => axios.get(`${BASE_URL}/inventory`);
export const addInventory = (data) => axios.post(`${BASE_URL}/inventory`, data);
export const getLogs = () => axios.get(`${BASE_URL}/logs`);

export const getInventoryReport = (params) => axios.get(`${BASE_URL}/inventory/report`, { params });

export const exportExcel = (params) => axios.get(`${BASE_URL}/export-excel`, { params, responseType: 'blob' });
export const exportPDF = (params) => axios.get(`${BASE_URL}/export-pdf`, { params, responseType: 'blob' });

export const getUsers = () => axios.get(`${BASE_URL}/users`);
export const addUser = (data) => axios.post(`${BASE_URL}/users`, data);
export const updateUser = (id, data) => axios.put(`${BASE_URL}/users/${id}`, data);
export const deleteUser = (id) => axios.delete(`${BASE_URL}/users/${id}`);
export const changePassword = (data) => {
  const token = localStorage.getItem('token');
  return axios.post(`${BASE_URL}/change-password`, data, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const getSettings = () => axios.get(`${BASE_URL}/settings`);
export const updateSettings = (data) => axios.post(`${BASE_URL}/settings`, data);

export const getTransfers = () => axios.get(`${BASE_URL}/transfer/all`);
export const createTransfer = (data) => axios.post(`${BASE_URL}/transfer`, data);
export const confirmTransfer = (id, quantity_received) => axios.post(`${BASE_URL}/transfer/${id}/confirm`, null, { params: { quantity_received } });
export const rejectTransfer = (id) => axios.post(`${BASE_URL}/transfer/${id}/reject`);
