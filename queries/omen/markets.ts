import { gql, request } from "graphql-request";
import {
  FixedProductMarketMaker_Filter,
  Query,
  QueryFixedProductMarketMakerArgs,
  QueryFixedProductMarketMakersArgs,
} from "./types";

const SUBGRAPH_API_KEY = process.env.SUBGRAPH_API_KEY || "";

const OMEN_SUBGRAPH_URL = `https://gateway-arbitrum.network.thegraph.com/api/${SUBGRAPH_API_KEY}/subgraphs/id/9fUVQpFwzpdWS9bq5WkAnmKbNNcoBwatMR4yZq81pbbz`;

const getMarketQuery = gql`
  query GetMarket($id: ID!) {
    fixedProductMarketMaker(id: $id) {
      id
      creator
      collateralToken
      fee
      collateralVolume
      outcomeTokenAmounts
      outcomeTokenMarginalPrices
      condition {
        id
        payouts
        oracle
        __typename
      }
      templateId
      title
      outcomes
      category
      language
      lastActiveDay
      runningDailyVolume
      arbitrator
      creationTimestamp
      openingTimestamp
      timeout
      resolutionTimestamp
      currentAnswer
      currentAnswerTimestamp
      currentAnswerBond
      answerFinalizedTimestamp
      scaledLiquidityParameter
      scaledLiquidityMeasure
      scaledCollateralVolume
      runningDailyVolumeByHour
      isPendingArbitration
      arbitrationOccurred
      runningDailyVolumeByHour
      curatedByDxDao
      curatedByDxDaoOrKleros
      question {
        id
        data
        currentAnswer
        answers {
          answer
          bondAggregate
          __typename
        }
        __typename
      }
      klerosTCRregistered
      curatedByDxDaoOrKleros
      curatedByDxDao
      submissionIDs {
        id
        status
        __typename
      }
      scalarLow
      scalarHigh
      usdVolume
      __typename
    }
  }
`;

const marketDataFragment = gql`
  fragment marketData on FixedProductMarketMaker {
    id
    collateralVolume
    collateralToken
    creationTimestamp
    lastActiveDay
    outcomeTokenAmounts
    runningDailyVolumeByHour
    title
    outcomes
    openingTimestamp
    arbitrator
    category
    templateId
    scaledLiquidityParameter
    scaledLiquidityMeasure
    scaledCollateralVolume
    curatedByDxDao
    klerosTCRregistered
    outcomeTokenMarginalPrices
    condition {
      id
      oracle
      scalarLow
      scalarHigh
      __typename
    }
    question {
      id
      data
      currentAnswer
      outcomes
      answers {
        answer
        bondAggregate
        __typename
      }
      __typename
    }
    outcomes
    outcomeTokenMarginalPrices
    resolutionTimestamp
    usdRunningDailyVolume
    usdVolume
    currentAnswer
    currentAnswerTimestamp
    fee
    __typename
  }
`;

const getMarketsQuery = (
  params: QueryFixedProductMarketMakersArgs & FixedProductMarketMaker_Filter
) => gql`
  query GetMarkets(
    $first: Int!
    $skip: Int!
    $orderBy: String
    $orderDirection: String
    $id: String
    $title_contains_nocase: String
    $creator_in: [String]
    $category_contains: String
    $openingTimestamp_gt: Int
    $openingTimestamp_lt: Int
    $isPendingArbitration: Boolean
    $currentAnswer: Bytes
    $currentAnswer_not: Bytes
    $answerFinalizedTimestamp_lt: Int
    $answerFinalizedTimestamp_gt: Int
    $openingTimestamp_lte: Int
    $scaledLiquidityParameter_gt: Int
    $resolutionTimestamp: Int
    $currentAnswerTimestamp_gt: Int
    $collateralToken_in: [String]
    ) {
    fixedProductMarketMakers(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: {
        outcomeSlotCount: 2
        ${
          params.title_contains_nocase
            ? "title_contains_nocase: $title_contains_nocase"
            : ""
        }
        ${params.id ? "id: $id" : ""}
      }
    ) {
      ...marketData
      __typename
    }
  }

  ${marketDataFragment}
`;

const getMarket = async (params: QueryFixedProductMarketMakerArgs) => {
  const response = await request<Pick<Query, "fixedProductMarketMaker">>(
    OMEN_SUBGRAPH_URL,
    getMarketQuery,
    params
  );

  return response;
};

const getMarkets = async (
  params: QueryFixedProductMarketMakersArgs & FixedProductMarketMaker_Filter
) => {
  const response = await request<Pick<Query, "fixedProductMarketMakers">>(
    OMEN_SUBGRAPH_URL,
    getMarketsQuery(params),
    params
  );

  return { fixedProductMarketMakers: response };
};

export { getMarket, getMarkets };
