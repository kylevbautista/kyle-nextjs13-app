"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef, useContext } from "react";
// import { unstable_getServerSession } from "next-auth/next";
// import { authOptions } from "../../server/auth";
import { LinkRouterWrapper } from "./LinkRouterWrapper";
import { RouterChangeContext } from "./RouterChangeProvider";

export default function LoginBox() {
  // const session = await unstable_getServerSession(authOptions);
  const { data: session, status } = useSession();
  const [showDropDown, setShowDropDown] = useState(false);
  const startChange = useContext(RouterChangeContext);
  const dropDownRef = useRef(null);
  const rimururRef = useRef(null);

  const handleSignOut = () => {
    setShowDropDown(false);
    startChange();
    signOut({
      redirect: true,
      callbackUrl: "/",
    });
  };

  useEffect(() => {
    window.addEventListener("mousedown", function (e) {
      if (dropDownRef.current) {
        if (
          /* @ts-ignore */
          !dropDownRef.current.contains(e.target) &&
          /* @ts-ignore */
          !rimururRef.current.contains(e.target)
        ) {
          setShowDropDown(false);
        }
      }
    });
  }, [dropDownRef]);

  if (session) {
    return (
      <div className="flex justify-items-center items-center">
        <div>
          <div
            ref={rimururRef}
            className="flex justify-center items-center hover:bg-blue-500 h-[63px] w-[63px] rounded-[50%] cursor-pointer"
            onClick={() => setShowDropDown(!showDropDown)}
          >
            <img src="/rimuru.png" alt="Avatar" className="h-[32px]" />
          </div>
          {showDropDown && (
            <div
              className="z-10 rounded-lg shadow w-44 bg-gray-700 absolute right-0"
              ref={dropDownRef}
            >
              <ul
                className="py-2 text-sm text-gray-200"
                aria-labelledby="dropdownDefaultButton"
              >
                <li onClick={() => setShowDropDown(!showDropDown)}>
                  <LinkRouterWrapper
                    href="/mylist"
                    className="
                      block
                      px-4 
                      py-2 
                      hover:bg-blue-500
                    "
                  >
                    <p>My List</p>
                  </LinkRouterWrapper>
                </li>
                <li>
                  <button
                    className="flex justify-start w-full px-4 py-2 hover:bg-gray-600 hover:text-white"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-items-center">
      <LinkRouterWrapper
        href="/auth"
        className="
            block
            p-5
            hover:bg-blue-500
            rounded-2xl
          "
      >
        <p>LogIn</p>
      </LinkRouterWrapper>
    </div>
  );
}
