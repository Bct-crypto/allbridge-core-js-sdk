import Web3 from "web3";
import { AbiItem } from "web3-utils";
import { ChainSymbol, ChainType } from "../../../chains";
import { AllbridgeCoreClient } from "../../../client/core-api";
import { PoolInfo, TokenInfoWithChainDetails } from "../../../tokens-info";
import { RawTransaction } from "../../models";
import {
  LiquidityPoolsParams,
  LiquidityPoolsParamsWithAmount,
  Pool,
  UserBalanceInfo,
} from "../models";
import abi from "./abi/abi.json";
import { Abi as PoolContract } from "./types/Abi";
import { BaseContract } from "./types/types";

export class EvmPool extends Pool {
  chainType: ChainType.EVM = ChainType.EVM;
  private P = 52;

  constructor(public web3: Web3, public api: AllbridgeCoreClient) {
    super();
  }

  async getUserBalanceInfo(
    accountAddress: string,
    token: TokenInfoWithChainDetails
  ): Promise<UserBalanceInfo> {
    return new UserBalanceInfo(
      await this.getPoolContract(token.poolAddress)
        .methods.userInfo(accountAddress)
        .call()
    );
  }

  async getPoolInfo(token: TokenInfoWithChainDetails): Promise<PoolInfo> {
    const poolContract = this.getPoolContract(token.poolAddress);
    const [
      aValue,
      dValue,
      tokenBalance,
      vUsdBalance,
      totalLpAmount,
      accRewardPerShareP,
    ] = await Promise.all([
      poolContract.methods.a().call(),
      poolContract.methods.d().call(),
      poolContract.methods.tokenBalance().call(),
      poolContract.methods.vUsdBalance().call(),
      poolContract.methods.totalLpAmount().call(),
      poolContract.methods.accRewardPerShareP().call(),
    ]);

    return {
      aValue,
      dValue,
      tokenBalance,
      vUsdBalance,
      totalLpAmount,
      accRewardPerShareP,
      p: this.P,
    };
  }

  /* eslint-disable-next-line  @typescript-eslint/require-await */
  async buildRawTransactionDeposit(
    params: LiquidityPoolsParamsWithAmount
  ): Promise<RawTransaction> {
    return {
      ...(await this.buildTxParams(params)),
      data: this.getPoolContract(params.token.poolAddress)
        .methods.deposit(params.amount)
        .encodeABI(),
    };
  }

  async buildRawTransactionWithdraw(
    params: LiquidityPoolsParamsWithAmount
  ): Promise<RawTransaction> {
    return {
      ...(await this.buildTxParams(params)),
      data: this.getPoolContract(params.token.poolAddress)
        .methods.withdraw(params.amount)
        .encodeABI(),
    };
  }

  async buildRawTransactionClaimRewards(
    params: LiquidityPoolsParams
  ): Promise<RawTransaction> {
    return {
      ...(await this.buildTxParams(params)),
      data: this.getPoolContract(params.token.poolAddress)
        .methods.claimRewards()
        .encodeABI(),
    };
  }

  async buildTxParams(params: LiquidityPoolsParams) {
    const txParams = {
      from: params.accountAddress,
      to: params.token.poolAddress,
      value: "0",
      type: 2,
    };

    if (params.token.chainSymbol == ChainSymbol.POL) {
      const maxPriorityFeePerGas = await this.api.getGasPriceForPolygon();
      return {
        ...txParams,
        maxPriorityFeePerGas,
      };
    }
    return txParams;
  }

  private getContract<T extends BaseContract>(
    abiItem: AbiItem[],
    contractAddress: string
  ): T {
    return new this.web3.eth.Contract(abiItem, contractAddress) as any;
  }

  private getPoolContract(contractAddress: string): PoolContract {
    return this.getContract<PoolContract>(abi as AbiItem[], contractAddress);
  }
}