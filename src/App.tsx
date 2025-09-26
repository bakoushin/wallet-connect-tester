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
import {
  getCapabilities,
  type GetCapabilitiesErrorType,
  type GetCapabilitiesReturnType,
} from 'wagmi/actions'
import { useState } from 'react'

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
      projectId: 'b56e18d47c72ab683b10814fe9495694',
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
  const [capabilities, setCapabilities] =
    useState<GetCapabilitiesReturnType | null>(null)
  const [capabilitiesError, setCapabilitiesError] =
    useState<GetCapabilitiesErrorType | null>(null)

  const handleDisconnect = () => {
    disconnect()
    setCapabilities(null)
    setCapabilitiesError(null)
  }

  const handleGetCapabilities = async () => {
    try {
      const capabilities = await getCapabilities(wagmiConfig)
      setCapabilities(capabilities)
      setCapabilitiesError(null)
    } catch (error) {
      setCapabilitiesError(error as GetCapabilitiesErrorType)
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
        <button onClick={handleGetCapabilities}>Get Capabilities</button>
      )}
      {capabilities && (
        <pre>
          <div>{JSON.stringify(capabilities, null, 2)}</div>
        </pre>
      )}
      {capabilitiesError && <div>{capabilitiesError.message}</div>}
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
