import { API_BASE_URL } from './config';

export const getFlowAppointments = async () => {
  const response = await fetch(`${API_BASE_URL}/flow-appointments`, {
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch flow appointments');
  }

  return await response.json();
};

export const deleteFlowAppointment = async (id) => {
  const response = await fetch(`${API_BASE_URL}/flow-appointments/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to delete flow appointment');
  }

  return await response.json();
};