import PageBase from "../components/home/PageBase";

/**
 * Can't invalidate cache in nextjs13 with graphqlrequest
 * Have to use native fetch api to make graphql post request
 * @returns data
 */

export default function Home() {
  return <PageBase />;
}
