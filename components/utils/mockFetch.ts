const mockFetch = async () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log("mock fetch...");
      return resolve({ data: {} });
    }, 2000);
  });
};
export { mockFetch };
