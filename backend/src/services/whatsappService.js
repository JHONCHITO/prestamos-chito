const axios = require("axios");

const token = "TU_ACCESS_TOKEN";
const phoneNumberId = "TU_PHONE_NUMBER_ID";

const enviarMensaje = async (numero, mensaje) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: numero,
        type: "text",
        text: { body: mensaje }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Mensaje enviado:", response.data);
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
};

module.exports = { enviarMensaje };