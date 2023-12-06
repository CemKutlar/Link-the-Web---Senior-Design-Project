import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_SERVER_URL,
  withCredentials: true,
});

export function makeRequest(url, options) {
  return api(url, options)
    .then((res) => res.data)
    .catch((error) => {
      console.error("Request Error:", error);
      return Promise.reject(error?.response?.data?.message ?? "Error");
    });
}
