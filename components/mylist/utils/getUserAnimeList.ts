export const getUserAnimeListClient = async ({ userParam }: any) => {
  try {
    /**
     * If calling /api routes from the server,
     * it must be an absolute url.
     * However, client side /api calls can be relative.
     */
    const res = await fetch(`/api/anime-list/user/${userParam}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    if (data?.list) {
      return data.list;
    }
    return data;
  } catch (err) {
    console.log(err);
  }
};
