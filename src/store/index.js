/**
 * MediVault Redux Store
 *
 * Mirrors PearPass's Redux + RTK pattern from pearpass-lib-vault.
 * Slices: auth, records, shares, doctors, audit.
 */

import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import * as vault from '../vault'

// ─── Auth Slice (mirrors PearPass vault unlock/lock) ───

export const createNewVault = createAsyncThunk(
  'auth/createVault',
  async (masterPassword, { rejectWithValue }) => {
    try {
      const { key } = await vault.createVault(masterPassword)
      return { key }
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

export const unlockExistingVault = createAsyncThunk(
  'auth/unlockVault',
  async (masterPassword, { rejectWithValue }) => {
    try {
      const { key } = await vault.unlockVault(masterPassword)
      return { key }
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    isUnlocked: false,
    vaultKey: null,
    isLoading: false,
    error: null,
    vaultExists: false
  },
  reducers: {
    lockVault: (state) => {
      state.isUnlocked = false
      state.vaultKey = null
    },
    setVaultExists: (state, action) => {
      state.vaultExists = action.payload
    },
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(createNewVault.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createNewVault.fulfilled, (state, action) => {
        state.isLoading = false
        state.isUnlocked = true
        state.vaultKey = action.payload.key
        state.vaultExists = true
      })
      .addCase(createNewVault.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      .addCase(unlockExistingVault.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(unlockExistingVault.fulfilled, (state, action) => {
        state.isLoading = false
        state.isUnlocked = true
        state.vaultKey = action.payload.key
      })
      .addCase(unlockExistingVault.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
  }
})

// ─── Records Slice (mirrors PearPass useRecords/useCreateRecord) ───

export const fetchRecords = createAsyncThunk(
  'records/fetchAll',
  async ({ vaultKey, filters = {} }, { rejectWithValue }) => {
    try {
      return await vault.listRecords(vaultKey, filters)
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

export const addRecord = createAsyncThunk(
  'records/add',
  async ({ recordData, file, vaultKey }, { rejectWithValue }) => {
    try {
      return await vault.createRecord(recordData, file, vaultKey)
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

export const removeRecord = createAsyncThunk(
  'records/remove',
  async (recordId, { rejectWithValue }) => {
    try {
      await vault.deleteRecord(recordId)
      return recordId
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

const recordsSlice = createSlice({
  name: 'records',
  initialState: {
    items: [],
    isLoading: false,
    error: null,
    selectedCategory: null
  },
  reducers: {
    setCategory: (state, action) => {
      state.selectedCategory = action.payload
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecords.pending, (state) => { state.isLoading = true })
      .addCase(fetchRecords.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = action.payload
      })
      .addCase(fetchRecords.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      .addCase(addRecord.fulfilled, (state, action) => {
        state.items.unshift(action.payload)
      })
      .addCase(removeRecord.fulfilled, (state, action) => {
        state.items = state.items.filter(r => r.id !== action.payload)
      })
  }
})

// ─── Shares Slice ───

export const fetchShares = createAsyncThunk(
  'shares/fetchAll',
  async (filters = {}, { rejectWithValue }) => {
    try {
      return await vault.listShares(filters)
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

export const addShare = createAsyncThunk(
  'shares/add',
  async (shareData, { rejectWithValue }) => {
    try {
      return await vault.createShare(shareData)
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

export const revokeShareAction = createAsyncThunk(
  'shares/revoke',
  async (shareId, { rejectWithValue }) => {
    try {
      await vault.revokeShare(shareId)
      return shareId
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

export const revokeAllForDoctor = createAsyncThunk(
  'shares/revokeAllForDoctor',
  async (doctorId, { rejectWithValue }) => {
    try {
      await vault.revokeAllSharesForDoctor(doctorId)
      return doctorId
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

const sharesSlice = createSlice({
  name: 'shares',
  initialState: { items: [], isLoading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchShares.pending, (state) => { state.isLoading = true })
      .addCase(fetchShares.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = action.payload
      })
      .addCase(fetchShares.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      .addCase(addShare.fulfilled, (state, action) => {
        state.items.push(action.payload)
      })
      .addCase(revokeShareAction.fulfilled, (state, action) => {
        state.items = state.items.filter(s => s.id !== action.payload)
      })
      .addCase(revokeAllForDoctor.fulfilled, (state, action) => {
        state.items = state.items.filter(s => s.doctorId !== action.payload)
      })
  }
})

// ─── Doctors Slice ───

export const fetchDoctors = createAsyncThunk(
  'doctors/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await vault.listDoctors()
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

export const addDoctorAction = createAsyncThunk(
  'doctors/add',
  async (doctorData, { rejectWithValue }) => {
    try {
      return await vault.addDoctor(doctorData)
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

export const removeDoctorAction = createAsyncThunk(
  'doctors/remove',
  async (doctorId, { rejectWithValue }) => {
    try {
      await vault.removeDoctor(doctorId)
      return doctorId
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

const doctorsSlice = createSlice({
  name: 'doctors',
  initialState: { items: [], isLoading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDoctors.pending, (state) => { state.isLoading = true })
      .addCase(fetchDoctors.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = action.payload
      })
      .addCase(addDoctorAction.fulfilled, (state, action) => {
        state.items.push(action.payload)
      })
      .addCase(removeDoctorAction.fulfilled, (state, action) => {
        state.items = state.items.filter(d => d.id !== action.payload)
      })
  }
})

// ─── Audit Slice ───

export const fetchAuditLog = createAsyncThunk(
  'audit/fetchAll',
  async (filters = {}, { rejectWithValue }) => {
    try {
      return await vault.getAuditLog(filters)
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

const auditSlice = createSlice({
  name: 'audit',
  initialState: { entries: [], isLoading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAuditLog.pending, (state) => { state.isLoading = true })
      .addCase(fetchAuditLog.fulfilled, (state, action) => {
        state.isLoading = false
        state.entries = action.payload
      })
  }
})

// ─── Configure Store ───

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    records: recordsSlice.reducer,
    shares: sharesSlice.reducer,
    doctors: doctorsSlice.reducer,
    audit: auditSlice.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'auth/createVault/fulfilled',
          'auth/unlockVault/fulfilled'
        ],
        ignoredPaths: ['auth.vaultKey']
      }
    })
})

export const { lockVault, setVaultExists, clearError } = authSlice.actions
export const { setCategory } = recordsSlice.actions
