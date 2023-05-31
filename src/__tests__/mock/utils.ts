import nock, { Body, RequestBodyMatcher } from "nock";
import { Pool, TokenWithChainDetails } from "../../tokens-info";

export function getRequestBodyMatcher(expectedBody: any): RequestBodyMatcher {
  return (body: Body) => JSON.stringify(body) === JSON.stringify(expectedBody);
}

export function mockPoolInfoEndpoint(scope: nock.Scope, pools: { token: TokenWithChainDetails; pool: Pool }[]) {
  let result = {};
  for (const pool of pools) {
    const poolResponse = {
      [pool.token.chainSymbol]: {
        [pool.token.poolAddress]: pool.pool,
      },
    };
    result = {
      ...result,
      ...poolResponse,
    };
  }
  scope.post("/pool-info").reply(201, result).persist();
}

export function rpcReply(result: any): (url: string, body: any) => Record<string, any> {
  return (url, body: any) => ({
    jsonrpc: "2.0",
    id: body.id,
    result: result,
  });
}
