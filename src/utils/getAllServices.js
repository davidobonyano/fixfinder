import jsonServices from "../data/services.json";

export const getAllServices = () => {
  const stored = JSON.parse(localStorage.getItem("addedServices")) || [];
  return [...jsonServices, ...stored];
};
