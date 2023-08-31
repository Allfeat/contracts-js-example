import {ApiPromise, WsProvider} from "@polkadot/api";

export async function connectToNode(endpoint: string) {
    console.log("Initializing connection to node...")

    const wsProvider = new WsProvider(endpoint);
    const api = await ApiPromise.create({ provider: wsProvider });

    console.log(
        `Connected to node: ${endpoint} | ${(await api.rpc.system.chain()).toHuman()} [ss58: ${
            api.registry.chainSS58
        }]`
    );

    return api
}