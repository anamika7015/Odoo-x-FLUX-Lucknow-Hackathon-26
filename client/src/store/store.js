import { configureStore, createSlice } from '@reduxjs/toolkit';
const authSlice = createSlice({ name: 'auth', initialState: { user: null, initialized: false }, reducers: { setUser: (state, action) => { state.user = action.payload; state.initialized = true; }, clearUser: (state) => { state.user = null; state.initialized = true; } } });
export const { setUser, clearUser } = authSlice.actions;
export const store = configureStore({ reducer: { auth: authSlice.reducer } });
