import axios from "../../axiosConfig";
const API="/api/collection-tracking";
export const ctGet=(url,config)=>axios.get(`${API}${url}`,config);
export const ctPost=(url,data,config)=>axios.post(`${API}${url}`,data,config);
export const ctPut=(url,data,config)=>axios.put(`${API}${url}`,data,config);
export const ctDelete=(url,config)=>axios.delete(`${API}${url}`,config);
