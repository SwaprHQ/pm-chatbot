import type { CodegenConfig } from "@graphql-codegen/cli";
import { config } from "dotenv";

config({
  path: ".env",
});

const SUBGRAPH_API_KEY = process.env.SUBGRAPH_API_KEY || "";

const OMEN_SUBGRAPH_URL = `https://gateway-arbitrum.network.thegraph.com/api/${SUBGRAPH_API_KEY}/subgraphs/id/9fUVQpFwzpdWS9bq5WkAnmKbNNcoBwatMR4yZq81pbbz`;

const codegenConfig: CodegenConfig = {
  overwrite: true,
  generates: {
    "queries/omen/types.ts": {
      schema: OMEN_SUBGRAPH_URL,
      plugins: ["typescript", "typescript-graphql-request"],
    },
  },
};

export default codegenConfig;
