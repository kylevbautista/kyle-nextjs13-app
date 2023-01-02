import { print as stringifyTag } from "graphql";

export const fetchFromGraphQLServer = async ({
  query: tag,
  variables: args = null,
}: {
  query: any;
  variables?: any;
}) => {
  const parameters = {
    variables: {
      ...args,
    },
  };

  const res = await fetch("/api/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: stringifyTag(tag),
      ...(args && parameters),
    }),
  });

  return res;
};
