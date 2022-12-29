import { useState, useRef } from "react";
import { sliceIntoChunks } from "../helpers";

export default function useLazyLoad(arr: any[]) {
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

  const observedRefCallBack = (el: any) => {
    if (observedRef.current) {
      observedRef.current.disconnect();
    }
    observedRef.current = new IntersectionObserver((el) => {
      if (el[0].isIntersecting) {
        if (pageNumber < chunks.length - 1) {
          updateData();
        } else {
          setHasMore(false);
        }
      }
    });
    if (el) {
      observedRef.current.observe(el);
    }
  };

  return {
    observedRefCallBack,
    pageNumber,
    setPageNumber,
    chunks,
    data,
    setData,
    updateData,
    hasMore,
  };
}
