import { gql } from "graphql-tag";

export default gql`
  type TestResult {
    id: Int
    url: String
  }
  type Query {
    test2: TestResult
  }
`;
