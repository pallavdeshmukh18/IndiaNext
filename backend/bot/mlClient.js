const axios = require("axios");

const ML_BASE_URL = process.env.ML_BASE_URL || "http://localhost:5001";

const analyzeWithMl = async (service, payload) => {
  const response = await axios.post(`${ML_BASE_URL}${service.endpoint}`, payload, {
    timeout: 30000,
  });

  return response.data;
};

module.exports = {
  analyzeWithMl,
};
