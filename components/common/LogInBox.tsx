"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef, useContext } from "react";
// import { unstable_getServerSession } from "next-auth/next";
// import { authOptions } from "../../server/auth";
import { LinkRouterWrapper } from "./LinkRouterWrapper";
// import { RouterChangeContext } from "./RouterChangeProvider";
import base64url from "base64url";

export default function LoginBox() {
  // const session = await unstable_getServerSession(authOptions);
  const { data: session, status } = useSession();
  const [showDropDown, setShowDropDown] = useState(false);
  // const startChange = useContext(RouterChangeContext);
  const dropDownRef = useRef(null);
  const rimururRef = useRef(null);

  const handleSignOut = () => {
    setShowDropDown(false);
    // startChange();
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
      <div className="flex items-center justify-items-center">
        <div>
          {/* <div
            ref={rimururRef}
            className="flex justify-center items-center hover:bg-blue-500 h-[63px] w-[63px] rounded-[50%] cursor-pointer"
            onClick={() => setShowDropDown(!showDropDown)}
          >
            <img src="/rimuru.png" alt="Avatar" className="h-[32px]" />
          </div> */}
          <div
            ref={rimururRef}
            className="flex h-[63px] w-[63px] cursor-pointer items-center justify-center rounded-[50%] hover:bg-blue-500"
            onClick={() => setShowDropDown(!showDropDown)}
          >
            <img
              src="/rimuru.png"
              alt="Avatar"
              className="absolute h-[32px] hover:opacity-0"
            />
            <img
              src="/assets/pepe-the-frog-dancing.gif"
              alt="Avatar"
              className="h-[30px]"
            />
          </div>
          {showDropDown && (
            <div
              className="absolute right-0 z-10 w-44 rounded-lg bg-gray-700 shadow"
              ref={dropDownRef}
            >
              <ul
                className="py-2 text-sm text-gray-200"
                aria-labelledby="dropdownDefaultButton"
              >
                <li onClick={() => setShowDropDown(!showDropDown)}>
                  <LinkRouterWrapper
                    href={`/mylist/${base64url(`${session?.user?.email}`)}`}
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
                <li onClick={() => setShowDropDown(!showDropDown)}>
                  <LinkRouterWrapper
                    href={`/user/${base64url(`${session?.user?.email}`)}`}
                    className="
                      block
                      px-4 
                      py-2 
                      hover:bg-blue-500
                    "
                  >
                    <p>My List New</p>
                  </LinkRouterWrapper>
                </li>
                <li onClick={() => setShowDropDown(!showDropDown)}>
                  <LinkRouterWrapper
                    href="https://www.trackkilo.com/"
                    className="
                      block
                      px-4 
                      py-2 
                      hover:bg-blue-500
                    "
                  >
                    <p>Lift Tracker</p>
                  </LinkRouterWrapper>
                </li>
                <li>
                  <button
                    className="flex w-full justify-start px-4 py-2 hover:bg-gray-600 hover:text-white"
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
            rounded-2xl
            p-5
            hover:bg-blue-500
          "
      >
        <p>LogIn</p>
      </LinkRouterWrapper>
    </div>
  );
}
