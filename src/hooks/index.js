/**
 * MediVault React Hooks
 *
 * Mirrors PearPass's pearpass-lib-vault hook patterns:
 *   useVaults → useVault
 *   useRecords → useRecords
 *   useCreateRecord → useCreateRecord
 *   useFolders → useCategories
 */

import { useEffect, useCallback, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  fetchRecords,
  addRecord,
  removeRecord,
  fetchShares,
  addShare,
  revokeShareAction,
  revokeAllForDoctor,
  fetchDoctors,
  addDoctorAction,
  removeDoctorAction,
  fetchAuditLog,
  setCategory,
  lockVault
} from '../store'
import { isVaultInitialized, generateShareLink } from '../vault'

/**
 * Hook to check vault status and manage auth state.
 * Mirrors PearPass useVaults({ onInitialize, onCompleted }).
 */
export function useVault() {
  const dispatch = useDispatch()
  const auth = useSelector(state => state.auth)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    isVaultInitialized().then(exists => {
      dispatch({ type: 'auth/setVaultExists', payload: exists })
      setChecking(false)
    })
  }, [dispatch])

  const lock = useCallback(() => {
    dispatch(lockVault())
  }, [dispatch])

  return {
    ...auth,
    checking,
    lock
  }
}

/**
 * Hook for medical records.
 * Mirrors PearPass useRecords({ variables: { vaultId, filters, sort } }).
 */
export function useRecords(filters = {}) {
  const dispatch = useDispatch()
  const { items, isLoading, error, selectedCategory } = useSelector(state => state.records)
  const vaultKey = useSelector(state => state.auth.vaultKey)

  const refetch = useCallback(() => {
    if (vaultKey) {
      dispatch(fetchRecords({
        vaultKey,
        filters: { ...filters, category: selectedCategory }
      }))
    }
  }, [dispatch, vaultKey, filters, selectedCategory])

  useEffect(() => {
    refetch()
  }, [refetch])

  const selectCategory = useCallback((cat) => {
    dispatch(setCategory(cat))
  }, [dispatch])

  return {
    records: items,
    isLoading,
    error,
    refetch,
    selectedCategory,
    selectCategory
  }
}

/**
 * Hook to create a new record.
 * Mirrors PearPass useCreateRecord({ onCompleted, onError }).
 */
export function useCreateRecord({ onCompleted, onError } = {}) {
  const dispatch = useDispatch()
  const vaultKey = useSelector(state => state.auth.vaultKey)
  const [isLoading, setIsLoading] = useState(false)

  const create = useCallback(async (recordData, file = null) => {
    if (!vaultKey) {
      onError?.('Vault is locked')
      return
    }
    setIsLoading(true)
    try {
      const result = await dispatch(addRecord({ recordData, file, vaultKey })).unwrap()
      onCompleted?.(result)
      return result
    } catch (err) {
      onError?.(err)
    } finally {
      setIsLoading(false)
    }
  }, [dispatch, vaultKey, onCompleted, onError])

  return { createRecord: create, isLoading }
}

/**
 * Hook to delete a record.
 */
export function useDeleteRecord({ onCompleted, onError } = {}) {
  const dispatch = useDispatch()
  const [isLoading, setIsLoading] = useState(false)

  const deleteRec = useCallback(async (recordId) => {
    setIsLoading(true)
    try {
      await dispatch(removeRecord(recordId)).unwrap()
      onCompleted?.(recordId)
    } catch (err) {
      onError?.(err)
    } finally {
      setIsLoading(false)
    }
  }, [dispatch, onCompleted, onError])

  return { deleteRecord: deleteRec, isLoading }
}

/**
 * Hook for share management.
 */
export function useShares(filters = {}) {
  const dispatch = useDispatch()
  const { items, isLoading } = useSelector(state => state.shares)

  const refetch = useCallback(() => {
    dispatch(fetchShares(filters))
  }, [dispatch, filters])

  useEffect(() => { refetch() }, [refetch])

  const createShare = useCallback(async (shareData) => {
    const result = await dispatch(addShare(shareData)).unwrap()
    return {
      share: result,
      link: generateShareLink(result.id)
    }
  }, [dispatch])

  const revoke = useCallback(async (shareId) => {
    await dispatch(revokeShareAction(shareId)).unwrap()
  }, [dispatch])

  const revokeForDoctor = useCallback(async (doctorId) => {
    await dispatch(revokeAllForDoctor(doctorId)).unwrap()
    refetch()
  }, [dispatch, refetch])

  return {
    shares: items,
    isLoading,
    refetch,
    createShare,
    revokeShare: revoke,
    revokeForDoctor
  }
}

/**
 * Hook for doctor management.
 */
export function useDoctors() {
  const dispatch = useDispatch()
  const { items, isLoading } = useSelector(state => state.doctors)

  const refetch = useCallback(() => {
    dispatch(fetchDoctors())
  }, [dispatch])

  useEffect(() => { refetch() }, [refetch])

  const add = useCallback(async (doctorData) => {
    return dispatch(addDoctorAction(doctorData)).unwrap()
  }, [dispatch])

  const remove = useCallback(async (doctorId) => {
    await dispatch(removeDoctorAction(doctorId)).unwrap()
  }, [dispatch])

  return {
    doctors: items,
    isLoading,
    refetch,
    addDoctor: add,
    removeDoctor: remove
  }
}

/**
 * Hook for audit log.
 */
export function useAuditLog(filters = {}) {
  const dispatch = useDispatch()
  const { entries, isLoading } = useSelector(state => state.audit)

  const refetch = useCallback(() => {
    dispatch(fetchAuditLog(filters))
  }, [dispatch, filters])

  useEffect(() => { refetch() }, [refetch])

  return { entries, isLoading, refetch }
}

/**
 * Inactivity auto-lock hook.
 * Mirrors PearPass useInactivity.js
 */
export function useInactivityLock(timeoutMs = 5 * 60 * 1000) {
  const dispatch = useDispatch()
  const isUnlocked = useSelector(state => state.auth.isUnlocked)

  useEffect(() => {
    if (!isUnlocked) return

    let timer
    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        dispatch(lockVault())
      }, timeoutMs)
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, reset))
    reset()

    return () => {
      clearTimeout(timer)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [dispatch, isUnlocked, timeoutMs])
}
