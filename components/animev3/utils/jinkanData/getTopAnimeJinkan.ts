import { fetchWithTimeout } from "../fetchWithTimeout";

const sleep = (ms: number) => {
  return new Promise((r) => setTimeout(r, ms));
};

const mockFetch = async () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const time = Date.now();
      return resolve({ message: "hi", time: time });
    }, 2500);
  });
};

export const getTopAnimeJinkan = async ({ page = 1, isClient = false }) => {
  let baseUrl = process.env.JINKANV4_URL;
  if (isClient) {
    baseUrl = process.env.NEXT_PUBLIC_JINKANV4_URL;
  }
  try {
    const res = await fetchWithTimeout(`${baseUrl}/top/anime?page=${page}`, {
      timeout: 7000,
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.log(err);
    return {};
  }
};

export const getTopAnimeJinkanInitalPages = async ({
  pages = 1,
  isClient = false,
  enableLogs = false,
}) => {
  let baseUrl = process.env.JINKANV4_URL;
  if (isClient) {
    baseUrl = process.env.NEXT_PUBLIC_JINKANV4_URL;
  }
  try {
    let promiseArray = [];
    for (let i = 0; i < pages; i++) {
      promiseArray.push(
        fetchWithTimeout(`${baseUrl}/top/anime?page=${i + 1}`, {
          timeout: 5000,
        })
      );
    }

    const response = await Promise.all([...promiseArray]);
    if (enableLogs) {
      console.log(response[0].status);
      // console.log(response[0].headers);
    }
    const data = await Promise.all(response.map((res) => res.json()));

    return data;
  } catch (err) {
    console.log(err);
    return [];
  }
};
