"use client"

import { useState, useEffect, useCallback } from "react"
import { blockchain } from "@/lib/services/blockchain"

interface WalletState {
  address: string | null
  isConnected: boolean
  isConnecting: boolean
  error: string | null
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    error: null,
  })

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }))

    try {
      const address = await blockchain.initWithWallet()
      setState({
        address,
        isConnected: true,
        isConnecting: false,
        error: null,
      })
      return address
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur de connexion"
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: message,
      }))
      throw err
    }
  }, [])

  const disconnect = useCallback(() => {
    setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    })
  }, [])

  // Check if already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const accounts = (await window.ethereum.request({
            method: "eth_accounts",
          })) as string[]

          if (accounts.length > 0) {
            await connect()
          }
        } catch {
          // Silent fail - user not connected
        }
      }
    }

    checkConnection()
  }, [connect])

  // Listen for account changes
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (accounts: unknown) => {
        const accts = accounts as string[]
        if (accts.length === 0) {
          disconnect()
        } else if (accts[0] !== state.address) {
          setState((prev) => ({ ...prev, address: accts[0] }))
        }
      }

      window.ethereum.on("accountsChanged", handleAccountsChanged)

      return () => {
        window.ethereum?.removeListener("accountsChanged", handleAccountsChanged)
      }
    }
  }, [state.address, disconnect])

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return {
    ...state,
    connect,
    disconnect,
    shortenAddress: state.address ? shortenAddress(state.address) : null,
  }
}
