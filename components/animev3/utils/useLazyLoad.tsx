import { useState, useRef, useEffect } from "react";
import { sliceIntoChunks } from "../helpers";

export default function useLazyLoad(
  arr: any[],
  nextPage: any,
  getAniListClient: any,
  obj: any,
  byCount: any,
  prevCountRef: any
) {
  const observedRef = useRef<any>(null);
  const [pageNumber, setPageNumber] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const chunks = sliceIntoChunks(arr, 2);
  const [data, setData] = useState(chunks[0]);

  const updateData = () => {
    if (pageNumber < chunks.length - 1) {
      setData((prev) => {
        return [...prev, ...chunks[pageNumber + 1]];
      });
      setPageNumber(pageNumber + 1);
    }
  };

  const reset = () => {
    setPageNumber(0);
    setHasMore(true);

    const chunks = sliceIntoChunks(arr, 2);
    setData(chunks[0]);
  };

  const observedRefCallBack = (el: any) => {
    if (observedRef.current) {
      observedRef.current.disconnect();
    }
    observedRef.current = new IntersectionObserver((el) => {
      if (el[0].isIntersecting) {
        if (pageNumber < chunks.length - 1) {
          updateData();
        } else if (nextPage) {
          console.log("client call");
          getAniListClient(obj);
        } else {
          setHasMore(false);
        }
      }
    });
    if (el) {
      observedRef.current.observe(el);
    }
  };

  useEffect(() => {
    reset();
  }, [arr]);

  return {
    observedRefCallBack,
    pageNumber,
    setPageNumber,
    chunks,
    data,
    setData,
    setHasMore,
    updateData,
    hasMore,
    reset,
  };
}
