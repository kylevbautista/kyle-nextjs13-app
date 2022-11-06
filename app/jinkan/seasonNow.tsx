export const getSeasonNow = async () => {
  try {
    const res = await fetch("https://api.jikan.moe/v4/seasons/now");
    const data = await res.json();
    return data;
  } catch (err) {
    console.log("error", err);
  }
};
