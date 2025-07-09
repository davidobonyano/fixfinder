export const saveService = async (data) => {
  const existing = JSON.parse(localStorage.getItem("addedServices")) || [];
  existing.push(data);
  localStorage.setItem("addedServices", JSON.stringify(existing));
  return Promise.resolve("success");
};
