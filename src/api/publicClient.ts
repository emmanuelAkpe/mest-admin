import axios from 'axios'
import { mest_server } from './server'

// Unauthenticated axios instance for public-facing endpoints (submission portal, etc.)
const publicApi = axios.create({
  baseURL: mest_server,
  withCredentials: false,
})

export default publicApi
