import {
  WagmiProvider,
  useAccount,
  useConnect,
  useDisconnect,
  createConfig,
  http,
} from 'wagmi'
import { mainnet, polygon, arbitrum, base, optimism, celo } from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { walletConnect } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getCapabilities, sendCalls } from 'wagmi/actions'
import { useState } from 'react'
import { parseUnits, erc20Abi, type Hex } from 'viem'

const chains = [mainnet, base, celo, optimism, arbitrum, polygon] as const

const transports = chains.reduce<Record<number, ReturnType<typeof http>>>(
  (acc, c) => {
    acc[c.id] = http()
    return acc
  },
  {}
)

const wagmiConfig = createConfig({
  chains,
  transports: transports,
  connectors: [
    injected(),
    walletConnect({
      projectId: '89dce935712eb0e41b2733671f25ff82',
      qrModalOptions: {
        explorerRecommendedWalletIds: [
          'd01c7758d741b363e637a817a09bcf579feae4db9f5bb16f599fdd1f66e2f974', // Valora
        ],
      },
    }),
  ],
})

const queryClient = new QueryClient()

function Capabilities() {
  const { address, chainId, status } = useAccount()
  const { connectors, connect, error: connectError } = useConnect()
  const { disconnect } = useDisconnect()
  const [requestResult, setRequestResult] = useState<any>(null)
  const [requestError, setRequestError] = useState<Error | null>(null)

  const handleDisconnect = () => {
    disconnect()
    setRequestResult(null)
    setRequestError(null)
  }

  const handleGetCapabilities = async () => {
    setRequestResult(null)
    setRequestError(null)
    try {
      const capabilities = await getCapabilities(wagmiConfig)
      setRequestResult(capabilities)
    } catch (error) {
      setRequestError(error as Error)
    }
  }

  const handleSendCallsAtomic = async () => {
    return handleSendCalls({ forceAtomic: true })
  }

  const handleSendCallsNonAtomic = async () => {
    return handleSendCalls({ forceAtomic: false })
  }

  const handleSendCalls = async ({ forceAtomic }: { forceAtomic: boolean }) => {
    if (!address) return

    setRequestResult(null)
    setRequestError(null)

    try {
      const calls = [
        {
          abi: erc20Abi,
          functionName: 'transfer',
          to: '0x765de816845861e75a25fca122bb6898b8b1282a' as Hex, // cUSD
          args: [address, parseUnits('0.0001', 18)],
        },
        {
          abi: erc20Abi,
          functionName: 'transfer',
          to: '0xceba9300f2b948710d2653dd7b07f33a8b32118c' as Hex, // USDC
          args: [address, parseUnits('0.0001', 6)],
        },
      ]

      const result = await sendCalls(wagmiConfig, {
        calls,
        chainId: celo.id,
        forceAtomic,
      })
      setRequestResult(result)
    } catch (error) {
      setRequestError(error as Error)
    }
  }

  return (
    <div>
      <div>Status: {status}</div>
      <div>Address: {address ?? '—'}</div>
      <div>Chain ID: {chainId ?? '—'}</div>
      {status === 'connected' ? (
        <button onClick={handleDisconnect}>Disconnect</button>
      ) : (
        connectors.map((connector) => (
          <button key={connector.uid} onClick={() => connect({ connector })}>
            Connect {connector.name}
          </button>
        ))
      )}
      {connectError && <div>{connectError.message}</div>}
      {status === 'connected' && (
        <>
          <button onClick={handleGetCapabilities}>Get Capabilities</button>
          <button onClick={handleSendCallsNonAtomic}>
            sendCalls (atomic optional)
          </button>
          <button onClick={handleSendCallsAtomic}>
            sendCalls (atomic required)
          </button>
        </>
      )}
      {requestResult && (
        <pre>
          <div>{JSON.stringify(requestResult, null, 2)}</div>
        </pre>
      )}
      {requestError && <div>{requestError.message}</div>}
    </div>
  )
}

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Capabilities />
      </QueryClientProvider>
    </WagmiProvider>
  )
}
