import { chainProperties, ChainSymbol } from "../../chains";
import {
  ChainDetails,
  ChainDetailsMap,
  ChainDetailsWithTokens,
  MessengerTransferTime,
  PoolMap,
  PoolKeyObject,
  TokenWithChainDetails,
  TransferTime,
} from "../../tokens-info";
import {
  ChainDetailsDTO,
  ChainDetailsResponse,
  Messenger,
  MessengerKeyDTO,
  MessengerTransferTimeDTO,
  PoolResponse,
  TokenDTO,
  TransferTimeDTO,
} from "./core-api.model";

export function mapChainDetailsResponseToChainDetailsMap(response: ChainDetailsResponse): ChainDetailsMap {
  return Object.entries(response).reduce<ChainDetailsMap>((map, entry) => {
    const chainSymbol = entry[0];
    const chainDetailsDTO = entry[1];
    const chainDetails = mapChainDetailsFromDto(chainSymbol, chainDetailsDTO);
    if (chainDetails) {
      map[chainSymbol] = chainDetails;
    }
    return map;
  }, {});
}

export function mapChainDetailsResponseToPoolMap(response: ChainDetailsResponse): PoolMap {
  const poolMap: PoolMap = {};
  for (const [chainSymbolValue, chainDetailsDTO] of Object.entries(response)) {
    const chainSymbol = chainSymbolValue as ChainSymbol;
    for (const token of chainDetailsDTO.tokens) {
      const poolKey = mapPoolKeyObjectToPoolKey({
        chainSymbol,
        poolAddress: token.poolAddress,
      });
      poolMap[poolKey] = token.pool;
    }
  }
  return poolMap;
}

function mapTokenWithChainDetailsFromDto(chainDetails: ChainDetails, dto: TokenDTO): TokenWithChainDetails {
  const { name: chainName, ...chainDetailsWithoutName } = chainDetails;
  const { pool: _pool, ...dtoWithoutPoolInfo } = dto;
  return {
    ...dtoWithoutPoolInfo,
    ...chainDetailsWithoutName,
    chainName,
  };
}

function mapMessengerKeyDtoToMessenger(dto: MessengerKeyDTO): Messenger | null {
  switch (dto) {
    case MessengerKeyDTO.ALLBRIDGE:
      return Messenger.ALLBRIDGE;
    case MessengerKeyDTO.WORMHOLE:
      return Messenger.WORMHOLE;
    default:
      return null;
  }
}

function mapTransferTimeFromDto(dto: TransferTimeDTO): TransferTime {
  return Object.entries(dto).reduce<TransferTime>((result, [key, value]) => {
    result[key as ChainSymbol] = mapMessengerTransferTimeFromDto(value);
    return result;
  }, {});
}

function mapMessengerTransferTimeFromDto(dto: MessengerTransferTimeDTO): MessengerTransferTime {
  return Object.entries(dto).reduce<MessengerTransferTime>((messengerTransferTime, [key, value]) => {
    const messenger = mapMessengerKeyDtoToMessenger(key as MessengerKeyDTO);
    if (messenger) {
      messengerTransferTime[messenger] = value;
    }
    return messengerTransferTime;
  }, {});
}

function mapChainDetailsFromDto(chainSymbol: string, dto: ChainDetailsDTO): ChainDetailsWithTokens | null {
  const basicChainProperties = chainProperties[chainSymbol];
  /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */
  if (!basicChainProperties) {
    return null;
  }
  const chainDetails: ChainDetails = {
    ...basicChainProperties,
    allbridgeChainId: dto.chainId,
    bridgeAddress: dto.bridgeAddress,
    transferTime: mapTransferTimeFromDto(dto.transferTime),
    confirmations: dto.confirmations,
  };
  return {
    ...chainDetails,
    tokens: dto.tokens.map((tokenDto) => mapTokenWithChainDetailsFromDto(chainDetails, tokenDto)),
  };
}

export function mapPoolKeyToPoolKeyObject(poolKey: string): PoolKeyObject {
  const dividerPosition = poolKey.indexOf("_");
  return {
    chainSymbol: poolKey.substring(0, dividerPosition) as ChainSymbol,
    poolAddress: poolKey.substring(dividerPosition + 1),
  };
}

export function mapPoolKeyObjectToPoolKey(poolKeyObject: PoolKeyObject): string {
  return poolKeyObject.chainSymbol + "_" + poolKeyObject.poolAddress;
}

export function mapChainDetailsMapToPoolKeyObjects(chainDetailsMap: ChainDetailsMap): PoolKeyObject[] {
  const result = [];
  for (const [chainSymbolValue, chainDetails] of Object.entries(chainDetailsMap)) {
    const chainSymbol = chainSymbolValue as ChainSymbol;
    for (const token of chainDetails.tokens) {
      result.push({
        chainSymbol,
        poolAddress: token.poolAddress,
      });
    }
  }
  return result;
}

export function mapPoolResponseToPoolMap(responseBody: PoolResponse): PoolMap {
  const poolMap: PoolMap = {};
  for (const [chainSymbolValue, poolByAddress] of Object.entries(responseBody)) {
    const chainSymbol = chainSymbolValue as ChainSymbol;
    for (const [poolAddress, pool] of Object.entries(poolByAddress)) {
      poolMap[mapPoolKeyObjectToPoolKey({ chainSymbol, poolAddress })] = pool;
    }
  }
  return poolMap;
}
