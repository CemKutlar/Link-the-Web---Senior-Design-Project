import axios from "axios";
import { Auth } from "@aws-amplify/auth";

console.log(process.env.REACT_APP_SERVER_URL);
// backend added to the env variable in secrets!
const api = axios.create({
  baseURL: `https://${process.env.REACT_APP_SERVER_URL}/backend`,
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

export function makeAuthRequest(url, options) {
  return Auth.currentAuthenticatedUser()
    .then((user) => {
      const token = user.signInUserSession.idToken.jwtToken;
      //console.log(url);
      //console.log("makeAuthRequest'e girdi", token);
      return api(url, {
        ...options,
        headers: {
          ...options.headers,
          // Ensure the Authorization header has the 'Bearer' prefix followed by a space
          Authorization: `Bearer ${token}`,
        },
      });
    })
    .then((res) => res.data)
    .catch((error) => {
      console.error("Request Error:", error);
      return Promise.reject(error?.response?.data?.message ?? "Error");
    });
}
