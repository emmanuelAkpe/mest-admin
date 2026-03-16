import axios from 'axios'

// Unauthenticated axios instance for public-facing endpoints (submission portal, etc.)
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: false,
})

export default publicApi
