import axios from "axios";

const API = "http://localhost:5000/api/users";

export const getUsers = async () => {
  const response = await axios.get(API);
  return response.data;
};