export const updateUserAnnimeList = async (info: any) => {
  try {
    const res = await fetch("/api/anime-list/bulk", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: info,
      }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.log(err);
  }
};
