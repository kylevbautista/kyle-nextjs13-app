## Redirected `pages/api` to look at `server` folder

- I prefer having server code in a folder called `server`.
  - However since NextJS looks for server/api code in the `pages/api` folder, I made the `pages/api` folder pull in code from the new `server` folder, which is located at root directory.
