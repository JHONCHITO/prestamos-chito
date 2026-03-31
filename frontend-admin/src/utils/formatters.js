export const formatCurrency = (value) => {
  if (!value && value !== 0) return "$0";
  return "$" + Number(value).toLocaleString("es-CO");
};

export const formatMoney = (value) => {
  if (!value && value !== 0) return "$0";
  return "$" + Number(value).toLocaleString("es-CO");
};

export const formatDate = (date) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("es-CO");
};

export const formatPercent = (value) => {
  if (!value && value !== 0) return "0%";
  return value + "%";
};
