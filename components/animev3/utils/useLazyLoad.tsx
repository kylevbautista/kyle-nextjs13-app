import { useState, useRef, useEffect } from "react";
import { sliceIntoChunks } from "../helpers";

export default function useLazyLoad({
  data,
  hasNextPage,
  callback,
  callBackParams,
  sortSelect,
}: any) {
  const observedRef = useRef<any>(null);
  const [pageNumber, setPageNumber] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const chunks = sliceIntoChunks(data, 2);
  const [chunkedData, setChunkedData] = useState(chunks[0]);

  const updateData = () => {
    if (pageNumber < chunks.length - 1) {
      setChunkedData((prev) => {
        return [...prev, ...chunks[pageNumber + 1]];
      });
      setPageNumber(pageNumber + 1);
    }
  };

  const reset = () => {
    setPageNumber(0);
    setHasMore(true);

    const chunks = sliceIntoChunks(data, 2);
    setChunkedData(chunks[0]);
  };

  const observedRefCallBack = (el: any) => {
    if (observedRef.current) {
      observedRef.current.disconnect();
    }
    observedRef.current = new IntersectionObserver(
      (el) => {
        if (el[0].isIntersecting) {
          if (pageNumber < chunks.length - 1) {
            updateData();
          } else if (hasNextPage) {
            console.log("client call");
            callback(callBackParams);
          } else {
            setHasMore(false);
          }
        }
      },
      { root: null, rootMargin: "0px", threshold: 0.5 }
    );
    if (el) {
      observedRef.current.observe(el);
    }
  };

  useEffect(() => {
    reset();
  }, [sortSelect]);

  return {
    observedRefCallBack,
    pageNumber,
    setPageNumber,
    chunks,
    chunkedData,
    setChunkedData,
    setHasMore,
    updateData,
    hasMore,
    reset,
  };
}
