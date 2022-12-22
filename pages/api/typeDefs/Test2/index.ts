import { gql } from "graphql-tag";

export default gql`
  type TestResult {
    id: Int
    url: String
    input: String
  }
  type Query {
    test2(input: String): TestResult
  }
`;
